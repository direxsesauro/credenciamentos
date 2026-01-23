import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { DollarSign, Plus, Minus, TrendingUp, RefreshCw } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { createValueAmendment, getContractWithCurrentInfo, type ValueAmendmentForm as ValueAmendmentFormData, formatCurrency } from '../services/firebase/contract-amendments.service';
import { useAmendmentNotifier } from '../hooks/useContractStatusUpdater';
import { ConfettiButton } from "./magicui/confetti";

interface ValueAmendmentFormProps {
  contractId: string;
  currentValue: number;
  userId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const ValueAmendmentForm: React.FC<ValueAmendmentFormProps> = ({
  contractId,
  currentValue,
  userId,
  onSuccess,
  onCancel
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { notifyValueAmendment } = useAmendmentNotifier();

  // Buscar dados atualizados do contrato
  const { data: contractData } = useQuery({
    queryKey: ['contract-with-current-info', contractId],
    queryFn: () => getContractWithCurrentInfo(contractId, userId)
  });

  const [formData, setFormData] = useState<ValueAmendmentFormData>({
    amendment_type: 'Aditivo',
    amendment_value: 0,
    percentage_applied: undefined,
    index_used: '',
    reference_period: '',
    justification: '',
    description: '',
    legal_basis: ''
  });

  const [displayValue, setDisplayValue] = useState('');

  const createAmendmentMutation = useMutation({
    mutationFn: () => createValueAmendment(contractId, formData, userId),
    onSuccess: () => {
      // Notifica o sistema sobre a alteração de valor para atualizar métricas
      notifyValueAmendment(contractId);
      
      toast({
        title: "Alteração de valor criada",
        description: "A alteração foi registrada com sucesso. Todas as métricas foram atualizadas.",
      });
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar alteração",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.amendment_value === 0) {
      toast({
        title: "Valor inválido",
        description: "O valor da alteração deve ser diferente de zero.",
        variant: "destructive",
      });
      return;
    }

    createAmendmentMutation.mutate();
  };

  const handleInputChange = (field: keyof ValueAmendmentFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Função para formatar valor monetário brasileiro
  const formatCurrencyInput = (value: string) => {
    const numericValue = value.replace(/\D/g, '');
    if (!numericValue) return '';
    
    const formattedValue = (parseInt(numericValue) / 100).toFixed(2);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(parseFloat(formattedValue));
  };

  // Função para converter valor formatado para número
  const parseCurrencyToNumber = (value: string) => {
    return parseFloat(value.replace(/[^\d,]/g, '').replace(',', '.'));
  };

  const handleValueChange = (value: string) => {
    const formatted = formatCurrencyInput(value);
    setDisplayValue(formatted);
    
    const numericValue = parseCurrencyToNumber(formatted);
    
    // Para supressão, o valor deve ser negativo
    const finalValue = formData.amendment_type === 'suppression' ? -Math.abs(numericValue) : numericValue;
    handleInputChange('amendment_value', finalValue);
  };

  const handleAmendmentTypeChange = (type: 'Aditivo' | 'Supressão' | 'Reajuste' | 'Repactuação') => {
    handleInputChange('amendment_type', type);
    
    // Ajustar sinal do valor baseado no tipo
    if (formData.amendment_value !== 0) {
      const absoluteValue = Math.abs(formData.amendment_value);
      const newValue = type === 'Supressão' ? -absoluteValue : absoluteValue;
      handleInputChange('amendment_value', newValue);
    }
  };

  const calculateNewValue = () => {
    const baseValue = contractData ? 
      (contractData.total_value + (contractData.total_amendments_value || 0)) : 
      currentValue;
    return baseValue + formData.amendment_value;
  };

  const getAmendmentIcon = (type: string) => {
    switch (type) {
      case 'Aditivo': return <Plus className="h-4 w-4" />;
      case 'Supressão': return <Minus className="h-4 w-4" />;
      case 'Reajuste': return <TrendingUp className="h-4 w-4" />;
      case 'Repactuação': return <RefreshCw className="h-4 w-4" />;
      default: return <DollarSign className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <DollarSign className="h-5 w-5 text-green-600" />
          <span>Alterar Valor do Contrato</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tipo de Alteração */}
          <div className="space-y-2">
            <Label htmlFor="amendment_type">Tipo de Alteração</Label>
            <Select
              value={formData.amendment_type}
              onValueChange={handleAmendmentTypeChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Aditivo">
                  <div className="flex items-center space-x-2">
                    <Plus className="h-4 w-4 text-green-600" />
                    <span>Acréscimo de Serviços</span>
                  </div>
                </SelectItem>
                <SelectItem value="Supressão">
                  <div className="flex items-center space-x-2">
                    <Minus className="h-4 w-4 text-red-600" />
                    <span>Supressão de Serviços</span>
                  </div>
                </SelectItem>
                <SelectItem value="Reajuste">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    <span>Reajuste</span>
                  </div>
                </SelectItem>
                <SelectItem value="Repactuação">
                  <div className="flex items-center space-x-2">
                    <RefreshCw className="h-4 w-4 text-purple-600" />
                    <span>Repactuação</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Valor Atual */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Valor Atual do Contrato</h4>
            <p className="text-2xl font-bold text-green-600">
              {contractData ? formatCurrency(contractData.total_value + (contractData.total_amendments_value || 0)) : formatCurrency(currentValue)}
            </p>
          </div>

          {/* Valor da Alteração */}
          <div className="space-y-2">
            <Label htmlFor="amendment_value">
              Valor da {formData.amendment_type === 'suppression' ? 'Supressão' : 'Alteração'}
            </Label>
            <Input
              id="amendment_value"
              value={displayValue}
              onChange={(e) => handleValueChange(e.target.value)}
              placeholder="R$ 0,00"
              required
            />
          </div>

          {/* Campos específicos para reajuste */}
          {formData.amendment_type === 'readjustment' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="percentage_applied">Percentual Aplicado (%)</Label>
                <Input
                  id="percentage_applied"
                  type="number"
                  step="0.01"
                  value={formData.percentage_applied || ''}
                  onChange={(e) => handleInputChange('percentage_applied', parseFloat(e.target.value))}
                  placeholder="Ex: 5.50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="index_used">Índice Utilizado</Label>
                <Input
                  id="index_used"
                  value={formData.index_used || ''}
                  onChange={(e) => handleInputChange('index_used', e.target.value)}
                  placeholder="Ex: IPCA, IGP-M, INPC"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reference_period">Período de Referência</Label>
                <Input
                  id="reference_period"
                  value={formData.reference_period || ''}
                  onChange={(e) => handleInputChange('reference_period', e.target.value)}
                  placeholder="Ex: Janeiro 2024 a Dezembro 2024"
                />
              </div>
            </>
          )}

          {/* Novo Valor Total */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2">Novo Valor Total</h4>
            <div className="flex items-center space-x-2">
              {getAmendmentIcon(formData.amendment_type)}
              <p className="text-2xl font-bold text-blue-700">
                {formatCurrency(calculateNewValue())}
              </p>
            </div>
            <p className="text-sm text-blue-600 mt-1">
              Diferença: {formData.amendment_value >= 0 ? '+' : ''}{formatCurrency(formData.amendment_value)}
            </p>
          </div>

          {/* Justificativa */}
          {/* <div className="space-y-2">
            <Label htmlFor="justification">Justificativa *</Label>
            <Textarea
              id="justification"
              value={formData.justification}
              onChange={(e) => handleInputChange('justification', e.target.value)}
              placeholder="Descreva os motivos para esta alteração de valor..."
              className="min-h-[100px]"
            />
          </div> */}

          {/* Descrição */}
          {/* <div className="space-y-2">
            <Label htmlFor="description">Descrição Detalhada</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Descreva os serviços adicionados, removidos ou alterados..."
              className="min-h-[100px]"
            />
          </div> */}
          

          {/* Base Legal */}
          <div className="space-y-2">
            <Label htmlFor="legal_basis">Número do Termo Aditivo</Label>
            <Input
              id="legal_basis"
              value={formData.legal_basis || ''}
              onChange={(e) => handleInputChange('legal_basis', e.target.value)}
              placeholder="Ex: 1TACNT/2026/SESAU/PGE/2026"
            />
          </div>

          {/* Botões */}
          <div className="flex justify-end space-x-4">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
            )}
            <ConfettiButton 
              type="submit" 
              disabled={createAmendmentMutation.isPending}
              className="flex items-center space-x-2"
            >
              {createAmendmentMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <DollarSign className="h-4 w-4" />
                  <span>Registrar Alteração</span>
                </>
              )}
            </ConfettiButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}; 