import Papa from 'papaparse';
import { EmpenhoFinanceiro } from '../../types';

// Cache para armazenar dados do CSV
interface CacheData {
  data: EmpenhoFinanceiro[];
  timestamp: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutos em milissegundos
let cache: CacheData | null = null;

/**
 * Extrai o ID do arquivo de uma URL do Google Drive ou retorna o próprio ID se já for um ID válido
 */
function extractFileId(input: string): string {
  if (!input || !input.trim()) {
    throw new Error('File ID não pode estar vazio.');
  }

  const trimmed = input.trim();

  // Se já for um ID válido (sem caracteres especiais de URL), retorna direto
  // IDs do Google Drive são alfanuméricos com hífens e underscores
  if (/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return trimmed;
  }

  // Tentar extrair de diferentes formatos de URL do Google Drive
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,  // https://drive.google.com/file/d/FILE_ID/view
    /id=([a-zA-Z0-9_-]+)/,          // https://drive.google.com/open?id=FILE_ID
    /\/folders\/([a-zA-Z0-9_-]+)/,   // https://drive.google.com/drive/folders/FOLDER_ID
    /\/u\/\d+\/folders\/([a-zA-Z0-9_-]+)/, // https://drive.google.com/drive/u/1/folders/FOLDER_ID
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  // Se não conseguir extrair, retorna o valor original (pode ser um ID válido com formato diferente)
  return trimmed;
}

/**
 * Busca o arquivo CSV do Google Drive e retorna o conteúdo como string
 */
async function fetchCSVFromDrive(): Promise<string> {
  const apiKey = import.meta.env.VITE_GOOGLE_DRIVE_API_KEY;
  const fileIdInput = import.meta.env.VITE_GOOGLE_DRIVE_FILE_ID;

  // Debug: verificar se as variáveis estão definidas (sem expor valores)
  const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
  
  if (!apiKey || !fileIdInput) {
    const missingVars = [];
    if (!apiKey) missingVars.push('VITE_GOOGLE_DRIVE_API_KEY');
    if (!fileIdInput) missingVars.push('VITE_GOOGLE_DRIVE_FILE_ID');
    
    const errorMsg = isProduction 
      ? `Variáveis de ambiente não configuradas no Vercel: ${missingVars.join(', ')}. Configure em: Settings > Environment Variables`
      : `Google Drive API Key ou File ID não configurados. Verifique as variáveis de ambiente ${missingVars.join(' e ')}.`;
    
    console.error('Erro de configuração:', {
      hasApiKey: !!apiKey,
      hasFileId: !!fileIdInput,
      isProduction,
      hostname: window.location.hostname
    });
    
    throw new Error(errorMsg);
  }

  // Extrair o ID do arquivo (pode ser uma URL completa ou apenas o ID)
  let fileId: string;
  try {
    fileId = extractFileId(fileIdInput);
  } catch (error) {
    throw new Error('Formato inválido do File ID. Forneça o ID do arquivo ou a URL completa do Google Drive.');
  }

  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`;

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      // Log detalhado do erro para debug
      const errorText = await response.text().catch(() => '');
      console.error('Erro ao buscar CSV do Google Drive:', {
        status: response.status,
        statusText: response.statusText,
        url: url.replace(apiKey, '***'),
        errorText: errorText.substring(0, 200)
      });

      if (response.status === 404) {
        throw new Error(`Arquivo CSV não encontrado no Google Drive. Verifique se o File ID está correto: ${fileId}. Lembre-se: você precisa do ID do ARQUIVO CSV, não da pasta.`);
      }
      if (response.status === 403) {
        throw new Error('Acesso negado ao arquivo. Verifique: 1) A API Key está correta e tem a URL de produção (https://credenciamentos.vercel.app) nas restrições, 2) O arquivo está compartilhado publicamente (qualquer pessoa com o link pode ver), 3) Você está usando o ID do arquivo CSV, não da pasta.');
      }
      if (response.status === 400) {
        throw new Error(`Requisição inválida. O ID fornecido pode ser de uma pasta, não de um arquivo. File ID usado: ${fileId}`);
      }
      throw new Error(`Erro ao buscar arquivo: ${response.status} ${response.statusText}. ${errorText.substring(0, 100)}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && !contentType.includes('text/csv') && !contentType.includes('text/plain') && !contentType.includes('application/octet-stream')) {
      console.warn(`Aviso: O arquivo pode não ser um CSV. Content-Type: ${contentType}`);
    }

    const csvText = await response.text();
    console.log('CSV carregado com sucesso do Google Drive. Tamanho:', csvText.length, 'caracteres');
    
    return csvText;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Erro ao buscar CSV:', error.message);
      throw error;
    }
    throw new Error('Erro de rede ao buscar arquivo do Google Drive.');
  }
}

/**
 * Converte valor string do CSV para número
 * Detecta automaticamente formato brasileiro (vírgula decimal) ou americano (ponto decimal)
 */
