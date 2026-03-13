# Cartões de Teste - Pagar.me

## ⚠️ IMPORTANTE: Use estes cartões para testar pagamentos

Os cartões abaixo são fornecidos pela Pagar.me para testes em ambiente sandbox (sk_test_*).

**NUNCA** use cartões reais em ambiente de teste!

## 📋 Cartões de Teste Válidos

### ✅ Cartões Aprovados

#### Visa (Aprovado)
```
Número: 4000 0000 0000 0010
Validade: 12/2030
CVV: 123
Nome: TESTE DA SILVA
```

#### Mastercard (Aprovado)
```
Número: 5555 4444 3333 1111
Validade: 12/2030
CVV: 123
Nome: TESTE DA SILVA
```

#### Elo (Aprovado)
```
Número: 6362 9720 0000 0005
Validade: 12/2030
CVV: 123
Nome: TESTE DA SILVA
```

### ❌ Cartões Recusados (Para testar cenários de erro)

#### Recusado - Fundos Insuficientes
```
Número: 4000 0000 0000 0028
Validade: 12/2030
CVV: 123
```

#### Recusado - Genérico
```
Número: 4000 0000 0000 0036
Validade: 12/2030
CVV: 123
```

## 🔐 Dados do Titular (Para todos os cartões)

```
CPF: 123.456.789-09
Nome: TESTE DA SILVA
Email: teste@fornecedorflow.com.br
Telefone: (11) 99999-9999
```

## 📍 Endereço (Para todos os cartões)

```
CEP: 01310-100
Rua: Avenida Paulista
Número: 1000
Bairro: Bela Vista
Cidade: São Paulo
Estado: SP
```

## 🧪 Como Usar

### No Frontend:
1. Acesse a página de pricing
2. Escolha um plano
3. Selecione "Cartão de Crédito"
4. Preencha com os dados de teste acima
5. Clique em "Pagar Agora"

### Via Script de Teste:
```bash
cd FornecedorFlow
npx tsx test_credit_card_payment.ts
```

## ⚠️ Cartões INVÁLIDOS (NÃO USAR)

Estes cartões **NÃO** funcionam na Pagar.me:
- ❌ 5100 0000 0000 0001 (Mastercard inválido)
- ❌ 4111 1111 1111 1111 (Comum em outros gateways, mas não aceito pela Pagar.me)

## 📚 Referência Oficial

Para mais informações sobre testes na Pagar.me:
https://docs.pagar.me/docs/realizando-testes

## 🔄 Status do Pedido

### Cartão Aprovado:
- Status da Order: `paid`
- Status do Charge: `paid`
- Status da Transaction: `captured`

### Cartão Recusado:
- Status da Order: `failed`
- Status do Charge: `failed`
- Gateway Response: Mensagem de erro específica

## 💡 Dicas

1. **Ambiente de Teste**: Certifique-se de estar usando `sk_test_*` no .env
2. **Dashboard**: Acesse https://dashboard.pagar.me/ para ver as transações
3. **Webhook**: Configure webhook para receber notificações de status
4. **Logs**: Verifique `pagarme_debug.txt` para debug detalhado
