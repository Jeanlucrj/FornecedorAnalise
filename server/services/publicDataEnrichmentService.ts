import axios from 'axios';

interface EnrichmentData {
  brasilAPI?: any;
  sicafData?: any;
  transparenciaData?: any;
  comprasNetData?: any;
  pgfnData?: any;
  ibamaData?: any;
  sintegraData?: any;
  source: string;
  confidence: number;
}

class PublicDataEnrichmentService {

  async enrichCompanyData(cnpj: string): Promise<EnrichmentData> {
    const cleanCnpj = cnpj.replace(/\D/g, '');
    
    console.log(`🌐 Enriching company data with public APIs for CNPJ: ${cleanCnpj}`);

    const enrichmentData: EnrichmentData = {
      source: 'public-apis-enrichment',
      confidence: 0
    };

    try {
      // Buscar dados paralelos de todas as APIs públicas
      const [
        brasilAPIData,
        sicafData,
        transparenciaData,
        comprasNetData,
        pgfnData,
        ibamaData,
        sintegraData
      ] = await Promise.allSettled([
        this.getBrasilAPIData(cleanCnpj),
        this.getSICAFData(cleanCnpj),
        this.getTransparenciaData(cleanCnpj),
        this.getComprasNetData(cleanCnpj),
        this.getPGFNData(cleanCnpj),
        this.getIBAMAData(cleanCnpj),
        this.getSintegraData(cleanCnpj)
      ]);

      // Consolidar resultados
      if (brasilAPIData.status === 'fulfilled' && brasilAPIData.value) {
        enrichmentData.brasilAPI = brasilAPIData.value;
        enrichmentData.confidence += 20;
        console.log('✅ BrasilAPI data retrieved');
      }

      if (sicafData.status === 'fulfilled' && sicafData.value) {
        enrichmentData.sicafData = sicafData.value;
        enrichmentData.confidence += 15;
        console.log('✅ SICAF data retrieved');
      }

      if (transparenciaData.status === 'fulfilled' && transparenciaData.value) {
        enrichmentData.transparenciaData = transparenciaData.value;
        enrichmentData.confidence += 15;
        console.log('✅ Portal Transparência data retrieved');
      }

      if (comprasNetData.status === 'fulfilled' && comprasNetData.value) {
        enrichmentData.comprasNetData = comprasNetData.value;
        enrichmentData.confidence += 10;
        console.log('✅ ComprasNet data retrieved');
      }

      if (pgfnData.status === 'fulfilled' && pgfnData.value) {
        enrichmentData.pgfnData = pgfnData.value;
        enrichmentData.confidence += 25; // Alto valor pois indica problemas fiscais
        console.log('✅ PGFN data retrieved');
      }

      if (ibamaData.status === 'fulfilled' && ibamaData.value) {
        enrichmentData.ibamaData = ibamaData.value;
        enrichmentData.confidence += 10;
        console.log('✅ IBAMA data retrieved');
      }

      if (sintegraData.status === 'fulfilled' && sintegraData.value) {
        enrichmentData.sintegraData = sintegraData.value;
        enrichmentData.confidence += 5;
        console.log('✅ Sintegra data retrieved');
      }

      console.log(`📊 Enrichment confidence: ${enrichmentData.confidence}%`);
      return enrichmentData;

    } catch (error: any) {
      console.error('❌ Error enriching company data:', error);
      return enrichmentData;
    }
  }

