# 📚 Documentação das APIs - FornecedorFlow

## 🎯 Visão Geral

O FornecedorFlow utiliza **exclusivamente APIs públicas e gratuitas** para consulta de dados de CNPJ, sem utilização de dados mock. O sistema implementa uma estratégia robusta de fallback com 5 APIs diferentes para garantir alta disponibilidade.

---

## 🔄 Estratégia de Fallback

O sistema tenta as APIs na seguinte ordem:

```
1. OpenCNPJ API     → 50 req/s, sem autenticação
2. BrasilAPI        → Generoso, sem autenticação
3. CNPJá API        → 5-10 req/min, sem autenticação
4. ReceitaWS        → 3 req/min, sem autenticação
5. CNPJ.ws          → Último recurso
```

Se **todas as APIs falharem**, o sistema retorna erro ao usuário (sem fallback para dados mock).

---

## 📡 APIs Implementadas

### 1️⃣ **OpenCNPJ API** ⭐ RECOMENDADA

**URL Base**: `https://api.opencnpj.org/v1/{cnpj}`

**Características**:
- ✅ 100% gratuita (inclusive uso comercial)
- ✅ Até **50 requisições/segundo** por IP
- ✅ Sem autenticação (sem chave de API)
- ✅ Open source (disponível no GitHub)
- ✅ Atualização mensal (base da Receita Federal)
- ✅ Respostas em até 50ms quando cacheado

**Dados Retornados**:
- Razão social e nome fantasia
- Situação cadastral
- Data de abertura
- Endereço completo
- Telefone e e-mail
- CNAE principal
- Sócios (QSA)
- Capital social
- Porte da empresa
- Natureza jurídica

**Exemplo de Uso**:
```bash
curl https://api.opencnpj.org/v1/00000000000191
```

**Documentação**: https://opencnpj.org/

---

### 2️⃣ **BrasilAPI**

**URL Base**: `https://brasilapi.com.br/api/cnpj/v1/{cnpj}`

**Características**:
- ✅ 100% gratuita
- ✅ Limite generoso de requisições
- ✅ Sem autenticação
- ✅ Open source (projeto brasileiro)
- ✅ Dados oficiais da Receita Federal
- ✅ Múltiplas integrações governamentais

**Dados Retornados**:
- Razão social e nome fantasia
- Situação cadastral detalhada
- Data de início de atividade
- Endereço completo com tipo de logradouro
- Telefones (DDD + número)
- CNAE principal + CNAEs secundários
- Sócios (QSA) com qualificações
- Capital social
- Porte da empresa

**Exemplo de Uso**:
```bash
curl https://brasilapi.com.br/api/cnpj/v1/00000000000191
```

**Documentação**: https://brasilapi.com.br/docs

---

### 3️⃣ **CNPJá API**

**URL Base**: `https://api.cnpja.com/office/{cnpj}`

**Características**:
- ✅ Gratuita
- ⚠️ Limite: **3-5 consultas/minuto** (sem cadastro)
- ⚠️ Limite: **10 consultas/minuto** (com cadastro gratuito)
- ✅ Sem autenticação obrigatória
- ✅ Dados atualizados e bem estruturados

**Dados Retornados**:
- Company name, alias
- Status detalhado
- Endereço estruturado
- Telefones e e-mails
- Atividades (principal + secundárias)
- Membros (sócios) com roles
- Equity (capital social)
- Size e nature

**Exemplo de Uso**:
```bash
curl https://api.cnpja.com/office/00000000000191
```

**Documentação**: https://cnpja.com/api

---

### 4️⃣ **ReceitaWS**

**URL Base**: `https://receitaws.com.br/v1/cnpj/{cnpj}`

**Características**:
- ✅ Gratuita
- ⚠️ Limite: **3 consultas/minuto** por IP
- ✅ Sem autenticação
- ✅ API consolidada e estável
- ✅ Formato simples e direto

**Dados Retornados**:
- Nome e fantasia
- Situação cadastral
- Abertura
- Endereço completo
- Telefone e e-mail
- Atividade principal
- Atividades secundárias
- QSA (sócios)
- Capital social
- Porte

**Exemplo de Uso**:
```bash
curl https://receitaws.com.br/v1/cnpj/00000000000191
```

**Documentação**: https://receitaws.com.br/

---

### 5️⃣ **CNPJ.ws** (Último Recurso)

**URL Base**: `https://publica.cnpj.ws/cnpj/{cnpj}`

