import { ApprovalRecord } from '../../types';

interface DriveJsonResponse {
  sucesso?: boolean;
  mensagem?: string;
  dados?: ApprovalRecord[];
}

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

/**
 * Busca o JSON de regulação/aprovações no Google Drive e retorna o array `dados`.
 */
export async function fetchApprovalsFromDrive(): Promise<ApprovalRecord[]> {
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
    return cache.data;
  }

  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`;

  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    if (response.status === 404) {
      throw new Error(`Arquivo JSON não encontrado no Google Drive. Verifique o File ID: ${fileId}.`);
    }
    if (response.status === 403) {
      throw new Error('Acesso negado ao arquivo. Verifique se o arquivo está compartilhado publicamente e se a API Key está correta.');
    }
    if (response.status === 400) {
      throw new Error(`Requisição inválida. O ID pode ser de uma pasta, não de um arquivo. File ID: ${fileId}`);
    }
    throw new Error(`Erro ao buscar arquivo: ${response.status} ${response.statusText}. ${errorText.substring(0, 100)}`);
  }

  const raw: DriveJsonResponse = await response.json();

  if (raw.sucesso === false) {
    throw new Error(raw.mensagem || 'A API retornou sucesso: false.');
  }

  if (!raw.dados || !Array.isArray(raw.dados)) {
    throw new Error('Resposta do JSON sem campo "dados" ou "dados" não é um array.');
  }

  cache = { data: raw.dados, timestamp: Date.now() };
  return raw.dados;
}
