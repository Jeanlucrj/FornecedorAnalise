-- Script SQL para atualizar dados de mercado da Bombril
-- Execute este script no seu banco de dados PostgreSQL

-- Atualizar validações da Bombril com dados de mercado
UPDATE validations
SET
  financial_market_data = jsonb_build_object(
    'ticker', 'BOBR4',
    'price', 1.21,
    'marketCap', 287693767,
    'currency', 'BRL',
    'updatedAt', NOW(),
    'source', 'Brapi'
  ),
  updated_at = NOW()
WHERE supplier_id IN (
  SELECT id FROM suppliers WHERE cnpj = '60108714000105'
);

-- Verificar os registros atualizados
SELECT
  v.id,
  s.company_name,
  s.cnpj,
  v.financial_market_data,
  v.updated_at
FROM validations v
JOIN suppliers s ON v.supplier_id = s.id
WHERE s.cnpj = '60108714000105';
