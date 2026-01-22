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
import { ContractPeriod, PeriodStatus, PeriodType, Contract } from '../../types';
import { getPaymentsByContract } from './payments.service';
import { getContractById } from './contracts.service';

const PERIODS_COLLECTION = 'contract_periods';

export interface ContractPeriodSummary extends ContractPeriod {
  execution_percentage: number;
}

/**
 * Buscar resumo de períodos de um contrato
 */
export const getContractPeriodsSummary = async (contractId: string): Promise<ContractPeriodSummary[]> => {
  try {
    const q = query(
      collection(db, PERIODS_COLLECTION),
      where('contract_id', '==', contractId),
      orderBy('period_number', 'asc')
    );

    const querySnapshot = await getDocs(q);
    const periods: ContractPeriodSummary[] = [];

    for (const docSnap of querySnapshot.docs) {
      const data = docSnap.data();
      const period: ContractPeriod = {
        id: docSnap.id,
        contract_id: data.contract_id,
        period_number: data.period_number,
        period_type: data.period_type,
        start_date: data.start_date,
        end_date: data.end_date,
        period_status: data.period_status,
        available_value: data.available_value || 0,
        paid_value: data.paid_value || 0,
        remaining_value: data.remaining_value || 0,
        execution_percentage: data.execution_percentage || 0,
        total_installments: data.total_installments || 0,
        paid_installments: data.paid_installments || 0,
        justification: data.justification,
        created_at: data.created_at instanceof Timestamp 
          ? data.created_at.toDate().toISOString() 
          : data.created_at || new Date().toISOString(),
        updated_at: data.updated_at instanceof Timestamp 
          ? data.updated_at.toDate().toISOString() 
          : data.updated_at || new Date().toISOString()
      };

      // Calcular valores baseado em pagamentos
      const contract = await getContractById(period.contract_id);
      if (contract) {
        const payments = await getPaymentsByContract(contract.numero_contrato);
        const paidValue = payments.reduce((sum, p) => {
          const fed = p.pagamentos_fed.reduce((s, e) => s + e.valor, 0);
          const est = p.pagamentos_est.reduce((s, e) => s + e.valor, 0);
          return sum + fed + est;
        }, 0);

        period.paid_value = paidValue;
        period.remaining_value = period.available_value - paidValue;
        period.execution_percentage = period.available_value > 0 
          ? (paidValue / period.available_value) * 100 
          : 0;
      }

      periods.push(period as ContractPeriodSummary);
    }

    return periods;
  } catch (error) {
    console.error('Erro ao buscar períodos:', error);
    throw error;
  }
};


/**
 * Calcular estatísticas dos períodos
 */
export const calculatePeriodStatistics = (periods: ContractPeriodSummary[]) => {
  const totalPaidAllPeriods = periods.reduce((sum, p) => sum + p.paid_value, 0);
  const totalAvailableAllPeriods = periods.reduce((sum, p) => sum + p.available_value, 0);
  const overallExecutionPercentage = totalAvailableAllPeriods > 0 
    ? (totalPaidAllPeriods / totalAvailableAllPeriods) * 100 
    : 0;
  
  const completedPeriods = periods.filter(p => p.period_status === 'completed').length;
  const totalPeriods = periods.length;
  
  const currentPeriodExecution = periods.find(p => p.period_status === 'active');

  return {
    totalPaidAllPeriods,
    totalAvailableAllPeriods,
    overallExecutionPercentage,
    completedPeriods,
    totalPeriods,
    currentPeriodExecution: currentPeriodExecution ? {
      periodNumber: currentPeriodExecution.period_number,
      paidValue: currentPeriodExecution.paid_value,
      remainingValue: currentPeriodExecution.remaining_value,
      executionPercentage: currentPeriodExecution.execution_percentage
    } : null
  };
};

/**
 * Formatar tipo de período
 */
