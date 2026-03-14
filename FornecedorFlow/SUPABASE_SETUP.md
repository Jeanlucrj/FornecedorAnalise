# Configuração do Supabase Client SDK

Este guia explica como configurar o Supabase Client SDK no projeto.

## 📋 Pré-requisitos

Você precisa ter um projeto Supabase ativo. Se ainda não tem, crie um em [supabase.com](https://supabase.com).

## 🔑 Obter as Credenciais

### 1. Acesse o Dashboard do Supabase

Baseado no seu `DATABASE_URL`, seu projeto está em:
- **Project Reference**: `bpphjypfxbsutccohhhz`
- **Dashboard URL**: https://supabase.com/dashboard/project/bpphjypfxbsutccohhhz

### 2. Navegue até as Configurações de API

1. No menu lateral, clique em **Settings** (⚙️)
2. Clique em **API**

### 3. Copie as Credenciais

Você encontrará duas informações importantes:

#### **Project URL**
```
VITE_SUPABASE_URL=https://bpphjypfxbsutccohhhz.supabase.co
```

#### **Anon/Public Key** (chave pública)
```
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> ⚠️ **Nota**: A chave anon/public é segura para uso no frontend. Ela permite apenas operações autorizadas pelas Row Level Security (RLS) policies.

## 📝 Adicionar ao Arquivo `.env`

Adicione as seguintes variáveis ao seu arquivo `.env`:

```bash
# Supabase Configuration (for client-side SDK)
VITE_SUPABASE_URL=https://bpphjypfxbsutccohhhz.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-aqui
```

## 🚀 Uso no Código

O cliente Supabase já está configurado em `client/src/lib/supabase.ts`.

### Exemplo de Uso

```typescript
import { supabase } from '@/lib/supabase';

// Autenticação
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password',
});

// Query de dados
const { data: users } = await supabase
  .from('users')
  .select('*')
  .limit(10);

// Realtime subscriptions
supabase
  .channel('custom-channel')
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'users' },
    (payload) => console.log('Change received!', payload)
  )
  .subscribe();
```

## 🔒 Segurança

- ✅ A chave `ANON_KEY` é segura para uso público
- ✅ Configure Row Level Security (RLS) no Supabase para proteger seus dados
- ❌ **NUNCA** exponha a `SERVICE_ROLE_KEY` no frontend

## 📚 Recursos

- [Documentação do Supabase](https://supabase.com/docs)
- [Supabase JS Client](https://supabase.com/docs/reference/javascript/introduction)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
