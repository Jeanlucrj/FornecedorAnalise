import "dotenv/config";
import pkg from 'pg';
import crypto from "crypto";
import { promisify } from "util";

const { Pool } = pkg;
const scrypt = promisify(crypto.scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString('hex')}`;
}

async function quickCreateAdmin() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const client = await pool.connect();

  try {
    console.log("\n🚀 Criando estrutura e administrador...\n");

    // Step 1: Create tables if they don't exist
    console.log("📋 Criando tabelas...");

    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR UNIQUE NOT NULL,
        password TEXT NOT NULL,
        email VARCHAR UNIQUE NOT NULL,
        is_active BOOLEAN DEFAULT true,
        last_login_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR,
        admin_id VARCHAR,
        action VARCHAR NOT NULL,
        resource VARCHAR,
        resource_id VARCHAR,
        details JSONB,
        ip_address VARCHAR,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("✅ Tabelas criadas/verificadas\n");

    // Step 2: Create admin user
    const username = "admin";
    const email = "admin@fornecedorflow.com";
    const password = "Admin@2026"; // Senha padrão - MUDE APÓS O PRIMEIRO LOGIN!

    // Check if admin exists
    const existingAdmin = await client.query(
      "SELECT * FROM admins WHERE username = $1",
      [username]
    );

    if (existingAdmin.rows.length > 0) {
      console.log("⚠️  Administrador 'admin' já existe!");
      console.log("\nCredenciais:");
      console.log(`  Usuário: ${username}`);
      console.log(`  Email: ${existingAdmin.rows[0].email}`);
      console.log("\n⚠️  Se esqueceu a senha, delete o registro e execute novamente.\n");
      return;
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Insert admin
    const result = await client.query(
      `INSERT INTO admins (username, email, password, is_active)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, email, created_at`,
      [username, email, hashedPassword, true]
    );

    const admin = result.rows[0];

    console.log("✅ Administrador criado com sucesso!\n");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📋 CREDENCIAIS DE ACESSO");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`  Usuário:  ${admin.username}`);
    console.log(`  Email:    ${admin.email}`);
    console.log(`  Senha:    Admin@2026`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`  ID:       ${admin.id}`);
    console.log(`  Criado:   ${admin.created_at}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log("🔗 Acesse: http://localhost:5000/admin/login");
    console.log("\n⚠️  IMPORTANTE: Altere a senha após o primeiro login!\n");

  } catch (error: any) {
    console.error("\n❌ Erro:", error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

quickCreateAdmin().catch((error) => {
  console.error(error);
  process.exit(1);
});
