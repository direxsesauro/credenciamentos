
import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ViewType, Contract, PaymentRecord } from './types';
import { useContracts } from './hooks/useContracts';
import { usePayments } from './hooks/usePayments';
import { migrateLocalStorageToFirestore } from './utils/migration';
import { AuthProvider } from './components/AuthProvider';
import Dashboard from './components/Dashboard';
import ContractList from './components/ContractList';
import PaymentHistory from './components/PaymentHistory';
import PaymentForm from './components/PaymentForm';
import ContractForm from './components/ContractForm';
import Sidebar from './components/Sidebar';
import { ContractAmendmentsManager } from './components/ContractAmendmentsManager';
import ContractDetails from './components/ContractDetails';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const AppContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [editingPayment, setEditingPayment] = useState<PaymentRecord | null>(null);
  const [amendmentsContractId, setAmendmentsContractId] = useState<string | null>(null);
  const [viewingContractId, setViewingContractId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('sesau_theme') === 'dark';
  });
  const [migrationStatus, setMigrationStatus] = useState<'pending' | 'running' | 'completed' | 'error'>('pending');

  // Usar hooks do Firebase para contratos e pagamentos
  const {
    contracts,
    loading: contractsLoading,
    error: contractsError,
    addContract: addContractToFirestore,
    updateContract: updateContractInFirestore,
    deleteContract: deleteContractFromFirestore
  } = useContracts(true); // true = tempo real

  const {
    payments,
    loading: paymentsLoading,
    error: paymentsError,
    addPayment: addPaymentToFirestore,
    updatePayment: updatePaymentInFirestore
  } = usePayments(true); // true = tempo real

  // Migração automática do localStorage para Firestore
  useEffect(() => {
    const runMigration = async () => {
      setMigrationStatus('running');
      try {
        const result = await migrateLocalStorageToFirestore();
        if (result.success) {
          console.log(`Migração concluída: ${result.contractsMigrated} contratos, ${result.paymentsMigrated} pagamentos`);
          setMigrationStatus('completed');
        } else {
          console.error('Migração concluída com erros:', result.errors);
          setMigrationStatus('error');
        }
      } catch (error) {
        console.error('Erro na migração:', error);
        setMigrationStatus('error');
      }
    };

    runMigration();
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('sesau_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('sesau_theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  // Contract CRUD Operations
  const handleAddContract = async (contract: Contract) => {
    try {
      // Se o contrato tem ID (edição), remover para criar novo
      const { id, ...contractData } = contract;
      await addContractToFirestore(contractData);
      setCurrentView('contracts');
    } catch (error) {
      console.error('Erro ao adicionar contrato:', error);
      alert('Erro ao adicionar contrato. Verifique sua conexão e tente novamente.');
    }
  };

  const handleUpdateContract = async (updatedContract: Contract) => {
    try {
      await updateContractInFirestore(updatedContract.id, updatedContract);
      setEditingContract(null);
      setCurrentView('contracts');
    } catch (error) {
      console.error('Erro ao atualizar contrato:', error);
      alert('Erro ao atualizar contrato. Verifique sua conexão e tente novamente.');
    }
  };

  const handleDeleteContract = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este contrato? Pagamentos vinculados a ele não serão excluídos, mas perderão a referência da empresa.')) {
      try {
        await deleteContractFromFirestore(id);
      } catch (error) {
        console.error('Erro ao deletar contrato:', error);
        alert('Erro ao deletar contrato. Verifique sua conexão e tente novamente.');
      }
    }
  };

  const handleEditClick = (contract: Contract) => {
    setEditingContract(contract);
    setCurrentView('edit-contract');
  };

  const handleManageAmendments = (contract: Contract) => {
    setAmendmentsContractId(contract.id);
    setCurrentView('contract-amendments');
  };

  // Listener para evento de gerenciar alterações
  useEffect(() => {
    const handleManageAmendmentsEvent = (event: CustomEvent) => {
      const contract = event.detail as Contract;
      handleManageAmendments(contract);
    };
    window.addEventListener('manageAmendments' as any, handleManageAmendmentsEvent as EventListener);
    return () => {
      window.removeEventListener('manageAmendments' as any, handleManageAmendmentsEvent as EventListener);
    };
  }, []);

  // Listener para evento de visualizar detalhes
  useEffect(() => {
    const handleViewContractDetails = (event: CustomEvent) => {
      const contract = event.detail as Contract;
      setViewingContractId(contract.id);
      setCurrentView('contract-details');
    };
    window.addEventListener('viewContractDetails' as any, handleViewContractDetails as EventListener);
    return () => {
      window.removeEventListener('viewContractDetails' as any, handleViewContractDetails as EventListener);
    };
  }, []);

  // Payment Operations
  const addPayment = async (newPayment: any) => {
    try {
      await addPaymentToFirestore(newPayment);
      setCurrentView('payments');
    } catch (error) {
      console.error('Erro ao adicionar pagamento:', error);
      alert('Erro ao adicionar pagamento. Verifique sua conexão e tente novamente.');
    }
  };

  const updatePayment = async (payment: PaymentRecord) => {
    try {
      await updatePaymentInFirestore(payment.id, payment);
      setEditingPayment(null);
      setCurrentView('payments');
    } catch (error) {
      console.error('Erro ao atualizar pagamento:', error);
      alert('Erro ao atualizar pagamento. Verifique sua conexão e tente novamente.');
    }
  };

  const handleEditPayment = (payment: PaymentRecord) => {
    setEditingPayment(payment);
    setCurrentView('edit-payment');
  };

  const handleUpdatePayment = async (payment: PaymentRecord) => {
    try {
      await updatePaymentInFirestore(payment.id, payment);
      setEditingPayment(null);
      setCurrentView('payments');
    } catch (error) {
      console.error('Erro ao atualizar pagamento:', error);
      alert('Erro ao atualizar pagamento. Verifique sua conexão e tente novamente.');
    }
  };

  const handleLaunchPayment = (contract: Contract) => {
    setSelectedContract(contract);
    setCurrentView('new-payment');
  };

  // Loading state
  const isLoading = contractsLoading || paymentsLoading || migrationStatus === 'running';

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-slate-950 overflow-hidden transition-colors duration-300">
      <Sidebar currentView={currentView} setView={setCurrentView} isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />

      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">SESAU/RO - Sistema de Gestão SUS</h1>
            <p className="text-slate-500 dark:text-slate-400">Controle de Pagamentos de Prestadores Credenciados</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentView('new-contract')}
              className="bg-slate-800 dark:bg-slate-700 text-white px-4 py-2 rounded-lg shadow hover:bg-slate-700 dark:hover:bg-slate-600 transition flex items-center gap-2 text-sm"
            >
              <span className="font-bold">+</span> Contrato
            </button>
            <button
              onClick={() => setCurrentView('new-payment')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition flex items-center gap-2 text-sm"
            >
              <span className="font-bold">+</span> Pagamento
            </button>
          </div>
        </header>

        {/* Loading Indicator */}
        {isLoading && (
          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-blue-700 dark:text-blue-300 text-sm">
              {migrationStatus === 'running' ? 'Migrando dados...' : 'Carregando dados...'}
            </p>
          </div>
        )}

        {/* Error Indicators */}
        {contractsError && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-700 dark:text-red-300 text-sm">
              Erro ao carregar contratos: {contractsError.message}
            </p>
          </div>
        )}
        {paymentsError && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-700 dark:text-red-300 text-sm">
              Erro ao carregar pagamentos: {paymentsError.message}
            </p>
          </div>
        )}

        <div className="max-w-[1600px] mx-auto">
          {currentView === 'dashboard' && (
            <Dashboard contracts={contracts} payments={payments} isDarkMode={isDarkMode} />
          )}
          {currentView === 'contracts' && (
            <ContractList
              contracts={contracts}
              payments={payments}
              onLaunchPayment={handleLaunchPayment}
              onEdit={handleEditClick}
              onDelete={handleDeleteContract}
              onAddNew={() => setCurrentView('new-contract')}
            />
          )}
          {currentView === 'payments' && (
            <PaymentHistory payments={payments} contracts={contracts} onEdit={handleEditPayment} />
          )}
          {currentView === 'new-payment' && (
            <PaymentForm
              contracts={contracts}
              initialContract={selectedContract}
              onSubmit={addPayment}
              onCancel={() => setCurrentView('payments')}
            />
          )}
          {currentView === 'new-contract' && (
            <ContractForm
              onSubmit={handleAddContract}
              onCancel={() => setCurrentView('contracts')}
            />
          )}
          {currentView === 'edit-contract' && editingContract && (
            <ContractForm
              initialData={editingContract}
              onSubmit={handleUpdateContract}
              onCancel={() => { setEditingContract(null); setCurrentView('contracts'); }}
            />
          )}
          {currentView === 'edit-payment' && editingPayment && (
            <PaymentForm
              contracts={contracts}
              initialContract={null}
              initialData={editingPayment}
              onSubmit={handleUpdatePayment}
              onCancel={() => { setEditingPayment(null); setCurrentView('payments'); }}
            />
          )}
          {currentView === 'contract-details' && viewingContractId && (
            <ContractDetails
              contractId={viewingContractId}
              onBack={() => { setViewingContractId(null); setCurrentView('contracts'); }}
              onManageAmendments={() => {
                setAmendmentsContractId(viewingContractId);
                setCurrentView('contract-amendments');
              }}
              onEditPayment={(payment) => {
                setEditingPayment(payment);
                setCurrentView('edit-payment');
              }}
            />
          )}
          {currentView === 'contract-amendments' && amendmentsContractId && (
            <ContractAmendmentsManager
              contractId={amendmentsContractId}
              onBack={() => {
                setAmendmentsContractId(null);
                setViewingContractId(amendmentsContractId);
                setCurrentView('contract-details');
              }}
            />
          )}
        </div>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
