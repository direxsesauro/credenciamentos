
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

export type ViewType = 'dashboard' | 'contracts' | 'payments' | 'new-payment' | 'new-contract' | 'edit-contract';
