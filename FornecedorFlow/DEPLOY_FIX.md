# 🔧 Fix para Erro 404 na Vercel

## ❌ Problema

Build na Vercel estava completando em 254ms sem executar `npm run build`, resultando em erro 404.

```
15:57:09.714 Build Completed in /vercel/output [254ms]
15:57:12.053 Deployment completed
```

## ✅ Solução Aplicada

### **Arquivos Modificados:**

#### 1. **`vercel.json`**
- Removido `version: 2` (deprecated)
- Removido `regions` (será configurado no dashboard)
- Simplificado `rewrites` para apenas `/api/*`

#### 2. **`api/index.ts`**
- Removido import desnecessário de `serveStatic`
- Mantido handler serverless limpo

#### 3. **`api/tsconfig.json`** (NOVO)
- Configuração TypeScript específica para serverless functions
- Extends do tsconfig.json principal
- `noEmit: false` para permitir compilação

### **Estrutura Final:**

```
FornecedorFlow/
├── api/
│   ├── index.ts           # Serverless Function
│   └── tsconfig.json      # Config TS para API
├── client/                # React App
├── server/                # Express routes (usado pela api/)
├── dist/
│   └── public/            # Build do Vite
├── vercel.json            # Config simplificada
└── package.json
```

## 🚀 Como Fazer Deploy

### **1. Commit e Push**

```bash
cd FornecedorFlow
git add .
git commit -m "fix: configure Vercel serverless functions correctly"
git push origin feature/ajustes-fornecedor
```

### **2. Configurar no Dashboard da Vercel**

⚠️ **IMPORTANTE:** Acesse o dashboard da Vercel e configure:

**Settings → General → Build & Development Settings:**

```
Framework Preset: Other
Build Command: npm run build
Output Directory: dist/public
Install Command: npm install
Node.js Version: 20.x
```

**Settings → Functions:**

```
Region: São Paulo (GRU) - gru1
```

### **3. Verificar Variáveis de Ambiente**

**Settings → Environment Variables:**

Certifique-se de que TODAS estas variáveis estão configuradas:

```
DATABASE_URL=postgresql://postgres:***@db.bpphjypfxbsutccohhhz.supabase.co:6543/postgres
VITE_SUPABASE_URL=https://bpphjypfxbsutccohhhz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
SESSION_SECRET=<secret-64-chars>
NODE_ENV=production
PAGARME_PUBLIC_KEY=pk_***
PAGARME_SECRET_KEY=sk_***
BRAPI_API_KEY=74wYAMWB6PDfgqeWTnxS9v
HG_BRASIL_API_KEY=<sua-key> (opcional)
```

### **4. Forçar Redeploy**

Após configurar:

1. Dashboard → Deployments
2. Clique nos **3 pontinhos** do último deployment
3. **Redeploy**
4. Marque **"Use existing build cache"** como **OFF**

## ✅ O que Esperar no Build

### **Build Logs Corretos:**

```
15:57:07.157 Running build in Portland, USA (West) – pdx1
15:57:08.678 Running "vercel build"
15:57:09.304 Vercel CLI 50.32.4
15:57:10.500 > npm run build

15:57:12.000 > vite build
15:57:15.000 vite v5.4.19 building for production...
15:57:18.000 ✓ 1234 modules transformed.
15:57:20.000 dist/public/index.html                1.23 kB
15:57:20.000 dist/public/assets/index-abc123.js  456.78 kB │ gzip: 123.45 kB
15:57:20.000 ✓ built in 5.23s

15:57:21.000 Compiling Serverless Functions...
15:57:22.000 ✓ api/index.ts compiled successfully
15:57:23.000 Build Completed in /vercel/output [15.2s]
```

**Tempo esperado:** 15-30 segundos (não 254ms!)

## 🧪 Testar Após Deploy

### **1. Frontend:**
```
https://seu-projeto.vercel.app
```
Deve carregar a landing page.

### **2. API:**
```bash
curl https://seu-projeto.vercel.app/api/validate \
  -H "Content-Type: application/json" \
  -d '{"cnpj":"33000167000101"}'
```

Deve retornar dados da Petrobras.

### **3. Serverless Function:**
```bash
curl https://seu-projeto.vercel.app/api/health
```

Deve retornar `{"status":"ok"}` ou similar.

## 🐛 Se Ainda Tiver Erro 404

### **Verificar no Dashboard:**

**Deployments → Último Deploy → Function Logs:**

Procure por:
- Errors de compilação TypeScript
- Imports faltando (módulos não encontrados)
- Path aliases não resolvidos

### **Soluções Comuns:**

#### **Erro: Cannot find module '@shared/schema'**
```bash
# Verificar se shared/ existe
ls shared/

# Se não existir, criar:
mkdir -p shared
```

#### **Erro: Module not found: 'dotenv'**
```bash
# Adicionar dotenv às dependencies (não devDependencies)
npm install dotenv
git add package.json package-lock.json
git commit -m "fix: move dotenv to dependencies"
git push
```

#### **Erro: Cannot find '../server/routes'**
```bash
# Verificar se server/ está no git
git ls-files | grep server/routes.ts

# Se não estiver, adicionar:
git add server/
git commit -m "fix: add server directory"
git push
```

## 📊 Comparação: Antes vs Depois

### **ANTES (Errado):**
```json
{
  "version": 2,
  "builds": [...],
  "routes": [...],
  "regions": ["gru1"]
}
```
- Build não executava
- 404 em todas as rotas

### **DEPOIS (Correto):**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist/public",
  "rewrites": [...]
}
```
- Build executa `vite build`
- Compila serverless function automaticamente
- Frontend e API funcionam

---

**Data:** 2026-03-14
**Status:** ✅ Pronto para redeploy
