import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { 
  Calendar, 
  DollarSign, 
  Clock, 
  Plus, 
  Minus, 
  TrendingUp, 
  RefreshCw,
  FileText,
  User,
  AlertCircle,
  Download
} from 'lucide-react';
import { AmendmentActions } from './AmendmentActions';
import { getContractWithCurrentInfo } from '../services/firebase/contract-amendments.service';
import { getContractAmendmentsHistory, formatAmendmentType, formatCurrency } from '../services/firebase/contract-amendments.service';
import { generateContractAmendmentsReport } from '../utils/pdfGenerator';
import { useAuth } from './AuthProvider';

interface AmendmentsHistoryProps {
  contractId: string;
  userId: string;
}

export const AmendmentsHistory: React.FC<AmendmentsHistoryProps> = ({ contractId, userId }) => {
  const { user } = useAuth();
  
  const { data: historyData, isLoading, error } = useQuery({
    queryKey: ['contract-amendments', contractId],
    queryFn: () => getContractAmendmentsHistory(contractId)
  });

  const { data: contractData, isLoading: isLoadingContract } = useQuery({
    queryKey: ['contract-with-current-info', contractId],
    queryFn: () => getContractWithCurrentInfo(contractId, userId)
  });

  const getAmendmentIcon = (type: string, category: 'tenure' | 'value') => {
    if (category === 'tenure') {
      return type === 'extension' ? 
        <Calendar className="h-4 w-4 text-blue-600" /> : 
        <Clock className="h-4 w-4 text-orange-600" />;
    }
    
    switch (type) {
      case 'addition': return <Plus className="h-4 w-4 text-green-600" />;
      case 'suppression': return <Minus className="h-4 w-4 text-red-600" />;
      case 'readjustment': return <TrendingUp className="h-4 w-4 text-blue-600" />;
      case 'renegotiation': return <RefreshCw className="h-4 w-4 text-purple-600" />;
      default: return <DollarSign className="h-4 w-4" />;
    }
  };

  const getAmendmentBadgeColor = (type: string, category: 'tenure' | 'value') => {
    if (category === 'tenure') {
      return type === 'extension' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800';
    }
    
    switch (type) {
      case 'addition': return 'bg-green-100 text-green-800';
      case 'suppression': return 'bg-red-100 text-red-800';
      case 'readjustment': return 'bg-blue-100 text-blue-800';
      case 'renegotiation': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading || isLoadingContract) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Histórico de Alterações</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <span>Erro ao carregar histórico</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">Não foi possível carregar o histórico de alterações.</p>
        </CardContent>
      </Card>
    );
  }

  const { amendments, summary } = historyData || { amendments: [], summary: null };

  const handleGeneratePDFReport = () => {
    if (!contractData || !amendments) {
      console.error('Dados do contrato ou alterações não disponíveis');
      return;
    }

    try {
      const userName = user?.user_metadata?.full_name || 
                      user?.user_metadata?.responsible_name || 
                      user?.email || 
                      'Usuário';

      generateContractAmendmentsReport(
        contractData,
        amendments,
        userId,
        userName
      );
    } catch (error) {
      console.error('Erro ao gerar relatório PDF:', error);
      // Você pode adicionar um toast ou notificação aqui
      alert('Erro ao gerar relatório PDF. Verifique os dados e tente novamente.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Resumo das Alterações */}
      {summary && contractData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <span>Resumo das Alterações</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-1">Valor Original</h4>
                <p className="text-2xl font-bold text-blue-700">
                  {contractData ? formatCurrency(contractData.total_value || 0) : '-'}
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-green-900 mb-1">Valor Atual</h4>
                <p className="text-2xl font-bold text-green-700">
                {contractData ? formatCurrency(contractData.total_value + (contractData.total_amendments_value || 0)) : '-' }
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-1">Total de Alterações</h4>
                <p className="text-2xl font-bold text-gray-700">
                  {summary.total_value_amendments + summary.total_tenure_amendments}
                </p>
              </div>
              <div className={`p-4 rounded-lg ${summary.total_amendments_value >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                <h4 className={`font-medium mb-1 ${summary.total_amendments_value >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                  Variação Total
                </h4>
                <p className={`text-2xl font-bold ${summary.total_amendments_value >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {summary.total_amendments_value >= 0 ? '+' : ''}{formatCurrency(summary.total_amendments_value)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Histórico de Alterações */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-gray-600" />
              <span>Histórico Completo</span>
            </CardTitle>
            <Button 
              onClick={handleGeneratePDFReport}
              disabled={!contractData || amendments.length === 0}
              className="flex items-center space-x-2"
              variant="outline"
            >
              <Download className="h-4 w-4" />
              <span>Gerar Relatório PDF</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {amendments.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Nenhuma alteração registrada ainda.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {amendments.map((amendment) => (
                <div
                  key={amendment.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      {getAmendmentIcon(amendment.amendment_type, amendment.type)}
                      <div>
                        <Badge 
                          className={getAmendmentBadgeColor(amendment.amendment_type, amendment.type)}
                        >
                          {formatAmendmentType(amendment.amendment_type)}
                        </Badge>
                        <p className="text-sm text-gray-600 mt-1">
                          {amendment.type === 'tenure' ? 'Alteração de Vigência' : 'Alteração de Valor'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <p>{new Date(amendment.amendment_date).toLocaleDateString('pt-BR')}</p>
                      <p>às {new Date(amendment.amendment_date).toLocaleTimeString('pt-BR', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}</p>
                    </div>
                  </div>

                  {/* Detalhes específicos por tipo */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                    {amendment.type === 'value' && (
                      <>
                        <div>
                          <p className="text-sm text-gray-600">Valor Anterior</p>
                          <p className="font-medium">{formatCurrency(amendment.previous_value)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Novo Valor Total</p>
                          <p className="font-medium">{formatCurrency(summary.current_value + summary.total_amendments_value)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Alteração</p>
                          <p className={`font-medium ${amendment.amendment_value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {amendment.amendment_value >= 0 ? '+' : ''}{formatCurrency(amendment.amendment_value)}
                          </p>
                        </div>
                        {amendment.percentage_applied && (
                          <div>
                            <p className="text-sm text-gray-600">Percentual</p>
                            <p className="font-medium">{amendment.percentage_applied}%</p>
                          </div>
                        )}
                      </>
                    )}

                    {amendment.type === 'tenure' && (
                      <>
                        <div>
                          <p className="text-sm text-gray-600">Vigência Anterior</p>
                          <p className="font-medium">
                            {new Date(amendment.previous_start_date).toLocaleDateString('pt-BR')} a{' '}
                            {new Date(amendment.previous_end_date).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Nova Vigência</p>
                          <p className="font-medium">
                            {new Date(amendment.new_start_date).toLocaleDateString('pt-BR')} a{' '}
                            {new Date(amendment.new_end_date).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </>
                    )}



                    {amendment.type === 'value' && amendment.index_used && (
                      <div>
                        <p className="text-sm text-gray-600">Índice Utilizado</p>
                        <p className="font-medium">{amendment.index_used}</p>
                      </div>
                    )}
                  </div>

                  {/* Justificativa */}
                  <div className="mb-3">
                    <p className="text-sm text-gray-600 mb-1">Justificativa</p>
                    <p className="text-sm bg-gray-50 p-2 rounded">
                      {amendment.justification}
                    </p>
                  </div>

                  {/* Descrição (apenas para alterações de valor) */}
                  {amendment.type === 'value' && amendment.description && (
                    <div className="mb-3">
                      <p className="text-sm text-gray-600 mb-1">Descrição</p>
                      <p className="text-sm bg-gray-50 p-2 rounded">
                        {amendment.description}
                      </p>
                    </div>
                  )}

                  {/* Base Legal */}
                  {amendment.legal_basis && (
                    <div className="mb-3">
                      <p className="text-sm text-gray-600 mb-1">Base Legal</p>
                      <p className="text-sm font-mono bg-blue-50 text-blue-800 p-2 rounded">
                        {amendment.legal_basis}
                      </p>
                    </div>
                  )}

                  {/* Rodapé com informações do usuário e ações */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <User className="h-4 w-4" />
                      <span>Alterado por: {amendment.amended_by}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        {amendment.is_active ? (
                          <Badge className="bg-green-100 text-green-800">Ativo</Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-800">Cancelado</Badge>
                        )}
                      </div>
                      <AmendmentActions
                        amendmentId={amendment.id}
                        amendmentType={amendment.type as 'tenure' | 'value'}
                        contractId={contractId}
                        userId={userId}
                        isActive={amendment.is_active}
                        onEdit={() => {
                          // TODO: Implementar modal de edição
                          console.log('Editar alteração:', amendment.id);
                        }}
                        onDeleted={() => {
                          // Refresh será feito automaticamente pela mutation
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}; 