import { db } from '../db';
import { users, validations, suppliers, activityLogs, alerts } from '../../shared/schema';
import { eq, desc, sql, and, gte, lte, count } from 'drizzle-orm';

interface DateRange {
  startDate?: Date;
  endDate?: Date;
}

export class AdminService {
  // Get platform statistics
  async getPlatformStats(dateRange?: DateRange) {
    try {
      const whereClause = dateRange?.startDate && dateRange?.endDate
        ? and(
            gte(users.createdAt, dateRange.startDate),
            lte(users.createdAt, dateRange.endDate)
          )
        : undefined;

      // Total users
      const totalUsersResult = await db.select({ count: count() }).from(users);
      const totalUsers = totalUsersResult[0]?.count || 0;

      // Users by plan
      const usersByPlan = await db
        .select({
          plan: users.plan,
          count: count(),
        })
        .from(users)
        .groupBy(users.plan);

      // Total validations
      const totalValidationsResult = await db.select({ count: count() }).from(validations);
      const totalValidations = totalValidationsResult[0]?.count || 0;

      // Validations by status
      const validationsByStatus = await db
        .select({
          status: validations.status,
          count: count(),
        })
        .from(validations)
        .groupBy(validations.status);

      // Total API usage
      const apiUsageResult = await db
        .select({
          total: sql<number>`SUM(${users.apiUsage})`,
        })
        .from(users);
      const totalApiUsage = apiUsageResult[0]?.total || 0;

      // Total suppliers
      const totalSuppliersResult = await db.select({ count: count() }).from(suppliers);
      const totalSuppliers = totalSuppliersResult[0]?.count || 0;

      // Active alerts
      const activeAlertsResult = await db
        .select({ count: count() })
        .from(alerts)
        .where(eq(alerts.isRead, false));
      const activeAlerts = activeAlertsResult[0]?.count || 0;

      // New users (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const newUsersResult = await db
        .select({ count: count() })
        .from(users)
        .where(gte(users.createdAt, thirtyDaysAgo));
      const newUsers = newUsersResult[0]?.count || 0;

      // Recent validations (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentValidationsResult = await db
        .select({ count: count() })
        .from(validations)
        .where(gte(validations.createdAt, sevenDaysAgo));
      const recentValidations = recentValidationsResult[0]?.count || 0;

      return {
        totalUsers,
        usersByPlan: usersByPlan.reduce((acc, item) => {
          acc[item.plan || 'unknown'] = item.count;
          return acc;
        }, {} as Record<string, number>),
        totalValidations,
        validationsByStatus: validationsByStatus.reduce((acc, item) => {
          acc[item.status || 'unknown'] = item.count;
          return acc;
        }, {} as Record<string, number>),
        totalApiUsage,
        totalSuppliers,
        activeAlerts,
        newUsers,
        recentValidations,
      };
    } catch (error) {
      console.error('Error getting platform stats:', error);
      throw error;
    }
  }

  // Get all users with details
  async getAllUsers(limit = 100, offset = 0) {
    try {
      const allUsers = await db.query.users.findMany({
        limit,
        offset,
        orderBy: [desc(users.createdAt)],
      });

      const totalResult = await db.select({ count: count() }).from(users);
      const total = totalResult[0]?.count || 0;

      return {
        users: allUsers.map(user => ({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          plan: user.plan,
          apiUsage: user.apiUsage,
          apiLimit: user.apiLimit,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt,
          isAdmin: user.isAdmin,
        })),
        total,
        limit,
        offset,
      };
    } catch (error) {
      console.error('Error getting all users:', error);
      throw error;
    }
  }