export const formatPeriodType = (type: PeriodType): string => {
  return type === 'original' ? 'Período Original' : 'Prorrogação';
};

/**
 * Formatar status do período
 */
export const formatPeriodStatus = (status: PeriodStatus): string => {
  const statusMap: Record<PeriodStatus, string> = {
    active: 'Ativo',
    completed: 'Concluído',
    cancelled: 'Cancelado'
  };
  return statusMap[status] || status;
};

/**
 * Formatar número do período
 */
export const formatPeriodNumber = (number: number, type: PeriodType): string => {
  if (type === 'original') {
    return `Período Original`;
  }
  return `Prorrogação ${number - 1}`;
};

/**
 * Obter classe CSS para status
 */
export const getPeriodStatusColorClass = (status: PeriodStatus): string => {
  const classes: Record<PeriodStatus, string> = {
    active: 'bg-green-100 text-green-800',
    completed: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-red-100 text-red-800'
  };
  return classes[status] || 'bg-gray-100 text-gray-800';
};

/**
 * Calcular dias restantes no período ativo
 */
export const getDaysRemainingInActivePeriod = (periods: ContractPeriodSummary[]): number | null => {
  const activePeriod = periods.find(p => p.period_status === 'active');
  if (!activePeriod) return null;

  const endDate = new Date(activePeriod.end_date);
  const today = new Date();
  const diffTime = endDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
};

/**
 * Obter status de urgência baseado em dias restantes
 */
export const getPeriodUrgencyStatus = (daysRemaining: number | null) => {
  if (daysRemaining === null) {
    return { label: 'N/A', colorClass: 'text-gray-500' };
  }
  
  if (daysRemaining < 0) {
    return { label: 'Vencido', colorClass: 'text-red-600' };
  }
  if (daysRemaining <= 30) {
    return { label: 'Urgente', colorClass: 'text-red-500' };
  }
  if (daysRemaining <= 60) {
    return { label: 'Atenção', colorClass: 'text-orange-500' };
  }
  return { label: 'Normal', colorClass: 'text-green-600' };
};

/**
 * Verificar se há múltiplos períodos
 */
export const hasMultiplePeriods = (periods: ContractPeriodSummary[]): boolean => {
  return periods.length > 1;
};

/**
 * Chave de query para React Query
 */
export const useContractPeriodsSummaryQueryKey = (contractId: string) => {
  return ['contract-periods', contractId];
};

/**
 * Criar período de contrato
 */
export const createContractPeriod = async (
  contractId: string,
  startDate: string,
  endDate: string,
  periodType: 'original' | 'extension',
  availableValue: number
): Promise<void> => {
  try {
    // Buscar períodos existentes para determinar o número
    const periodsQuery = query(
      collection(db, PERIODS_COLLECTION),
      where('contract_id', '==', contractId),
      orderBy('period_number', 'desc')
    );
    const periodsSnapshot = await getDocs(periodsQuery);
    const nextPeriodNumber = periodsSnapshot.empty ? 1 : periodsSnapshot.docs[0].data().period_number + 1;

    // Marcar períodos anteriores como concluídos
    if (periodsSnapshot.docs.length > 0) {
      const previousPeriod = periodsSnapshot.docs[0];
      await updateDoc(previousPeriod.ref, {
        period_status: 'completed',
        updated_at: Timestamp.now()
      });
    }

    await addDoc(collection(db, PERIODS_COLLECTION), {
      contract_id: contractId,
      period_number: nextPeriodNumber,
      period_type: periodType,
      start_date: startDate,
      end_date: endDate,
      period_status: 'active',
      available_value: availableValue,
      paid_value: 0,
      remaining_value: availableValue,
      execution_percentage: 0,
      total_installments: 0,
      paid_installments: 0,
      created_at: Timestamp.now(),
      updated_at: Timestamp.now()
    });
  } catch (error) {
    console.error('Erro ao criar período:', error);
    throw error;
  }
};
