import type { Express, RequestHandler } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import MemoryStore from "memorystore";
import { storage } from "./storage.js";
import { scrypt, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import pg from "pg";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
    const [hashed, salt] = stored.split(".");
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Singleton pool instance to reuse across serverless invocations
let pgPoolInstance: pg.Pool | null = null;

function getPgPool() {
    if (!pgPoolInstance) {
        console.log('🔌 Creating new PostgreSQL pool for sessions...');
        pgPoolInstance = new pg.Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
            max: 1, // Minimize connections in serverless
            idleTimeoutMillis: 10000,
            connectionTimeoutMillis: 10000,
        });

        // Handle pool errors
        pgPoolInstance.on('error', (err) => {
            console.error('❌ PostgreSQL pool error:', err);
        });
    }
    return pgPoolInstance;
}

export function getSession() {
    const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
    const isProduction = process.env.NODE_ENV === 'production';

    console.log(`🔌 Using PostgreSQL for sessions (${isProduction ? 'production' : 'development'})`);
    const pgStore = connectPg(session);
    const sessionStore = new pgStore({
        pool: getPgPool(),
        createTableIfMissing: true,
        ttl: sessionTtl / 1000, // connect-pg-simple expects seconds
        tableName: "sessions",
        errorLog: (err) => {
            console.error('❌ Session store error:', err);
        },
    });

    return session({
        secret: process.env.SESSION_SECRET || 'local-dev-secret',
        store: sessionStore,
        resave: false,
        saveUninitialized: false,
        rolling: true,
        cookie: {
            httpOnly: true,
            secure: isProduction,
            maxAge: sessionTtl,
            sameSite: isProduction ? 'none' : 'lax', // Use none for cross-site cookies if needed
        },
    });
}

declare module 'express-session' {
    interface SessionData {
        userId: string;
    }
}

export async function setupAuth(app: Express) {
    app.set("trust proxy", 1);
    app.use(getSession());

    app.post("/api/register", async (req, res) => {
        try {
            const { email, password, firstName, lastName } = req.body;

            if (!email || !password) {
                return res.status(400).json({ message: "Email e senha são obrigatórios" });
            }

            const existingUser = await storage.getUserByEmail(email);
            if (existingUser) {
                return res.status(400).json({ message: "Este e-mail já está cadastrado" });
            }

            const hashedPassword = await hashPassword(password);
            const user = await storage.createUser({
                email,
                password: hashedPassword,
                firstName,
                lastName,
                plan: 'free',
                apiUsage: 0,
                apiLimit: 10,
                notificationsEnabled: true,
                autoRefreshEnabled: false,
                monitoringFrequency: 'daily',
                emailNotifications: false,
                whatsappNotifications: false,
            });

            req.session.userId = user.id;
            res.status(201).json(user);
        } catch (error) {
            console.error("Erro no registro:", error);
            res.status(500).json({ message: "Erro ao criar conta" });
        }
    });

    app.post("/api/login", async (req, res) => {
        try {
            console.log('🔐 Login attempt for:', req.body.email);
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({ message: "Email e senha são obrigatórios" });
            }

            const user = await storage.getUserByEmail(email);
            if (!user) {
                console.log('❌ User not found:', email);
                return res.status(401).json({ message: "E-mail ou senha incorretos" });
            }

            const passwordMatch = await comparePasswords(password, user.password);
            if (!passwordMatch) {
                console.log('❌ Password mismatch for:', email);
                return res.status(401).json({ message: "E-mail ou senha incorretos" });
            }

            console.log('✅ Authentication successful for:', email);

            // Save session and wait for it to complete
            req.session.userId = user.id;
            await new Promise((resolve, reject) => {
                req.session.save((err) => {
                    if (err) {
                        console.error('❌ Session save error:', err);
                        reject(err);
                    } else {
                        console.log('✅ Session saved successfully');
                        resolve(true);
                    }
                });
            });

            res.json(user);
        } catch (error: any) {
            console.error("❌ Login error:", error);
            console.error("Error stack:", error.stack);
            res.status(500).json({
                message: "Erro de conexão. Tente novamente.",
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });

    app.post("/api/logout", (req, res) => {
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).json({ message: "Erro ao sair" });
            }
            res.json({ message: "Logout realizado com sucesso" });
        });
    });

    app.get("/api/auth/user", async (req, res) => {
        if (!req.session.userId) {
            return res.status(401).json({ message: "Não autenticado" });
        }

        const user = await storage.getUser(req.session.userId);
        if (!user) {
            return res.status(401).json({ message: "Usuário não encontrado" });
        }

        res.json(user);
    });
}

export const isAuthenticated: RequestHandler = (req: any, res, next) => {
    if (req.session.userId) {
        return next();
    }
    res.status(401).json({ message: "Não autorizado" });
};
