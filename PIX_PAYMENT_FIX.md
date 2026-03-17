# Fix: PIX Payment e Mudança de Plano em Produção

## 🐛 Problema Identificado

Ao tentar fazer mudança de plano em produção usando PIX como método de pagamento, o sistema apresentava erro ou comportamento incorreto.

### Causas Raiz:

1. **Atualização prematura do plano**: O código estava atualizando o plano do usuário ANTES do pagamento PIX ser confirmado (apenas com status `pending`), o que causava:
   - Usuários recebendo upgrade sem pagar
   - Inconsistência de dados se o pagamento expirasse ou falhasse

2. **Falta de webhook**: Não havia endpoint configurado para receber confirmações de pagamento da Pagar.me quando o PIX fosse efetivamente pago

3. **Falta de rastreamento**: Não havia metadata associada aos pedidos para vincular order → user → plan

## ✅ Solução Implementada

### 1. Correção no Fluxo de Pagamento PIX ([server/routes.ts:561-578](server/routes.ts#L561-L578))

**ANTES:**
```typescript
// Atualizava o plano mesmo com PIX pendente
if (order.status === 'paid' || (paymentMethod === 'pix' && order.status === 'pending')) {
  await storage.updateUser(userId, { plan: plan as any, ... });
}
```

**DEPOIS:**
```typescript
// Só atualiza se realmente pago (cartão)
if (order.status === 'paid') {
  await storage.updateUser(userId, { plan: plan as any, ... });
} else if (paymentMethod === 'pix' && order.status === 'pending') {
  console.log(`[CHECKOUT] PIX payment pending. Waiting for webhook confirmation`);
  // Aguarda webhook para confirmar
}
```

### 2. Adição de Metadata aos Pedidos ([server/routes.ts:543-547](server/routes.ts#L543-L547))

Agora cada pedido carrega informações do usuário e plano:

```typescript
const order = await pagarmeService.createOrder({
  // ... outros params
  metadata: {
    userId: userId,
    plan: plan,
    planName: planInfo.name,
  }
});
```

### 3. Criação de Webhook Endpoint ([server/routes.ts:602-671](server/routes.ts#L602-L671))

Novo endpoint `POST /api/webhooks/pagarme` que:
- Recebe notificações da Pagar.me quando o pagamento é confirmado
- Extrai userId e plan do metadata
- Atualiza o plano automaticamente quando PIX for pago
- Registra a ação no activity log

```typescript
app.post("/api/webhooks/pagarme", async (req: any, res) => {
  const event = req.body;

  if (event.type === 'order.paid' || event.type === 'charge.paid') {
    const metadata = event.data.metadata || {};
    const userId = metadata.userId;
    const plan = metadata.plan;

    if (userId && plan) {
      await storage.updateUser(userId, {
        plan: plan as any,
        apiLimit: planInfo.limit,
        apiUsage: 0,
        planUpdatedAt: new Date()
      });

      // Log no activity
      await db.insert(activityLogs).values({ ... });
    }
  }
});
```

### 4. Melhoria na UX do Checkout ([client/src/components/CheckoutDialog.tsx:212-220](client/src/components/CheckoutDialog.tsx#L212-L220))

Mensagem mais clara para o usuário:
- Informa que o QR Code expira em 1 hora
- Explica que o plano será liberado automaticamente
- Adiciona botões de voltar e fechar

## 📋 Passos para Deploy

### 1. Configure o Webhook no Pagar.me

