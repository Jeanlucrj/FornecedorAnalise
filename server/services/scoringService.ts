import { Supplier } from "../../shared/schema.js";
import { RiskAnalysisData } from "./riskAnalysisService.js";

interface ScoringWeights {
  cadastralStatus: number;
  financialHealth: number;
  certificates: number;
  legalIssues: number;
  companyAge: number;
  companySize: number;
  riskCompliance: number;
}

class ScoringService {
  private readonly weights: ScoringWeights = {
    cadastralStatus: 0.20,
    financialHealth: 0.25,
    certificates: 0.15,
    legalIssues: 0.15,
    companyAge: 0.05,
    companySize: 0.05,
    riskCompliance: 0.15,
  };

  calculateRiskScore(supplier: Supplier, analysis: any): number {
    let totalScore = 0;

    // Cadastral Status Score (0-100)
    const cadastralScore = this.calculateCadastralScore(supplier, analysis.cadastralStatus);
    totalScore += cadastralScore * this.weights.cadastralStatus;

    // Financial Health Score (0-100)
    const financialScore = this.calculateFinancialScore(analysis.financialHealth);
    totalScore += financialScore * this.weights.financialHealth;

    // Certificates Score (0-100)
    const certificatesScore = this.calculateCertificatesScore(analysis.certificates);
    totalScore += certificatesScore * this.weights.certificates;

    // Legal Issues Score (0-100)
    const legalScore = this.calculateLegalScore(analysis.legalIssues);
    totalScore += legalScore * this.weights.legalIssues;

    // Company Age Score (0-100)
    const ageScore = this.calculateAgeScore(supplier.openingDate);
    totalScore += ageScore * this.weights.companyAge;

    // Company Size Score (0-100)
    const sizeScore = this.calculateSizeScore(supplier.companySize);
    totalScore += sizeScore * this.weights.companySize;

    // Risk Compliance Score (0-100)
    const riskScore = this.calculateRiskComplianceScore(analysis.riskAnalysis);
    totalScore += riskScore * this.weights.riskCompliance;

    // Ensure score is between 0 and 100
    return Math.round(Math.max(0, Math.min(100, totalScore)));
  }

  private calculateRiskComplianceScore(riskAnalysis: RiskAnalysisData | null): number {
    if (!riskAnalysis) return 50; // Neutral score if no risk analysis available
    
    let score = riskAnalysis.complianceScore;
    
    // Apply penalties for specific risk factors
    if (riskAnalysis.complianceChecks.sanctionList) {
      score -= 30; // Major penalty for sanctions
    }
    
    if (riskAnalysis.complianceChecks.pep) {
      score -= 20; // Penalty for politically exposed persons
    }
    
    if (riskAnalysis.complianceChecks.workSlavery) {
      score -= 40; // Severe penalty for labor violations
    }
    
    if (riskAnalysis.complianceChecks.debtorList) {
      score -= 15; // Penalty for debt issues
    }
    
    // Penalty based on number of legal processes
    score -= Math.min(riskAnalysis.complianceChecks.legalProcesses * 2, 20);
    
    // Apply risk factor penalties
    score -= Math.min(riskAnalysis.riskFactors.length * 5, 25);
    
    return Math.max(0, Math.min(100, score));
  }

  private calculateCadastralScore(supplier: Supplier, cadastralStatus: any): number {
    let score = 100;

    // Legal Status
    if (supplier.legalStatus === 'ATIVA') {
      score += 0;
    } else if (supplier.legalStatus === 'SUSPENSA') {
      score -= 30;
    } else if (supplier.legalStatus === 'INAPTA') {
      score -= 50;
    } else if (supplier.legalStatus === 'BAIXADA') {
      score -= 100;
    }

    // Legal Situation
    if (supplier.legalSituation === 'REGULAR') {
      score += 0;
    } else {
      score -= 40;
    }

    // Additional cadastral checks
    if (cadastralStatus?.situation === 'IRREGULAR') {
      score -= 25;
    }

    return Math.max(0, score);
  }

