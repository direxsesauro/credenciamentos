import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  DollarSign, 
  Plus, 
  History, 
  Edit,
  ArrowLeft
} from 'lucide-react';
import { TenureAmendmentForm } from './TenureAmendmentForm';
import { ValueAmendmentForm } from './ValueAmendmentForm';
import { AmendmentsHistory } from './AmendmentsHistory';
import { formatCurrency, getContractWithCurrentInfo } from '@/services/contract-amendments';
import { useAuth } from '@/components/AuthProvider';

interface ContractAmendmentsManagerProps {
  contractId: string;
  onBack?: () => void;
}

export const ContractAmendmentsManager: React.FC<ContractAmendmentsManagerProps> = ({
  contractId,
  onBack
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('history');
  const [showTenureForm, setShowTenureForm] = useState(false);
  const [showValueForm, setShowValueForm] = useState(false);

  const { data: contractData, isLoading, error, refetch } = useQuery({
    queryKey: ['contract-with-current-info', contractId, user?.id],
    queryFn: () => getContractWithCurrentInfo(contractId, user?.id),
    staleTime: 0, // Sempre buscar dados frescos
    refetchOnWindowFocus: true // Refetch quando a janela ganhar foco
  });

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error || !contractData) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-red-600">Erro ao carregar informações do contrato.</p>
            {onBack && (
              <Button onClick={onBack} className="mt-4">
                Voltar
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleFormSuccess = () => {
    setShowTenureForm(false);
    setShowValueForm(false);
    setActiveTab('history');
    // Invalidar cache para forçar atualização dos dados
    queryClient.invalidateQueries({ 
      queryKey: ['contract-with-current-info', contractId] 
    });
    queryClient.invalidateQueries({ 
      queryKey: ['contract-amendments', contractId] 
    });
    queryClient.invalidateQueries({ 
      queryKey: ['contract-periods-for-payment', contractId] 
    });
    refetch();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-4">
          {onBack && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={onBack}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Voltar</span>
            </Button>
          )}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Alterações do Contrato
            </h1>
            <p className="text-gray-600">
              Contrato {contractData.contract_number} - {contractData.contractor_name}
            </p>
          </div>
        </div>

        {/* Informações Atuais do Contrato */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <DollarSign className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Valor Atual</p>
                  <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(contractData.total_value + (contractData.total_amendments_value || 0))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <Calendar className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Vigência Atual</p>
                  <p className="font-semibold">
                    {new Date(contractData.current_start_date).toLocaleDateString('pt-BR')} a{' '}
                    {new Date(contractData.current_end_date).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <Edit className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Total de Alterações</p>
                  <p className="text-2xl font-bold text-purple-600">
                  {contractData.total_amendments}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Formulários ou Histórico */}
      {showTenureForm ? (
        <TenureAmendmentForm
          contractId={contractId}
          currentStartDate={contractData.current_start_date}
          currentEndDate={contractData.current_end_date}
          userId={user?.id || ''}
          onSuccess={handleFormSuccess}
          onCancel={() => setShowTenureForm(false)}
        />
      ) : showValueForm ? (
        <ValueAmendmentForm
          contractId={contractId}
          currentValue={contractData.total_value + (contractData.total_amendments_value || 0)}
          userId={user?.id || ''}
          onSuccess={handleFormSuccess}
          onCancel={() => setShowValueForm(false)}
        />
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex justify-between items-center mb-6">
            <TabsList>
              <TabsTrigger value="history" className="flex items-center space-x-2">
                <History className="h-4 w-4" />
                <span>Histórico</span>
              </TabsTrigger>
            </TabsList>

            <div className="flex space-x-3">
              <Button
                onClick={() => setShowTenureForm(true)}
                className="flex items-center space-x-2"
                variant="outline"
              >
                <Calendar className="h-4 w-4" />
                <span>Alterar Vigência</span>
              </Button>
              <Button
                onClick={() => setShowValueForm(true)}
                className="flex items-center space-x-2"
              >
                <DollarSign className="h-4 w-4" />
                <span>Alterar Valor</span>
              </Button>
            </div>
          </div>

          <TabsContent value="history">
            <AmendmentsHistory contractId={contractId} userId={user?.id || ''} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}; 