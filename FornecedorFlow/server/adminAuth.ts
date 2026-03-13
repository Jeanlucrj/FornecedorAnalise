import { Router } from 'express';
import { db } from './db';
import { admins, activityLogs } from '../shared/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(crypto.scrypt);
const router = Router();

// Hash password using scrypt
async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString('hex')}`;
}

// Verify password
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const [salt, key] = hash.split(':');
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return key === derivedKey.toString('hex');
}

// Middleware to check if user is authenticated as admin
export function isAdminAuthenticated(req: any, res: any, next: any) {
  if (req.session && req.session.adminId) {
    return next();
  }
  return res.status(401).json({ error: 'Não autorizado. Acesso restrito a administradores.' });
}

// Log admin activity
async function logAdminActivity(
  adminId: string,
  action: string,
  resource?: string,
  resourceId?: string,
  details?: any,
  req?: any
) {
  try {
    await db.insert(activityLogs).values({
      adminId,
      action,
      resource,
      resourceId,
      details,
      ipAddress: req?.ip || req?.connection?.remoteAddress,
      userAgent: req?.headers?.['user-agent'],
    });
  } catch (error) {
    console.error('Error logging admin activity:', error);
  }
}

// Admin login
router.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
    }

    // Find admin by username
    const admin = await db.query.admins.findFirst({
      where: eq(admins.username, username),
    });

    if (!admin) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    if (!admin.isActive) {
      return res.status(403).json({ error: 'Conta de administrador desativada' });
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, admin.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Update last login
    await db.update(admins)
      .set({ lastLoginAt: new Date() })
      .where(eq(admins.id, admin.id));

    // Set session
    req.session.adminId = admin.id;
    req.session.adminUsername = admin.username;

    // Log activity
    await logAdminActivity(admin.id, 'admin_login', 'admin', admin.id, null, req);

    res.json({
      id: admin.id,
      username: admin.username,
      email: admin.email,
    });
  } catch (error: any) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

// Admin logout
router.post('/api/admin/logout', isAdminAuthenticated, async (req, res) => {
  const adminId = req.session.adminId;

  if (adminId) {
    await logAdminActivity(adminId, 'admin_logout', 'admin', adminId, null, req);
  }

  req.session.destroy((err: any) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao fazer logout' });
    }
    res.json({ message: 'Logout realizado com sucesso' });
  });
});

// Check admin authentication
router.get('/api/admin/auth/check', async (req, res) => {
  if (req.session && req.session.adminId) {
    try {
      const admin = await db.query.admins.findFirst({
        where: eq(admins.id, req.session.adminId),
      });

      if (admin && admin.isActive) {
        return res.json({
          authenticated: true,
          admin: {
            id: admin.id,
            username: admin.username,
            email: admin.email,
          },
        });
      }
    } catch (error) {
      console.error('Error checking admin auth:', error);
    }
  }

  res.json({ authenticated: false });
});

// Create admin (only for initial setup - should be protected or removed in production)
router.post('/api/admin/create', async (req, res) => {
  try {
    const { username, password, email } = req.body;

    if (!username || !password || !email) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    // Check if admin already exists
    const existingAdmin = await db.query.admins.findFirst({
      where: eq(admins.username, username),
    });

    if (existingAdmin) {
      return res.status(409).json({ error: 'Administrador já existe' });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create admin
    const [newAdmin] = await db.insert(admins).values({
      username,
      password: hashedPassword,
      email,
      isActive: true,
    }).returning();

    res.json({
      message: 'Administrador criado com sucesso',
      admin: {
        id: newAdmin.id,
        username: newAdmin.username,
        email: newAdmin.email,
      },
    });
  } catch (error: any) {
    console.error('Error creating admin:', error);
    res.status(500).json({ error: 'Erro ao criar administrador' });
  }
});

export { router as adminAuthRouter, logAdminActivity };
