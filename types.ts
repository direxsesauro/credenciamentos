
export interface Contract {
  id: string;
  cnpj: string;
  empresa: string;
  numero_contrato: string;
  id_contrato: string;
  numero_processo: string;
  natureza: string;
  objeto: string;
  valor_global_anul: number;
  inicio_vigencia: string;
  fim_vigencia?: string; // Data de término da vigência original
  valor_original?: number; // Valor inicial antes de alterações (pode ser igual a valor_global_anul)
  empenhos?: Empenho[]; // Array de empenhos associados ao contrato
}

export interface Empenho {
  id: string;
  numero_empenho: string; // N° da nota de empenho (ex: 202XNEXXXXX)
}

export interface EmpenhoFinanceiro {
  numero_empenho: string;
  empenhado: number;
  reforco: number;
  anulacao: number;
  saldo_empenho: number;
  pagamentos_do_exercicio: number;
  total_a_pagar: number;
  despesa?: string;
  fonte?: string;
  programa?: string;
  acao?: string;
}

export interface PaymentEntry {
  id: string;
  valor: number;
  referencia_ob: string; // N° da ordem bancária
  data_ob: string;       // Data da ordem
  numero_empenho: string; // N° da nota de empenho
}

export interface PaymentRecord {
  id: string;
  numero_contrato: string;
  numero_nf: string;      // N° da nota fiscal
  valor_nfe: number;
  pagamentos_fed: PaymentEntry[];
  pagamentos_est: PaymentEntry[];
  mes_competencia: number;
  ano_competencia: number;
  data_cadastro: string;
}

export type ViewType = 'dashboard' | 'contracts' | 'payments' | 'new-payment' | 'new-contract' | 'edit-contract' | 'edit-payment' | 'contract-amendments' | 'contract-details' | 'regulation'
// Tipos para Alterações Contratuais
export type AmendmentType = 'extension' | 'early_termination' | 'addition' | 'suppression' | 'readjustment' | 'renegotiation';
export type AmendmentCategory = 'tenure' | 'value';
export type PeriodType = 'original' | 'extension';
export type PeriodStatus = 'active' | 'completed' | 'cancelled';

export interface ContractAmendment {
  id: string;
  contract_id: string;
  type: AmendmentCategory;
  amendment_type: AmendmentType;
  amendment_date: string; // ISO date string
  is_active: boolean;
  
  // Campos para alteração de vigência
  previous_start_date?: string;
  previous_end_date?: string;
  new_start_date?: string;
  new_end_date?: string;
  
  // Campos para alteração de valor
  previous_value?: number;
  amendment_value?: number;
  percentage_applied?: number;
  index_used?: string;
  reference_period?: string;
  description?: string;
  
  // Campos comuns
  justification: string;
  legal_basis?: string;
  amended_by: string; // user_id
  created_at: string;
  updated_at: string;
}

export interface ContractPeriod {
  id: string;
  contract_id: string;
  period_number: number; // 1, 2, 3... (1 = original, 2+ = prorrogações)
  period_type: PeriodType;
  start_date: string;
  end_date: string;
  period_status: PeriodStatus;
  available_value: number; // Valor disponível para este período
  paid_value: number;
  remaining_value: number;
  execution_percentage: number;
  total_installments: number;
  paid_installments: number;
  justification?: string;
  created_at: string;
  updated_at: string;
}

export interface ContractWithCurrentInfo {
  id: string;
  contract_number: string;
  numero_contrato?: string;
  contractor_name: string;
  empresa?: string;
  cnpj?: string;
  contractor_document?: string;
  numero_processo?: string;
  objeto?: string;
  total_value: number; // valor_original ou valor_global_anul
  valor_original?: number;
  valor_global_anul?: number;
  total_amendments_value: number; // Soma de todas as alterações de valor ativas
  current_start_date: string;
  current_end_date: string;
  inicio_vigencia?: string;
  fim_vigencia?: string;
  start_date?: string;
  end_date?: string;
  total_amendments: number;
}

export interface SisregRecord {
  codigo_solicitacao: string;
  data_marcacao: string;
  data_aprovacao: string;
  codigo_unidade_executante: string;
  nome_unidade_executante: string;
  nome_profissional_executante: string;
  codigo_interno_procedimento: string;
  descricao_interna_procedimento: string;
  status_solicitacao: string;
  codigo_central_reguladora: string;
  municipio_paciente_residencia?: string;
}
