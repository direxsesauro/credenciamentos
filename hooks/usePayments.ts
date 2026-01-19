import { useState, useEffect } from 'react';
import { PaymentRecord } from '../types';
import {
    getPayments,
    addPayment as addPaymentService,
    getPaymentsByContract,
    subscribeToPayments,
    subscribeToPaymentsByContract
} from '../services/firebase/payments.service';

interface UsePaymentsReturn {
    payments: PaymentRecord[];
    loading: boolean;
    error: Error | null;
    addPayment: (payment: Omit<PaymentRecord, 'id'>) => Promise<string>;
    refreshPayments: () => Promise<void>;
}

/**
 * Hook customizado para gerenciar pagamentos com Firestore
 * Sincronização em tempo real automática
 */
export const usePayments = (
    realtime: boolean = true,
    contractNumber?: string
): UsePaymentsReturn => {
    const [payments, setPayments] = useState<PaymentRecord[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);

    // Função para buscar pagamentos manualmente
    const refreshPayments = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = contractNumber
                ? await getPaymentsByContract(contractNumber)
                : await getPayments();
            setPayments(data);
        } catch (err) {
            setError(err as Error);
            console.error('Erro ao buscar pagamentos:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (realtime) {
            // Modo tempo real
            setLoading(true);

            const unsubscribe = contractNumber
                ? subscribeToPaymentsByContract(
                    contractNumber,
                    (data) => {
                        setPayments(data);
                        setLoading(false);
                        setError(null);
                    },
                    (err) => {
                        setError(err);
                        setLoading(false);
                    }
                )
                : subscribeToPayments(
                    (data) => {
                        setPayments(data);
                        setLoading(false);
                        setError(null);
                    },
                    (err) => {
                        setError(err);
                        setLoading(false);
                    }
                );

            return () => unsubscribe();
        } else {
            // Modo busca única
            refreshPayments();
        }
    }, [realtime, contractNumber]);

    // Adicionar pagamento
    const addPayment = async (payment: Omit<PaymentRecord, 'id'>): Promise<string> => {
        try {
            const id = await addPaymentService(payment);
            return id;
        } catch (err) {
            setError(err as Error);
            throw err;
        }
    };

    return {
        payments,
        loading,
        error,
        addPayment,
        refreshPayments
    };
};