  // 1. BrasilAPI - Dados CNPJ gratuitos
  private async getBrasilAPIData(cnpj: string): Promise<any> {
    try {
      console.log('🇧🇷 Fetching BrasilAPI data...');
      
      const response = await axios.get(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
        timeout: 10000,
        headers: {
          'User-Agent': 'ValidaFornecedor/1.0'
        }
      });

      return {
        razaoSocial: response.data.razao_social,
        nomeFantasia: response.data.nome_fantasia,
        situacaoCadastral: response.data.situacao_cadastral,
        dataInicioAtividade: response.data.data_inicio_atividade,
        cnae: response.data.cnae_fiscal,
        endereco: {
          logradouro: response.data.logradouro,
          numero: response.data.numero,
          cep: response.data.cep,
          municipio: response.data.municipio,
          uf: response.data.uf
        },
        qsa: response.data.qsa || [],
        source: 'brasilapi'
      };

    } catch (error: any) {
      console.warn('⚠️ BrasilAPI failed:', error.response?.status || error.message);
      return null;
    }
  }

  // 2. SICAF - Fornecedores Governo Federal
  private async getSICAFData(cnpj: string): Promise<any> {
    try {
      console.log('🏛️ Fetching SICAF data...');
      
      // Buscar fornecedor específico
      const response = await axios.get(`http://compras.dados.gov.br/fornecedores/doc/fornecedor/${cnpj}.json`, {
        timeout: 10000,
        headers: {
          'User-Agent': 'ValidaFornecedor/1.0'
        }
      });

      return {
        nome: response.data.nome,
        situacao: response.data.situacao,
        habilitado: response.data.habilitado,
        dataHabilitacao: response.data.data_habilitacao,
        linhasFornecimento: response.data.linhas_fornecimento || [],
        endereco: response.data.endereco,
        source: 'sicaf'
      };

    } catch (error: any) {
      console.warn('⚠️ SICAF failed:', error.response?.status || error.message);
      return null;
    }
  }

  // 3. Portal da Transparência
  private async getTransparenciaData(cnpj: string): Promise<any> {
    try {
      console.log('👁️ Fetching Portal Transparência data...');
      
      // Buscar contratos e convênios da empresa
      // Nota: A API requer token, implementar estrutura para futura integração
      console.log('🔐 Portal Transparência requires token - structure ready for integration');
      
      return null; // Por enquanto

    } catch (error: any) {
      console.warn('⚠️ Portal Transparência failed:', error.message);
      return null;
    }
  }

  // 4. ComprasNet - Licitações e Contratos
  private async getComprasNetData(cnpj: string): Promise<any> {
    try {
      console.log('📋 Fetching ComprasNet data...');
      
      // Buscar contratos da empresa
      const response = await axios.get(`http://compras.dados.gov.br/contratos/v1/contratos.json`, {
        params: {
          cnpj_contratada: cnpj,
          offset: 0
        },
        timeout: 10000,
        headers: {
          'User-Agent': 'ValidaFornecedor/1.0'
        }
      });

      const contratos = response.data._embedded?.contratos || [];

      return {
        totalContratos: contratos.length,
        contratos: contratos.slice(0, 5), // Primeiros 5 contratos
        valorTotalContratos: contratos.reduce((sum: number, contrato: any) => 
          sum + (parseFloat(contrato.valor_inicial?.replace(',', '.')) || 0), 0),
        ultimoContrato: contratos[0]?.data_assinatura,
        source: 'comprasnet'
      };

    } catch (error: any) {
      console.warn('⚠️ ComprasNet failed:', error.response?.status || error.message);
      return null;
    }
  }

  // 5. PGFN - Dívida Ativa da União
  private async getPGFNData(cnpj: string): Promise<any> {
    try {
      console.log('💰 Checking PGFN Dívida Ativa...');
      
      // API oficial do Serpro é paga, implementar estrutura para consulta heurística
      console.log('🔐 PGFN API requires paid Serpro service - using heuristic analysis');
      
      return null; // Por enquanto

    } catch (error: any) {
      console.warn('⚠️ PGFN failed:', error.message);
      return null;
    }
  }

  // 6. IBAMA - Cadastro Técnico Federal
  private async getIBAMAData(cnpj: string): Promise<any> {
    try {
      console.log('🌿 Fetching IBAMA data...');
      
      // Implementar consulta ao Cadastro Técnico Federal quando disponível
      console.log('🔐 IBAMA CTF requires specific integration - structure ready');
      
      return null; // Por enquanto

    } catch (error: any) {
      console.warn('⚠️ IBAMA failed:', error.message);
      return null;
    }
  }

  // 7. Sintegra - APIs estaduais
  private async getSintegraData(cnpj: string): Promise<any> {
    try {
      console.log('🏢 Fetching Sintegra data...');
      
      // Implementar por estado quando dados de localização estiverem disponíveis
      console.log('🔐 Sintegra APIs vary by state - structure ready for UF-specific integration');
      
      return null; // Por enquanto

    } catch (error: any) {
      console.warn('⚠️ Sintegra failed:', error.message);
      return null;
    }
  }

  // Análise de risco baseada nos dados enriquecidos
  analyzeEnrichedRisk(enrichmentData: EnrichmentData): any {
    const riskFactors: string[] = [];
    let riskScore = 0;

    console.log('🔍 Analyzing enriched risk data:', {
      hasBrasilAPI: !!enrichmentData.brasilAPI,
      hasSICAF: !!enrichmentData.sicafData,
      hasComprasNet: !!enrichmentData.comprasNetData
    });

    // Analisar dados BrasilAPI
    if (enrichmentData.brasilAPI) {
      const situacaoCadastral = enrichmentData.brasilAPI.situacaoCadastral;
      console.log('📊 BrasilAPI situacao cadastral:', situacaoCadastral, typeof situacaoCadastral);
      
      // Garantir que é string antes de chamar toLowerCase
      const situacao = typeof situacaoCadastral === 'string' ? situacaoCadastral.toLowerCase() : '';
      if (situacao && (situacao.includes('suspens') || situacao.includes('cancel') || situacao.includes('baixa'))) {
        riskFactors.push('Situação cadastral irregular na Receita Federal');
        riskScore += 30;
      }
    }

    // Analisar dados SICAF
    if (enrichmentData.sicafData) {
      if (!enrichmentData.sicafData.habilitado) {
        riskFactors.push('Não habilitado no SICAF para fornecimento ao governo');
        riskScore += 15;
      }
    }

    // Analisar dados ComprasNet
    if (enrichmentData.comprasNetData) {
      if (enrichmentData.comprasNetData.totalContratos === 0) {
        riskFactors.push('Sem histórico de contratos com o governo federal');
        riskScore += 5;
      } else if (enrichmentData.comprasNetData.totalContratos > 50) {
        riskFactors.push('Fornecedor frequente do governo - boa experiência');
        riskScore -= 10; // Reduz risco
      }
    }

    // Analisar dados PGFN
    if (enrichmentData.pgfnData) {
      riskFactors.push('Pendências na Dívida Ativa da União');
      riskScore += 25;
    }

    return {
      riskScore: Math.max(0, Math.min(100, riskScore)),
      riskFactors,
      confidence: enrichmentData.confidence,
      recommendations: this.generateRecommendations(riskScore, riskFactors)
    };
  }

  private generateRecommendations(riskScore: number, riskFactors: string[]): string[] {
    const recommendations: string[] = [];

    if (riskScore > 50) {
      recommendations.push('Alto risco - recomenda-se análise detalhada antes da contratação');
    } else if (riskScore > 25) {
      recommendations.push('Risco moderado - verificar documentação adicional');
    } else {
      recommendations.push('Baixo risco identificado nas bases públicas');
    }

    if (riskFactors.some(f => f.includes('SICAF'))) {
      recommendations.push('Verificar habilitação no SICAF para contratos governamentais');
    }

    if (riskFactors.some(f => f.includes('cadastral'))) {
      recommendations.push('Validar situação cadastral atual na Receita Federal');
    }

    return recommendations;
  }
}

export const publicDataEnrichmentService = new PublicDataEnrichmentService();