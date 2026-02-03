import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ApprovalRecord } from '../../types';

const PAGE_SIZE = 1000;

function getSupabase(): SupabaseClient | null {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return createClient(url, anonKey);
}

/** Converte linha do Supabase (snake_case) para ApprovalRecord. */
function rowToApprovalRecord(row: Record<string, unknown>): ApprovalRecord {
  return {
    codigo_solicitacao: row.codigo_solicitacao ?? '',
    data_solicitacao: (row.data_solicitacao as string) ?? '',
    data_aprovacao: (row.data_aprovacao as string) ?? '',
    nome_unidade_executante: (row.nome_unidade_executante as string) ?? '',
    descricao_sigtap_procedimento: (row.descricao_sigtap_procedimento as string) ?? '',
    descricao_interna_procedimento: (row.descricao_interna_procedimento as string) ?? '',
    nome_grupo_procedimento: (row.nome_grupo_procedimento as string) ?? '',
    status_solicitacao: (row.status_solicitacao as string) ?? '',
    codigo_unidade_executante: (row.codigo_unidade_executante as string) ?? '',
    ...row,
  } as ApprovalRecord;
}

/**
 * Busca todos os registros de aprovação (regulação) no Supabase.
 * Usa paginação para trazer todos os dados; retorna array no formato ApprovalRecord[].
 */
export async function fetchApprovalsFromSupabase(): Promise<ApprovalRecord[]> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error(
      'Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.local.'
    );
  }

  const all: ApprovalRecord[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('approval_records')
      .select('*')
      .range(offset, offset + PAGE_SIZE - 1)
      .order('data_solicitacao', { ascending: true });

    if (error) {
      throw new Error(`Erro ao buscar aprovações no Supabase: ${error.message}`);
    }

    const rows = (data ?? []) as Record<string, unknown>[];
    for (const row of rows) {
      all.push(rowToApprovalRecord(row));
    }

    hasMore = rows.length === PAGE_SIZE;
    offset += PAGE_SIZE;
  }

  return all;
}

/** Retorna true se Supabase estiver configurado (prioridade sobre Drive). */
export function isSupabaseConfigured(): boolean {
  return !!(
    import.meta.env.VITE_SUPABASE_URL &&
    import.meta.env.VITE_SUPABASE_ANON_KEY
  );
}
