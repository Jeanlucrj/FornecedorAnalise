import axios from 'axios';

export interface RiskAnalysisData {
  complianceScore: number; // 0-100
  riskLevel: 'BAIXO' | 'MÉDIO' | 'ALTO' | 'CRÍTICO';
  riskFactors: string[];
  recommendations: string[];
  complianceChecks: {
    pep: boolean;
    sanctionList: boolean;
    legalProcesses: number;
    debtorList: boolean;
    workSlavery: boolean;
    ceis: boolean;   // Cadastro de Empresas Inidôneas e Suspensas
    ceaf: boolean;   // Cadastro de Entidades Acusadas de Fraudes
    cnep: boolean;   // Cadastro Nacional de Empresas Punidas
  };
  dataSourcers: string[];
  lastUpdated: Date;
}

export interface SupplierComplianceData {
  cnpj: string;
  companyName: string;
  riskAnalysis: RiskAnalysisData;
  additionalData?: any;
}

const PORTAL_TRANSPARENCIA_BASE = 'https://api.portaldatransparencia.gov.br/api-de-dados';

class RiskAnalysisService {
  private dataSutraApiKey: string | null;
  private portalApiKey: string | null;

  constructor() {
    this.dataSutraApiKey = process.env.DATASUTRA_API_KEY || null;
    this.portalApiKey = process.env.PORTAL_TRANSPARENCIA_API_KEY || null;

    if (!this.dataSutraApiKey) {
      console.warn('Warning: No DataSutra API key found. Using enhanced risk analysis with available data.');
    }
    if (!this.portalApiKey) {
      console.info('ℹ️ Portal da Transparência API key not set. Using public endpoints (no key required for some).');
    }
  }

  async analyzeComplianceRisk(cnpj: string, supplierData: any): Promise<RiskAnalysisData> {
    const cleanCnpj = cnpj.replace(/\D/g, '');

    try {
      // Run all free government API checks in parallel
      const [ceisResult, cnepResult, workSlaveryResult] = await Promise.allSettled([
        this.checkCEIS(cleanCnpj),
        this.checkCNEP(cleanCnpj),
        this.checkWorkSlavery(cleanCnpj),
      ]);

      const ceisFound = ceisResult.status === 'fulfilled' ? ceisResult.value : false;
      const cnepFound = cnepResult.status === 'fulfilled' ? cnepResult.value : false;
      const workSlavery = workSlaveryResult.status === 'fulfilled' ? workSlaveryResult.value : false;

      const sources: string[] = ['Portal da Transparência'];

      // Build risk factors and score based on real data + internal heuristics
      return this.buildRiskResult(cleanCnpj, supplierData, {
        ceisFound,
        cnepFound,
        workSlavery,
        sources,
      });

    } catch (error) {
      console.error('Error in risk analysis:', error);
      return this.performBasicRiskAnalysis(supplierData);
    }
  }

  /**
   * CEIS – Cadastro de Empresas Inidôneas e Suspensas
   * (CGU/Portal da Transparência – public API, no key required)
   */
  private async checkCEIS(cnpj: string): Promise<boolean> {
    try {
      const url = `${PORTAL_TRANSPARENCIA_BASE}/ceis?cnpjSancionado=${cnpj}&pagina=1`;
      const headers: any = { 'Accept': 'application/json' };
      if (this.portalApiKey) headers['chave-api-dados'] = this.portalApiKey;

      const response = await axios.get(url, { timeout: 10000, headers });
      const data = response.data;

      if (Array.isArray(data) && data.length > 0) {
        console.log(`⚠️ CEIS: ${data.length} registro(s) encontrado(s) para CNPJ ${cnpj}`);
        return true;
      }
      return false;
    } catch (error) {
      // 404 means not found = clean
      if (axios.isAxiosError(error) && error.response?.status === 404) return false;
      console.warn('CEIS API unavailable, skipping:', (error as Error).message);
      return false;
    }
  }

