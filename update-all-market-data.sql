-- Script para atualizar dados de mercado em validações existentes
-- Execute este script no seu banco PostgreSQL

-- Atualizar Bombril
UPDATE validations
SET financial_market_data = jsonb_build_object(
    'ticker', 'BOBR4',
    'price', 1.21,
    'marketCap', 287693767,
    'currency', 'BRL',
    'updatedAt', NOW(),
    'source', 'Brapi'
  ),
  updated_at = NOW()
WHERE supplier_id IN (SELECT id FROM suppliers WHERE cnpj = '60108714000105');

-- Atualizar Petrobras
UPDATE validations
SET financial_market_data = jsonb_build_object(
    'ticker', 'PETR4',
    'price', 42.16,
    'marketCap', 564363036574,
    'currency', 'BRL',
    'updatedAt', NOW(),
    'source', 'Brapi'
  ),
  updated_at = NOW()
WHERE supplier_id IN (SELECT id FROM suppliers WHERE cnpj = '33000167000101');

-- Atualizar Vale
UPDATE validations
SET financial_market_data = jsonb_build_object(
    'ticker', 'VALE3',
    'price', 59.50,
    'marketCap', 242000000000,
    'currency', 'BRL',
    'updatedAt', NOW(),
    'source', 'Brapi'
  ),
  updated_at = NOW()
WHERE supplier_id IN (SELECT id FROM suppliers WHERE cnpj = '33592510000154');

-- Atualizar Magazine Luiza
UPDATE validations
SET financial_market_data = jsonb_build_object(
    'ticker', 'MGLU3',
    'price', 9.45,
    'marketCap', 63000000000,
    'currency', 'BRL',
    'updatedAt', NOW(),
    'source', 'Brapi'
  ),
  updated_at = NOW()
WHERE supplier_id IN (SELECT id FROM suppliers WHERE cnpj = '33041260000192');

-- Verificar os registros atualizados
SELECT
  v.id,
  s.company_name,
  s.cnpj,
  v.financial_market_data->>'ticker' as ticker,
  v.financial_market_data->>'price' as price,
  v.financial_market_data->>'marketCap' as market_cap,
  v.updated_at
FROM validations v
JOIN suppliers s ON v.supplier_id = s.id
WHERE s.cnpj IN ('60108714000105', '33000167000101', '33592510000154', '33041260000192')
ORDER BY v.created_at DESC;
