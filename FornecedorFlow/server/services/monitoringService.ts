import { storage } from "../storage";
import { cnpjService } from "./cnpjService";
import { scoringService } from "./scoringService";
import { NotificationService } from "./notificationService";

export class MonitoringService {
  private static isRunning = false;
  private static intervalId: NodeJS.Timeout | null = null;

  /**
   * Inicia o serviço de monitoramento automático
   * Executa verificações baseadas na frequência configurada pelos usuários
   */
  static start() {
    if (this.isRunning) {
      console.log('Monitoring service is already running');
      return;
    }

    console.log('Starting automatic monitoring service...');
    this.isRunning = true;

    // Executa a primeira verificação imediatamente
    this.runMonitoringCycle().catch(console.error);

    // Agenda verificações a cada 6 horas para verificar se algum usuário precisa de monitoramento
    // Isso permite diferentes frequências (diário, semanal, mensal) sem múltiplos timers
    this.intervalId = setInterval(() => {
      this.runMonitoringCycle().catch(console.error);
    }, 6 * 60 * 60 * 1000); // A cada 6 horas

    console.log('Monitoring service started - checking every 6 hours for due monitoring');
  }

  /**
   * Para o serviço de monitoramento
   */
  static stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('Monitoring service stopped');
  }

  /**
   * Executa um ciclo completo de monitoramento
   */
  private static async runMonitoringCycle() {
    console.log('🔍 Starting monitoring cycle...', new Date().toISOString());

    try {
      // 1. Buscar todos os usuários com autoRefreshEnabled = true
      const usersWithAutoRefresh = await this.getUsersWithAutoRefresh();
      console.log(`Found ${usersWithAutoRefresh.length} users with auto-refresh enabled`);

      if (usersWithAutoRefresh.length === 0) {
        console.log('No users with auto-refresh enabled, skipping monitoring cycle');
        return;
      }

      // 2. Para cada usuário, verificar fornecedores que precisam de atualização
      for (const user of usersWithAutoRefresh) {
        await this.monitorUserSuppliers(user);
      }

      console.log('✅ Monitoring cycle completed successfully');
    } catch (error) {
      console.error('❌ Error during monitoring cycle:', error);
    }
  }

  /**
   * Busca usuários que precisam de monitoramento no momento atual
   * Apenas usuários com plano pro ou superior podem usar monitoramento automático
   */
  private static async getUsersWithAutoRefresh() {
    try {
      const { db } = await import("../db");
      const { users } = await import("@shared/schema");
      const { eq, and, or } = await import("drizzle-orm");
      
      // Buscar usuários com auto-refresh ativado E plano pro ou superior
      const allUsers = await db.select().from(users).where(
        and(
          eq(users.autoRefreshEnabled, true),
          or(
            eq(users.plan, 'pro'),
            eq(users.plan, 'enterprise')
          )
        )
      );
      
      // Filtrar usuários que precisam de monitoramento baseado na frequência
      const usersNeedingMonitoring = [];
      const now = new Date();
      
      for (const user of allUsers) {
        const shouldMonitor = await this.shouldMonitorUser(user, now);
        if (shouldMonitor) {
          usersNeedingMonitoring.push(user);
        }
      }
      
      return usersNeedingMonitoring;
    } catch (error) {
      console.error('Error fetching users with auto-refresh:', error);
      return [];
    }
  }

  /**
   * Verifica se um usuário precisa de monitoramento baseado na frequência configurada
   */
  private static async shouldMonitorUser(user: any, currentTime: Date): Promise<boolean> {
    try {
      // Buscar a última verificação feita para este usuário
      const { db } = await import("../db");
      const { validations } = await import("@shared/schema");
      const { eq, desc } = await import("drizzle-orm");
      
      const lastValidation = await db
        .select()
        .from(validations)
        .where(eq(validations.userId, user.id))
        .orderBy(desc(validations.createdAt))
        .limit(1);

      // Se não há validações, precisa monitorar
      if (lastValidation.length === 0) {
        return true;
      }

      const lastCheck = new Date(lastValidation[0].createdAt || new Date());
      const timeDiff = currentTime.getTime() - lastCheck.getTime();
      
      // Definir intervalos baseados na frequência
      const frequency = user.monitoringFrequency || 'daily';
      let requiredInterval = 24 * 60 * 60 * 1000; // 24 horas (daily)
      
      switch (frequency) {
        case 'weekly':
          requiredInterval = 7 * 24 * 60 * 60 * 1000; // 7 dias
          break;
        case 'monthly':
          requiredInterval = 30 * 24 * 60 * 60 * 1000; // 30 dias
          break;
        case 'daily':
        default:
          requiredInterval = 24 * 60 * 60 * 1000; // 24 horas
          break;
      }

      return timeDiff >= requiredInterval;
    } catch (error) {
      console.error('Error checking if user needs monitoring:', error);
      return false;
    }
  }

  /**
   * Monitora fornecedores de um usuário específico
   */
  private static async monitorUserSuppliers(user: any) {
    try {
      console.log(`🔍 Monitoring suppliers for user: ${user.email}`);

      // Buscar validações recentes do usuário (últimos 30 dias)
      const recentValidations = await storage.getValidationsWithSuppliers(user.id, {
        limit: 100,
        dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      });

      if (recentValidations.length === 0) {
        console.log(`No recent validations found for user ${user.email}`);
        return;
      }

      // Verificar cada fornecedor que ainda está sendo monitorado
      for (const validationData of recentValidations) {
        await this.checkSupplierChanges(user, validationData);
      }

    } catch (error) {
      console.error(`Error monitoring suppliers for user ${user.email}:`, error);
    }
  }

  /**
   * Verifica mudanças em um fornecedor específico
   */
  private static async checkSupplierChanges(user: any, validationData: any) {
    try {
      const supplier = validationData.supplier;
      const lastValidation = validationData.validation;

      if (!supplier || !lastValidation) {
        return;
      }

      console.log(`📊 Checking supplier: ${supplier.companyName} (${supplier.cnpj})`);

      // Verificar se o usuário tem créditos suficientes para monitoramento automático
      if (user.apiUsage >= user.apiLimit) {
        console.log(`⚠️ User ${user.email} has reached API limit, skipping monitoring`);
        return;
      }

      // Re-validar o fornecedor com dados atuais
      const freshData = await cnpjService.getSupplierData(supplier.cnpj);
      const analysis = await cnpjService.getComprehensiveAnalysis(supplier.cnpj);
      const newScore = scoringService.calculateRiskScore(supplier, analysis);

      // Consumir crédito para validação automática
      await storage.incrementApiUsage(user.id);

      const scoreDifference = Math.abs(newScore - (lastValidation.score || 0));
      const significantChange = scoreDifference >= 10; // Mudança de 10 pontos ou mais

      // Verificar mudanças no status cadastral
      const statusChanged = freshData.legalStatus !== supplier.legalStatus;

      if (significantChange || statusChanged) {
        await this.sendChangeAlert(user, supplier, {
          oldScore: lastValidation.score || 0,
          newScore,
          statusChanged,
          oldStatus: supplier.legalStatus,
          newStatus: freshData.legalStatus
        });

        // Opcional: Criar uma nova validação automática
        await this.createAutomaticValidation(user.id, supplier, freshData, newScore);
      }

    } catch (error) {
      console.error(`Error checking supplier changes:`, error);
    }
  }

  /**
   * Envia alerta sobre mudanças detectadas
   */
  private static async sendChangeAlert(user: any, supplier: any, changes: any) {
    try {
      let alertTitle = '';
      let alertDescription = '';
      let severity = 'medium';

      if (changes.statusChanged) {
        severity = 'high';
        alertTitle = `Mudança de Status: ${supplier.companyName}`;
        alertDescription = `O status cadastral do fornecedor ${supplier.companyName} mudou de "${changes.oldStatus}" para "${changes.newStatus}".`;
      } else {
        const scoreImproved = changes.newScore > changes.oldScore;
        severity = changes.newScore < 50 ? 'high' : 'medium';
        
        alertTitle = `${scoreImproved ? 'Melhoria' : 'Piora'} no Score: ${supplier.companyName}`;
        alertDescription = `O score do fornecedor ${supplier.companyName} ${scoreImproved ? 'melhorou' : 'piorou'} de ${changes.oldScore}% para ${changes.newScore}%.`;
      }

      // Criar alerta no banco
      await storage.createAlert({
        userId: user.id,
        supplierId: supplier.id,
        type: changes.statusChanged ? 'status_change' : 'score_drop',
        severity,
        title: alertTitle,
        description: alertDescription,
      });

      // Enviar notificações se habilitadas
      if (user.emailNotifications || user.whatsappNotifications) {
        await NotificationService.sendAlert(user, {
          title: alertTitle,
          description: alertDescription + ` CNPJ: ${supplier.cnpj}`,
          severity,
          supplierName: supplier.companyName,
        });
      }

      console.log(`📧 Alert sent to ${user.email}: ${alertTitle}`);
    } catch (error) {
      console.error('Error sending change alert:', error);
    }
  }

  /**
   * Cria uma validação automática com os novos dados
   */
  private static async createAutomaticValidation(userId: string, supplier: any, freshData: any, newScore: number) {
    try {
      // Atualizar dados do fornecedor
      await storage.updateSupplier(supplier.id, {
        legalStatus: freshData.legalStatus,
        legalSituation: freshData.legalSituation,
        companySize: freshData.companySize,
        // outros campos relevantes...
      });

      // Criar nova validação
      const status = newScore >= 80 ? 'approved' : newScore >= 50 ? 'attention' : 'rejected';
      
      await storage.createValidation({
        userId,
        supplierId: supplier.id,
        score: newScore,
        status,
        category: 'general',
        analysisType: 'automatic',
        cadastralStatus: freshData.cadastralStatus,
        financialHealth: freshData.financialHealth,
        certificates: freshData.certificates,
        legalIssues: freshData.legalIssues,
        riskAnalysis: freshData.riskAnalysis,
        dataSource: freshData.dataSource,
        apiCost: freshData.apiCost?.toString() || '0',
        processingTime: freshData.processingTime || 0,
        nextCheck: new Date(Date.now() + 24 * 60 * 60 * 1000), // Próxima verificação em 24h
      });

      console.log(`✅ Created automatic validation for ${supplier.companyName} with score ${newScore}`);
    } catch (error) {
      console.error('Error creating automatic validation:', error);
    }
  }

  /**
   * Força uma verificação manual (para testes)
   */
  static async runManualCheck() {
    console.log('🚀 Running manual monitoring check...');
    await this.runMonitoringCycle();
  }

  /**
   * Verifica o status do serviço
   */
  static getStatus() {
    return {
      isRunning: this.isRunning,
      nextCheck: this.intervalId ? 'Every 24 hours' : 'Stopped'
    };
  }
}