# 🚀 Guia de Deploy na Vercel - FornecedorFlow

## 📋 Pré-requisitos

- [ ] Conta na [Vercel](https://vercel.com)
- [ ] Repositório GitHub com o código
- [ ] Banco de dados Supabase configurado
- [ ] Chaves API do Pagar.me (produção)

---

## ⚙️ Configuração Inicial

### 1. **Importar Projeto na Vercel**

```bash
# Opção 1: Via CLI
npm i -g vercel
vercel login
vercel

# Opção 2: Via Dashboard (Recomendado)
# Acesse https://vercel.com/new
# Selecione seu repositório GitHub
```

### 2. **Configurar Variáveis de Ambiente**

No dashboard da Vercel, vá em **Settings → Environment Variables** e adicione:

#### 🔴 **Obrigatórias**

```bash
# Database (Supabase PostgreSQL)
DATABASE_URL=postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:6543/postgres

# Supabase Client SDK
VITE_SUPABASE_URL=https://PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Session Security
SESSION_SECRET=<gerar-secret-forte-64-caracteres>

# Environment
NODE_ENV=production

# Public URL
PUBLIC_URL=https://seu-projeto.vercel.app
```

#### 💳 **Pagamentos (Pagar.me)**

⚠️ **IMPORTANTE:** Usar chaves de PRODUÇÃO (não teste)

```bash
PAGARME_PUBLIC_KEY=pk_live_XXXXXXXXXXXXXXXX
PAGARME_SECRET_KEY=sk_live_XXXXXXXXXXXXXXXX
```

#### 📊 **Dados de Mercado (Opcional)**

```bash
# HG Brasil Finance API
HG_BRASIL_API_KEY=sua-key-hg-brasil

# Brapi (Ações B3)
BRAPI_API_KEY=74wYAMWB6PDfgqeWTnxS9v
```

---

## 🔧 Arquitetura Serverless

### **Estrutura do Projeto para Vercel:**

```
FornecedorFlow/
├── api/
│   └── index.ts          # ⭐ Serverless Function Handler
├── server/
│   ├── index.ts          # Servidor local (dev)
│   ├── routes.ts         # Rotas Express
│   └── services/         # Serviços (CNPJ, Pagar.me, etc)
├── client/               # React App
├── dist/
│   └── public/           # Build do frontend
├── vercel.json           # Configuração Vercel
└── package.json
```

### **Como Funciona:**

1. **Frontend (SPA):** Build do React vai para `dist/public/`
2. **Backend API:** Serverless function em `api/index.ts` processa todas as requisições `/api/*`
3. **Rotas:** Configuradas em `vercel.json` para redirecionar corretamente

---

## 📦 Arquivos de Configuração

### 1. **`vercel.json`**

```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "dist/public",
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "regions": ["gru1"]
}
```

**Região `gru1`**: São Paulo (menor latência para Brasil)

### 2. **`api/index.ts`** - Handler Serverless

```typescript
import "dotenv/config";
import express from "express";
import { registerRoutes } from "../server/routes";

const app = express();
app.use(express.json());

let routesRegistered = false;
async function setupRoutes() {
  if (!routesRegistered) {
    await registerRoutes(app);
    routesRegistered = true;
  }
}

// Vercel serverless function handler
export default async function handler(req, res) {
  await setupRoutes();
  return app(req, res);
}
```

### 3. **Build Settings no Dashboard**

Configure em **Settings → General**:

```
Framework Preset: Other
Build Command: npm run build
Output Directory: dist/public
Install Command: npm install
Development Command: npm run dev
Node.js Version: 20.x
```

---

## 🎯 Deploy

### **Deploy Automático (Recomendado)**

Cada push para a branch `main` faz deploy automaticamente:

```bash
git add .
git commit -m "fix: configurar serverless functions para vercel"
git push origin main
```

### **Deploy Manual via CLI**

```bash
# Deploy para preview
vercel

# Deploy para produção
vercel --prod
```

---

## ✅ Checklist Pós-Deploy

### 1. **Testar Frontend**

```
https://seu-projeto.vercel.app
```

Deve carregar a landing page.

### 2. **Testar API de CNPJ**

```bash
curl https://seu-projeto.vercel.app/api/validate \
  -H "Content-Type: application/json" \
  -d '{"cnpj":"33000167000101"}'
```

**Resposta esperada:** Dados da Petrobras

### 3. **Verificar Logs da Vercel**

No dashboard:
- **Runtime Logs** → Erros de execução
- **Build Logs** → Erros de build

### 4. **Testar Autenticação**

- Acesse `/login`
- Crie uma conta
- Faça login
- Verifique se o token persiste

---

## 🐛 Troubleshooting

### **Erro 404: NOT_FOUND**

**Causa:** A Vercel não encontra os arquivos ou rotas estão incorretas.

**Soluções:**

1. **Verificar se o build gerou `dist/public/`:**
```bash
npm run build
ls dist/public/
```

2. **Verificar `vercel.json`:**
```json
{
  "outputDirectory": "dist/public",  // ✅ Correto
  "rewrites": [...]
}
```

3. **Verificar se `api/index.ts` existe:**
```bash
ls api/index.ts
```

4. **Verificar logs de build na Vercel:**
- Dashboard → Deployments → Clique no último deploy → Build Logs

### **Erro: "Cannot find module '@shared/schema'"**

**Causa:** Path alias `@shared` não configurado.

**Solução:** Adicionar em `tsconfig.json`:
```json
{
  "compilerOptions": {
    "paths": {
      "@shared/*": ["./shared/*"]
    }
  }
}
```

### **Erro: "Database connection failed"**

**Causas possíveis:**
1. `DATABASE_URL` não configurada
2. Senha com caracteres especiais (encode com `%XX`)
3. IP da Vercel bloqueado no Supabase

**Solução:**
```bash
# Supabase → Project Settings → Database → Connection Pooling
# Use a connection string de "Session Mode" (porta 6543)
# Exemplo: postgresql://postgres:PASSWORD@db.xxx.supabase.co:6543/postgres
```

### **APIs de CNPJ retornando erro 429**

**Causa:** Rate limiting das APIs públicas

**Soluções:**
1. Implementar cache (ver seção de otimizações)
2. APIs já têm fallback automático (OpenCNPJ → BrasilAPI → CNPJá → ReceitaWS)

---

## 🚀 Otimizações

### **1. Cache com Vercel KV (Redis)**

```bash
npm install @vercel/kv
```

```typescript
import { kv } from '@vercel/kv';

// Cache de 1 hora para dados de CNPJ
const cached = await kv.get(`cnpj:${cnpj}`);
if (cached) return cached;

const data = await fetchCnpjData(cnpj);
await kv.set(`cnpj:${cnpj}`, data, { ex: 3600 });
```

### **2. Serverless Function Configuration**

Em `api/index.ts`, adicionar:

```typescript
export const config = {
  maxDuration: 30,        // 30 segundos (Pro plan)
  memory: 1024,           // 1GB RAM
  regions: ['gru1'],      // São Paulo
};
```

### **3. Edge Middleware (Opcional)**

Para proteção de rotas:

```typescript
// middleware.ts
import { NextResponse } from 'next/server';

export function middleware(request) {
  const token = request.cookies.get('session');
  if (!token) {
    return NextResponse.redirect('/login');
  }
}

export const config = {
  matcher: ['/dashboard/:path*', '/validate/:path*']
};
```

---

## 💰 Custos Estimados

### **Vercel Hobby (Free)**
- ✅ 100 GB bandwidth/mês
- ✅ Serverless Functions ilimitadas (10s limite)
- ⚠️ Sem KV/Redis (cache)

### **Vercel Pro ($20/mês)**
- ✅ 1 TB bandwidth
- ✅ 30 segundos por função
- ✅ Vercel KV incluído (cache)
- ✅ Analytics avançado

### **Estimativa Real para 1.000 validações/dia:**
- **Vercel:** Free tier suficiente
- **Supabase:** Free tier (500MB DB)
- **APIs públicas:** Grátis

**Total:** R$ 0/mês (até escalar)

---

## 🔄 CI/CD

### **Preview Deployments**

Cada PR cria um preview:
```
https://fornecedor-flow-git-feature-usuario.vercel.app
```

### **Production Deploy**

Apenas pushes para `main` vão para produção:
```
https://fornecedor-analise.vercel.app
```

---

## 📊 Monitoramento

### **1. Logs em Tempo Real**

```bash
vercel logs --follow
```

### **2. Vercel Analytics**

Dashboard → Analytics:
- Requests por dia
- Tempo de resposta (P50, P95, P99)
- Errors 4xx/5xx
- Bandwidth usage

### **3. Uptime Monitoring Externo**

Recomendado:
- **Better Uptime** (free)
- **UptimeRobot** (free)

Monitorar endpoint:
```
https://seu-projeto.vercel.app/api/health
```

---

## 🔐 Segurança

### **1. Variáveis de Ambiente**

✅ Nunca commitar `.env`
✅ Usar variáveis de ambiente da Vercel
✅ Prefixo `VITE_` para variáveis client-side

### **2. CORS** (se necessário)

Em `api/index.ts`:

```typescript
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.PUBLIC_URL);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});
```

### **3. Rate Limiting**

```bash
npm install express-rate-limit
```

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // 100 requests
});

app.use('/api/', limiter);
```

---

## 📞 Suporte

### **Documentação**
- [Vercel Docs](https://vercel.com/docs)
- [Serverless Functions](https://vercel.com/docs/functions/serverless-functions)

### **Community**
- [Vercel Discord](https://vercel.com/discord)

---

## ✅ Resumo Final

### **Arquivos Criados:**
- ✅ `vercel.json` - Configuração de rotas e build
- ✅ `api/index.ts` - Serverless function handler
- ✅ `.vercelignore` - Arquivos excluídos do deploy

### **Passos para Deploy:**
1. Push código para GitHub
2. Conectar repositório na Vercel
3. Configurar variáveis de ambiente
4. Deploy automático!

---

**Última atualização:** 2026-03-14
**Versão:** 2.0.0 (Serverless)
