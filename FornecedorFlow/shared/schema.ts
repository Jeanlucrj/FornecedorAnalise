import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  decimal,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  plan: varchar("plan").default("free"), // free, pro, enterprise
  apiUsage: integer("api_usage").default(0),
  apiLimit: integer("api_limit").default(100),
  // Notification settings
  notificationsEnabled: boolean("notifications_enabled").default(true),
  autoRefreshEnabled: boolean("auto_refresh_enabled").default(false),
  monitoringFrequency: varchar("monitoring_frequency").default("daily"), // daily, weekly, monthly
  emailNotifications: boolean("email_notifications").default(false),
  whatsappNotifications: boolean("whatsapp_notifications").default(false),
  notificationEmail: varchar("notification_email"),
  whatsappNumber: varchar("whatsapp_number"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Suppliers table
export const suppliers = pgTable("suppliers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cnpj: varchar("cnpj", { length: 18 }).notNull().unique(),
  companyName: text("company_name").notNull(),
  tradeName: text("trade_name"),
  legalStatus: varchar("legal_status"), // ATIVA, SUSPENSA, BAIXADA
  legalSituation: varchar("legal_situation"), // REGULAR, IRREGULAR
  companySize: varchar("company_size"), // MICRO, PEQUENO, MEDIO, GRANDE
  cnaeCode: varchar("cnae_code"),
  cnaeDescription: text("cnae_description"),
  openingDate: timestamp("opening_date"),
  shareCapital: decimal("share_capital", { precision: 15, scale: 2 }),
  address: text("address"),
  city: varchar("city"),
  state: varchar("state", { length: 2 }),
  zipCode: varchar("zip_code", { length: 20 }),
  phone: varchar("phone"),
  email: varchar("email"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Partners/Shareholders table
export const partners = pgTable("partners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  supplierId: varchar("supplier_id").references(() => suppliers.id),
  name: text("name").notNull(),
  cpfCnpj: varchar("cpf_cnpj"),
  qualification: varchar("qualification"), // Administrator, Partner, etc.
  sharePercentage: decimal("share_percentage", { precision: 5, scale: 2 }),
  entryDate: timestamp("entry_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Validations table
export const validations = pgTable("validations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  supplierId: varchar("supplier_id").references(() => suppliers.id),
  score: integer("score").notNull(), // 0-100
  status: varchar("status").notNull(), // approved, attention, critical
  category: varchar("category"), // technology, services, industry, etc.
  analysisType: varchar("analysis_type").default("complete"), // quick, complete
  
  // Analysis results
  cadastralStatus: jsonb("cadastral_status"), // Receita Federal data
  financialHealth: jsonb("financial_health"), // Protests, bankruptcies, etc.
  certificates: jsonb("certificates"), // Federal, state, municipal, labor
  legalIssues: jsonb("legal_issues"), // Court processes, sanctions
  riskAnalysis: jsonb("risk_analysis"), // Compliance and risk assessment data
  
  // Metadata
  dataSource: varchar("data_source"), // API provider used
  apiCost: decimal("api_cost", { precision: 10, scale: 4 }),
  processingTime: integer("processing_time"), // milliseconds
  
  // Monitoring
  monitoringEnabled: boolean("monitoring_enabled").default(false),
  nextCheck: timestamp("next_check"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Alerts table for monitoring
export const alerts = pgTable("alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  supplierId: varchar("supplier_id").references(() => suppliers.id),
  validationId: varchar("validation_id").references(() => validations.id),
  type: varchar("type").notNull(), // status_change, score_drop, certificate_expiry
  severity: varchar("severity").notNull(), // low, medium, high, critical
  title: text("title").notNull(),
  description: text("description"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Export schemas for validation
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSupplierSchema = createInsertSchema(suppliers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertValidationSchema = createInsertSchema(validations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPartnerSchema = createInsertSchema(partners).omit({
  id: true,
  createdAt: true,
});

export const insertAlertSchema = createInsertSchema(alerts).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Supplier = typeof suppliers.$inferSelect;
export type InsertValidation = z.infer<typeof insertValidationSchema>;
export type Validation = typeof validations.$inferSelect;
export type InsertPartner = z.infer<typeof insertPartnerSchema>;
export type Partner = typeof partners.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alerts.$inferSelect;