  private calculateFinancialScore(financialHealth: any): number {
    if (!financialHealth) return 50; // Neutral score if no data

    let score = 100;

    // Protests
    const protests = financialHealth.protests || [];
    score -= protests.length * 15; // -15 per protest

    // Bankruptcies
    const bankruptcies = financialHealth.bankruptcies || [];
    score -= bankruptcies.length * 50; // -50 per bankruptcy

    // Judicial Recovery - severe penalty
    if (financialHealth.judicialRecovery) {
      score -= 50; // Increased penalty for judicial recovery
      console.log('⚠️ Judicial recovery detected - severe score penalty applied');
    }

    // Serasa Score (if available)
    if (financialHealth.serasaScore) {
      const serasaScore = financialHealth.serasaScore;
      if (serasaScore >= 800) {
        score += 10;
      } else if (serasaScore >= 600) {
        score += 0;
      } else if (serasaScore >= 400) {
        score -= 20;
      } else {
        score -= 40;
      }
    }

    return Math.max(0, score);
  }

  private calculateCertificatesScore(certificates: any): number {
    if (!certificates) return 50; // Neutral score if no data

    let score = 100;
    const certificateTypes = ['federal', 'state', 'municipal', 'labor'];

    for (const type of certificateTypes) {
      const cert = certificates[type];
      if (!cert) {
        score -= 25; // Missing certificate
        continue;
      }

      if (cert.status === 'valid') {
        // Check expiry date
        const expiryDate = new Date(cert.expiryDate);
        const now = new Date();
        const daysUntilExpiry = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntilExpiry < 0) {
          score -= 20; // Expired
        } else if (daysUntilExpiry < 30) {
          score -= 10; // Expiring soon
        }
      } else if (cert.status === 'expiring') {
        score -= 10;
      } else if (cert.status === 'invalid' || cert.status === 'expired') {
        score -= 20;
      }
    }

    return Math.max(0, score);
  }

  private calculateLegalScore(legalIssues: any): number {
    if (!legalIssues) return 100; // No legal issues is good

    let score = 100;

    // Legal processes
    const processes = legalIssues.processes || [];
    score -= processes.length * 10; // -10 per process

    // Sanctions
    const sanctions = legalIssues.sanctions || [];
    score -= sanctions.length * 25; // -25 per sanction

    // Restrictions
    const restrictions = legalIssues.restrictions || [];
    score -= restrictions.length * 15; // -15 per restriction

    return Math.max(0, score);
  }

  private calculateAgeScore(openingDate: Date | null): number {
    if (!openingDate) return 50; // Neutral if no date

    const now = new Date();
    const ageInYears = (now.getTime() - openingDate.getTime()) / (1000 * 60 * 60 * 24 * 365);

    if (ageInYears >= 10) {
      return 100; // Mature company
    } else if (ageInYears >= 5) {
      return 80; // Established
    } else if (ageInYears >= 2) {
      return 60; // Getting established
    } else if (ageInYears >= 1) {
      return 40; // New but some history
    } else {
      return 20; // Very new company
    }
  }

  private calculateSizeScore(companySize: string | null): number {
    const sizeScores: { [key: string]: number } = {
      'GRANDE': 100,
      'MEDIO': 80,
      'PEQUENO': 60,
      'MICRO': 40,
    };

    return sizeScores[companySize || ''] || 50;
  }

  getScoreClassification(score: number): string {
    if (score >= 80) return 'CONFIÁVEL';
    if (score >= 50) return 'ATENÇÃO';
    return 'CRÍTICO';
  }

  getScoreColor(score: number): string {
    if (score >= 80) return 'success';
    if (score >= 50) return 'warning';
    return 'destructive';
  }
}

export const scoringService = new ScoringService();
