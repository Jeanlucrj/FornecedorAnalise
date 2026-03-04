import axios from 'axios';

export interface PublicCnpjData {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia?: string;
  situacao: string;
  dataAbertura: string;
  endereco: {
    logradouro: string;
    numero: string;
    bairro: string;
    municipio: string;
    uf: string;
    cep: string;
  };
  telefones: string[];
  emails: string[];
  cnae: {
    principal: {
      codigo: string;
      descricao: string;
    };
    secundarias: Array<{
      codigo: string;
      descricao: string;
    }>;
  };
  socios: Array<{
    nome: string;
    qualificacao: string;
  }>;
  capitalSocial: number;
  porte: string;
  naturezaJuridica: string;
  isJudicialRecovery: boolean;
  source: string;
}

class PublicApisService {
  private rateLimitDelay = 12000; // 12 segundos entre requisições para respeitar limites

  async getCnpjData(cnpj: string): Promise<PublicCnpjData | null> {
    const cleanCnpj = cnpj.replace(/\D/g, '');
    
    // Tentar CNPJá API primeiro (mais estável)
    try {
      const cnpjaData = await this.getCnpjaData(cleanCnpj);
      if (cnpjaData) return cnpjaData;
    } catch (error) {
      console.warn('CNPJá API failed:', error);
    }

    // Fallback para ReceitaWS
    try {
      const receitaData = await this.getReceitaWsData(cleanCnpj);
      if (receitaData) return receitaData;
    } catch (error) {
      console.warn('ReceitaWS API failed:', error);
    }

    return null;
  }

  private async getCnpjaData(cnpj: string): Promise<PublicCnpjData | null> {
    const url = `https://api.cnpja.com/office/${cnpj}`;
    
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'ValidaFornecedor/1.0',
        'Accept': 'application/json',
      },
    });

    if (response.status !== 200 || !response.data) {
      return null;
    }

    const data = response.data;
    
    // Detectar recuperação judicial pela situação e nome da empresa
    const situacao = data.status?.text || '';
    const razaoSocial = data.company?.name || '';
    const isJudicialRecovery = this.detectJudicialRecovery(situacao, razaoSocial);

    return {
      cnpj: this.formatCnpj(cnpj),
      razaoSocial: data.company?.name || '',
      nomeFantasia: data.alias || '',
      situacao: situacao,
      dataAbertura: this.formatDate(data.founded),
      endereco: {
        logradouro: data.address?.street || '',
        numero: data.address?.number || '',
        bairro: data.address?.district || '',
        municipio: data.address?.city || '',
        uf: data.address?.state || '',
        cep: data.address?.zip || '',
      },
      telefones: data.phones || [],
      emails: data.emails || [],
      cnae: {
        principal: {
          codigo: data.mainActivity?.id || '',
          descricao: data.mainActivity?.text || '',
        },
        secundarias: (data.sideActivities || []).map((activity: any) => ({
          codigo: activity.id || '',
          descricao: activity.text || '',
        })),
      },
      socios: (data.members || []).map((member: any) => ({
        nome: member.name || '',
        qualificacao: member.role?.text || '',
      })),
      capitalSocial: parseFloat(data.equity?.toString().replace(/[^\d,]/g, '').replace(',', '.') || '0'),
      porte: data.size?.acronym || '',
      naturezaJuridica: data.nature?.text || '',
      isJudicialRecovery,
      source: 'CNPJá API',
    };
  }

  private async getReceitaWsData(cnpj: string): Promise<PublicCnpjData | null> {
    const url = `https://receitaws.com.br/v1/cnpj/${cnpj}`;
    
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'ValidaFornecedor/1.0',
        'Accept': 'application/json',
      },
    });

    if (response.status !== 200 || !response.data || response.data.status === 'ERROR') {
      return null;
    }

    const data = response.data;
    
    // Detectar recuperação judicial pela situação e nome da empresa
    const situacao = data.situacao || '';
    const razaoSocial = data.nome || '';
    const isJudicialRecovery = this.detectJudicialRecovery(situacao, razaoSocial);

    return {
      cnpj: data.cnpj || this.formatCnpj(cnpj),
      razaoSocial: data.nome || '',
      nomeFantasia: data.fantasia || '',
      situacao: situacao,
      dataAbertura: data.abertura || '',
      endereco: {
        logradouro: data.logradouro || '',
        numero: data.numero || '',
        bairro: data.bairro || '',
        municipio: data.municipio || '',
        uf: data.uf || '',
        cep: data.cep || '',
      },
      telefones: data.telefone ? [data.telefone] : [],
      emails: data.email ? [data.email] : [],
      cnae: {
        principal: {
          codigo: data.atividade_principal?.[0]?.code || '',
          descricao: data.atividade_principal?.[0]?.text || '',
        },
        secundarias: (data.atividades_secundarias || []).map((activity: any) => ({
          codigo: activity.code || '',
          descricao: activity.text || '',
        })),
      },
      socios: (data.qsa || []).map((socio: any) => ({
        nome: socio.nome || '',
        qualificacao: socio.qual || '',
      })),
      capitalSocial: parseFloat(data.capital_social?.replace(/[^\d,]/g, '').replace(',', '.') || '0'),
      porte: data.porte || '',
      naturezaJuridica: data.natureza_juridica || '',
      isJudicialRecovery,
      source: 'ReceitaWS',
    };
  }

  private detectJudicialRecovery(situacao: string, razaoSocial?: string): boolean {
    const situacaoLower = situacao.toLowerCase();
    const razaoSocialLower = razaoSocial?.toLowerCase() || '';
    
    // Palavras-chave que indicam recuperação judicial
    const keywords = [
      'recuperação judicial',
      'recuperacao judicial', 
      'em recuperação',
      'em recuperacao',
      'rj',
      'sob recuperação',
      'sob recuperacao',
      'judicial recovery'
    ];

    // Verificar na situação cadastral
    const foundInSituacao = keywords.some(keyword => situacaoLower.includes(keyword));
    
    // Verificar no nome da empresa (razão social)
    const foundInRazaoSocial = keywords.some(keyword => razaoSocialLower.includes(keyword));
    
    console.log(`🔍 Judicial recovery detection:
      - Situação: "${situacao}" -> ${foundInSituacao}
      - Razão Social: "${razaoSocial}" -> ${foundInRazaoSocial}`);

    return foundInSituacao || foundInRazaoSocial;
  }

  private formatCnpj(cnpj: string): string {
    const clean = cnpj.replace(/\D/g, '');
    return clean.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }

  private formatDate(dateString: string): string {
    if (!dateString) return '';
    
    // Se já está no formato brasileiro
    if (dateString.includes('/')) return dateString;
    
    // Se está no formato ISO, converter
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR');
    } catch {
      return dateString;
    }
  }

  // Rate limiting - aguardar entre requisições
  async waitForRateLimit(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
  }
}

export const publicApisService = new PublicApisService();