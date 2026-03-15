import {
  users,
  suppliers,
  validations,
  partners,
  alerts,
  type User,
  type UpsertUser,
  type Supplier,
  type InsertSupplier,
  type Validation,
  type InsertValidation,
  type Partner,
  type InsertPartner,
  type Alert,
  type InsertAlert,
} from "@shared/schema";
import { db } from "./db.js";
import { eq, desc, and, or, like, gte, lte, count, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, userData: Partial<User>): Promise<User>;

  // Supplier operations
  getSupplier(id: string): Promise<Supplier | undefined>;
  getSupplierByCnpj(cnpj: string): Promise<Supplier | undefined>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: string, supplier: Partial<InsertSupplier>): Promise<Supplier>;

  // Validation operations
  getValidation(id: string): Promise<Validation | undefined>;
  getValidationsByUser(userId: string, limit?: number, offset?: number): Promise<Validation[]>;
  getValidationsWithSuppliers(userId: string, filters?: any): Promise<any[]>;
  createValidation(validation: InsertValidation): Promise<Validation>;
  updateValidation(id: string, validation: Partial<InsertValidation>): Promise<Validation>;

  // Partner operations
  getPartnersBySupplier(supplierId: string): Promise<Partner[]>;
  createPartner(partner: InsertPartner): Promise<Partner>;

  // Alert operations
  getAlertsByUser(userId: string, unreadOnly?: boolean): Promise<Alert[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  markAlertAsRead(id: string): Promise<Alert>;

  // Statistics
  getUserStats(userId: string): Promise<any>;
  getScoreDistribution(userId: string): Promise<any>;

  // API usage tracking
  incrementApiUsage(userId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: UpsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.email,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUser(id: string, userData: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...userData,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Supplier operations
  async getSupplier(id: string): Promise<Supplier | undefined> {
    const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, id));
    return supplier;
  }

  async getSupplierByCnpj(cnpj: string): Promise<Supplier | undefined> {
    const [supplier] = await db.select().from(suppliers).where(eq(suppliers.cnpj, cnpj));
    return supplier;
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    const [created] = await db.insert(suppliers).values(supplier).returning();
    return created;
  }

  async updateSupplier(id: string, supplier: Partial<InsertSupplier>): Promise<Supplier> {
    const [updated] = await db
      .update(suppliers)
      .set({ ...supplier, updatedAt: new Date() })
      .where(eq(suppliers.id, id))
      .returning();
    return updated;
  }

  // Validation operations
  async getValidation(id: string): Promise<Validation | undefined> {
    const [validation] = await db.select().from(validations).where(eq(validations.id, id));
    return validation;
  }

  async getValidationsByUser(userId: string, limit = 10, offset = 0): Promise<Validation[]> {
    return await db
      .select()
      .from(validations)
      .where(eq(validations.userId, userId))
      .orderBy(desc(validations.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getValidationsWithSuppliers(userId: string, filters: any = {}): Promise<any[]> {
    const conditions = [eq(validations.userId, userId)];

    if (filters.search) {
      conditions.push(
        or(
          like(suppliers.companyName, `%${filters.search}%`),
          like(suppliers.cnpj, `%${filters.search}%`)
        )!
      );
    }

    if (filters.status) {
      conditions.push(eq(validations.status, filters.status));
    }

    if (filters.dateFrom) {
      conditions.push(gte(validations.createdAt, new Date(filters.dateFrom)));
    }

    if (filters.dateTo) {
      conditions.push(lte(validations.createdAt, new Date(filters.dateTo)));
    }

    return await db
      .select({
        validation: validations,
        supplier: suppliers,
      })
      .from(validations)
      .leftJoin(suppliers, eq(validations.supplierId, suppliers.id))
      .where(and(...conditions))
      .orderBy(desc(validations.createdAt))
      .limit(filters.limit || 50)
      .offset(filters.offset || 0);
  }

  async createValidation(validation: InsertValidation): Promise<Validation> {
    const [created] = await db.insert(validations).values(validation).returning();

    // Create alert for low scores (below 50)
    if (created.score < 50) {
      await this.createAlert({
        userId: created.userId,
        type: 'low_score',
        title: 'Fornecedor com Score Baixo',
        description: `Fornecedor validado com score ${created.score}/100. Requer atenção imediata.`,
        severity: 'high',
        isRead: false,
      });
    }

    return created;
  }

  async updateValidation(id: string, validation: Partial<InsertValidation>): Promise<Validation> {
    const [updated] = await db
      .update(validations)
      .set({ ...validation, updatedAt: new Date() })
      .where(eq(validations.id, id))
      .returning();
    return updated;
  }

  // Partner operations
  async getPartnersBySupplier(supplierId: string): Promise<Partner[]> {
    return await db.select().from(partners).where(eq(partners.supplierId, supplierId));
  }

  async createPartner(partner: InsertPartner): Promise<Partner> {
    const [created] = await db.insert(partners).values(partner).returning();
    return created;
  }

  // Alert operations
  async getAlertsByUser(userId: string, unreadOnly = false): Promise<Alert[]> {
    const conditions = [eq(alerts.userId, userId)];

    if (unreadOnly) {
      conditions.push(eq(alerts.isRead, false));
    }

    return await db
      .select()
      .from(alerts)
      .where(and(...conditions))
      .orderBy(desc(alerts.createdAt));
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    const [created] = await db.insert(alerts).values(alert).returning();
    return created;
  }

  async markAlertAsRead(id: string): Promise<Alert> {
    const [updated] = await db
      .update(alerts)
      .set({ isRead: true })
      .where(eq(alerts.id, id))
      .returning();
    return updated;
  }

  // Statistics
  async getUserStats(userId: string): Promise<any> {
    const [validatedCount] = await db
      .select({ count: count() })
      .from(validations)
      .where(eq(validations.userId, userId));

    const [avgScore] = await db
      .select({ avg: sql<number>`avg(${validations.score})` })
      .from(validations)
      .where(eq(validations.userId, userId));

    const [alertsCount] = await db
      .select({ count: count() })
      .from(alerts)
      .where(and(eq(alerts.userId, userId), eq(alerts.isRead, false)));

    const [user] = await db.select().from(users).where(eq(users.id, userId));

    return {
      validated: validatedCount.count || 0,
      averageScore: Math.round(avgScore.avg || 0),
      alerts: alertsCount.count || 0,
      remaining: (user?.apiLimit || 0) - (user?.apiUsage || 0),
    };
  }

  async getScoreDistribution(userId: string): Promise<any> {
    const validationList = await db
      .select({ score: validations.score })
      .from(validations)
      .where(eq(validations.userId, userId));

    const total = validationList.length;
    if (total === 0) {
      return { high: 0, medium: 0, low: 0 };
    }

    const high = validationList.filter(v => v.score >= 80).length;
    const medium = validationList.filter(v => v.score >= 50 && v.score < 80).length;
    const low = validationList.filter(v => v.score < 50).length;

    return {
      high: Math.round((high / total) * 100),
      medium: Math.round((medium / total) * 100),
      low: Math.round((low / total) * 100),
    };
  }

  // API usage tracking
  async incrementApiUsage(userId: string): Promise<void> {
    await db
      .update(users)
      .set({
        apiUsage: sql`COALESCE(${users.apiUsage}, 0) + 1`,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }
}

export const storage = new DatabaseStorage();
