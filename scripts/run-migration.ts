import "dotenv/config";
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log("🔄 Executando migração do banco de dados...\n");

    // Add admin fields to users table
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;
    `);
    console.log("✅ Campos de admin adicionados à tabela users");

    // Create admins table
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
    console.log("✅ Tabela admins criada");

    // Create activity_logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR REFERENCES users(id),
        admin_id VARCHAR REFERENCES admins(id),
        action VARCHAR NOT NULL,
        resource VARCHAR,
        resource_id VARCHAR,
        details JSONB,
        ip_address VARCHAR,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Tabela activity_logs criada");

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS IDX_activity_logs_user_id ON activity_logs(user_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS IDX_activity_logs_admin_id ON activity_logs(admin_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS IDX_activity_logs_created_at ON activity_logs(created_at);
    `);
    console.log("✅ Índices criados");

    // Create trigger function
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);
    console.log("✅ Função de trigger criada");

    // Create trigger
    await client.query(`
      DROP TRIGGER IF EXISTS update_admins_updated_at ON admins;
    `);
    await client.query(`
      CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON admins
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
    console.log("✅ Trigger criado");

    console.log("\n🎉 Migração concluída com sucesso!\n");
  } catch (error: any) {
    console.error("❌ Erro ao executar migração:", error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch((error) => {
  console.error(error);
  process.exit(1);
});
