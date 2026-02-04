-- RPC para lista distinta de nome_unidade_executante (regulação)
-- A coluna nome_unidade_executante já existe na tabela approval_records.
-- Executar no SQL Editor do Supabase (Dashboard → SQL Editor).

CREATE OR REPLACE FUNCTION get_distinct_nome_unidade_executante()
RETURNS SETOF text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT DISTINCT nome_unidade_executante
  FROM public.approval_records
  WHERE nome_unidade_executante IS NOT NULL AND trim(nome_unidade_executante) != ''
  ORDER BY nome_unidade_executante;
$$;

GRANT EXECUTE ON FUNCTION get_distinct_nome_unidade_executante() TO anon;
GRANT EXECUTE ON FUNCTION get_distinct_nome_unidade_executante() TO authenticated;