**Características**:
- ✅ Gratuita
- ✅ Sem autenticação
- ✅ Base oficial da Receita Federal
- ⚠️ Usado apenas como último recurso

**Dados Retornados**:
- Dados cadastrais completos
- Estabelecimento
- QSA detalhado
- CNAEs

**Exemplo de Uso**:
```bash
curl https://publica.cnpj.ws/cnpj/00000000000191
```

**Documentação**: https://www.cnpj.ws/

---

## 🛡️ Detecção de Recuperação Judicial

O sistema detecta automaticamente empresas em recuperação judicial através de:

### **Fontes de Detecção**:
1. **Análise do nome da empresa** (razão social)
   - Palavras-chave: "em recuperação judicial", "RJ", "recuperação"

2. **Situação cadastral da Receita Federal**
   - Análise da descrição da situação

3. **Cross-check com múltiplas APIs**
   - Validação cruzada entre OpenCNPJ, BrasilAPI, CNPJá e ReceitaWS

### **Palavras-chave Detectadas**:
```
- "recuperação judicial"
- "recuperacao judicial"
- "em recuperação"
- "em recuperacao"
- "sob recuperação"
- "plano de recuperação"
- "rj" (abreviação)
- "judicial recovery"
```

### **Impacto no Score**:
- ✅ Detecção automática: **-50 pontos** no score
- 🚨 Todos os certificados marcados como **INVÁLIDOS**
- ⚠️ Status: **CRÍTICO** (score < 50)

---

## 🔐 Certificados e Regularidade Fiscal

### **Sistema de Verificação**:

O sistema verifica 4 tipos de certidões:

1. **Federal (CND)** - Certidão Negativa de Débitos
2. **Trabalhista (CNDT)** - Portal TST
3. **Estadual** - Por UF específica
4. **Municipal** - Por município específico

### **Lógica de Verificação**:

```typescript
// 1. Verificar recuperação judicial (invalidação automática)
if (isInJudicialRecovery) {
  return ALL_CERTIFICATES_INVALID;
}

// 2. Verificar APIs oficiais (quando disponível)
checkOfficialAPIs();

// 3. Análise heurística via dados públicos
analyzeSituationFromPublicAPIs();
```

### **Empresas com Problemas Conhecidos**:

O sistema possui dados específicos para empresas reais em situação irregular:

| CNPJ | Empresa | Status |
|------|---------|--------|
| 07663140002302 | Coteminas S.A. | Recuperação Judicial (2024) |
| 00776574000156 | Americanas S.A. | Recuperação Judicial + Fraude |
| 76535764000143 | Oi S.A. | Segunda Recuperação Judicial |
| 07575651000159 | Gol Linhas Aéreas | Recuperação concluída (2025) |
| 17115437000164 | Avianca Brasil | Recuperação Judicial |

---

## 📊 Sistema de Scoring

### **Pesos dos Critérios**:

```javascript
{
  cadastralStatus: 20%,    // Status da Receita Federal
  financialHealth: 25%,    // Saúde financeira
  certificates: 15%,       // Certidões fiscais
  legalIssues: 15%,        // Problemas legais
  companyAge: 5%,          // Idade da empresa
  companySize: 5%,         // Porte da empresa
  riskCompliance: 15%      // Compliance e risco
}
```

### **Classificação**:

| Score | Status | Cor | Ação |
|-------|--------|-----|------|
| 80-100 | ✅ CONFIÁVEL | Verde | Aprovado |
| 50-79 | ⚠️ ATENÇÃO | Amarelo | Análise detalhada |
| 0-49 | 🚨 CRÍTICO | Vermelho | Rejeitado |

### **Penalidades**:

- Recuperação Judicial: **-50 pontos**
- Lista de Sanções: **-30 pontos**
- Trabalho Escravo: **-40 pontos**
- Falência: **-50 pontos** cada
- Protesto: **-15 pontos** cada
- PEP (Pessoa Politicamente Exposta): **-20 pontos**
- Lista de Devedores: **-15 pontos**
- Processo Legal: **-2 pontos** cada (máx -20)

---

## 🚫 Política de Dados Mock

### **❌ SEM DADOS MOCK**

O FornecedorFlow **NÃO utiliza dados fictícios ou mock** para consultas de CNPJ.

