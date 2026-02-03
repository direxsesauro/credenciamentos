import { ApprovalRecord } from '../../types';

/**
 * DESATIVADO: A leitura do CSV de regulação no Google Drive foi desativada.
 * Os dados de aprovação/regulação passaram a ser consumidos do Supabase
 * (services/supabase/regulacao-approvals.service.ts).
 * O código abaixo permanece comentado para referência ou reativação futura.
 */

/** Formato antigo: um único dia (objeto com sucesso, mensagem, dados). */
interface DriveJsonResponseSingle {
  sucesso?: boolean;
  mensagem?: string;
  dados?: ApprovalRecord[];
}

/** Formato novo (com wrapper): array de dias com data_consulta e resultado. */
interface DriveJsonDayEntryWithResultado {
  data_consulta: string;
  resultado: {
    sucesso?: boolean;
    mensagem?: string;
    dados?: ApprovalRecord[];
  };
}

/** Formato novo (flat): array de dias onde cada item é { sucesso, mensagem, dados }. */
interface DriveJsonDayEntryFlat {
  sucesso?: boolean;
  mensagem?: string;
  dados?: ApprovalRecord[];
}

type DriveJsonResponse = DriveJsonResponseSingle | DriveJsonDayEntryWithResultado[] | DriveJsonDayEntryFlat[];

interface CacheData {
  data: ApprovalRecord[];
  timestamp: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutos
let cache: CacheData | null = null;

function extractFileId(input: string): string {
  if (!input || !input.trim()) {
    throw new Error('File ID não pode estar vazio.');
  }
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return trimmed;
  }
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /id=([a-zA-Z0-9_-]+)/,
    /\/folders\/([a-zA-Z0-9_-]+)/,
    /\/u\/\d+\/folders\/([a-zA-Z0-9_-]+)/,
  ];
  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match && match[1]) return match[1];
  }
  return trimmed;
}

/** Parse de uma linha CSV respeitando aspas (valores com vírgula dentro de "..."). */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += c;
    }
  }
  result.push(current.trim().replace(/^"|"$/g, ''));
  return result;
}

/**
 * Parse do CSV de regulação. Cabeçalho na primeira linha; colunas esperadas:
 * descricao_interna_procedimento, data_aprovacao, nome_unidade_executante,
 * data_solicitacao, codigo_solicitacao, nome_grupo_procedimento,
 * descricao_sigtap_procedimento, status_solicitacao.
 * Apenas essas colunas são mapeadas para ApprovalRecord.
 */
function parseCsvToApprovalRecords(csvText: string): ApprovalRecord[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) {
    console.warn('[RegulacaoDrive] CSV com menos de 2 linhas (cabeçalho + dados)');
    return [];
  }
  const headerLine = lines[0];
  const headers = parseCsvLine(headerLine).map((h) => (h || '').trim());
  const colIndex: Record<string, number> = {};
  for (let j = 0; j < headers.length; j++) {
    const key = headers[j] || `col_${j}`;
    colIndex[key] = j;
  }
  const records: ApprovalRecord[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const get = (col: string) => (colIndex[col] !== undefined ? (values[colIndex[col]] ?? '').trim() : '');
    const row: ApprovalRecord = {
      descricao_interna_procedimento: get('descricao_interna_procedimento'),
      data_aprovacao: get('data_aprovacao'),
      nome_unidade_executante: get('nome_unidade_executante'),
      data_solicitacao: get('data_solicitacao'),
      codigo_solicitacao: get('codigo_solicitacao') || '',
      nome_grupo_procedimento: get('nome_grupo_procedimento'),
      descricao_sigtap_procedimento: get('descricao_sigtap_procedimento'),
      status_solicitacao: get('status_solicitacao') || undefined,
    };
    records.push(row);
  }
  return records;
}

/**
 * Busca o arquivo de regulação/aprovações no Google Drive (CSV).
 * DESATIVADO: regulação passou a ser lida do Supabase. Código comentado abaixo.
 */
export async function fetchApprovalsFromDrive(): Promise<ApprovalRecord[]> {
  throw new Error('Leitura de regulação via CSV do Drive está desativada. Use Supabase (VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY).');
  /*
  const apiKey = import.meta.env.VITE_GOOGLE_DRIVE_API_KEY;
  const fileIdInput = import.meta.env.VITE_GOOGLE_DRIVE_JSON_REG_ID;

  const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

  if (!apiKey || !fileIdInput) {
    const missingVars = [];
    if (!apiKey) missingVars.push('VITE_GOOGLE_DRIVE_API_KEY');
    if (!fileIdInput) missingVars.push('VITE_GOOGLE_DRIVE_JSON_REG_ID');
    const errorMsg = isProduction
      ? `Variáveis de ambiente não configuradas: ${missingVars.join(', ')}. Configure em: Settings > Environment Variables`
      : `Google Drive API Key ou JSON Reg ID não configurados. Verifique ${missingVars.join(' e ')}.`;
    throw new Error(errorMsg);
  }

  let fileId: string;
  try {
    fileId = extractFileId(fileIdInput);
  } catch {
    throw new Error('Formato inválido do File ID. Forneça o ID do arquivo ou a URL completa do Google Drive.');
  }

  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    console.log('[RegulacaoDrive] Retornando do cache:', cache.data.length, 'registros');
    return cache.data;
  }

  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`;
  console.log('[RegulacaoDrive] Buscando arquivo no Google Drive, fileId:', fileId);

  const response = await fetch(url);
  console.log('[RegulacaoDrive] Fetch status:', response.status, response.statusText);

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    if (response.status === 404) {
      throw new Error(`Arquivo não encontrado no Google Drive. Verifique o File ID: ${fileId}.`);
    }
    if (response.status === 403) {
      throw new Error('Acesso negado ao arquivo. Verifique se o arquivo está compartilhado publicamente e se a API Key está correta.');
    }
    if (response.status === 400) {
      throw new Error(`Requisição inválida. O ID pode ser de uma pasta, não de um arquivo. File ID: ${fileId}`);
    }
    throw new Error(`Erro ao buscar arquivo: ${response.status} ${response.statusText}. ${errorText.substring(0, 100)}`);
  }

  const csvText = await response.text();
  const dados = parseCsvToApprovalRecords(csvText);
  console.log('[RegulacaoDrive] CSV parseado:', dados.length, 'registros');
  cache = { data: dados, timestamp: Date.now() };
  return dados;
  */
}
