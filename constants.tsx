
import { Contract, PaymentRecord } from './types';

export const INITIAL_CONTRACTS: Contract[] = [
  {
    id: '1',
    cnpj: '01.234.567/0001-89',
    empresa: 'Hospital das Clínicas de Porto Velho',
    numero_contrato: '120/SESAU/2023',
    id_contrato: 'CTR-001',
    numero_processo: '0012.345678/2023-11',
    natureza: 'Serviços Médicos Hospitalares',
    objeto: 'Prestação de serviços de UTI Adulto e Pediátrica',
    valor_global_anul: 12500000,
    inicio_vigencia: '2023-01-15'
  },
  {
    id: '2',
    cnpj: '98.765.432/0001-10',
    empresa: 'Centro de Hemodiálise Ji-Paraná',
    numero_contrato: '045/SESAU/2024',
    id_contrato: 'CTR-002',
    numero_processo: '0012.987654/2023-22',
    natureza: 'Serviços de Nefrologia',
    objeto: 'Tratamento dialítico para pacientes do SUS',
    valor_global_anul: 8400000,
    inicio_vigencia: '2024-02-01'
  }
];

export const INITIAL_PAYMENTS: PaymentRecord[] = [
  {
    id: 'p1',
    numero_contrato: '120/SESAU/2023',
    invoices: [
      {
        id: 'inv1',
        numero_nf: 'NF-88229',
        valor_nfe: 450000,
        mes_competencia: 1,
        ano_competencia: 2024
      }
    ],
    pagamentos_fed: [
      { 
        id: 'f1', 
        valor: 200000, 
        referencia_ob: '2023OB00123', 
        data_ob: '2024-02-01', 
        numero_empenho: '2023NE0010',
        invoice_id: 'inv1'
      },
      { 
        id: 'f2', 
        valor: 50000, 
        referencia_ob: '2023OB00124', 
        data_ob: '2024-02-05', 
        numero_empenho: '2023NE0010',
        invoice_id: 'inv1'
      }
    ],
    pagamentos_est: [
      { 
        id: 'e1', 
        valor: 200000, 
        referencia_ob: '2023OB88772', 
        data_ob: '2024-02-08', 
        numero_empenho: '2023NE0991',
        invoice_id: 'inv1'
      }
    ],
    data_cadastro: '2024-02-10'
  }
];

export const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];
