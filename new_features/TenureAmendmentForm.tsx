import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createTenureAmendment, type TenureAmendmentForm as TenureAmendmentFormData } from '@/services/contract-amendments';
import { useAmendmentNotifier } from '@/hooks/useContractStatusUpdater';
import { ConfettiButton } from "@/components/magicui/confetti";

interface TenureAmendmentFormProps {
  contractId: string;
  currentStartDate: string;
  currentEndDate: string;
  userId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const TenureAmendmentForm: React.FC<TenureAmendmentFormProps> = ({
  contractId,
  currentStartDate,
  currentEndDate,
  userId,
  onSuccess,
  onCancel
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { notifyTenureAmendment } = useAmendmentNotifier();

  const [formData, setFormData] = useState<TenureAmendmentFormData>({
    amendment_type: 'extension',
    new_start_date: currentStartDate,
    new_end_date: currentEndDate,
    justification: '',
    legal_basis: ''
  });

  const createAmendmentMutation = useMutation({
    mutationFn: () => createTenureAmendment(contractId, formData, userId),
    onSuccess: () => {
      // Invalidar cache de períodos para pagamento
      queryClient.invalidateQueries({ 
        queryKey: ['contract-periods-for-payment', contractId] 
      });
      
      // Notifica o sistema sobre a alteração de vigência para atualizar todos os status
      notifyTenureAmendment(
        contractId,
        currentStartDate,
        currentEndDate,
        formData.new_start_date,
        formData.new_end_date
      );
      
      toast({
        title: "Alteração de vigência criada",
        description: "A alteração foi registrada com sucesso. Todos os status foram atualizados.",
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
    
    // Validações
    if (formData.amendment_type === 'extension') {
      if (new Date(formData.new_end_date) <= new Date(currentEndDate)) {
        toast({
          title: "Data inválida",
          description: "Para prorrogação, a nova data de fim deve ser posterior à atual.",
          variant: "destructive",
        });
        return;
      }
    } else if (formData.amendment_type === 'early_termination') {
      if (new Date(formData.new_end_date) >= new Date(currentEndDate)) {
        toast({
          title: "Data inválida",
          description: "Para encerramento antecipado, a nova data de fim deve ser anterior à atual.",
          variant: "destructive",
        });
        return;
      }
    }

    createAmendmentMutation.mutate();
  };

  const handleInputChange = (field: keyof TenureAmendmentFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          <span>Alterar Vigência do Contrato</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tipo de Alteração */}
          <div className="space-y-2">
            <Label htmlFor="amendment_type">Tipo de Alteração</Label>
            <Select
              value={formData.amendment_type}
              onValueChange={(value: 'extension' | 'early_termination') => 
                handleInputChange('amendment_type', value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="extension">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4" />
                    <span>Prorrogação da Vigência</span>
                  </div>
                </SelectItem>
                <SelectItem value="early_termination">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4" />
                    <span>Encerramento Antecipado</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Vigência Atual */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Vigência Atual</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Início:</span>
                <span className="ml-2 font-medium">
                  {new Date(currentStartDate).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Fim:</span>
                <span className="ml-2 font-medium">
                  {new Date(currentEndDate).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>
          </div>

          {/* Nova Vigência */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="new_start_date">Nova Data de Início</Label>
              <Input
                id="new_start_date"
                type="date"
                value={formData.new_start_date}
                onChange={(e) => handleInputChange('new_start_date', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new_end_date">Nova Data de Fim</Label>
              <Input
                id="new_end_date"
                type="date"
                value={formData.new_end_date}
                onChange={(e) => handleInputChange('new_end_date', e.target.value)}
                required
              />
            </div>
          </div>



          {/* Justificativa */}
          <div className="space-y-2">
            <Label htmlFor="justification">Justificativa *</Label>
            <Textarea
              id="justification"
              value={formData.justification}
              onChange={(e) => handleInputChange('justification', e.target.value)}
              placeholder="Descreva os motivos para esta alteração de vigência..."
              required
              className="min-h-[100px]"
            />
          </div>

          {/* Base Legal */}
          <div className="space-y-2">
            <Label htmlFor="legal_basis">Base Legal</Label>
            <Input
              id="legal_basis"
              value={formData.legal_basis || ''}
              onChange={(e) => handleInputChange('legal_basis', e.target.value)}
              placeholder="Ex: Art. 57, § 1º da Lei 8.666/93"
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
                  <FileText className="h-4 w-4" />
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