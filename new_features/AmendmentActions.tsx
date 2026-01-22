import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  Edit2, 
  Trash2, 
  MoreHorizontal,
  AlertTriangle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  deleteTenureAmendment, 
  deleteValueAmendment 
} from '@/services/contract-amendments';

interface AmendmentActionsProps {
  amendmentId: string;
  amendmentType: 'tenure' | 'value';
  contractId: string;
  userId: string;
  isActive: boolean;
  onEdit?: () => void;
  onDeleted?: () => void;
}

export const AmendmentActions: React.FC<AmendmentActionsProps> = ({
  amendmentId,
  amendmentType,
  contractId,
  userId,
  isActive,
  onEdit,
  onDeleted
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (amendmentType === 'tenure') {
        return deleteTenureAmendment(amendmentId, userId);
      } else {
        return deleteValueAmendment(amendmentId, userId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-amendments', contractId] });
      queryClient.invalidateQueries({ queryKey: ['contracts-with-current-info'] });
      queryClient.invalidateQueries({ queryKey: ['contract-periods'] });
      
      toast({
        title: "Alteração excluída",
        description: `A alteração de ${amendmentType === 'tenure' ? 'vigência' : 'valor'} foi removida com sucesso.`,
      });
      
      setShowDeleteDialog(false);
      onDeleted?.();
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir alteração",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  if (!isActive) {
    return (
      <div className="text-sm text-gray-500">
        Alteração cancelada
      </div>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {onEdit && (
            <DropdownMenuItem onClick={onEdit}>
              <Edit2 className="h-4 w-4 mr-2" />
              Editar
            </DropdownMenuItem>
          )}
          <DropdownMenuItem 
            onClick={() => setShowDeleteDialog(true)}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <span>Confirmar Exclusão</span>
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta alteração de {amendmentType === 'tenure' ? 'vigência' : 'valor'}?
              <br />
              <br />
              <strong>Esta ação não pode ser desfeita.</strong> A alteração será marcada como inativa e não afetará mais o contrato.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}; 