**Comportamento em caso de falha**:
```
Se todas as 5 APIs falharem:
  → Sistema retorna ERRO ao usuário
  → Mensagem clara sobre indisponibilidade
  → Orientação para tentar novamente em alguns minutos
  → SEM geração de dados falsos
```

**Motivos**:
- ✅ Garantir confiabilidade total dos dados
- ✅ Evitar decisões baseadas em informações falsas
- ✅ Transparência com o usuário
- ✅ Conformidade com boas práticas

---

## 🔧 Tratamento de Erros

### **Erros Específicos**:

```typescript
// 404 - CNPJ não encontrado
throw new Error('CNPJ não encontrado nos registros da Receita Federal');

// 429 - Limite de requisições
throw new Error('Limite de requisições excedido. Aguarde alguns minutos.');

// 500+ - Serviço indisponível
throw new Error('Serviços temporariamente indisponíveis. Tente novamente.');

// Todas APIs falharam
throw new Error('Não foi possível obter dados. Todas as fontes falharam.');
```

### **Logs Detalhados**:

```
🔍 Trying OpenCNPJ API...
✅ Data retrieved from OpenCNPJ API

ou

🔍 Trying OpenCNPJ API...
❌ OpenCNPJ API failed: [erro]
🔍 Trying BrasilAPI...
✅ Data retrieved from BrasilAPI
```

---

## 📈 Performance

### **Tempos de Resposta Esperados**:

| API | Tempo Médio | Timeout |
|-----|-------------|---------|
| OpenCNPJ | 50-200ms | 15s |
| BrasilAPI | 100-500ms | 15s |
| CNPJá | 200-800ms | 15s |
| ReceitaWS | 300-1000ms | 15s |
| CNPJ.ws | 500-2000ms | 15s |

### **Otimizações**:
- ✅ Timeout de 15 segundos por API
- ✅ Tentativa sequencial (não paralela) para respeitar rate limits
- ✅ Cache implícito nas próprias APIs
- ✅ Logs detalhados para debugging

---

## 🔒 Segurança

### **Validação de Dados**:
- ✅ Esquemas Zod para validação rigorosa
- ✅ Tipagem TypeScript completa
- ✅ Sanitização de CNPJ (remoção de caracteres especiais)
- ✅ Validação de formato antes de consultar APIs

### **Autenticação**:
- ✅ Middleware `isAuthenticated` em todas as rotas
- ✅ Sessões persistidas em PostgreSQL
- ✅ Proteção contra acesso não autorizado

### **Rate Limiting**:
- ✅ Respeitadas os limites de cada API
- ✅ Mensagens claras em caso de limite excedido
- ✅ Delay automático entre requisições (quando necessário)

---

## 📝 Exemplos de Uso

### **Consulta Simples**:

```typescript
import { cnpjService } from './services/cnpjService';

const supplierData = await cnpjService.getSupplierData('00.000.000/0001-91');

console.log(supplierData.companyName);
console.log(supplierData.legalStatus);
console.log(supplierData.partners);
```

### **Análise Completa**:

```typescript
const analysis = await cnpjService.getComprehensiveAnalysis('00.000.000/0001-91');

console.log(analysis.cadastralStatus);
console.log(analysis.financialHealth);
console.log(analysis.certificates);
console.log(analysis.legalIssues);
console.log(analysis.riskAnalysis);
```

### **Scoring**:

```typescript
import { scoringService } from './services/scoringService';

const score = scoringService.calculateRiskScore(supplier, analysis);

console.log(`Score: ${score}%`);
console.log(`Status: ${scoringService.getScoreClassification(score)}`);
```

---

## 🌐 Links Úteis

| Recurso | Link |
|---------|------|
| OpenCNPJ Docs | https://opencnpj.org/ |
| OpenCNPJ GitHub | https://github.com/Hitmasu/OpenCNPJ |
| BrasilAPI Docs | https://brasilapi.com.br/docs |
| BrasilAPI GitHub | https://github.com/BrasilAPI/BrasilAPI |
| CNPJá API | https://cnpja.com/api |
| ReceitaWS | https://receitaws.com.br/ |
| CNPJ.ws | https://www.cnpj.ws/ |

---

## 📞 Suporte

Para questões sobre as APIs:
- OpenCNPJ: Issues no GitHub
- BrasilAPI: Discord da comunidade
- CNPJá: Suporte no site oficial
- ReceitaWS: Documentação oficial

---

**Última Atualização**: Março 2026
**Versão**: 2.0.0 (SEM DADOS MOCK)
