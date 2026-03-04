import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { cnpjService } from "./services/cnpjService";
import { scoringService } from "./services/scoringService";
import { reportService } from "./services/reportService";
import { NotificationService } from "./services/notificationService";
import { insertValidationSchema, insertSupplierSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Test login route (development only)
  if (process.env.NODE_ENV === 'development') {
    app.post('/api/test-login', async (req: any, res) => {
      try {
        const { username, password } = req.body;
        
        // Simple test credentials
        if (username === 'admin' && password === 'admin123') {
          // Create or get test user
          const testUser = await storage.upsertUser({
            email: 'admin@test.com',
            firstName: 'Admin',
            lastName: 'Teste',
            profileImageUrl: null,
            plan: 'pro',
            apiUsage: 0,
            apiLimit: 1000,
          });

          // Simulate Replit Auth session
          req.user = {
            claims: {
              sub: testUser.id,
              email: testUser.email,
              first_name: testUser.firstName,
              last_name: testUser.lastName,
              profile_image_url: testUser.profileImageUrl,
            },
            expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour
          };

          // Store user in session
          req.session.regenerate((err: any) => {
            if (err) {
              console.error('Session regeneration error:', err);
              return res.status(500).json({ message: 'Session failed' });
            }
            
            // Manually set the session data
            req.session.passport = { user: req.user };
            
            req.session.save((err: any) => {
              if (err) {
                console.error('Session save error:', err);
                return res.status(500).json({ message: 'Session save failed' });
              }
              
              res.json({ 
                message: 'Test login successful', 
                user: testUser,
                redirect: '/'
              });
            });
          });
        } else {
          res.status(401).json({ message: 'Invalid test credentials' });
        }
      } catch (error) {
        console.error('Test login error:', error);
        res.status(500).json({ message: 'Test login failed' });
      }
    });
  }

  // Helper function to check authentication
  const requireAuth = (req: any, res: any, next: any) => {
    if (req.isAuthenticated && req.isAuthenticated()) {
      return next();
    }
    return res.status(401).json({ message: "Unauthorized" });
  };

  // Auth routes
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // CNPJ validation route
  app.post("/api/validate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { cnpj, analysisType = 'complete' } = req.body;
      
      if (!cnpj) {
        return res.status(400).json({ message: "CNPJ is required" });
      }

      console.log(`Validating CNPJ: ${cnpj} for user: ${userId}`);

      // Get supplier data
      const supplierData = await cnpjService.getSupplierData(cnpj);
      const analysis = await cnpjService.getComprehensiveAnalysis(cnpj);
      
      // Calculate risk score
      const score = scoringService.calculateRiskScore(supplierData as any, analysis);
      
      // Determine category based on CNAE
      const category = categorizeByCNAE(supplierData.cnaeCode);
      
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
      if (supplier) {
        supplier = await storage.updateSupplier(supplier.id, supplierSchema);
      } else {
        supplier = await storage.createSupplier(supplierSchema);
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
        dataSource: analysis.dataSource,
        apiCost: analysis.apiCost.toString(),
        processingTime: analysis.processingTime,
      });

      // Increment API usage
      await storage.incrementApiUsage(userId);

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
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Validation failed" 
      });
    }
  });

  // Get validation history
  app.get("/api/validations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  // Get specific validation
  app.get("/api/validations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      const { id } = req.params;

      // Get validation data
      const validation = await storage.getValidation(id);
      if (!validation || validation.userId !== userId) {
        return res.status(404).json({ message: "Validation not found" });
      }

      const supplier = await storage.getSupplier(validation.supplierId!) || null;
      const partners = await storage.getPartnersBySupplier(validation.supplierId!);

      // Generate PDF
      const { reportService } = await import("./services/reportService");
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
    const userId = req.user.claims.sub;

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

  // Monitoring status endpoint
  app.get("/api/monitoring/status", isAuthenticated, async (req: any, res) => {
    try {
      const { MonitoringService } = await import("./services/monitoringService");
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
      const { MonitoringService } = await import("./services/monitoringService");
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

  // Emergency login for production issues (development only)
  app.post("/api/emergency-login", async (req: any, res) => {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ message: "Not available in production" });
    }

    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email required" });
      }

      // Create emergency user session
      const user = {
        claims: {
          sub: 'emergency-user-' + Date.now(),
          email: email,
          first_name: 'Emergency',
          last_name: 'User',
          exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
        }
      };

      req.login(user, (err) => {
        if (err) {
          console.error('Emergency login error:', err);
          return res.status(500).json({ message: "Emergency login failed" });
        }
        
        console.log('🚨 Emergency login successful for:', email);
        res.json({ message: "Emergency login successful", user: user.claims });
      });

    } catch (error) {
      console.error("Emergency login error:", error);
      res.status(500).json({ message: "Emergency login failed" });
    }
  });

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