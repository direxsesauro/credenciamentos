import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from '../../firebase.config';
import { ContractAmendment, ContractWithCurrentInfo, AmendmentType, AmendmentCategory } from '../../types';
import { getContractById } from './contracts.service';
import { getPaymentsByContract } from './payments.service';

const AMENDMENTS_COLLECTION = 'contract_amendments';

export interface TenureAmendmentForm {
  amendment_type: 'extension' | 'early_termination';
  new_start_date: string;
  new_end_date: string;
  justification: string;
  legal_basis?: string;
}

export interface ValueAmendmentForm {
  amendment_type: 'addition' | 'suppression' | 'readjustment' | 'renegotiation';
  amendment_value: number;
  percentage_applied?: number;
  index_used?: string;
  reference_period?: string;
  justification: string;
  description?: string;
  legal_basis?: string;
}

/**
 * Criar alteração de vigência
 */
export const createTenureAmendment = async (
  contractId: string,
  formData: TenureAmendmentForm,
  userId: string
): Promise<string> => {
  try {
    const contract = await getContractById(contractId);
    if (!contract) {
      throw new Error('Contrato não encontrado');
    }

    // Usar o ID do contrato (pode ser o ID do documento ou o campo id interno)
    const contractDocId = contract.id;

    const amendment: Omit<ContractAmendment, 'id'> = {
      contract_id: contractDocId,
      type: 'tenure',
      amendment_type: formData.amendment_type,
      amendment_date: new Date().toISOString(),
      is_active: true,
      previous_start_date: contract.inicio_vigencia,
      previous_end_date: contract.fim_vigencia || contract.inicio_vigencia,
      new_start_date: formData.new_start_date,
      new_end_date: formData.new_end_date,
      justification: formData.justification,
      legal_basis: formData.legal_basis || '',
      amended_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const docRef = await addDoc(collection(db, AMENDMENTS_COLLECTION), {
      ...amendment,
      created_at: Timestamp.now(),
      updated_at: Timestamp.now()
    });

    // Buscar o documento do contrato no Firestore para obter o ID real do documento
    // Primeiro tentar pelo ID direto
    let contractDocRef = doc(db, 'contracts', contractDocId);
    let contractDocSnap = await getDoc(contractDocRef);
    
    // Se não encontrou, buscar pelo campo 'id' interno
    if (!contractDocSnap.exists()) {
      const q = query(collection(db, 'contracts'), where('id', '==', contractDocId));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        throw new Error(`Contrato com ID ${contractDocId} não encontrado no Firestore`);
      }
      
      // Usar o ID do documento encontrado
      const foundDoc = querySnapshot.docs[0];
      contractDocRef = doc(db, 'contracts', foundDoc.id);
    }
    
    // Atualizar contrato com novas datas de vigência
    await updateDoc(contractDocRef, {
      inicio_vigencia: formData.new_start_date,
      fim_vigencia: formData.new_end_date,
      updatedAt: Timestamp.now()
    });

    // Criar período se for prorrogação
    if (formData.amendment_type === 'extension') {
      const { createContractPeriod } = await import('./contract-periods.service');
      await createContractPeriod(contractDocId, formData.new_start_date, formData.new_end_date, 'extension', contract.valor_original || contract.valor_global_anul);
    }

    return docRef.id;
  } catch (error) {
    console.error('Erro ao criar alteração de vigência:', error);
    throw error;
  }
};

/**
 * Criar alteração de valor
 */
export const createValueAmendment = async (
  contractId: string,
  formData: ValueAmendmentForm,
  userId: string
): Promise<string> => {
  try {
    const contract = await getContractById(contractId);
    if (!contract) {
      throw new Error('Contrato não encontrado');
    }

    // Usar o ID do contrato (pode ser o ID do documento ou o campo id interno)
    const contractDocId = contract.id;

    const contractInfo = await getContractWithCurrentInfo(contractId, userId);
    const previousValue = contractInfo.total_value + contractInfo.total_amendments_value;

    // Preparar dados da alteração, removendo campos undefined
    const amendmentData: any = {
      contract_id: contractDocId,
      type: 'value',
      amendment_type: formData.amendment_type,
      amendment_date: new Date().toISOString(),
      is_active: true,
      previous_value: previousValue,
      amendment_value: formData.amendment_value,
      justification: formData.justification,
      legal_basis: formData.legal_basis || '',
      amended_by: userId,
      created_at: Timestamp.now(),
      updated_at: Timestamp.now()
    };

    // Adicionar campos opcionais apenas se tiverem valor
    if (formData.percentage_applied !== undefined && formData.percentage_applied !== null) {
      amendmentData.percentage_applied = formData.percentage_applied;
    }
    if (formData.index_used !== undefined && formData.index_used !== null && formData.index_used !== '') {
      amendmentData.index_used = formData.index_used;
    }
    if (formData.reference_period !== undefined && formData.reference_period !== null && formData.reference_period !== '') {
      amendmentData.reference_period = formData.reference_period;
    }
    if (formData.description !== undefined && formData.description !== null && formData.description !== '') {
      amendmentData.description = formData.description;
    }

    const docRef = await addDoc(collection(db, AMENDMENTS_COLLECTION), amendmentData);

    return docRef.id;
  } catch (error) {
    console.error('Erro ao criar alteração de valor:', error);
    throw error;
  }
};

/**
 * Deletar alteração de vigência (marcar como inativa)
 */
