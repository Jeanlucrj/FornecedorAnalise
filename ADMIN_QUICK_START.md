# 🚀 Guia Rápido - Painel Administrativo

## Passos para Começar

### 1️⃣ Aplicar Migração do Banco de Dados

Execute a migração SQL para criar as tabelas necessárias:

```bash
# Se estiver usando PostgreSQL direto
psql $DATABASE_URL -f migrations/add-admin-tables.sql

# OU usando Drizzle
npx drizzle-kit push
```

### 2️⃣ Adicionar Script no package.json

Abra o arquivo `package.json` e adicione na seção `scripts`:

```json
"create-admin": "tsx scripts/create-admin.ts"
```

### 3️⃣ Criar Primeiro Administrador

Execute o comando:

```bash
npm run create-admin
```

Preencha as informações solicitadas:
```
Nome de usuário: admin
Email: admin@fornecedorflow.com
Senha: SuaSenhaSegura123
```

### 4️⃣ Acessar o Painel

1. Inicie o servidor (se ainda não estiver rodando):
   ```bash
   npm run dev
   ```

2. Abra o navegador em:
   ```
   http://localhost:5000/admin/login
   ```

3. Faça login com as credenciais criadas

## 📊 O Que Você Verá no Painel

### Dashboard Principal
- ✅ Total de usuários da plataforma
- ✅ Número total de validações realizadas
- ✅ Receita mensal recorrente (MRR)
- ✅ Alertas ativos não lidos

### Aba "Usuários"
- Lista completa de todos os usuários
- Distribuição por plano (Free, Pro, Enterprise)
- Uso de API de cada usuário
- Data de cadastro e último login

### Aba "Análises"
- Status das validações (aprovado/atenção/crítico)
- Serviços mais utilizados
- Uso total de API da plataforma

### Aba "Logs de Atividade"
- Últimas 50 ações realizadas no sistema
- Detalhes de cada ação (usuário, timestamp, IP)
- Auditoria completa de atividades

### Aba "Receita"
- Receita total da plataforma
- Receita por plano
- Número de usuários pagantes
- MRR (Monthly Recurring Revenue)

## 🔐 Segurança

- ✅ Autenticação obrigatória para todas as rotas
- ✅ Senhas criptografadas com scrypt
- ✅ Logs de auditoria de todas as ações
- ✅ Sessões seguras com expiração automática
- ✅ Proteção contra acesso não autorizado

## 📝 Notas Importantes

1. **PRODUÇÃO**: Remova ou proteja a rota `POST /api/admin/create` em ambiente de produção
2. **BACKUP**: Faça backup regular da tabela `activity_logs`
3. **SENHAS**: Use senhas fortes e únicas para cada administrador
4. **HTTPS**: Sempre use HTTPS em produção
5. **LOGS**: Revise os logs de atividade regularmente

## ❓ Problemas Comuns

### Não consigo fazer login
- Verifique se o administrador foi criado corretamente
- Confirme que o campo `is_active` está como `true`
- Teste a senha novamente

### Erro 401 nas rotas
- Faça logout e login novamente
- Verifique se a sessão não expirou
- Confirme que o middleware está configurado

### Estatísticas não aparecem
- Verifique a conexão com o banco de dados
- Confirme que as tabelas foram criadas
- Revise os logs do servidor no console

---

**Pronto!** Seu painel administrativo está configurado e funcionando! 🎉
