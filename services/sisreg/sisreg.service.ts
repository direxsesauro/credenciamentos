/// <reference types="vite/client" />
import { SisregRecord } from '../../types';

// Usar proxy em desenvolvimento, API direta em produção
const isDevelopment = import.meta.env.DEV;
const SISREG_API_BASE_URL = isDevelopment 
  ? '/api/sisreg' // Proxy do Vite em desenvolvimento
  : 'https://farma.sesau.ro.gov.br/api/SisREG'; // API direta em produção

/** Tamanho padrão de página (limite por data) para o endpoint data-solicitacao */
const DEFAULT_TAMANHO = 100;

/**
 * Interface para parâmetros da requisição (endpoint agendamento-ambulatorial-data-solicitacao)
 */
export interface SisregQueryParams {
  dataInicio: string; // Data início no formato YYYY-MM-DD
  dataFim: string; // Data fim no formato YYYY-MM-DD
  codigoCentralReguladora?: string; // Código da central reguladora (ex: 110020), enviado como unidadeReguladora
  tamanho?: number; // Limite por data (paginação); padrão 100
}

/**
 * Interface para resposta da API (pode precisar ser ajustada conforme resposta real)
 */
interface SisregApiResponse {
  data?: SisregRecord[];
  items?: SisregRecord[];
  results?: SisregRecord[];
  // A API pode retornar diretamente um array
  [key: string]: any;
}

/**
 * Mapeia a resposta da API para o formato SisregRecord
 */
function mapApiResponseToSisregRecord(apiItem: any): SisregRecord {
  return {
    codigo_solicitacao: String(apiItem.codigo_solicitacao ?? apiItem.codigoSolicitacao ?? ''),
    data_marcacao: apiItem.data_marcacao || apiItem.dataMarcacao || new Date().toISOString(),
    data_aprovacao: apiItem.data_aprovacao || apiItem.dataAprovacao || '',
    codigo_unidade_executante: String(apiItem.codigo_unidade_executante ?? apiItem.codigoUnidadeExecutante ?? ''),
    nome_unidade_executante: apiItem.nome_unidade_executante || apiItem.nomeUnidadeExecutante || '',
    nome_profissional_executante: apiItem.nome_profissional_executante || apiItem.nomeProfissionalExecutante || '',
    codigo_interno_procedimento: String(apiItem.codigo_interno_procedimento ?? apiItem.codigoInternoProcedimento ?? ''),
    descricao_interna_procedimento: apiItem.descricao_interna_procedimento || apiItem.descricaoInternaProcedimento || '',
    status_solicitacao: apiItem.status_solicitacao || apiItem.statusSolicitacao || '',
    codigo_central_reguladora: String(apiItem.codigo_central_reguladora ?? apiItem.codigoCentralReguladora ?? ''),
    municipio_paciente_residencia: apiItem.municipio_paciente_residencia || apiItem.municipioPacienteResidencia || '',
  };
}

/**
 * Retorna todas as datas entre dataInicio e dataFim (inclusive) no formato YYYY-MM-DD
 */
function getDatesInRange(dataInicio: string, dataFim: string): string[] {
  const dates: string[] = [];
  const start = new Date(dataInicio);
  const end = new Date(dataFim);
  if (start.getTime() > end.getTime()) return dates;
  const current = new Date(start);
  while (current.getTime() <= end.getTime()) {
    dates.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

/**
 * Normaliza uma data para o formato YYYY-MM-DD
 * Garante que a data esteja no formato correto para a API
 */
function normalizeDate(dateString: string): string {
  if (!dateString) {
    throw new Error('Data não fornecida.');
  }

  // Se já está no formato YYYY-MM-DD, retorna como está
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (dateRegex.test(dateString)) {
    return dateString;
  }

  // Tentar parsear e formatar
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new Error('Data inválida.');
    }
    
    // Formatar para YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    throw new Error(`Formato de data inválido: ${dateString}. Use o formato YYYY-MM-DD.`);
  }
}

/**
 * Busca agendamentos ambulatoriais da API SISREG
 */
