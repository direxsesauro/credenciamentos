import { useState, useEffect } from 'react';
import { Contract } from '../types';
import {
    getContracts,
    addContract as addContractService,
    updateContract as updateContractService,
    deleteContract as deleteContractService,
    subscribeToContracts
} from '../services/firebase/contracts.service';

interface UseContractsReturn {
    contracts: Contract[];
    loading: boolean;
    error: Error | null;
    addContract: (contract: Omit<Contract, 'id'>) => Promise<string>;
    updateContract: (id: string, contract: Partial<Contract>) => Promise<void>;
    deleteContract: (id: string) => Promise<void>;
    refreshContracts: () => Promise<void>;
}

/**
 * Hook customizado para gerenciar contratos com Firestore
 * Sincronização em tempo real automática
 */
export const useContracts = (realtime: boolean = true): UseContractsReturn => {
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);

    // Função para buscar contratos manualmente
    const refreshContracts = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getContracts();
            setContracts(data);
        } catch (err) {
            setError(err as Error);
            console.error('Erro ao buscar contratos:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (realtime) {
            // Modo tempo real
            setLoading(true);
            const unsubscribe = subscribeToContracts(
                (data) => {
                    setContracts(data);
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
            refreshContracts();
        }
    }, [realtime]);

    // Adicionar contrato
    const addContract = async (contract: Omit<Contract, 'id'>): Promise<string> => {
        try {
            const id = await addContractService(contract);
            return id;
        } catch (err) {
            setError(err as Error);
            throw err;
        }
    };

    // Atualizar contrato
    const updateContract = async (id: string, contract: Partial<Contract>): Promise<void> => {
        try {
            await updateContractService(id, contract);
        } catch (err) {
            setError(err as Error);
            throw err;
        }
    };

    // Deletar contrato
    const deleteContract = async (id: string): Promise<void> => {
        try {
            await deleteContractService(id);
        } catch (err) {
            setError(err as Error);
            throw err;
        }
    };

    return {
        contracts,
        loading,
        error,
        addContract,
        updateContract,
        deleteContract,
        refreshContracts
    };
};
