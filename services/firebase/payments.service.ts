import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    Timestamp,
    query,
    where,
    orderBy
} from 'firebase/firestore';
import { db } from '../../firebase.config';
import { PaymentRecord } from '../../types';

const PAYMENTS_COLLECTION = 'payments';

export interface FirestorePayment extends Omit<PaymentRecord, 'id'> {
    createdAt: Timestamp;
}

/**
 * Buscar todos os pagamentos
 */
export const getPayments = async (): Promise<PaymentRecord[]> => {
    try {
        const q = query(collection(db, PAYMENTS_COLLECTION), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            // Se o documento tem um campo 'id' interno (importado via Python), usar ele
            // Caso contrário, usar o ID do documento do Firestore
            return {
                ...data,
                id: data.id || doc.id
            } as PaymentRecord;
        });
    } catch (error) {
        console.error('Erro ao buscar pagamentos:', error);
        throw error;
    }
};

/**
 * Buscar pagamento por ID
 */
export const getPaymentById = async (id: string): Promise<PaymentRecord | null> => {
    try {
        const docRef = doc(db, PAYMENTS_COLLECTION, id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            return {
                ...data,
                id: data.id || docSnap.id
            } as PaymentRecord;
        }
        return null;
    } catch (error) {
        console.error('Erro ao buscar pagamento:', error);
        throw error;
    }
};

/**
 * Adicionar novo pagamento
 */
export const addPayment = async (payment: Omit<PaymentRecord, 'id'>): Promise<string> => {
    try {
        const paymentData: FirestorePayment = {
            ...payment,
            createdAt: Timestamp.now()
        };

        const docRef = await addDoc(collection(db, PAYMENTS_COLLECTION), paymentData);
        return docRef.id;
    } catch (error) {
        console.error('Erro ao adicionar pagamento:', error);
        throw error;
    }
};

/**
 * Atualizar pagamento existente
 */
export const updatePayment = async (id: string, payment: Partial<PaymentRecord>): Promise<void> => {
    try {
        // Primeiro, tentar encontrar o documento pelo ID fornecido
        let docRef = doc(db, PAYMENTS_COLLECTION, id);
        let docSnap = await getDoc(docRef);

        // Se não encontrar, procurar por documentos com campo 'id' interno igual ao fornecido
        if (!docSnap.exists()) {
            const q = query(collection(db, PAYMENTS_COLLECTION));
            const querySnapshot = await getDocs(q);

            for (const document of querySnapshot.docs) {
                const data = document.data();
                if (data.id === id) {
                    docRef = doc(db, PAYMENTS_COLLECTION, document.id);
                    break;
                }
            }
        }

        const updateData = {
            ...payment,
            updatedAt: Timestamp.now()
        };

        // Remove o campo id se existir
        const { id: _, ...dataWithoutId } = updateData as any;

        await updateDoc(docRef, dataWithoutId);
    } catch (error) {
        console.error('Erro ao atualizar pagamento:', error);
        throw error;
    }
};

/**
 * Buscar pagamentos por número de contrato
 */
export const getPaymentsByContract = async (contractNumber: string): Promise<PaymentRecord[]> => {
    try {
        const q = query(
            collection(db, PAYMENTS_COLLECTION),
            where('numero_contrato', '==', contractNumber),
            orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                id: data.id || doc.id
            } as PaymentRecord;
        });
    } catch (error) {
        console.error('Erro ao buscar pagamentos por contrato:', error);
        throw error;
    }
};

/**
 * Listener em tempo real para pagamentos
 */
export const subscribeToPayments = (
    callback: (payments: PaymentRecord[]) => void,
    onError?: (error: Error) => void
): (() => void) => {
    try {
        const q = query(collection(db, PAYMENTS_COLLECTION), orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const payments = snapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        ...data,
                        id: data.id || doc.id
                    } as PaymentRecord;
                });
                callback(payments);
            },
            (error) => {
                console.error('Erro no listener de pagamentos:', error);
                if (onError) onError(error as Error);
            }
        );

        return unsubscribe;
    } catch (error) {
        console.error('Erro ao criar listener de pagamentos:', error);
        throw error;
    }
};

/**
 * Listener em tempo real para pagamentos de um contrato específico
 */
export const subscribeToPaymentsByContract = (
    contractNumber: string,
    callback: (payments: PaymentRecord[]) => void,
    onError?: (error: Error) => void
): (() => void) => {
    try {
        const q = query(
            collection(db, PAYMENTS_COLLECTION),
            where('numero_contrato', '==', contractNumber),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const payments = snapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        ...data,
                        id: data.id || doc.id
                    } as PaymentRecord;
                });
                callback(payments);
            },
            (error) => {
                console.error('Erro no listener de pagamentos por contrato:', error);
                if (onError) onError(error as Error);
            }
        );

        return unsubscribe;
    } catch (error) {
        console.error('Erro ao criar listener de pagamentos por contrato:', error);
        throw error;
    }
};
