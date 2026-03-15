# Guia de Deploy na Vercel - FornecedorFlow

## 🚨 PROBLEMA ATUAL

O deploy está falhando com erro `FUNCTION_INVOCATION_FAILED` porque **as variáveis de ambiente não foram configuradas na Vercel**.

## ✅ SOLUÇÃO - Configurar Variáveis de Ambiente

### Passo 1: Acessar Configurações do Projeto na Vercel

1. Acesse: https://vercel.com/
2. Faça login na sua conta
3. Selecione o projeto: **fornecedor-analise**
4. Vá para: **Settings** → **Environment Variables**

Ou acesse diretamente (substitua `seu-usuario` pelo seu usuário/team):
```
https://vercel.com/seu-usuario/fornecedor-analise/settings/environment-variables
```

### Passo 2: Adicionar Variáveis de Ambiente Obrigatórias

Configure as seguintes variáveis para os ambientes: **Production**, **Preview** e **Development**:

#### 🔴 OBRIGATÓRIAS (sem essas o sistema NÃO funciona)

| Variável | Valor | Descrição |
|----------|-------|-----------|
| `DATABASE_URL` | `postgresql://usuario:senha@host:5432/database?sslmode=require` | URL de conexão com PostgreSQL (Supabase, Neon, Railway, etc.) |
| `SESSION_SECRET` | String aleatória (min 32 caracteres) | Chave secreta para sessões. Gere com: `openssl rand -base64 32` |
| `NODE_ENV` | `production` | Ambiente de execução |

#### 🟡 OPCIONAIS (sistema funciona sem elas, mas com funcionalidades limitadas)

| Variável | Valor | Descrição |
|----------|-------|-----------|
| `BRAPI_API_KEY` | Sua chave da API Brapi | Para dados de mercado de ações |
| `HG_BRASIL_API_KEY` | Sua chave da HG Brasil | Para dados financeiros alternativos |
| `PAGARME_PUBLIC_KEY` | Chave pública Pagar.me | Para processamento de pagamentos |
| `PAGARME_SECRET_KEY` | Chave secreta Pagar.me | Para processamento de pagamentos |
| `VITE_SUPABASE_URL` | URL do projeto Supabase | Se estiver usando Supabase |
| `VITE_SUPABASE_ANON_KEY` | Chave anônima Supabase | Se estiver usando Supabase |

### Passo 3: Obter DATABASE_URL

Escolha um provedor de PostgreSQL:

#### Opção A: Supabase (Recomendado - Grátis)
1. Acesse: https://supabase.com/
2. Crie um novo projeto
3. Vá para: **Settings** → **Database**
4. Copie a **Connection String** (modo URI)
5. Formato: `postgresql://postgres:[SUA-SENHA]@db.[REF].supabase.co:5432/postgres`

#### Opção B: Neon (Alternativa - Grátis)
1. Acesse: https://neon.tech/
2. Crie um novo projeto
3. Copie a **Connection String**
4. Formato: `postgresql://[usuario]:[senha]@[host].neon.tech/[database]?sslmode=require`

#### Opção C: Railway (Alternativa - Trial grátis)
1. Acesse: https://railway.app/
2. Crie um novo PostgreSQL
3. Copie a **DATABASE_URL**

### Passo 4: Gerar SESSION_SECRET

No terminal, execute:
```bash
# Linux/Mac
openssl rand -base64 32

# Windows (PowerShell)
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})

# Node.js (qualquer sistema)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Passo 5: Fazer Redeploy

Após adicionar as variáveis de ambiente:

1. Vá para: **Deployments** no painel da Vercel
2. Clique nos **3 pontos** do último deployment
3. Selecione **Redeploy**

Ou force um novo deploy fazendo um commit:
```bash
git commit --allow-empty -m "chore: trigger redeploy after env vars config"
git push
```

## 🧪 Testar o Deploy

Após o redeploy, teste os endpoints:

### 1. Health Check (verifica DB)
```bash
curl https://fornecedor-analise.vercel.app/api/health
```

**Resposta esperada:**
```json
{
  "status": "ok",
  "database": "connected",
  "diagnostics": {
    "databaseUrlSet": true,
    "sessionSecretSet": true,
    "nodeEnv": "production",
    ...
  }
}
```

### 2. Login (testa autenticação)
```bash
curl -X POST https://fornecedor-analise.vercel.app/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"seu@email.com","password":"sua-senha"}'
```

**Resposta esperada (erro 401 se usuário não existe):**
```json
{
  "message": "E-mail ou senha incorretos"
}
```

**Se ainda retornar erro 500, verifique os logs:**
```bash
vercel logs https://fornecedor-analise.vercel.app --follow
```

## 📊 Migrar Banco de Dados

Após configurar `DATABASE_URL`, você precisa criar as tabelas:

### Opção 1: Via Drizzle (Recomendado)
```bash
# Localmente
npm run db:push
```

### Opção 2: Executar SQL manualmente

Conecte-se ao banco e execute o schema em `shared/schema.ts` ou use o Drizzle Studio:
```bash
npx drizzle-kit studio
```

## ❓ Troubleshooting

### Erro: "FUNCTION_INVOCATION_FAILED"
- **Causa:** Variáveis de ambiente não configuradas
- **Solução:** Siga os passos acima para adicionar `DATABASE_URL` e `SESSION_SECRET`

### Erro: "Database connection failed"
- **Causa:** `DATABASE_URL` inválida ou banco inacessível
- **Solução:** Verifique se a URL está correta e se o IP da Vercel tem permissão no firewall do banco

### Erro: "relation does not exist"
- **Causa:** Tabelas não foram criadas no banco
- **Solução:** Execute `npm run db:push` ou crie as tabelas manualmente

### Login retorna 401 mas deveria funcionar
- **Causa:** Usuário não existe no banco
- **Solução:** Primeiro registre um usuário em `/register`

## 📞 Suporte

Se o problema persistir após seguir este guia:

1. Verifique os logs da Vercel: https://vercel.com/seu-projeto/logs
2. Teste localmente com `npm run dev` e `DATABASE_URL` configurada
3. Verifique se todas as variáveis estão nos 3 ambientes (Production, Preview, Development)

## ✨ Próximos Passos

Após resolver o problema de deploy:

1. ✅ Cadastre um usuário em `/register`
2. ✅ Teste o login
3. ✅ Valide um fornecedor usando CNPJ
4. ✅ Configure as APIs opcionais (Brapi, HG Brasil, Pagar.me)