export async function fetchAgendamentosAmbulatoriais(
  params: SisregQueryParams
): Promise<SisregRecord[]> {
  const apiKey = import.meta.env.VITE_SISREG_API_KEY;

  if (!apiKey) {
    throw new Error(
      'Chave de API SISREG não configurada. Verifique a variável de ambiente VITE_SISREG_API_KEY.'
    );
  }

  // Normalizar datas para garantir formato YYYY-MM-DD
  let dataInicio: string;
  let dataFim: string;
  
  try {
    dataInicio = normalizeDate(params.dataInicio);
    dataFim = normalizeDate(params.dataFim);
  } catch (error) {
    throw error instanceof Error 
      ? error 
      : new Error('Erro ao normalizar datas. Use o formato YYYY-MM-DD.');
  }

  // Validar formato das datas (dupla verificação)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dataInicio) || !dateRegex.test(dataFim)) {
    throw new Error('Formato de data inválido após normalização. Use o formato YYYY-MM-DD.');
  }

  const unidadeReguladora = (params.codigoCentralReguladora || '').trim();
  if (!unidadeReguladora) {
    throw new Error('Código da central reguladora (unidadeReguladora) é obrigatório.');
  }

  const tamanho = Math.min(Math.max(params.tamanho ?? DEFAULT_TAMANHO, 1), 1000);
  const dates = getDatesInRange(dataInicio, dataFim);
  if (dates.length === 0) {
    throw new Error('Intervalo de datas inválido. Data início deve ser menor ou igual à data fim.');
  }

  // Log para debug (sem expor a API key)
  console.log('Consultando API SISREG (agendamento-ambulatorial-data-solicitacao) com:', {
    dataInicio,
    dataFim,
    unidadeReguladora,
    tamanho,
    quantidadeDatas: dates.length,
  });

  const endpoint = '/agendamento-ambulatorial-data-solicitacao';
  const allRecords: SisregRecord[] = [];
  const seenIds = new Set<string>();

  try {
    for (const data of dates) {
      let url: URL;
      if (isDevelopment) {
        url = new URL(`/api/sisreg${endpoint}`, window.location.origin);
      } else {
        url = new URL(`${SISREG_API_BASE_URL}${endpoint}`);
      }
      url.searchParams.append('data', data);
      url.searchParams.append('unidadeReguladora', unidadeReguladora);
      url.searchParams.append('tamanho', String(tamanho));
      url.searchParams.append('apiKey', apiKey);

      // Autenticação: API pode aceitar apiKey na query (já enviado) e/ou no header (Swagger "Authorize")
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        let errorMessage = 'Erro ao buscar dados do SISREG.';

        switch (response.status) {
          case 401:
            errorMessage = 'Chave de API inválida ou expirada. Verifique a configuração da variável VITE_SISREG_API_KEY.';
            break;
          case 403:
            errorMessage = 'Acesso negado. Verifique se a chave de API tem permissão para acessar este endpoint.';
            break;
          case 404:
            errorMessage = 'Endpoint não encontrado. Verifique se a URL da API está correta.';
            break;
          case 500:
            errorMessage = 'Erro interno do servidor SISREG. Tente novamente mais tarde.';
            break;
          default:
            errorMessage = `Erro ao buscar dados: ${response.status} ${response.statusText}`;
        }

        try {
          const errorData = await response.json();
          if (errorData.message || errorData.error) {
            errorMessage += ` ${errorData.message || errorData.error}`;
          }
        } catch {
          // ignorar
        }

        throw new Error(errorMessage);
      }

      const raw: SisregApiResponse | SisregRecord[] = await response.json();

      // Validar sucesso quando a API retorna { sucesso, mensagem, dados }
      if (typeof raw === 'object' && raw !== null && 'sucesso' in raw && (raw as { sucesso?: boolean }).sucesso === false) {
        const msg = (raw as { mensagem?: string }).mensagem || 'A API SISREG retornou sucesso: false.';
        throw new Error(msg);
      }

      let records: any[] = [];
      if (Array.isArray(raw)) {
        records = raw;
      } else if (raw.dados && Array.isArray(raw.dados)) {
        records = raw.dados;
      } else if (raw.data && Array.isArray(raw.data)) {
        records = raw.data;
      } else if (raw.items && Array.isArray(raw.items)) {
        records = raw.items;
      } else if (raw.results && Array.isArray(raw.results)) {
        records = raw.results;
      }

      const mapped = records.map(mapApiResponseToSisregRecord);
      for (const r of mapped) {
        const id = String(r.codigo_solicitacao);
        if (!seenIds.has(id)) {
          seenIds.add(id);
          allRecords.push(r);
        }
      }
    }

    return allRecords;
  } catch (error) {
    if (error instanceof Error) {
      // Re-throw erros já tratados
      throw error;
    }

    // Tratar erros de rede
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(
        'Erro de conexão com a API SISREG. Verifique sua conexão com a internet e tente novamente.'
      );
    }

    throw new Error('Erro desconhecido ao buscar dados do SISREG.');
  }
}
