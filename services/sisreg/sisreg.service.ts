/// <reference types="vite/client" />
import { SisregRecord } from '../../types';

// Usar proxy em desenvolvimento, API direta em produção
const isDevelopment = import.meta.env.DEV;
const SISREG_API_BASE_URL = isDevelopment 
  ? '/api/sisreg' // Proxy do Vite em desenvolvimento
  : 'https://farma.sesau.ro.gov.br/api/SisREG'; // API direta em produção

/**
 * Interface para parâmetros da requisição
 */
export interface SisregQueryParams {
  dataInicio: string; // Data no formato YYYY-MM-DD
  dataFim: string; // Data no formato YYYY-MM-DD
  codigoCentralReguladora?: string; // Código opcional da central reguladora
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
    codigo_solicitacao: apiItem.codigo_solicitacao || apiItem.codigoSolicitacao || '',
    data_marcacao: apiItem.data_marcacao || apiItem.dataMarcacao || new Date().toISOString(),
    data_aprovacao: apiItem.data_aprovacao || apiItem.dataAprovacao || '',
    codigo_unidade_executante: apiItem.codigo_unidade_executante || apiItem.codigoUnidadeExecutante || '',
    nome_unidade_executante: apiItem.nome_unidade_executante || apiItem.nomeUnidadeExecutante || '',
    nome_profissional_executante: apiItem.nome_profissional_executante || apiItem.nomeProfissionalExecutante || '',
    codigo_interno_procedimento: apiItem.codigo_interno_procedimento || apiItem.codigoInternoProcedimento || '',
    descricao_interna_procedimento: apiItem.descricao_interna_procedimento || apiItem.descricaoInternaProcedimento || '',
    status_solicitacao: apiItem.status_solicitacao || apiItem.statusSolicitacao || '',
    codigo_central_reguladora: apiItem.codigo_central_reguladora || apiItem.codigoCentralReguladora || '',
    municipio_paciente_residencia: apiItem.municipio_paciente_residencia || apiItem.municipioPacienteResidencia || '',
  };
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

  // Log para debug (sem expor a API key)
  console.log('Consultando API SISREG com:', {
    dataInicio,
    dataFim,
    codigoCentralReguladora: params.codigoCentralReguladora || 'não informado',
    formatoDataInicio: dateRegex.test(dataInicio) ? 'OK (YYYY-MM-DD)' : 'INVÁLIDO',
    formatoDataFim: dateRegex.test(dataFim) ? 'OK (YYYY-MM-DD)' : 'INVÁLIDO',
  });

  // Construir URL com query parameters
  // Em desenvolvimento, usar proxy relativo; em produção, usar URL completa
  const endpoint = '/agendamento-ambulatorial-data-aprovacao';
  let url: URL;
  
  if (isDevelopment) {
    // Em desenvolvimento, usar o proxy do Vite
    url = new URL(`/api/sisreg${endpoint}`, window.location.origin);
  } else {
    // Em produção, usar URL completa
    url = new URL(`${SISREG_API_BASE_URL}${endpoint}`);
  }
  
  url.searchParams.append('dataInicio', dataInicio);
  url.searchParams.append('dataFim', dataFim);
  url.searchParams.append('apiKey', apiKey);

  if (params.codigoCentralReguladora) {
    url.searchParams.append('codigoCentralReguladora', params.codigoCentralReguladora);
  }
  
  console.log('URL da requisição:', url.toString().replace(apiKey, '***'));

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
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

      // Tentar obter mensagem de erro do corpo da resposta
      try {
        const errorData = await response.json();
        if (errorData.message || errorData.error) {
          errorMessage += ` ${errorData.message || errorData.error}`;
        }
      } catch {
        // Ignorar se não conseguir parsear JSON
      }

      throw new Error(errorMessage);
    }

    const data: SisregApiResponse | SisregRecord[] = await response.json();

    // A API pode retornar diretamente um array ou dentro de uma propriedade
    let records: any[] = [];
    if (Array.isArray(data)) {
      records = data;
    } else if (data.data && Array.isArray(data.data)) {
      records = data.data;
    } else if (data.items && Array.isArray(data.items)) {
      records = data.items;
    } else if (data.results && Array.isArray(data.results)) {
      records = data.results;
    } else {
      console.warn('Formato de resposta da API não reconhecido:', data);
      records = [];
    }

    // Mapear para o formato SisregRecord
    return records.map(mapApiResponseToSisregRecord);
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
