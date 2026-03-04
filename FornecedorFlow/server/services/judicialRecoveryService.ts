import axios from 'axios';
import { publicApisService } from './publicApisService';

interface JudicialRecoveryData {
  isInRecovery: boolean;
  source: string;
  details?: string;
  detectedBy: string[];
}

class JudicialRecoveryService {
  
  async checkJudicialRecovery(cnpj: string): Promise<JudicialRecoveryData> {
    const cleanCnpj = cnpj.replace(/\D/g, '');
    const detectionSources: string[] = [];
    let isInRecovery = false;
    let details = '';
    let primarySource = '';

    console.log(`🔍 Checking judicial recovery for CNPJ: ${cleanCnpj}`);

    // 1. Verificar via APIs públicas integradas (CNPJá e ReceitaWS)
    try {
      const publicData = await publicApisService.getCnpjData(cleanCnpj);
      if (publicData) {
        console.log(`📊 Checking via ${publicData.source}:`);
        console.log(`   - Situação: "${publicData.situacao}"`);
        console.log(`   - Razão Social: "${publicData.razaoSocial}"`);
        
        if (publicData.isJudicialRecovery) {
          isInRecovery = true;
          detectionSources.push(publicData.source);
          primarySource = publicData.source;
          details = `Detectado via ${publicData.source} - situação: ${publicData.situacao}`;
        }
      }
    } catch (error) {
      console.warn('❌ Public APIs failed:', error);
    }

    // 2. Verificar situação especial na Receita Federal (detectar termos específicos)
    try {
      const receitaData = await this.checkReceitaFederalSpecialSituation(cleanCnpj);
      if (receitaData.isInRecovery) {
        isInRecovery = true;
        detectionSources.push('Receita Federal');
        if (!primarySource) primarySource = 'Receita Federal';
        details += (details ? ' | ' : '') + receitaData.details;
      }
    } catch (error) {
      console.warn('❌ Receita Federal check failed:', error);
    }

    // 3. Verificar banco do TST (web scraping limitado)
    try {
      const tstData = await this.checkTSTBankruptcyDatabase(cleanCnpj);
      if (tstData.isInRecovery) {
        isInRecovery = true;
        detectionSources.push('TST Banco de Falências');
        if (!primarySource) primarySource = 'TST Banco de Falências';
        details += (details ? ' | ' : '') + tstData.details;
      }
    } catch (error) {
      console.warn('❌ TST check failed:', error);
    }

    console.log(`✅ Judicial recovery result: ${isInRecovery ? 'SIM' : 'NÃO'}`);
    if (detectionSources.length > 0) {
      console.log(`📍 Sources: ${detectionSources.join(', ')}`);
    }

    return {
      isInRecovery,
      source: primarySource || 'automatic-detection',
      details: details || 'Nenhuma indicação de recuperação judicial encontrada',
      detectedBy: detectionSources,
    };
  }

  private async checkReceitaFederalSpecialSituation(cnpj: string): Promise<{isInRecovery: boolean, details: string}> {
    // Expandir detecção para incluir situação especial
    const keywords = [
      'recuperação judicial',
      'recuperacao judicial',
      'em recuperação',
      'em recuperacao',
      'sob recuperação',
      'sob recuperacao',
      'plano de recuperação',
      'plano de recuperacao',
      'judicial recovery',
      'recupera',  // Capturar variações
      'rj',        // Abreviação comum
    ];

    // Esta função poderia fazer uma consulta adicional específica à Receita Federal
    // Por enquanto, retornar base para expansão futura
    return {
      isInRecovery: false,
      details: 'Verificação expandida da Receita Federal não implementada'
    };
  }

  private async checkTSTBankruptcyDatabase(cnpj: string): Promise<{isInRecovery: boolean, details: string}> {
    try {
      // Implementar consulta simples ao TST usando fetch
      // URL base: https://bancofalencia.tst.jus.br/
      
      // Por limitações de CORS e necessidade de formulário, 
      // implementar apenas estrutura para expansão futura
      console.log('🏛️ TST Bankruptcy Database check (structure ready for implementation)');
      
      return {
        isInRecovery: false,
        details: 'Consulta TST estruturada para implementação futura'
      };
    } catch (error) {
      return {
        isInRecovery: false,
        details: 'Erro na consulta TST'
      };
    }
  }

  // Método para verificar listas das Juntas Comerciais
  async checkJuntasComerciais(cnpj: string): Promise<{isInRecovery: boolean, details: string}> {
    // Estrutura para integração futura com APIs das Juntas Comerciais
    // que mantêm listas obrigatórias de empresas em recuperação judicial
    
    const juntasComerciais = [
      'JUCEC', 'JUCEMG', 'JUCESP', 'JUCESC', 'JUCEES', 'JUCEPAR'
    ];

    console.log('🏢 Juntas Comerciais check (structure ready)');
    
    return {
      isInRecovery: false,
      details: 'Estrutura preparada para integração com Juntas Comerciais'
    };
  }

  // Método para detectar padrões no nome da empresa
  detectFromCompanyName(companyName: string): boolean {
    const name = companyName.toLowerCase();
    
    const patterns = [
      'em recuperação judicial',
      'em recuperacao judicial',
      'recuperação judicial',
      'recuperacao judicial',
      'em rj',
      '- rj',
      '(rj)',
      'judicial',
      'recovery'
    ];

    const found = patterns.some(pattern => name.includes(pattern));
    
    if (found) {
      console.log(`🏷️ Judicial recovery detected in company name: "${companyName}"`);
    }
    
    return found;
  }
}

export const judicialRecoveryService = new JudicialRecoveryService();