import React, { useEffect, useState } from 'react';
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { 
  FileText, 
  ArrowLeft,
  DollarSign,
  Calendar,
  Building2,
  User,
  Download,
  Clock,
  CheckCircle,
  CreditCard,
  TrendingUp,
  Edit,
  History,
  ExternalLink
} from "lucide-react";
// import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, BarChart, Bar, Tooltip } from 'recharts';
import { useAuth } from './AuthProvider';
import { getContractById } from '../services/firebase/contracts.service';
import { getContractWithCurrentInfo } from '../services/firebase/contract-amendments.service';
import { getPaymentsByContract } from '../services/firebase/payments.service';
import { useQuery } from '@tanstack/react-query';
import { ContractPeriodsHistory } from './ContractPeriodsHistory';
import { useToast } from "../hooks/use-toast";

interface ContractDetailsProps {
  contractId: string;
  onBack?: () => void;
  onManageAmendments?: () => void;
}

const ContractDetails: React.FC<ContractDetailsProps> = ({ contractId, onBack, onManageAmendments }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Estado para controlar qual aba está ativa
  const [activeTab, setActiveTab] = useState<'overview' | 'periods'>('overview');

  // Buscar dados do contrato com informações atualizadas
  const { data: contract, isLoading: contractLoading } = useQuery({
    queryKey: ['contract-with-current-info', contractId, user?.id],
    queryFn: () => getContractWithCurrentInfo(contractId, user?.id || ''),
    enabled: !!contractId && !!user?.id,
  });

  // Buscar pagamentos do contrato
  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ['payments-by-contract', contractId],
    queryFn: async () => {
      const contractData = await getContractById(contractId);
      if (!contractData) return [];
      return getPaymentsByContract(contractData.numero_contrato);
    },
    enabled: !!contractId,
  });

  if (contractLoading || paymentsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Contrato não encontrado</h2>
          {onBack && (
            <Button onClick={onBack}>
              Voltar para Contratos
            </Button>
          )}
        </div>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatFileSize = (bytes: number) => {
    return (bytes / 1024).toFixed(1) + ' KB';
  };

  const getTotalPaid = () => {
    return payments.reduce((total, payment) => {
      const fed = payment.pagamentos_fed?.reduce((sum, entry) => sum + entry.valor, 0) || 0;
      const est = payment.pagamentos_est?.reduce((sum, entry) => sum + entry.valor, 0) || 0;
      return total + fed + est;
    }, 0);
  };

  const getTotalApprovisioned = () => {
    return payments.reduce((total, payment) => total + (payment.valor_nfe || 0), 0);
  };

  const getPaymentProgress = () => {
    const totalValue = contract.total_value + (contract.total_amendments_value || 0);
    return Math.round((getTotalPaid() / totalValue) * 100);
  };

  const getApprovisionedProgress = () => {
    const totalValue = contract.total_value + (contract.total_amendments_value || 0);
    return Math.round((getTotalApprovisioned() / totalValue) * 100);
  };

  // Calcular progresso esperado baseado no número de parcelas pagas
  const getExpectedProgress = () => {
    const totalInstallments = payments.length || 1;
    const paidInstallments = payments.length; // Todos os pagamentos registrados são considerados
    const expectedPercentage = (paidInstallments / totalInstallments) * 100;
    
    return Math.round(expectedPercentage);
  };

  // Verificar se está acima ou abaixo da meta
  const getProgressComparison = () => {
    const actual = getPaymentProgress();
    const expected = getExpectedProgress();
    
    if (actual > expected) {
      return { status: 'above', difference: actual - expected };
    } else if (actual < expected) {
      return { status: 'below', difference: expected - actual };
    } else {
      return { status: 'ontrack', difference: 0 };
    }
  };

  const getDaysRemaining = () => {
    const today = new Date();
    const endDate = new Date(contract.current_end_date || contract.fim_vigencia || contract.inicio_vigencia);
    const timeDiff = endDate.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return daysDiff;
  };

  const getContractStatusInfo = () => {
    const daysRemaining = getDaysRemaining();
    if (daysRemaining < 0) {
      return { label: 'Vencido', colorClass: 'bg-red-100 text-red-800' };
    } else if (daysRemaining <= 30) {
      return { label: `Vence em ${daysRemaining} dia${daysRemaining !== 1 ? 's' : ''}`, colorClass: 'bg-red-100 text-red-800' };
    } else if (daysRemaining <= 60) {
      return { label: `Vence em ${daysRemaining} dias`, colorClass: 'bg-orange-100 text-orange-800' };
    } else {
      return { label: `Vence em ${daysRemaining} dias`, colorClass: 'bg-green-100 text-green-800' };
    }
  };

  const getDaysRemainingLabel = (days: number) => {
    if (days < 0) return 'Vencido';
    if (days === 0) return 'Vence hoje';
    if (days === 1) return '1 dia restante';
    return `${days} dias restantes`;
  };

  const getDaysRemainingColor = (days: number) => {
    if (days < 0) return 'text-red-600';
    if (days <= 30) return 'text-red-500';
    if (days <= 60) return 'text-orange-500';
    return 'text-green-600';
  };

  const getPaymentStatusColor = (payment: any) => {
    const totalPaid = (payment.pagamentos_fed?.reduce((sum: number, e: any) => sum + e.valor, 0) || 0) +
                     (payment.pagamentos_est?.reduce((sum: number, e: any) => sum + e.valor, 0) || 0);
    if (totalPaid > 0) return 'bg-green-100 text-green-800';
    if (payment.valor_nfe > 0) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getPaymentStatusLabel = (payment: any) => {
    const totalPaid = (payment.pagamentos_fed?.reduce((sum: number, e: any) => sum + e.valor, 0) || 0) +
                     (payment.pagamentos_est?.reduce((sum: number, e: any) => sum + e.valor, 0) || 0);
    if (totalPaid > 0) return 'Pago';
    if (payment.valor_nfe > 0) return 'Pendente';
    return 'Sem pagamento';
  };

  // Preparar dados para o gráfico
  const totalInstallments = payments.length || 12; // Usar 12 como padrão se não houver pagamentos
  const estimatedInstallmentValue = (contract.total_value + (contract.total_amendments_value || 0)) / totalInstallments;
  
  // Agrupar pagamentos por competência
  const paymentsByMonth = payments.reduce((acc, payment, index) => {
    const installmentKey = index + 1;
    
    if (!acc[installmentKey]) {
      acc[installmentKey] = {
        installment: `${installmentKey}ª`,
        totalInvoice: 0,
        totalLiquidated: 0,
        estimated: estimatedInstallmentValue
      };
    }
    
    // Somar valores
    acc[installmentKey].totalInvoice += payment.valor_nfe || 0;
    const totalPaid = (payment.pagamentos_fed?.reduce((sum: number, e: any) => sum + e.valor, 0) || 0) +
                     (payment.pagamentos_est?.reduce((sum: number, e: any) => sum + e.valor, 0) || 0);
    acc[installmentKey].totalLiquidated += totalPaid;
    
    return acc;
  }, {} as Record<number, any>);
  
  // Converter para array e ordenar
  const chartData = Object.values(paymentsByMonth)
    .sort((a: any, b: any) => {
      const aNum = parseInt(a.installment.replace('ª', ''));
      const bNum = parseInt(b.installment.replace('ª', ''));
      return aNum - bNum;
    })
    .map((item: any) => ({
      installment: item.installment,
      estimated: item.estimated,
      invoice: item.totalInvoice,
      liquidated: item.totalLiquidated,
    }));

  const chartConfig = {
    estimated: {
      label: "Valor Estimado",
      color: "#8884d8",
    },
    invoice: {
      label: "Valor da NF",
      color: "#82ca9d",
    },
    liquidated: {
      label: "Valor Liquidado",
      color: "#ffc658",
    },
  };

  const handleEditPayment = (payment: any) => {
    toast({
      title: "Editar Pagamento",
      description: `Abrindo edição do pagamento`,
    });
    // TODO: Implementar navegação para edição
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Main Content */}
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header simples com botão voltar */}
          {onBack && (
            <div className="mb-4">
              <Button 
                variant="ghost" 
                onClick={onBack}
                className="p-2"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Voltar
              </Button>
            </div>
          )}

          {/* Duas colunas lado a lado */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Informações do Contrato */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <span>Informações do Contrato</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Número do Contrato</p>
                  <p className="font-medium text-lg">{contract.contract_number || contract.numero_contrato}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Contratado</p>
                  <p className="font-medium">{contract.contractor_name || contract.empresa}</p>
                  <p className="text-sm text-gray-500">{contract.cnpj || contract.contractor_document || ''}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Vigência</p>
                  <p className="font-medium flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    {new Date(contract.current_start_date || contract.inicio_vigencia).toLocaleDateString('pt-BR')} a {new Date(contract.current_end_date || contract.fim_vigencia || contract.inicio_vigencia).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Objeto</p>
                  <p className="font-medium">{contract.objeto || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Número do Processo</p>
                  <p className="font-medium">{contract.numero_processo || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Parcelas</p>
                  <p className="font-medium">{payments.length || 12}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                  <span className={`inline-block px-3 py-1 text-sm rounded-full ${getContractStatusInfo().colorClass}`}>
                    {getContractStatusInfo().label}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Resumo Financeiro */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <span>Resumo Financeiro</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Valor Total</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(contract.total_value + (contract.total_amendments_value || 0))}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Valor Aprovisionado (NFs Enviadas)</p>
                  <p className="text-xl font-bold text-blue-600">
                    {formatCurrency(getTotalApprovisioned())}
                  </p>
                  <div className="mt-2">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-xs text-gray-500">Progresso Aprovisionado</p>
                      <p className="text-sm font-bold text-blue-600">{getApprovisionedProgress()}%</p>
                    </div>
                    <Progress value={getApprovisionedProgress()} className="h-2 mb-1" />
                    <p className="text-xs text-gray-500">
                      Notas fiscais enviadas para pagamento
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Valor Liquidado (Efetivamente Pago)</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency(getTotalPaid())}
                  </p>
                  <div className="mt-2">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-xs text-gray-500">Progresso Real (Liquidado)</p>
                      <p className="text-sm font-bold text-green-600">{getPaymentProgress()}%</p>
                    </div>
                    <Progress value={getPaymentProgress()} className="h-2" />
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Valor Restante</p>
                  <p className="text-xl font-bold text-orange-600">
                    {formatCurrency(contract.total_value + (contract.total_amendments_value || 0) - getTotalPaid())}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Meta Esperada</p>
                  <p className="text-lg font-bold text-purple-600">{getExpectedProgress()}%</p>
                  <div className="mt-2">
                    <div className="w-full bg-purple-100 rounded-full h-2">
                      <div 
                        className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${getExpectedProgress()}%` }}
                      ></div>
                    </div>
                    <div className="mt-1 text-xs text-gray-600 flex items-center">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      No alvo da meta ({payments.length}/{payments.length || 12} parcelas pagas)
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Valor Estimado por Parcela</p>
                  <p className="text-xl font-bold text-purple-600">
                    {formatCurrency(estimatedInstallmentValue)}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    Dias Restantes
                  </p>
                  <p className={`text-lg font-bold ${getDaysRemainingColor(getDaysRemaining())}`}>
                    {getDaysRemainingLabel(getDaysRemaining())}
                  </p>
                </div>

                {/* Botão para Gerenciar Alterações */}
                {onManageAmendments && (
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
                    <Button
                      onClick={onManageAmendments}
                      className="w-full flex items-center justify-center space-x-2"
                      variant="outline"
                    >
                      <Edit className="h-4 w-4" />
                      <span>Gerenciar Alterações do Contrato</span>
                    </Button>
                  </div>
                )}
            </CardContent>
          </Card>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4" />
              <span>Resumo Geral</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('periods')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'periods'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center space-x-2">
              <History className="h-4 w-4" />
              <span>Períodos de Vigência</span>
            </div>
          </button>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'overview' && (
          <>
            {/* Chart Section */}
        {chartData.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <span>Comparativo de Valores das Parcelas</span>
              </CardTitle>
              <CardDescription>
                Comparação entre valores estimados, valores das notas fiscais e valores liquidados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart 
                    data={chartData} 
                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis 
                      dataKey="installment"
                      stroke="#6b7280"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                    />
                    <YAxis 
                      stroke="#6b7280"
                      tickFormatter={(value) => formatCurrency(value)}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white p-3 border rounded shadow-lg">
                              <p className="font-medium mb-2">{label}</p>
                              {payload.map((entry: any, index: number) => (
                                <p key={index} style={{ color: entry.color }} className="text-sm">
                                  {entry.name}: {formatCurrency(entry.value)}
                                </p>
                              ))}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      dataKey="estimated"
                      name="Valor Estimado"
                      type="natural"
                      fill="#8884d8"
                      fillOpacity={0.2}
                      stroke="#8884d8"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      stackId="a"
                    />
                    <Area
                      dataKey="invoice"
                      name="Valor da NF"
                      type="natural"
                      fill="#82ca9d"
                      fillOpacity={0.3}
                      stroke="#82ca9d"
                      strokeWidth={2}
                      stackId="b"
                    />
                    <Area
                      dataKey="liquidated"
                      name="Valor Liquidado"
                      type="natural"
                      fill="#ffc658"
                      fillOpacity={0.4}
                      stroke="#ffc658"
                      strokeWidth={3}
                      stackId="c"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              
              {/* Legenda manual */}
              <div className="flex justify-center gap-6 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-3 border-2 border-[#8884d8] border-dashed bg-[#8884d8] bg-opacity-20 rounded"></div>
                  <span>Valor Estimado</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-3 bg-[#82ca9d] bg-opacity-30 border-2 border-[#82ca9d] rounded"></div>
                  <span>Valor da NF</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-3 bg-[#ffc658] bg-opacity-40 border-2 border-[#ffc658] rounded"></div>
                  <span>Valor Liquidado</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payments History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5 text-purple-600" />
              <span>Histórico de Pagamentos</span>
            </CardTitle>
            <CardDescription>
              Detalhes de todas as parcelas e pagamentos registrados. Clique em uma linha para editar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Nenhum pagamento registrado para este contrato.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Competência</TableHead>
                    <TableHead>Nº NF</TableHead>
                    <TableHead>Data Cadastro</TableHead>
                    <TableHead>Valor da NF</TableHead>
                    <TableHead>Valor Pago</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment, index) => {
                    const totalPaid = (payment.pagamentos_fed?.reduce((sum: number, e: any) => sum + e.valor, 0) || 0) +
                                     (payment.pagamentos_est?.reduce((sum: number, e: any) => sum + e.valor, 0) || 0);
                    return (
                      <TableRow 
                        key={payment.id}
                        className="group cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        onClick={() => handleEditPayment(payment)}
                        title="Clique para editar este pagamento"
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-2">
                            <span>{payment.mes_competencia}/{payment.ano_competencia}</span>
                            <ExternalLink className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-all duration-200" />
                          </div>
                        </TableCell>
                        <TableCell>
                          {payment.numero_nf || '-'}
                        </TableCell>
                        <TableCell>
                          {payment.data_cadastro ? new Date(payment.data_cadastro).toLocaleDateString('pt-BR') : '-'}
                        </TableCell>
                        <TableCell>
                          <div>
                            <span className="font-medium text-blue-600">
                              {formatCurrency(payment.valor_nfe || 0)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            {totalPaid > 0 ? (
                              <>
                                <span className="font-medium text-green-600">
                                  {formatCurrency(totalPaid)}
                                </span>
                                {totalPaid !== payment.valor_nfe && (
                                  <div className="text-xs text-orange-600">
                                    Diferença: {formatCurrency((payment.valor_nfe || 0) - totalPaid)}
                                  </div>
                                )}
                              </>
                            ) : (
                              <span className="text-gray-400">Pendente</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-block px-2 py-1 text-xs rounded-full ${getPaymentStatusColor(payment)}`}>
                            {getPaymentStatusLabel(payment)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditPayment(payment);
                            }}
                            title="Editar pagamento"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
          </>
        )}

        {/* Periods Tab Content */}
        {activeTab === 'periods' && (
          <ContractPeriodsHistory contractId={contractId} />
        )}
        </div>
      </div>
    </div>
  );
};

export default ContractDetails; 