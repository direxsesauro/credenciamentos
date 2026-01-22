import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar, 
  Clock, 
  DollarSign, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  XCircle,
  RotateCcw
} from 'lucide-react';
import {
  getContractPeriodsSummary,
  calculatePeriodStatistics,
  formatPeriodType,
  formatPeriodStatus,
  formatPeriodNumber,
  getPeriodStatusColorClass,
  getDaysRemainingInActivePeriod,
  getPeriodUrgencyStatus,
  hasMultiplePeriods,
  useContractPeriodsSummaryQueryKey,
  type ContractPeriodSummary
} from '@/services/contract-periods';

interface ContractPeriodsHistoryProps {
  contractId: string;
}

export const ContractPeriodsHistory: React.FC<ContractPeriodsHistoryProps> = ({ contractId }) => {
  // Buscar dados dos períodos
  const { data: periods = [], isLoading, error } = useQuery({
    queryKey: useContractPeriodsSummaryQueryKey(contractId),
    queryFn: () => getContractPeriodsSummary(contractId),
    enabled: !!contractId,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Carregando histórico de períodos...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            Erro ao carregar histórico de períodos
          </div>
        </CardContent>
      </Card>
    );
  }

  if (periods.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            Nenhum período encontrado para este contrato
          </div>
        </CardContent>
      </Card>
    );
  }

  const statistics = calculatePeriodStatistics(periods);
  const daysRemaining = getDaysRemainingInActivePeriod(periods);
  const urgencyStatus = getPeriodUrgencyStatus(daysRemaining);
  const isMultiplePeriods = hasMultiplePeriods(periods);

  const getPeriodIcon = (periodType: 'original' | 'extension', status: 'active' | 'completed' | 'cancelled') => {
    if (status === 'completed') return <CheckCircle className="h-5 w-5 text-blue-600" />;
    if (status === 'cancelled') return <XCircle className="h-5 w-5 text-red-600" />;
    if (periodType === 'extension') return <RotateCcw className="h-5 w-5 text-green-600" />;
    return <Calendar className="h-5 w-5 text-gray-600" />;
  };

  return (
    <div className="space-y-6">
      {/* Resumo Geral */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <span>Resumo dos Períodos</span>
            {isMultiplePeriods && (
              <Badge variant="secondary" className="ml-2">
                {statistics.totalPeriods} Período{statistics.totalPeriods > 1 ? 's' : ''}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Execução financeira consolidada de todos os períodos de vigência
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Total Pago (Todos os Períodos)</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(statistics.totalPaidAllPeriods)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {statistics.overallExecutionPercentage}% do total
              </p>
            </div> */}
            
            {/* <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Valor Total (Todos os Períodos)</p>
              <p className="text-2xl font-bold text-blue-600">
                {/* deve mostrar o valor do contrato juntamente com o valor de todas as alterações */}
                {/* {formatCurrency(statistics.totalAvailableAllPeriods + (statistics.total_amendments_value || 0))}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Soma de todos os períodos
              </p>
            </div> */}

            {/* <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Períodos Concluídos</p>
              <p className="text-2xl font-bold text-purple-600">
                {statistics.completedPeriods}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                de {statistics.totalPeriods} total
              </p>
            </div> */}

            {/* <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Período Atual</p>
              <div className="flex items-center justify-center space-x-2 mt-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-lg font-bold text-gray-900">
                  {statistics.currentPeriodExecution?.periodNumber || 'N/A'}
                </span>
              </div>
              {daysRemaining !== null && (
                <p className={`text-xs mt-1 ${urgencyStatus.colorClass}`}>
                  {daysRemaining > 0 ? `${daysRemaining} dias restantes` : 'Vencido'}
                </p>
              )}
            </div> */}
          {/* </div> */}

          {/* Progresso do Período Atual */}
          {statistics.currentPeriodExecution && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-900">
                  Execução do Período Atual
                </span>
                <span className="text-sm font-bold text-blue-700">
                  {statistics.currentPeriodExecution.executionPercentage}%
                </span>
              </div>
              <Progress 
                value={statistics.currentPeriodExecution.executionPercentage} 
                className="mb-2"
              />
              <div className="flex justify-between text-xs text-blue-700">
                <span>
                  Pago: {formatCurrency(statistics.currentPeriodExecution.paidValue)}
                </span>
                <span>
                  Restante: {formatCurrency(statistics.currentPeriodExecution.remainingValue)}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Histórico de Períodos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-purple-600" />
            <span>Histórico de Períodos</span>
          </CardTitle>
          <CardDescription>
            Detalhamento de cada período de vigência do contrato
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {periods.map((period, index) => (
              <div key={period.period_id}>
                <div className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  {/* Ícone e Indicador */}
                  <div className="flex flex-col items-center">
                    {getPeriodIcon(period.period_type, period.period_status)}
                    {index < periods.length - 1 && (
                      <div className="w-px h-16 bg-gray-300 mt-2"></div>
                    )}
                  </div>

                  {/* Conteúdo do Período */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <h4 className="font-semibold text-gray-900">
                          {formatPeriodNumber(period.period_number, period.period_type)}
                        </h4>
                        <Badge className={getPeriodStatusColorClass(period.period_status)}>
                          {formatPeriodStatus(period.period_status)}
                        </Badge>
                        {period.period_status === 'active' && daysRemaining !== null && (
                          <Badge variant="outline" className={urgencyStatus.colorClass}>
                            {urgencyStatus.label}
                          </Badge>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-600">Execução</p>
                        <p className="text-lg font-bold text-blue-600">
                          {period.execution_percentage}%
                        </p>
                      </div>
                    </div>

                    {/* Informações do Período */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                      <div>
                        <p className="text-xs text-gray-500">Vigência</p>
                        <p className="text-sm font-medium">
                          {formatDate(period.start_date)} a {formatDate(period.end_date)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Valor Disponível</p>
                        <p className="text-sm font-medium text-blue-600">
                          {formatCurrency(period.available_value)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Parcelas</p>
                        <p className="text-sm font-medium">
                          {period.paid_installments} de {period.total_installments} pagas
                        </p>
                      </div>
                    </div>

                    {/* Progresso Financeiro */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Progresso Financeiro</span>
                        <span>{period.execution_percentage}%</span>
                      </div>
                      <Progress value={period.execution_percentage} className="mb-1" />
                      <div className="flex justify-between text-xs">
                        <span className="text-green-600">
                          Pago: {formatCurrency(period.paid_value)}
                        </span>
                        <span className="text-orange-600">
                          Restante: {formatCurrency(period.remaining_value)}
                        </span>
                      </div>
                    </div>

                    {/* Justificativa */}
                    {period.justification && (
                      <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                        <strong>Justificativa:</strong> {period.justification}
                      </div>
                    )}
                  </div>
                </div>

                {index < periods.length - 1 && <Separator className="my-2" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Alertas e Observações */}
      {isMultiplePeriods && (
        <Card className="border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 mb-1">Contrato com Prorrogações</h4>
                <p className="text-sm text-blue-700">
                  Este contrato foi prorrogado {statistics.completedPeriods} vez(es). 
                  Cada prorrogação iniciou um novo período com o valor total disponível para execução, 
                  permitindo uma gestão independente da execução financeira por período.
                </p>
                <p className="text-xs text-blue-600 mt-2">
                  <strong>Benefício:</strong> Facilita o controle e acompanhamento da execução 
                  de contratos com múltiplas vigências, mantendo histórico completo.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}; 