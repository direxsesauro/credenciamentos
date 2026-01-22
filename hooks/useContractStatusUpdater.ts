import { useQueryClient } from '@tanstack/react-query';

export const useAmendmentNotifier = () => {
  const queryClient = useQueryClient();

  const notifyTenureAmendment = (
    contractId: string,
    previousStartDate: string,
    previousEndDate: string,
    newStartDate: string,
    newEndDate: string
  ) => {
    // Invalidar queries relacionadas
    queryClient.invalidateQueries({ queryKey: ['contract-with-current-info', contractId] });
    queryClient.invalidateQueries({ queryKey: ['contract-amendments', contractId] });
    queryClient.invalidateQueries({ queryKey: ['contract-periods', contractId] });
    queryClient.invalidateQueries({ queryKey: ['contract-periods-for-payment', contractId] });
  };

  const notifyValueAmendment = (contractId: string) => {
    // Invalidar queries relacionadas
    queryClient.invalidateQueries({ queryKey: ['contract-with-current-info', contractId] });
    queryClient.invalidateQueries({ queryKey: ['contract-amendments', contractId] });
  };

  return {
    notifyTenureAmendment,
    notifyValueAmendment
  };
};
