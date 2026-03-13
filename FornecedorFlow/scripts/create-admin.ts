import "dotenv/config";
import { db } from "../server/db";
import { admins } from "../shared/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { promisify } from "util";
import * as readline from "readline";

const scrypt = promisify(crypto.scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString('hex')}`;
}

function question(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function createAdmin() {
  console.log("\n=== Criar Administrador do Sistema ===\n");

  try {
    const username = await question("Nome de usuário: ");
    const email = await question("Email: ");
    const password = await question("Senha: ");

    if (!username || !email || !password) {
      console.error("❌ Todos os campos são obrigatórios!");
      process.exit(1);
    }

    // Check if admin already exists
    const existingAdmin = await db.query.admins.findFirst({
      where: eq(admins.username, username),
    });

    if (existingAdmin) {
      console.error(`❌ Administrador com o usuário "${username}" já existe!`);
      process.exit(1);
    }

    // Check if email already exists
    const existingEmail = await db.query.admins.findFirst({
      where: eq(admins.email, email),
    });

    if (existingEmail) {
      console.error(`❌ Email "${email}" já está em uso!`);
      process.exit(1);
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create admin
    const [newAdmin] = await db.insert(admins).values({
      username,
      email,
      password: hashedPassword,
      isActive: true,
    }).returning();

    console.log("\n✅ Administrador criado com sucesso!");
    console.log("\nDetalhes:");
    console.log(`  ID: ${newAdmin.id}`);
    console.log(`  Usuário: ${newAdmin.username}`);
    console.log(`  Email: ${newAdmin.email}`);
    console.log(`  Criado em: ${newAdmin.createdAt}`);
    console.log("\nVocê pode fazer login em: /admin/login\n");

    process.exit(0);
  } catch (error: any) {
    console.error("\n❌ Erro ao criar administrador:", error.message);
    process.exit(1);
  }
}

createAdmin();