No dashboard da Pagar.me (https://dashboard.pagar.me):
1. Vá em **Configurações** → **Webhooks**
2. Adicione uma nova URL de webhook:
   - **URL**: `https://seu-dominio.vercel.app/api/webhooks/pagarme`
   - **Eventos**: Selecione `order.paid` e `charge.paid`
3. Salve a configuração

### 2. Teste o Fluxo em Ambiente de Teste

```bash
# 1. Inicie o servidor local
npm run dev

# 2. Use ngrok para expor localmente (para testar webhooks)
npx ngrok http 5000

# 3. Configure a URL do ngrok como webhook temporário no Pagar.me

# 4. Teste um pagamento PIX
```

### 3. Verifique Variáveis de Ambiente

Certifique-se de que estas variáveis estão configuradas no Vercel:
- `PAGARME_SECRET_KEY`: Sua chave secreta da Pagar.me
- `PAGARME_PUBLIC_KEY`: Sua chave pública (se usar tokenização no frontend)

### 4. Deploy para Produção

```bash
git add .
git commit -m "Fix: PIX payment flow and webhook integration"
git push origin main
```

## 🧪 Como Testar

### Teste de Pagamento PIX:

1. Faça login no sistema
2. Vá para a página de Pricing
3. Selecione um plano pago (Basic, Professional ou Enterprise)
4. Escolha "PIX" como método de pagamento
5. Preencha o CPF/CNPJ
6. Clique em "Gerar QR Code Pix"
7. Você deverá ver:
   - QR Code gerado
   - Código copia-e-cola
   - Mensagem informando que expira em 1 hora
8. **NÃO PAGUE AINDA** - verifique que o plano do usuário NÃO foi atualizado
9. Simule um pagamento no ambiente de teste da Pagar.me
10. Aguarde a confirmação via webhook
11. Verifique que o plano foi atualizado automaticamente

### Verificar Logs do Webhook:

```bash
# No Vercel, vá para: Project → Functions → Logs
# Procure por logs que começam com [WEBHOOK]
```

## 🔍 Monitoramento

### Logs Importantes:

- `[CHECKOUT] PIX payment pending` - PIX gerado com sucesso
- `[WEBHOOK] Payment confirmed for order` - Webhook recebido
- `[WEBHOOK] User X plan upgraded to Y via PIX payment` - Upgrade realizado

### Activity Logs no Banco:

Agora registramos no `activity_logs`:
- `action: 'plan_upgrade_pix'` - Quando upgrade via PIX é confirmado
- `resource: 'payment'`
- `details: { plan, orderId, orderCode }`

## 🚨 Problemas Conhecidos & Soluções

### "PIX não disponível em conta de teste"

**Causa**: As chaves da Pagar.me em teste podem não ter PIX habilitado

**Solução**:
1. Use chaves de produção (com cuidado!)
2. OU ative PIX no dashboard de teste da Pagar.me
3. OU use Cartão de Crédito para testes

### Webhook não está sendo chamado

**Causa**: URL não configurada ou firewall bloqueando

**Solução**:
1. Verifique a URL no dashboard da Pagar.me
2. Teste manualmente com curl:
   ```bash
   curl -X POST https://seu-dominio.vercel.app/api/webhooks/pagarme \
     -H "Content-Type: application/json" \
     -d '{"type":"order.paid","data":{"id":"test","code":"test","metadata":{"userId":"1","plan":"basic"}}}'
   ```

### Plano não atualiza após pagamento

**Causa**: Metadata não está sendo enviada corretamente

**Solução**:
1. Verifique os logs do Pagar.me
2. Confirme que `metadata.userId` e `metadata.plan` estão presentes
3. Verifique os logs do webhook no Vercel

## 📝 Arquivos Modificados

- ✅ `server/routes.ts` - Corrigido fluxo de pagamento + webhook
- ✅ `server/services/pagarmeService.ts` - Adicionado suporte a metadata
- ✅ `client/src/components/CheckoutDialog.tsx` - Melhorada UX do PIX

## 🎯 Próximos Passos (Opcional)

1. **Tabela de pending_orders**: Criar tabela dedicada para rastrear pedidos pendentes
2. **Polling de status**: Implementar polling no frontend para atualizar automaticamente quando PIX for pago
3. **Notificação por email**: Enviar email quando plano for upgradado
4. **Verificação de assinatura webhook**: Validar signature dos webhooks da Pagar.me para segurança
5. **Retry logic**: Implementar retry automático caso webhook falhe

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs no Vercel
2. Verifique o dashboard da Pagar.me
3. Consulte a documentação: https://docs.pagar.me/docs/webhooks-1
