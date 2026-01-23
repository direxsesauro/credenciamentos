import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    Timestamp,
    query,
    orderBy,
    where
} from 'firebase/firestore';
import { db } from '../../firebase.config';
import { Contract } from '../../types';

const CONTRACTS_COLLECTION = 'contracts';

export interface FirestoreContract extends Omit<Contract, 'id'> {
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

/**
 * Buscar todos os contratos
 */
export const getContracts = async (): Promise<Contract[]> => {
    try {
        const q = query(collection(db, CONTRACTS_COLLECTION), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            // Se o documento tem um campo 'id' interno (importado via Python), usar ele
            // Caso contrário, usar o ID do documento do Firestore
            return {
                ...data,
                id: data.id || doc.id
            } as Contract;
        });
    } catch (error) {
        console.error('Erro ao buscar contratos:', error);
        throw error;
    }
};

/**
 * Buscar contrato por ID
 */
export const getContractById = async (id: string): Promise<Contract | null> => {
    try {
        // Primeiro, tentar buscar pelo ID do documento
        const docRef = doc(db, CONTRACTS_COLLECTION, id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            return {
                ...data,
                id: data.id || docSnap.id
            } as Contract;
        }

        // Se não encontrou pelo ID do documento, tentar buscar pelo campo 'id' interno
        const q = query(collection(db, CONTRACTS_COLLECTION), where('id', '==', id));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            const doc = querySnapshot.docs[0];
            const data = doc.data();
            return {
                ...data,
                id: data.id || doc.id
            } as Contract;
        }

        return null;
    } catch (error) {
        console.error('Erro ao buscar contrato:', error);
        throw error;
    }
};

/**
 * Adicionar novo contrato
 */
export const addContract = async (contract: Omit<Contract, 'id'>): Promise<string> => {
    try {
        const now = Timestamp.now();
        // Criar documento primeiro para obter o ID
        const docRef = doc(collection(db, CONTRACTS_COLLECTION));
        
        const contractData: FirestoreContract = {
            ...contract,
            id: docRef.id, // Salvar o ID do Firestore no campo id
            valor_original: contract.valor_original || contract.valor_global_anul,
            createdAt: now,
            updatedAt: now
        };

        await setDoc(docRef, contractData as any);
        
        // Criar período inicial se não existir
        if (contract.inicio_vigencia && (contract.fim_vigencia || contract.inicio_vigencia)) {
            try {
                const { createContractPeriod } = await import('./contract-periods.service');
                await createContractPeriod(
                    docRef.id,
                    contract.inicio_vigencia,
                    contract.fim_vigencia || contract.inicio_vigencia,
                    'original',
                    contract.valor_original || contract.valor_global_anul || 0
                );
            } catch (periodError) {
                console.warn('Erro ao criar período inicial:', periodError);
            }
        }
        
        return docRef.id;
    } catch (error) {
        console.error('Erro ao adicionar contrato:', error);
        throw error;
    }
};

/**
 * Remove campos undefined e null de um objeto (Firestore não aceita undefined)
 */
function removeUndefinedFields(obj: any): any {
    const cleaned: any = {};
    for (const key in obj) {
        if (obj[key] !== undefined) {
            // Se for um array vazio, manter; se for null, manter (pode ser necessário para limpar campos)
            cleaned[key] = obj[key];
        }
    }
    return cleaned;
}

/**
 * Atualizar contrato existente
 */
export const updateContract = async (id: string, contract: Partial<Contract>): Promise<void> => {
    try {
        // Primeiro, tentar encontrar o documento pelo ID fornecido
        let docRef = doc(db, CONTRACTS_COLLECTION, id);
        let docSnap = await getDoc(docRef);

        // Se não encontrar, procurar por documentos com campo 'id' interno igual ao fornecido
        if (!docSnap.exists()) {
            const q = query(collection(db, CONTRACTS_COLLECTION));
            const querySnapshot = await getDocs(q);

            for (const document of querySnapshot.docs) {
                const data = document.data();
                if (data.id === id) {
                    docRef = doc(db, CONTRACTS_COLLECTION, document.id);
                    break;
                }
            }
        }

        const updateData = {
            ...contract,
            updatedAt: Timestamp.now()
        };

        // Remove o campo id se existir e remove campos undefined
        const { id: _, ...dataWithoutId } = updateData as any;
        const cleanedData = removeUndefinedFields(dataWithoutId);

        await updateDoc(docRef, cleanedData);
    } catch (error) {
        console.error('Erro ao atualizar contrato:', error);
        throw error;
    }
};

/**
 * Deletar contrato
 */
export const deleteContract = async (id: string): Promise<void> => {
    try {
        // Primeiro, tentar encontrar o documento pelo ID fornecido
        let docRef = doc(db, CONTRACTS_COLLECTION, id);
        let docSnap = await getDoc(docRef);

        // Se não encontrar, procurar por documentos com campo 'id' interno igual ao fornecido
        if (!docSnap.exists()) {
            const q = query(collection(db, CONTRACTS_COLLECTION));
            const querySnapshot = await getDocs(q);

            for (const document of querySnapshot.docs) {
                const data = document.data();
                if (data.id === id) {
                    docRef = doc(db, CONTRACTS_COLLECTION, document.id);
                    break;
                }
            }
        }

        await deleteDoc(docRef);
    } catch (error) {
        console.error('Erro ao deletar contrato:', error);
        throw error;
    }
};

/**
 * Listener em tempo real para contratos
 */
export const subscribeToContracts = (
    callback: (contracts: Contract[]) => void,
    onError?: (error: Error) => void
): (() => void) => {
    try {
        const q = query(collection(db, CONTRACTS_COLLECTION), orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const contracts = snapshot.docs.map(doc => {
                    const data = doc.data();
                    // Se o documento tem um campo 'id' interno, usar ele
                    return {
                        ...data,
                        id: data.id || doc.id
                    } as Contract;
                });
                callback(contracts);
            },
            (error) => {
                console.error('Erro no listener de contratos:', error);
                if (onError) onError(error as Error);
            }
        );

        return unsubscribe;
    } catch (error) {
        console.error('Erro ao criar listener de contratos:', error);
        throw error;
    }
};