  /**
   * CNEP – Cadastro Nacional de Empresas Punidas
   * (CGU/Portal da Transparência – public API)
   */
  private async checkCNEP(cnpj: string): Promise<boolean> {
    try {
      const url = `${PORTAL_TRANSPARENCIA_BASE}/cnep?cnpjSancionado=${cnpj}&pagina=1`;
      const headers: any = { 'Accept': 'application/json' };
      if (this.portalApiKey) headers['chave-api-dados'] = this.portalApiKey;

      const response = await axios.get(url, { timeout: 10000, headers });
      const data = response.data;

      if (Array.isArray(data) && data.length > 0) {
        console.log(`⚠️ CNEP: ${data.length} registro(s) encontrado(s) para CNPJ ${cnpj}`);
        return true;
      }
      return false;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) return false;
      console.warn('CNEP API unavailable, skipping:', (error as Error).message);
      return false;
    }
  }

  /**
   * Lista de Trabalho Escravo – MTE via Portal da Transparência
   */
  private async checkWorkSlavery(cnpj: string): Promise<boolean> {
    try {
      const url = `${PORTAL_TRANSPARENCIA_BASE}/trabalho-escravo?cnpj=${cnpj}&pagina=1`;
      const headers: any = { 'Accept': 'application/json' };
      if (this.portalApiKey) headers['chave-api-dados'] = this.portalApiKey;

      const response = await axios.get(url, { timeout: 10000, headers });
      const data = response.data;

      if (Array.isArray(data) && data.length > 0) {
        console.log(`⚠️ TRABALHO ESCRAVO: ${data.length} registro(s) para CNPJ ${cnpj}`);
        return true;
      }
      return false;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) return false;
      console.warn('Trabalho Escravo API unavailable, skipping:', (error as Error).message);
      return false;
    }
  }

  private buildRiskResult(
    cnpj: string,
    supplierData: any,
    apiResults: {
      ceisFound: boolean;
      cnepFound: boolean;
      workSlavery: boolean;
      sources: string[];
    }
  ): RiskAnalysisData {
    const { ceisFound, cnepFound, workSlavery, sources } = apiResults;
    const riskFactors: string[] = [];
    const recommendations: string[] = [];
    let score = 75; // baseline

    // --- Government API findings ---
    if (ceisFound) {
      riskFactors.push('Empresa inscrita no CEIS (inidônea ou suspensa)');
      score -= 35;
    }
    if (cnepFound) {
      riskFactors.push('Empresa inscrita no CNEP (punições administrativas)');
      score -= 30;
    }
    if (workSlavery) {
      riskFactors.push('Empresa constante na Lista de Trabalho Escravo (MTE)');
      score -= 45;
    }

    // --- Heuristic analysis from supplier data ---
    if (supplierData) {
      if (supplierData.legalStatus && supplierData.legalStatus !== 'ATIVA') {
        riskFactors.push(`Situação cadastral: ${supplierData.legalStatus}`);
        score -= 20;
      }

      if (supplierData.openingDate) {
        const ageYears = (Date.now() - new Date(supplierData.openingDate).getTime()) / (365.25 * 24 * 3600 * 1000);
        if (ageYears < 1) {
          riskFactors.push('Empresa com menos de 1 ano de atividade');
          score -= 15;
        } else if (ageYears < 2) {
          riskFactors.push('Empresa com menos de 2 anos de atividade');
          score -= 8;
        } else if (ageYears > 10) {
          score += 8; // established company bonus
        }
      }

      const capital = typeof supplierData.shareCapital === 'string'
        ? parseFloat(supplierData.shareCapital)
        : (supplierData.shareCapital || 0);
      if (capital < 5000) {
        riskFactors.push('Capital social muito baixo (abaixo de R$ 5.000)');
        score -= 8;
      } else if (capital > 1_000_000) {
        score += 5;
      }

      if (!supplierData.email) riskFactors.push('E-mail não informado');
      if (!supplierData.phone) riskFactors.push('Telefone não informado');

      // High-risk CNAEs (financial intermediation, holding companies)
      const highRiskCnaes = ['6490', '6499', '6431', '6432', '6433', '6619', '6822', '6821'];
      if (highRiskCnaes.some(code => supplierData.cnaeCode?.startsWith(code))) {
        riskFactors.push('CNAE de atividade financeira/holding – risco regulatório elevado');
        score -= 10;
      }
    }

    score = Math.max(0, Math.min(100, score));

    // --- Recommendations ---
    if (ceisFound || cnepFound) {
      recommendations.push('Não contratar — empresa em lista de punições da CGU');
      recommendations.push('Consultar o Portal da Transparência para detalhes das sanções');
    }
    if (workSlavery) {
      recommendations.push('Não contratar — empresa na Lista Suja do Trabalho Escravo');
    }
    if (riskFactors.length === 0) {
      recommendations.push('Fornecedor aprovado nas verificações governamentais');
      recommendations.push('Recomendado monitoramento periódico semestral');
    } else {
      if (!ceisFound && !cnepFound && !workSlavery) {
        recommendations.push('Solicitar documentação adicional antes da contratação');
        recommendations.push('Acompanhar situação cadastral periodicamente');
      }
    }

    return {
      complianceScore: score,
      riskLevel: this.mapRiskLevel(score),
      riskFactors,
      recommendations,
      complianceChecks: {
        pep: false,
        sanctionList: ceisFound || cnepFound,
        legalProcesses: 0,
        debtorList: false,
        workSlavery,
        ceis: ceisFound,
        ceaf: false,
        cnep: cnepFound,
      },
      dataSourcers: sources.length > 0 ? sources : ['Análise Interna'],
      lastUpdated: new Date(),
    };
  }

  private performBasicRiskAnalysis(supplierData: any): RiskAnalysisData {
    return this.buildRiskResult('', supplierData, {
      ceisFound: false,
      cnepFound: false,
      workSlavery: false,
      sources: ['Análise Interna'],
    });
  }

  private mapRiskLevel(score: number): 'BAIXO' | 'MÉDIO' | 'ALTO' | 'CRÍTICO' {
    if (score >= 80) return 'BAIXO';
    if (score >= 60) return 'MÉDIO';
    if (score >= 40) return 'ALTO';
    return 'CRÍTICO';
  }
}

export const riskAnalysisService = new RiskAnalysisService();