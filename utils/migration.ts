import { Contract, PaymentRecord } from '../types';
import { addContract } from '../services/firebase/contracts.service';
import { addPayment } from '../services/firebase/payments.service';

/**
 * Migra dados do localStorage para o Firestore
 * Deve ser executado apenas uma vez na primeira carga da aplicação
 */
export const migrateLocalStorageToFirestore = async (): Promise<{
    success: boolean;
    contractsMigrated: number;
    paymentsMigrated: number;
    errors: string[];
}> => {
    const errors: string[] = [];
    let contractsMigrated = 0;
    let paymentsMigrated = 0;

    try {
        // Verificar se já foi migrado
        const migrationFlag = localStorage.getItem('sesau_migrated_to_firestore');
        if (migrationFlag === 'true') {
            console.log('Dados já foram migrados anteriormente');
            return { success: true, contractsMigrated: 0, paymentsMigrated: 0, errors: [] };
        }

        // Buscar dados do localStorage
        const contractsData = localStorage.getItem('sesau_contracts');
        const paymentsData = localStorage.getItem('sesau_payments');

        // Migrar contratos
        if (contractsData) {
            try {
                const contracts: Contract[] = JSON.parse(contractsData);
                console.log(`Migrando ${contracts.length} contratos...`);

                for (const contract of contracts) {
                    try {
                        const { id, ...contractWithoutId } = contract;
                        await addContract(contractWithoutId);
                        contractsMigrated++;
                    } catch (err) {
                        const errorMsg = `Erro ao migrar contrato ${contract.numero_contrato}: ${err}`;
                        console.error(errorMsg);
                        errors.push(errorMsg);
                    }
                }
            } catch (err) {
                const errorMsg = `Erro ao parsear contratos do localStorage: ${err}`;
                console.error(errorMsg);
                errors.push(errorMsg);
            }
        }

        // Migrar pagamentos
        if (paymentsData) {
            try {
                const payments: PaymentRecord[] = JSON.parse(paymentsData);
                console.log(`Migrando ${payments.length} pagamentos...`);

                for (const payment of payments) {
                    try {
                        const { id, ...paymentWithoutId } = payment;
                        await addPayment(paymentWithoutId);
                        paymentsMigrated++;
                    } catch (err) {
                        const errorMsg = `Erro ao migrar pagamento ${payment.numero_nf}: ${err}`;
                        console.error(errorMsg);
                        errors.push(errorMsg);
                    }
                }
            } catch (err) {
                const errorMsg = `Erro ao parsear pagamentos do localStorage: ${err}`;
                console.error(errorMsg);
                errors.push(errorMsg);
            }
        }

        // Marcar como migrado
        localStorage.setItem('sesau_migrated_to_firestore', 'true');

        console.log(`Migração concluída: ${contractsMigrated} contratos, ${paymentsMigrated} pagamentos`);

        return {
            success: errors.length === 0,
            contractsMigrated,
            paymentsMigrated,
            errors
        };
    } catch (err) {
        const errorMsg = `Erro geral na migração: ${err}`;
        console.error(errorMsg);
        errors.push(errorMsg);

        return {
            success: false,
            contractsMigrated,
            paymentsMigrated,
            errors
        };
    }
};

/**
 * Reseta a flag de migração (útil para testes)
 */
export const resetMigrationFlag = (): void => {
    localStorage.removeItem('sesau_migrated_to_firestore');
    console.log('Flag de migração resetada');
};