export const deleteTenureAmendment = async (amendmentId: string, userId: string): Promise<void> => {
  try {
    const docRef = doc(db, AMENDMENTS_COLLECTION, amendmentId);
    await updateDoc(docRef, {
      is_active: false,
      updated_at: Timestamp.now()
    });
  } catch (error) {
    console.error('Erro ao deletar alteração de vigência:', error);
    throw error;
  }
};

/**
 * Deletar alteração de valor (marcar como inativa)
 */
export const deleteValueAmendment = async (amendmentId: string, userId: string): Promise<void> => {
  try {
    const docRef = doc(db, AMENDMENTS_COLLECTION, amendmentId);
    await updateDoc(docRef, {
      is_active: false,
      updated_at: Timestamp.now()
    });
  } catch (error) {
    console.error('Erro ao deletar alteração de valor:', error);
    throw error;
  }
};

/**
 * Buscar histórico de alterações de um contrato
 */
export const getContractAmendmentsHistory = async (contractId: string) => {
  try {
    const q = query(
      collection(db, AMENDMENTS_COLLECTION),
      where('contract_id', '==', contractId),
      orderBy('amendment_date', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const amendments: ContractAmendment[] = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        amendment_date: data.amendment_date instanceof Timestamp 
          ? data.amendment_date.toDate().toISOString() 
          : data.amendment_date,
        created_at: data.created_at instanceof Timestamp 
          ? data.created_at.toDate().toISOString() 
          : data.created_at || new Date().toISOString(),
        updated_at: data.updated_at instanceof Timestamp 
          ? data.updated_at.toDate().toISOString() 
          : data.updated_at || new Date().toISOString()
      } as ContractAmendment;
    });

    // Calcular resumo
    const activeValueAmendments = amendments.filter(a => a.type === 'value' && a.is_active);
    const totalAmendmentsValue = activeValueAmendments.reduce((sum, a) => sum + (a.amendment_value || 0), 0);
    const totalValueAmendments = amendments.filter(a => a.type === 'value').length;
    const totalTenureAmendments = amendments.filter(a => a.type === 'tenure').length;

    const contract = await getContractById(contractId);
    const currentValue = contract ? (contract.valor_original || contract.valor_global_anul) : 0;

    return {
      amendments,
      summary: {
        total_amendments_value: totalAmendmentsValue,
        total_value_amendments: totalValueAmendments,
        total_tenure_amendments: totalTenureAmendments,
        current_value: currentValue
      }
    };
  } catch (error) {
    console.error('Erro ao buscar histórico de alterações:', error);
    throw error;
  }
};

/**
 * Buscar contrato com informações atuais (incluindo alterações)
 */
export const getContractWithCurrentInfo = async (
  contractId: string,
  userId: string
): Promise<ContractWithCurrentInfo> => {
  try {
    const contract = await getContractById(contractId);
    if (!contract) {
      throw new Error('Contrato não encontrado');
    }

    const history = await getContractAmendmentsHistory(contractId);
    const activeValueAmendments = history.amendments.filter(a => a.type === 'value' && a.is_active);
    const totalAmendmentsValue = activeValueAmendments.reduce((sum, a) => sum + (a.amendment_value || 0), 0);

    // Buscar períodos para determinar vigência atual
    let currentStartDate = contract.inicio_vigencia;
    let currentEndDate = contract.fim_vigencia || contract.inicio_vigencia;
    
    try {
      const periods = await getContractPeriodsSummary(contractId);
      if (periods.length > 0) {
        const activePeriod = periods.find(p => p.period_status === 'active') || periods[periods.length - 1];
        if (activePeriod) {
          currentStartDate = activePeriod.start_date;
          currentEndDate = activePeriod.end_date;
        }
      }
    } catch (error) {
      console.warn('Erro ao buscar períodos, usando dados do contrato:', error);
    }

    return {
      id: contract.id,
      contract_number: contract.numero_contrato,
      numero_contrato: contract.numero_contrato,
      contractor_name: contract.empresa,
      empresa: contract.empresa,
      cnpj: contract.cnpj,
      numero_processo: contract.numero_processo,
      objeto: contract.objeto,
      total_value: contract.valor_original || contract.valor_global_anul,
      valor_original: contract.valor_original || contract.valor_global_anul,
      valor_global_anul: contract.valor_global_anul,
      total_amendments_value: totalAmendmentsValue,
      current_start_date: currentStartDate,
      current_end_date: currentEndDate,
      inicio_vigencia: contract.inicio_vigencia,
      fim_vigencia: contract.fim_vigencia,
      end_date: contract.fim_vigencia,
      start_date: contract.inicio_vigencia,
      total_amendments: history.amendments.length
    };
  } catch (error) {
    console.error('Erro ao buscar informações do contrato:', error);
    throw error;
  }
};

/**
 * Formatar tipo de alteração para exibição
 */
export const formatAmendmentType = (type: AmendmentType): string => {
  const types: Record<AmendmentType, string> = {
    extension: 'Prorrogação',
    early_termination: 'Encerramento Antecipado',
    addition: 'Acréscimo',
    suppression: 'Supressão',
    readjustment: 'Reajuste',
    renegotiation: 'Repactuação'
  };
  return types[type] || type;
};

/**
 * Formatar valor monetário
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

// Importar função de períodos
import { getContractPeriodsSummary } from './contract-periods.service';
