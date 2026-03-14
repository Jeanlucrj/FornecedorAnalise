import type { Express, RequestHandler } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
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

export function getSession() {
    const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
    const pgStore = connectPg(session);

    // Explicit pool with SSL for production to satisfy Supabase requirements
    const pgPool = new pg.Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
    });

    const sessionStore = new pgStore({
        pool: pgPool,
        createTableIfMissing: true,
        ttl: sessionTtl,
        tableName: "sessions",
    });

    return session({
        secret: process.env.SESSION_SECRET || 'local-dev-secret',
        store: sessionStore,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: sessionTtl,
            sameSite: 'lax',
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
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({ message: "Email e senha são obrigatórios" });
            }

            const user = await storage.getUserByEmail(email);
            if (!user || !(await comparePasswords(password, user.password))) {
                return res.status(401).json({ message: "E-mail ou senha incorretos" });
            }

            req.session.userId = user.id;
            res.json(user);
        } catch (error: any) {
            console.error("Erro no login:", error);
            res.status(500).json({ message: "Erro ao realizar login: " + (error.message || String(error)) });
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
