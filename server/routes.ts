import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { setupAuth, isAuthenticated } from "./auth.js";
import { cnpjService } from "./services/cnpjService.js";
import { scoringService } from "./services/scoringService.js";
import { reportService } from "./services/reportService.js";
import { marketDataService } from "./services/marketDataService.js";
import { NotificationService } from "./services/notificationService.js";
import { db } from "./db.js";
import { insertValidationSchema, insertSupplierSchema, activityLogs } from "../shared/schema.js";
import { PLANS } from "../shared/plans.js";
import { z } from "zod";
import { adminAuthRouter } from "./adminAuth.js";
import { adminRoutes } from "./adminRoutes.js";
import { pagarmeService } from "./services/pagarmeService.js";
import { eq } from "drizzle-orm";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Helper function to check authentication
  const requireAuth = (req: any, res: any, next: any) => {
    if (req.isAuthenticated && req.isAuthenticated()) {
      return next();
    }
    return res.status(401).json({ message: "Unauthorized" });
  };

  // Debug market data route
  app.get("/api/debug-market", async (req: any, res) => {
    try {
      const cnpj = req.query.cnpj as string || "16614075000100";
      const name = req.query.name as string || "DIRECIONAL";
      const nature = req.query.nature as string || "Sociedade Anônima Aberta";

      console.log(`🔍 [DEBUG ENDPOINT] Testing market data for ${name} (${cnpj})`);
      marketDataService.clearRecentLogs();
      const data = await marketDataService.getMarketData(name, cnpj, nature);

      res.json({
        input: { name, cnpj, nature },
        result: data,
        logs: marketDataService.getRecentLogs(),
        env: {
          hasBrapiToken: !!process.env.BRAPI_API_KEY,
          hasHgBrasilKey: !!process.env.HG_BRASIL_API_KEY
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // CNPJ validation route
  app.post("/api/validate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { cnpj, analysisType = 'complete' } = req.body;

      if (!cnpj) {
        return res.status(400).json({ message: "CNPJ is required" });
      }

      // Check usage limit
      const user = await storage.getUser(userId);
      if (user && (user.apiUsage || 0) >= (user.apiLimit || 0)) {
        return res.status(403).json({
          message: "Limite de consultas excedido",
          code: "LIMIT_EXCEEDED",
          current: user.apiUsage,
          limit: user.apiLimit
        });
      }

      console.log(`Validating CNPJ: ${cnpj} for user: ${userId} (mode: ${analysisType})`);

      // Get supplier data (always needed)
      const supplierData = await cnpjService.getSupplierData(cnpj);

      // For quick analysis, skip heavy data sources (financial, certificates, legal, compliance)
      const analysis = analysisType === 'quick'
        ? await cnpjService.getQuickAnalysis(cnpj)
        : await cnpjService.getComprehensiveAnalysis(cnpj);

      // Calculate risk score
      const score = scoringService.calculateRiskScore(supplierData as any, analysis);

      // Determine category based on CNAE
      const category = categorizeByCNAE(supplierData.cnaeCode);

      // Fetch market data logic moved below supplier lookup

      // Create or update supplier
      const supplierSchema = insertSupplierSchema.parse({
        cnpj: cnpj.replace(/\D/g, ''),
        companyName: supplierData.companyName,
        tradeName: supplierData.tradeName,
        legalStatus: supplierData.legalStatus,
        legalSituation: supplierData.legalSituation,
        companySize: supplierData.companySize,
        cnaeCode: supplierData.cnaeCode,
        cnaeDescription: supplierData.cnaeDescription,
        openingDate: supplierData.openingDate,
        shareCapital: supplierData.shareCapital?.toString() || '0',
        address: supplierData.address,
        city: supplierData.city,
        state: supplierData.state,
        zipCode: supplierData.zipCode,
        phone: supplierData.phone,
        email: supplierData.email,
      });

      let supplier = await storage.getSupplierByCnpj(cnpj.replace(/\D/g, ''));

      // Fetch market data for listed companies
      console.log(`🔍 [DEBUG] Calling marketDataService for ${supplierData.companyName}`);
      console.log(`🔍 [DEBUG] Legal Nature: ${supplierData.naturezaJuridica}`);
      const marketData = await marketDataService.getMarketData(
        supplierData.companyName,
        cnpj,
        supplierData.naturezaJuridica,
        supplier?.ticker || undefined
      );
      console.log(`🔍 [DEBUG] marketData result: ${marketData ? JSON.stringify(marketData) : 'NULL'}`);

      if (supplier) {
        supplier = await storage.updateSupplier(supplier.id, {
          ...supplierSchema,
          legalNature: supplierData.naturezaJuridica,
          ticker: marketData?.ticker || supplier.ticker,
        });
      } else {
        supplier = await storage.createSupplier({
          ...supplierSchema,
          legalNature: supplierData.naturezaJuridica,
          ticker: marketData?.ticker || undefined,
        });
      }

      // Store partners if available
      if (supplierData.partners && supplierData.partners.length > 0) {
        for (const partnerData of supplierData.partners) {
          await storage.createPartner({
            supplierId: supplier.id,
            name: partnerData.name,
            cpfCnpj: partnerData.cpfCnpj,
            qualification: partnerData.qualification,
            sharePercentage: partnerData.sharePercentage?.toString(),
            entryDate: partnerData.entryDate,
          });
        }
      }

      // Determine validation status
      let status = 'rejected';
      if (score >= 80) status = 'approved';
      else if (score >= 50) status = 'attention';

      // Create validation record
      const validation = await storage.createValidation({
        userId,
        supplierId: supplier.id,
        score,
        status,
        category: category || 'general',
        analysisType: analysisType || 'complete',
        cadastralStatus: analysis.cadastralStatus,
        financialHealth: analysis.financialHealth,
        certificates: analysis.certificates,
        legalIssues: analysis.legalIssues,
        riskAnalysis: analysis.riskAnalysis,
        financialMarketData: marketData,
        dataSource: analysis.dataSource,
        apiCost: analysis.apiCost.toString(),
        processingTime: analysis.processingTime,
      });

      // Increment API usage
      await storage.incrementApiUsage(userId);

      // Log success in activity logs
      await db.insert(activityLogs).values({
        userId,
        action: 'validation_success',
        resource: 'validation',
        resourceId: validation.id,
        details: { cnpj, score, status }
      });

      // Create alert if score is low and send notifications
      if (score < 50) {
        try {
          // Create alert in database
          const alert = await storage.createAlert({
            userId,
            supplierId: supplier.id,
            validationId: validation.id,
            type: 'score_drop',
            severity: score < 30 ? 'critical' : 'high',
            title: `Score Baixo: ${supplier.companyName}`,
            description: `O fornecedor ${supplier.companyName} recebeu um score de ${score}%, indicando alto risco. Recomenda-se revisão detalhada.`,
          });

          // Get user data for notifications
          const user = await storage.getUser(userId);
          if (user && (user.emailNotifications || user.whatsappNotifications)) {
            // Send notifications
            await NotificationService.sendAlert(user, {
              title: `Score Baixo: ${supplier.companyName}`,
              description: `O fornecedor ${supplier.companyName} (CNPJ: ${supplier.cnpj}) recebeu um score de ${score}%, indicando alto risco. Acesse o sistema para revisar os detalhes.`,
              severity: score < 30 ? 'critical' : 'high',
              supplierName: supplier.companyName,
            });
          }
        } catch (alertError) {
          console.error('Failed to create alert or send notifications:', alertError);
          // Don't fail the validation if alert creation fails
        }
      }

      // Get partners for response
      const partners = await storage.getPartnersBySupplier(supplier.id);

      res.json({
        validation,
        supplier,
        partners,
        analysis: {
          score,
          status,
          ...analysis,
        },
      });

    } catch (error) {
      console.error("Validation error:", error);

      // Log failure in activity logs
      try {
        const userId = req.session.userId;
        if (userId) {
          await db.insert(activityLogs).values({
            userId,
            action: 'validation_error',
            resource: 'validation',
            details: {
              error: error instanceof Error ? error.message : String(error),
              cnpj: req.body?.cnpj,
              analysisType: req.body?.analysisType
            }
          });
        }
      } catch (logError) {
        console.error("Failed to log validation error:", logError);
      }

      res.status(500).json({
        message: error instanceof Error ? error.message : "Validation failed"
      });
    }
  });

  // Get validation history
  app.get("/api/validations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const {
        page = 1,
        limit = 10,
        search,
        status,
        dateFrom,
        dateTo
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);

      const validations = await storage.getValidationsWithSuppliers(userId, {
        search,
        status,
        dateFrom,
        dateTo,
        limit: parseInt(limit),
        offset,
      });

      res.json(validations);
    } catch (error) {
      console.error("Error fetching validations:", error);
      res.status(500).json({ message: "Failed to fetch validations" });
    }
  });

  // Export all validations as a single consolidated PDF (MUST be before /:id route)
  app.get("/api/validations/consolidated-export", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { analysisType } = req.query;

      const validations = await storage.getValidationsWithSuppliers(userId, { limit: 200 });

      const filtered = !analysisType || analysisType === 'all'
        ? validations
        : (validations as any[]).filter((v: any) => v.validation?.analysisType === analysisType);

      if (!filtered || filtered.length === 0) {
        return res.status(404).json({ message: "Nenhuma validação encontrada" });
      }

      const records = await Promise.all(
        (filtered as any[]).map(async (item: any) => {
          const partners = item.validation?.supplierId
            ? await storage.getPartnersBySupplier(item.validation.supplierId)
            : [];
          return { validation: item.validation, supplier: item.supplier || null, partners };
        })
      );

      const { reportService } = await import("./services/reportService.js");
      const pdfBuffer = await reportService.generateConsolidatedPDF(records);

      const date = new Date().toISOString().split('T')[0];
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', pdfBuffer.length);
      res.setHeader('Content-Disposition', `attachment; filename="relatorio-consolidado-fornecedores-${date}.pdf"`);
      res.send(pdfBuffer);

    } catch (error) {
      console.error("Error exporting consolidated PDF:", error);
      res.status(500).json({ message: "Failed to export consolidated PDF" });
    }
  });

  // Get specific validation
  app.get("/api/validations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { id } = req.params;

      const validation = await storage.getValidation(id);
      if (!validation || validation.userId !== userId) {
        return res.status(404).json({ message: "Validation not found" });
      }

      const supplier = await storage.getSupplier(validation.supplierId!);
      const partners = await storage.getPartnersBySupplier(validation.supplierId!);

      res.json({
        validation,
        supplier,
        partners,
      });
    } catch (error) {
      console.error("Error fetching validation:", error);
      res.status(500).json({ message: "Failed to fetch validation" });
    }
  });

  // Export validation as PDF
  app.get("/api/validations/:id/export", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { id } = req.params;

      // Get validation data
      const validation = await storage.getValidation(id);
      if (!validation || validation.userId !== userId) {
        return res.status(404).json({ message: "Validation not found" });
      }

      const supplier = await storage.getSupplier(validation.supplierId!) || null;
      const partners = await storage.getPartnersBySupplier(validation.supplierId!);

      // Generate PDF
      const { reportService } = await import("./services/reportService.js");
      const pdfBuffer = await reportService.generatePDF({
        validation,
        supplier,
        partners
      });

      // Set headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', pdfBuffer.length);
      res.setHeader('Content-Disposition', `attachment; filename="relatorio-${supplier?.companyName || 'fornecedor'}-${new Date().toISOString().split('T')[0]}.pdf"`);

      // Send PDF
      res.send(pdfBuffer);

    } catch (error) {
      console.error("Error exporting validation PDF:", error);
      res.status(500).json({ message: "Failed to export validation PDF" });
    }
  });

  // Dashboard statistics
  app.get("/api/dashboard/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const stats = await storage.getUserStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Score distribution
  app.get("/api/dashboard/score-distribution", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const distribution = await storage.getScoreDistribution(userId);
      res.json(distribution);
    } catch (error) {
      console.error("Error fetching score distribution:", error);
      res.status(500).json({ message: "Failed to fetch score distribution" });
    }
  });

  // Get recent validations for dashboard
  app.get("/api/dashboard/recent", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const validations = await storage.getValidationsWithSuppliers(userId, { limit: 5 });
      res.json(validations);
    } catch (error) {
      console.error("Error fetching recent validations:", error);
      res.status(500).json({ message: "Failed to fetch recent validations" });
    }
  });

  // Get alerts
  app.get("/api/alerts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { unread } = req.query;
      const alerts = await storage.getAlertsByUser(userId, unread === 'true');
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching alerts:", error);
      res.status(500).json({ message: "Failed to fetch alerts" });
    }
  });

  // Mark alert as read
  app.patch("/api/alerts/:id/read", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const alert = await storage.markAlertAsRead(id);
      res.json(alert);
    } catch (error) {
      console.error("Error marking alert as read:", error);
      res.status(500).json({ message: "Failed to mark alert as read" });
    }
  });

  // Update user settings
  app.patch("/api/users/:id", isAuthenticated, async (req: any, res) => {
    const { id } = req.params;
    const userId = req.session.userId;

    // Ensure user can only update their own settings
    if (id !== userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    try {
      const updates = req.body;
      const user = await storage.updateUser(id, updates);
      res.json(user);
    } catch (error) {
      console.error("Error updating user settings:", error);
      res.status(500).json({ error: "Failed to update user settings" });
    }
  });

  // Upgrade plan
  app.post("/api/upgrade", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { plan } = req.body;

      if (!plan || !PLANS[plan as keyof typeof PLANS]) {
        return res.status(400).json({ message: "Plano inválido" });
      }

      const planInfo = PLANS[plan as keyof typeof PLANS];

      const updatedUser = await storage.updateUser(userId, {
        plan: plan as any,
        apiLimit: planInfo.limit,
        apiUsage: 0,
        planUpdatedAt: new Date(),
        updatedAt: new Date()
      });

      console.log(`User ${userId} upgraded to ${plan}. New limit: ${planInfo.limit}`);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error upgrading plan:", error);
      res.status(500).json({ message: "Erro ao realizar upgrade de plano" });
    }
  });

  // Pagar.me Checkout
  app.post("/api/checkout", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { plan, paymentMethod, cardToken, cardData, customer } = req.body;

      console.log(`[CHECKOUT ROUTE] User: ${userId}, Plan: ${plan}, Method: ${paymentMethod}`);
      console.log(`[CHECKOUT ROUTE] Body:`, JSON.stringify(req.body, null, 2));

      if (!plan || !PLANS[plan as keyof typeof PLANS]) {
        return res.status(400).json({ message: "Plano inválido" });
      }

      const planInfo = PLANS[plan as keyof typeof PLANS];
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      const order = await pagarmeService.createOrder({
        amount: planInfo.price * 100, // Pagar.me uses cents
        paymentMethod,
        customer: {
          name: customer?.name || user.firstName || 'Usuário',
          email: user.email || 'contato@fornecedorflow.com.br',
          cpf: customer?.cpf || user.document?.replace(/\D/g, ''),
          phone: user.phone || (customer as any)?.phone,
          address: {
            city: user.city || (customer as any)?.address?.city,
            state: user.state || (customer as any)?.address?.state,
          }
        },
        cardToken,
        cardData,
        metadata: {
          userId: userId,
          plan: plan,
          planName: planInfo.name,
        }
      });

      // Check if order has failed status and return error details
      const charge = order.charges?.[0] as any;
      const lastTx = charge?.lastTransaction || charge?.last_transaction;

      if (order.status === 'failed' && lastTx) {
        const gatewayError = lastTx.gatewayResponse?.errors?.[0]?.message ||
          (lastTx as any).gateway_code ||
          'Erro ao processar transação';

        return res.status(400).json({
          message: "O pagamento foi recusado",
          error: gatewayError,
          order: order
        });
      }

      // Update user plan ONLY if payment was successful (paid)
      // For PIX, wait for webhook confirmation before upgrading
      if (order.status === 'paid') {
        console.log(`[CHECKOUT] Payment successful! Updating user ${userId} to plan ${plan}`);

        await storage.updateUser(userId, {
          plan: plan as any,
          apiLimit: planInfo.limit,
          apiUsage: 0,
          planUpdatedAt: new Date()
        });

        console.log(`[CHECKOUT] User ${userId} plan updated to ${plan}`);
      } else if (paymentMethod === 'pix' && order.status === 'pending') {
        console.log(`[CHECKOUT] PIX payment pending. Waiting for webhook confirmation for order ${order.id}`);
        // Store the pending order for later webhook processing
        // You could create a pending_payments table to track these
      }

      res.json(order);
    } catch (error: any) {
      console.error("Checkout error:", error);
      const errorData = error?.response?.data || { message: error.message };
      res.status(500).json({
        message: "Erro interno ao processar pagamento",
        error: errorData,
      });
    }
  });

  // Get Order Status
  app.get("/api/checkout/order/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const order = await pagarmeService.getOrder(id);
      res.json(order);
    } catch (error: any) {
      res.status(500).json({ message: "Erro ao buscar status do pedido" });
    }
  });

  // Pagar.me Webhook endpoint for payment confirmations
  app.post("/api/webhooks/pagarme", async (req: any, res) => {
    try {
      const event = req.body;
      console.log('[WEBHOOK] Received Pagar.me webhook:', JSON.stringify(event, null, 2));

      // Validate webhook authenticity (you should verify signature in production)
      if (!event || !event.type) {
        return res.status(400).json({ message: "Invalid webhook payload" });
      }

      // Handle order paid event
      if (event.type === 'order.paid' || event.type === 'charge.paid') {
        const order = event.data;
        const orderId = order.id;
        const orderCode = order.code;
        const metadata = order.metadata || {};

        console.log(`[WEBHOOK] Payment confirmed for order ${orderId} (${orderCode})`);
        console.log(`[WEBHOOK] Metadata:`, JSON.stringify(metadata, null, 2));

        // Extract userId and plan from metadata
        const userId = metadata.userId;
        const plan = metadata.plan;

        if (userId && plan) {
          try {
            const planInfo = PLANS[plan as keyof typeof PLANS];
            if (planInfo) {
              await storage.updateUser(userId, {
                plan: plan as any,
                apiLimit: planInfo.limit,
                apiUsage: 0,
                planUpdatedAt: new Date()
              });

              console.log(`[WEBHOOK] User ${userId} plan upgraded to ${plan} via PIX payment`);

              // Log success in activity logs
              await db.insert(activityLogs).values({
                userId,
                action: 'plan_upgrade_pix',
                resource: 'payment',
                resourceId: orderId,
                details: { plan, orderId, orderCode }
              });
            }
          } catch (error) {
            console.error(`[WEBHOOK] Error upgrading user plan:`, error);
            return res.status(500).json({ message: "Failed to upgrade plan" });
          }
        } else {
          console.log(`[WEBHOOK] Missing userId or plan in metadata`);
        }

        res.status(200).json({ message: "Webhook processed" });
      } else {
        console.log(`[WEBHOOK] Ignoring event type: ${event.type}`);
        res.status(200).json({ message: "Event ignored" });
      }
    } catch (error: any) {
      console.error("[WEBHOOK] Error processing webhook:", error);
      res.status(500).json({ message: "Webhook processing failed" });
    }
  });

  // Monitoring status endpoint
  app.get("/api/monitoring/status", isAuthenticated, async (req: any, res) => {
    try {
      const { MonitoringService } = await import("./services/monitoringService.js");
      const status = MonitoringService.getStatus();
      res.json(status);
    } catch (error) {
      console.error("Error getting monitoring status:", error);
      res.status(500).json({ message: "Failed to get monitoring status" });
    }
  });

  // Manual monitoring check endpoint (for testing)
  app.post("/api/monitoring/check", isAuthenticated, async (req: any, res) => {
    try {
      const { MonitoringService } = await import("./services/monitoringService.js");
      await MonitoringService.runManualCheck();
      res.json({ message: "Manual monitoring check completed" });
    } catch (error) {
      console.error("Error running manual monitoring check:", error);
      res.status(500).json({ message: "Failed to run manual monitoring check" });
    }
  });

  // Production auth diagnosis endpoint (no auth required)
  app.get("/api/auth-debug", async (req: any, res) => {
    const hostname = req.hostname;
    const protocol = req.protocol;
    const domains = process.env.REPLIT_DOMAINS?.split(",") || [];

    const authInfo = {
      currentHostname: hostname,
      protocol: protocol,
      configuredDomains: domains,
      domainMatch: domains.includes(hostname),
      environment: process.env.NODE_ENV,
      sessionExists: !!req.session,
      userAuthenticated: req.isAuthenticated(),
      timestamp: new Date().toISOString()
    };

    console.log('🔍 Auth diagnosis requested:', authInfo);

    res.json({
      ...authInfo,
      recommendation: !authInfo.domainMatch ?
        `Domain mismatch! Current: ${hostname}, Expected one of: ${domains.join(", ")}` :
        "Domain configuration looks correct"
    });
  });

  // Admin authentication routes
  app.use(adminAuthRouter);

  // Admin panel routes
  app.use(adminRoutes);

  const httpServer = createServer(app);
  return httpServer;

}

