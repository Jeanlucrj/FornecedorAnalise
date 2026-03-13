# Painel Administrativo - FornecedorFlow

## 📋 Visão Geral

O Painel Administrativo do FornecedorFlow é uma interface completa para gerenciamento e monitoramento da plataforma. Apenas administradores autorizados podem acessar este painel.

## 🚀 Configuração Inicial

### 1. Executar Migração do Banco de Dados

Primeiro, você precisa aplicar a migração que adiciona as tabelas necessárias para o painel administrativo:

```bash
# Execute a migração SQL
psql $DATABASE_URL -f migrations/add-admin-tables.sql
```

Ou se preferir usar o Drizzle:

```bash
npm run db:push
```

### 2. Criar o Primeiro Administrador

Execute o script para criar o primeiro administrador do sistema:

```bash
npm run create-admin
```

O script solicitará:
- **Nome de usuário**: Escolha um nome único (ex: admin)
- **Email**: Email do administrador
- **Senha**: Senha segura (mínimo 8 caracteres recomendado)

Exemplo:
```
=== Criar Administrador do Sistema ===

Nome de usuário: admin
Email: admin@fornecedorflow.com
Senha: ********

✅ Administrador criado com sucesso!

Detalhes:
  ID: 550e8400-e29b-41d4-a716-446655440000
  Usuário: admin
  Email: admin@fornecedorflow.com
  Criado em: 2026-03-08T12:00:00.000Z

Você pode fazer login em: /admin/login
```

### 3. Adicionar Script ao package.json

Adicione este script ao seu `package.json`:

```json
{
  "scripts": {
    "create-admin": "tsx scripts/create-admin.ts"
  }
}
```

## 🔐 Acesso ao Painel

### URL de Acesso
```
http://localhost:5000/admin/login
```

### Credenciais
Use o usuário e senha criados no passo anterior.

## 📊 Funcionalidades do Painel

### 1. Dashboard Principal
- **Total de Usuários**: Visualize o número total de usuários cadastrados
- **Validações Totais**: Acompanhe todas as validações realizadas
- **Receita Mensal (MRR)**: Monitore a receita recorrente mensal
- **Alertas Ativos**: Veja alertas não lidos do sistema

### 2. Gestão de Usuários
- Lista completa de todos os usuários
- Detalhes de cada usuário incluindo:
  - Nome e email
  - Plano atual (free, pro, enterprise)
  - Uso de API (atual/limite)
  - Data de cadastro
  - Último login
- Distribuição de usuários por plano

### 3. Análises e Métricas
- **Status das Validações**: Distribuição por status (aprovado, atenção, crítico)
- **Serviços Mais Utilizados**: Top 5 ações mais executadas
- **Uso Total de API**: Total de requisições realizadas
- **Métricas por Período**: Análises dos últimos 7 e 30 dias

### 4. Logs de Atividade
- Histórico completo de ações (últimas 50)
- Informações registradas:
  - Ação executada
  - Tipo de recurso
  - Timestamp
  - Endereço IP
  - User Agent
  - Usuário ou admin responsável

### 5. Métricas de Receita
- Receita total da plataforma
- Receita por plano (Free, Pro, Enterprise)
- Número de usuários por plano
- MRR (Monthly Recurring Revenue)

## 🔒 Segurança

### Autenticação
- Sistema de sessões seguro
- Senhas criptografadas com scrypt
- Verificação de autenticação em todas as rotas

### Autorização
- Middleware `isAdminAuthenticated` protege todas as rotas administrativas
- Apenas administradores ativos podem acessar o painel
- Logout automático em caso de sessão inválida

### Logs de Auditoria
Todas as ações administrativas são registradas com:
- ID do administrador
- Ação executada
- Recurso afetado
- Detalhes da operação
- IP e User Agent
- Timestamp

## 📡 API Endpoints

### Autenticação
- `POST /api/admin/login` - Login de administrador
- `POST /api/admin/logout` - Logout
- `GET /api/admin/auth/check` - Verificar autenticação
- `POST /api/admin/create` - Criar administrador (proteger em produção)

### Estatísticas
- `GET /api/admin/stats` - Estatísticas da plataforma
- `GET /api/admin/analytics/services` - Serviços mais usados
- `GET /api/admin/analytics/usage` - Análise de uso
- `GET /api/admin/analytics/revenue` - Métricas de receita

### Usuários
- `GET /api/admin/users` - Listar todos os usuários
- `GET /api/admin/users/:userId` - Detalhes de um usuário
- `PATCH /api/admin/users/:userId/plan` - Atualizar plano
- `POST /api/admin/users/:userId/reset-usage` - Resetar uso de API

### Logs
- `GET /api/admin/logs` - Buscar logs de atividade

## 🛡️ Boas Práticas

### Produção
1. **Remover ou proteger** a rota `POST /api/admin/create` em produção
2. **Configurar variáveis de ambiente** para segurança adicional
3. **Implementar rate limiting** nas rotas de login
4. **Ativar HTTPS** obrigatoriamente
5. **Backup regular** da tabela `activity_logs`

### Manutenção
1. Revisar logs de atividade regularmente
2. Desativar administradores inativos
3. Rotacionar senhas periodicamente
4. Monitorar tentativas de login falhadas

## 🎨 Interface

### Design
- Interface moderna com Tailwind CSS
- Suporte a tema escuro/claro
- Responsivo para mobile e desktop
- Componentes do shadcn/ui

### Navegação
- **Header**: Logo, título e botão de logout
- **Tabs**: Usuários, Análises, Logs, Receita
- **Cards**: Métricas principais em destaque
- **Tabelas**: Listagens organizadas e filtráveis

## 🔧 Troubleshooting

### Problema: Não consigo fazer login
**Solução**: Verifique se:
- O administrador foi criado corretamente
- A senha está correta
- O campo `is_active` está como `true` no banco

### Problema: Erro 401 ao acessar rotas
**Solução**:
- Faça logout e login novamente
- Verifique se a sessão não expirou
- Confirme que o middleware está configurado

### Problema: Estatísticas não aparecem
**Solução**:
- Verifique a conexão com o banco de dados
- Confirme que as tabelas foram criadas
- Revise os logs do servidor

## 📞 Suporte

Para problemas ou dúvidas sobre o painel administrativo:
1. Verifique os logs de erro no console
2. Revise a documentação da API
3. Consulte os logs de atividade para auditoria

---

**Desenvolvido para FornecedorFlow** | Sistema de Validação de Fornecedores