function parseValue(value: string): number {
  if (!value || value.trim() === '') {
    return 0;
  }
  
  const trimmed = value.trim();
  
  // Verificar se tem vírgula (formato brasileiro)
  const hasComma = trimmed.includes(',');
  // Verificar se tem ponto
  const hasDot = trimmed.includes('.');
  
  let cleaned: string;
  
  if (hasComma) {
    // Formato brasileiro: vírgula é decimal, pontos são separadores de milhar
    // Exemplo: 5.107.195,14 -> 5107195.14
    cleaned = trimmed.replace(/\./g, '').replace(',', '.');
  } else if (hasDot) {
    // Formato americano: ponto é decimal, não há separadores de milhar
    // Exemplo: 5107195.14 -> 5107195.14 (já está correto)
    cleaned = trimmed;
  } else {
    // Sem separadores, apenas número
    cleaned = trimmed;
  }
  
  const parsed = parseFloat(cleaned);
  
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Normaliza o nome da coluna removendo espaços extras e caracteres invisíveis
 */
function normalizeColumnName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

/**
 * Busca uma coluna no objeto row, tentando variações do nome
 */
function getColumnValue(row: any, columnName: string): string {
  // Tentar o nome exato primeiro
  if (row[columnName] !== undefined) {
    return row[columnName];
  }
  
  // Tentar normalizado
  const normalized = normalizeColumnName(columnName);
  if (row[normalized] !== undefined) {
    return row[normalized];
  }
  
  // Tentar case-insensitive
  const keys = Object.keys(row);
  const foundKey = keys.find(key => 
    normalizeColumnName(key).toLowerCase() === normalized.toLowerCase()
  );
  
  if (foundKey) {
    return row[foundKey];
  }
  
  return '';
}

/**
 * Parseia o CSV e retorna array de EmpenhoFinanceiro
 */
function parseCSV(csvText: string): Promise<EmpenhoFinanceiro[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: (results) => {
        try {
          const empenhos: EmpenhoFinanceiro[] = [];

          // Verificar se há dados
          if (!results.data || results.data.length === 0) {
            console.warn('CSV vazio ou sem dados');
            resolve([]);
            return;
          }

          // Debug: mostrar as colunas encontradas na primeira linha
          if (results.data.length > 0) {
            const firstRow = results.data[0] as any;
            const columns = Object.keys(firstRow);
            console.log('Colunas encontradas no CSV:', columns);
          }

          for (const row of results.data as any[]) {
            // Verificar se a linha tem o campo EMPENHO
            const numeroEmpenho = getColumnValue(row, 'EMPENHO');
            if (!numeroEmpenho || !numeroEmpenho.trim()) {
              continue;
            }

            // Extrair as colunas financeiras e de agrupamento
            const empenho: EmpenhoFinanceiro = {
              numero_empenho: numeroEmpenho.trim(),
              empenhado: parseValue(getColumnValue(row, 'Empenhado')),
              reforco: parseValue(getColumnValue(row, 'Reforco')),
              anulacao: parseValue(getColumnValue(row, 'Anulacao')),
              saldo_empenho: parseValue(getColumnValue(row, 'Saldo Empenho')),
              pagamentos_do_exercicio: parseValue(getColumnValue(row, 'Pagamentos do Exercicio')),
              total_a_pagar: parseValue(getColumnValue(row, 'Total a Pagar')),
              despesa: getColumnValue(row, 'DESPESA') || undefined,
              fonte: getColumnValue(row, 'FONTE') || undefined,
              programa: getColumnValue(row, 'PROGRAMA') || undefined,
              acao: getColumnValue(row, 'AÇÃO') || undefined,
            };

            empenhos.push(empenho);
          }

          console.log(`Total de empenhos processados: ${empenhos.length}`);
          resolve(empenhos);
        } catch (error) {
          reject(new Error('Erro ao processar dados do CSV: ' + (error instanceof Error ? error.message : String(error))));
        }
      },
      error: (error) => {
        reject(new Error('Erro ao parsear CSV: ' + error.message));
      },
    });
  });
}

/**
 * Busca todos os empenhos do Google Drive (com cache)
 */
export async function fetchEmpenhosFromDrive(): Promise<EmpenhoFinanceiro[]> {
  // Verificar cache
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return cache.data;
  }

  // Buscar do Google Drive
  const csvText = await fetchCSVFromDrive();
  const empenhos = await parseCSV(csvText);

  // Atualizar cache
  cache = {
    data: empenhos,
    timestamp: Date.now(),
  };

  return empenhos;
}

/**
 * Busca um empenho específico pelo número
 */
export async function getEmpenhoByNumber(numero: string): Promise<EmpenhoFinanceiro | null> {
  if (!numero || !numero.trim()) {
    return null;
  }

  const empenhos = await fetchEmpenhosFromDrive();
  const numeroNormalizado = numero.trim();

  return empenhos.find(e => e.numero_empenho === numeroNormalizado) || null;
}

/**
 * Busca múltiplos empenhos pelos números
 */
export async function getEmpenhosByNumbers(numeros: string[]): Promise<EmpenhoFinanceiro[]> {
  if (!numeros || numeros.length === 0) {
    return [];
  }

  const empenhos = await fetchEmpenhosFromDrive();
  const numerosNormalizados = numeros.map(n => n.trim()).filter(n => n);

  return empenhos.filter(e => numerosNormalizados.includes(e.numero_empenho));
}

/**
 * Limpa o cache (útil para forçar atualização)
 */
export function clearCache(): void {
  cache = null;
}