// Helper function to categorize by CNAE
function categorizeByCNAE(cnaeCode: string): string {
  if (!cnaeCode) return 'general';

  const cnaeMap: { [key: string]: string } = {
    '01': 'agricultura',
    '02': 'agricultura',
    '03': 'agricultura',
    '05': 'mineracao',
    '06': 'mineracao',
    '07': 'mineracao',
    '08': 'mineracao',
    '09': 'mineracao',
    '10': 'industria',
    '11': 'industria',
    '12': 'industria',
    '13': 'industria',
    '14': 'industria',
    '15': 'industria',
    '16': 'industria',
    '17': 'industria',
    '18': 'industria',
    '19': 'industria',
    '20': 'industria',
    '21': 'industria',
    '22': 'industria',
    '23': 'industria',
    '24': 'industria',
    '25': 'industria',
    '26': 'tecnologia',
    '27': 'tecnologia',
    '28': 'industria',
    '29': 'industria',
    '30': 'industria',
    '31': 'industria',
    '32': 'industria',
    '33': 'industria',
    '35': 'energia',
    '36': 'energia',
    '37': 'energia',
    '38': 'energia',
    '39': 'energia',
    '41': 'construcao',
    '42': 'construcao',
    '43': 'construcao',
    '45': 'comercio',
    '46': 'comercio',
    '47': 'comercio',
    '49': 'transporte',
    '50': 'transporte',
    '51': 'transporte',
    '52': 'transporte',
    '53': 'transporte',
    '55': 'turismo',
    '56': 'turismo',
    '58': 'tecnologia',
    '59': 'tecnologia',
    '60': 'tecnologia',
    '61': 'tecnologia',
    '62': 'tecnologia',
    '63': 'tecnologia',
    '64': 'financeiro',
    '65': 'financeiro',
    '66': 'financeiro',
    '68': 'imobiliario',
    '69': 'consultoria',
    '70': 'consultoria',
    '71': 'consultoria',
    '72': 'tecnologia',
    '73': 'consultoria',
    '74': 'consultoria',
    '75': 'consultoria',
    '77': 'comercio',
    '78': 'consultoria',
    '79': 'turismo',
    '80': 'consultoria',
    '81': 'consultoria',
    '82': 'consultoria',
    '84': 'governo',
    '85': 'educacao',
    '86': 'saude',
    '87': 'saude',
    '88': 'consultoria',
    '90': 'cultura',
    '91': 'cultura',
    '92': 'cultura',
    '93': 'cultura',
    '94': 'consultoria',
    '95': 'tecnologia',
    '96': 'consultoria',
    '97': 'consultoria',
    '99': 'consultoria'
  };

  const sector = cnaeCode.substring(0, 2);
  return cnaeMap[sector] || 'general';
}