  // Get user details with activity
  async getUserDetails(userId: string) {
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      // Get user validations
      const userValidations = await db.query.validations.findMany({
        where: eq(validations.userId, userId),
        orderBy: [desc(validations.createdAt)],
        limit: 10,
      });

      // Get user activity logs
      const userLogs = await db.query.activityLogs.findMany({
        where: eq(activityLogs.userId, userId),
        orderBy: [desc(activityLogs.createdAt)],
        limit: 20,
      });

      // Get user alerts
      const userAlerts = await db.query.alerts.findMany({
        where: eq(alerts.userId, userId),
        orderBy: [desc(alerts.createdAt)],
        limit: 10,
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          plan: user.plan,
          apiUsage: user.apiUsage,
          apiLimit: user.apiLimit,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt,
          document: user.document,
          phone: user.phone,
          state: user.state,
          city: user.city,
        },
        validations: userValidations,
        activityLogs: userLogs,
        alerts: userAlerts,
      };
    } catch (error) {
      console.error('Error getting user details:', error);
      throw error;
    }
  }

  // Get activity logs
  async getActivityLogs(limit = 100, offset = 0, filters?: {
    userId?: string;
    adminId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    try {
      let whereConditions: any[] = [];

      if (filters?.userId) {
        whereConditions.push(eq(activityLogs.userId, filters.userId));
      }
      if (filters?.adminId) {
        whereConditions.push(eq(activityLogs.adminId, filters.adminId));
      }
      if (filters?.action) {
        whereConditions.push(eq(activityLogs.action, filters.action));
      }
      if (filters?.startDate) {
        whereConditions.push(gte(activityLogs.createdAt, filters.startDate));
      }
      if (filters?.endDate) {
        whereConditions.push(lte(activityLogs.createdAt, filters.endDate));
      }

      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      const logs = await db.query.activityLogs.findMany({
        where: whereClause,
        limit,
        offset,
        orderBy: [desc(activityLogs.createdAt)],
      });

      const totalResult = await db
        .select({ count: count() })
        .from(activityLogs)
        .where(whereClause);
      const total = totalResult[0]?.count || 0;

      return {
        logs,
        total,
        limit,
        offset,
      };
    } catch (error) {
      console.error('Error getting activity logs:', error);
      throw error;
    }
  }

  // Get most used services
  async getMostUsedServices() {
    try {
      const actionCounts = await db
        .select({
          action: activityLogs.action,
          count: count(),
        })
        .from(activityLogs)
        .groupBy(activityLogs.action)
        .orderBy(desc(count()))
        .limit(10);

      return actionCounts;
    } catch (error) {
      console.error('Error getting most used services:', error);
      throw error;
    }
  }

  // Get usage analytics
  async getUsageAnalytics(days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Daily validations
      const dailyValidations = await db
        .select({
          date: sql<string>`DATE(${validations.createdAt})`,
          count: count(),
        })
        .from(validations)
        .where(gte(validations.createdAt, startDate))
        .groupBy(sql`DATE(${validations.createdAt})`)
        .orderBy(sql`DATE(${validations.createdAt})`);

      // Daily new users
      const dailyNewUsers = await db
        .select({
          date: sql<string>`DATE(${users.createdAt})`,
          count: count(),
        })
        .from(users)
        .where(gte(users.createdAt, startDate))
        .groupBy(sql`DATE(${users.createdAt})`)
        .orderBy(sql`DATE(${users.createdAt})`);

      // Average session duration (from activity logs)
      const sessionMetrics = await db
        .select({
          avgLoginFrequency: sql<number>`COUNT(DISTINCT DATE(${activityLogs.createdAt}))`,
        })
        .from(activityLogs)
        .where(
          and(
            eq(activityLogs.action, 'login'),
            gte(activityLogs.createdAt, startDate)
          )
        );

      return {
        dailyValidations,
        dailyNewUsers,
        sessionMetrics: sessionMetrics[0] || {},
      };
    } catch (error) {
      console.error('Error getting usage analytics:', error);
      throw error;
    }
  }

  // Update user plan
  async updateUserPlan(userId: string, plan: string, apiLimit: number) {
    try {
      const [updatedUser] = await db
        .update(users)
        .set({ plan, apiLimit })
        .where(eq(users.id, userId))
        .returning();

      return updatedUser;
    } catch (error) {
      console.error('Error updating user plan:', error);
      throw error;
    }
  }

  // Reset user API usage
  async resetUserApiUsage(userId: string) {
    try {
      const [updatedUser] = await db
        .update(users)
        .set({ apiUsage: 0 })
        .where(eq(users.id, userId))
        .returning();

      return updatedUser;
    } catch (error) {
      console.error('Error resetting user API usage:', error);
      throw error;
    }
  }

  // Get revenue metrics (based on plans)
  async getRevenueMetrics() {
    try {
      const planPrices: Record<string, number> = {
        free: 0,
        pro: 297,
        enterprise: 997,
      };

      const planCounts = await db
        .select({
          plan: users.plan,
          count: count(),
        })
        .from(users)
        .groupBy(users.plan);

      const revenueData = planCounts.map(item => ({
        plan: item.plan || 'unknown',
        users: item.count,
        revenue: (planPrices[item.plan || 'free'] || 0) * item.count,
      }));

      const totalRevenue = revenueData.reduce((sum, item) => sum + item.revenue, 0);
      const mrr = totalRevenue; // Monthly Recurring Revenue

      return {
        revenueByPlan: revenueData,
        totalRevenue,
        mrr,
      };
    } catch (error) {
      console.error('Error getting revenue metrics:', error);
      throw error;
    }
  }
}

export const adminService = new AdminService();
