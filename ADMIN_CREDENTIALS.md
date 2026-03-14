# 🔐 Credenciais do Administrador

## ✅ Administrador Criado com Sucesso!

### Informações de Acesso

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 CREDENCIAIS DE ACESSO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Usuário:   admin
Email:     admin@fornecedorflow.com
Senha:     Admin@2026

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 🔗 Link de Acesso

**URL do Painel:** http://localhost:5000/admin/login

### 📝 Como Acessar

1. Certifique-se de que o servidor está rodando:
   ```bash
   npm run dev
   ```

2. Abra o navegador e acesse:
   ```
   http://localhost:5000/admin/login
   ```

3. Faça login com as credenciais acima:
   - **Usuário:** admin
   - **Senha:** Admin@2026

### ⚠️ IMPORTANTE - Segurança

**ALTERE A SENHA IMEDIATAMENTE APÓS O PRIMEIRO LOGIN!**

Por questões de segurança:
1. ✅ Use uma senha forte e única
2. ✅ Não compartilhe as credenciais
3. ✅ Delete este arquivo após anotar as credenciais
4. ✅ Em produção, remova a rota `POST /api/admin/create`

### 🎯 O Que Você Pode Fazer no Painel

#### Dashboard
- ✅ Ver total de usuários
- ✅ Acompanhar validações realizadas
- ✅ Monitorar receita mensal (MRR)
- ✅ Verificar alertas ativos

#### Gestão de Usuários
- ✅ Listar todos os usuários
- ✅ Ver planos utilizados
- ✅ Verificar uso de API
- ✅ Consultar histórico de login

#### Análises
- ✅ Status das validações
- ✅ Serviços mais utilizados
- ✅ Uso total de API
- ✅ Métricas de uso

#### Logs de Atividade
- ✅ Histórico completo de ações
- ✅ Auditoria de usuários e admins
- ✅ Rastreamento de IP e User Agent
- ✅ Detalhes de cada operação

#### Receita
- ✅ Receita total da plataforma
- ✅ Receita por plano
- ✅ MRR (Monthly Recurring Revenue)
- ✅ Distribuição de usuários pagantes

### 🔄 Criar Mais Administradores

Se precisar criar mais administradores no futuro, execute:

```bash
npm run create-admin
```

Ou use o script rápido:

```bash
npx tsx scripts/quick-create-admin.ts
```

### 🆘 Problemas?

#### Esqueci a senha
1. Conecte ao banco de dados
2. Delete o registro do administrador:
   ```sql
   DELETE FROM admins WHERE username = 'admin';
   ```
3. Execute novamente: `npx tsx scripts/quick-create-admin.ts`

#### Não consigo fazer login
- Verifique se o servidor está rodando
- Confirme que as credenciais estão corretas
- Verifique o console do navegador para erros
- Revise os logs do servidor

#### Erro 401
- Faça logout e login novamente
- Limpe os cookies do navegador
- Verifique se a sessão não expirou

---

**Data de Criação:** 08/03/2026
**ID do Admin:** c789f783-c243-4faf-b3ff-93248f3e4786

🔒 **Mantenha este arquivo seguro ou delete após anotar as credenciais!**
