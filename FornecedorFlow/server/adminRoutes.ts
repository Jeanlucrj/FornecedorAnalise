import { Router } from 'express';
import { adminService } from './services/adminService';
import { isAdminAuthenticated, logAdminActivity } from './adminAuth';

const router = Router();

// Get platform statistics
router.get('/api/admin/stats', isAdminAuthenticated, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateRange = startDate && endDate ? {
      startDate: new Date(startDate as string),
      endDate: new Date(endDate as string),
    } : undefined;

    const stats = await adminService.getPlatformStats(dateRange);

    await logAdminActivity(
      (req.session as any).adminId,
      'view_stats',
      'stats',
      undefined,
      { dateRange },
      req
    );

    res.json(stats);
  } catch (error: any) {
    console.error('Error getting platform stats:', error);
    res.status(500).json({ error: 'Erro ao obter estatísticas da plataforma' });
  }
});

// Get all users
router.get('/api/admin/users', isAdminAuthenticated, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await adminService.getAllUsers(limit, offset);

    await logAdminActivity(
      (req.session as any).adminId,
      'view_users',
      'users',
      undefined,
      { limit, offset },
      req
    );

    res.json(result);
  } catch (error: any) {
    console.error('Error getting users:', error);
    res.status(500).json({ error: 'Erro ao obter usuários' });
  }
});

// Get user details
router.get('/api/admin/users/:userId', isAdminAuthenticated, async (req, res) => {
  try {
    const { userId } = req.params;
    const userDetails = await adminService.getUserDetails(userId);

    await logAdminActivity(
      (req.session as any).adminId,
      'view_user_details',
      'user',
      userId,
      undefined,
      req
    );

    res.json(userDetails);
  } catch (error: any) {
    console.error('Error getting user details:', error);
    res.status(500).json({ error: error.message || 'Erro ao obter detalhes do usuário' });
  }
});

// Update user plan
router.patch('/api/admin/users/:userId/plan', isAdminAuthenticated, async (req, res) => {
  try {
    const { userId } = req.params;
    const { plan, apiLimit } = req.body;

    if (!plan || apiLimit === undefined) {
      return res.status(400).json({ error: 'Plano e limite de API são obrigatórios' });
    }

    const updatedUser = await adminService.updateUserPlan(userId, plan, apiLimit);

    await logAdminActivity(
      (req.session as any).adminId,
      'update_user_plan',
      'user',
      userId,
      { plan, apiLimit },
      req
    );

    res.json(updatedUser);
  } catch (error: any) {
    console.error('Error updating user plan:', error);
    res.status(500).json({ error: 'Erro ao atualizar plano do usuário' });
  }
});

// Reset user API usage
router.post('/api/admin/users/:userId/reset-usage', isAdminAuthenticated, async (req, res) => {
  try {
    const { userId } = req.params;
    const updatedUser = await adminService.resetUserApiUsage(userId);

    await logAdminActivity(
      (req.session as any).adminId,
      'reset_user_api_usage',
      'user',
      userId,
      undefined,
      req
    );

    res.json(updatedUser);
  } catch (error: any) {
    console.error('Error resetting user API usage:', error);
    res.status(500).json({ error: 'Erro ao resetar uso de API do usuário' });
  }
});

// Get activity logs
router.get('/api/admin/logs', isAdminAuthenticated, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    const filters: any = {};
    if (req.query.userId) filters.userId = req.query.userId as string;
    if (req.query.adminId) filters.adminId = req.query.adminId as string;
    if (req.query.action) filters.action = req.query.action as string;
    if (req.query.startDate) filters.startDate = new Date(req.query.startDate as string);
    if (req.query.endDate) filters.endDate = new Date(req.query.endDate as string);

    const result = await adminService.getActivityLogs(limit, offset, filters);

    res.json(result);
  } catch (error: any) {
    console.error('Error getting activity logs:', error);
    res.status(500).json({ error: 'Erro ao obter logs de atividade' });
  }
});

// Get most used services
router.get('/api/admin/analytics/services', isAdminAuthenticated, async (req, res) => {
  try {
    const services = await adminService.getMostUsedServices();

    await logAdminActivity(
      (req.session as any).adminId,
      'view_services_analytics',
      'analytics',
      undefined,
      undefined,
      req
    );

    res.json(services);
  } catch (error: any) {
    console.error('Error getting most used services:', error);
    res.status(500).json({ error: 'Erro ao obter serviços mais utilizados' });
  }
});

// Get usage analytics
router.get('/api/admin/analytics/usage', isAdminAuthenticated, async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const analytics = await adminService.getUsageAnalytics(days);

    await logAdminActivity(
      (req.session as any).adminId,
      'view_usage_analytics',
      'analytics',
      undefined,
      { days },
      req
    );

    res.json(analytics);
  } catch (error: any) {
    console.error('Error getting usage analytics:', error);
    res.status(500).json({ error: 'Erro ao obter análise de uso' });
  }
});

// Get revenue metrics
router.get('/api/admin/analytics/revenue', isAdminAuthenticated, async (req, res) => {
  try {
    const revenue = await adminService.getRevenueMetrics();

    await logAdminActivity(
      (req.session as any).adminId,
      'view_revenue_analytics',
      'analytics',
      undefined,
      undefined,
      req
    );

    res.json(revenue);
  } catch (error: any) {
    console.error('Error getting revenue metrics:', error);
    res.status(500).json({ error: 'Erro ao obter métricas de receita' });
  }
});

export { router as adminRoutes };
