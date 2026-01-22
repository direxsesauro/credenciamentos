import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ContractWithCurrentInfo, ContractAmendment } from '../types';

export const generateContractAmendmentsReport = (
  contractData: ContractWithCurrentInfo,
  amendments: ContractAmendment[],
  userId: string,
  userName: string
) => {
  const doc = new jsPDF();
  
  // Título
  doc.setFontSize(18);
  doc.text('Relatório de Alterações Contratuais', 14, 20);
  
  // Informações do Contrato
  doc.setFontSize(12);
  doc.text(`Contrato: ${contractData.contract_number}`, 14, 35);
  doc.text(`Contratado: ${contractData.contractor_name}`, 14, 42);
  doc.text(`Valor Original: R$ ${contractData.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 14, 49);
  doc.text(`Valor Atual: R$ ${(contractData.total_value + contractData.total_amendments_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 14, 56);
  doc.text(`Vigência Atual: ${new Date(contractData.current_start_date).toLocaleDateString('pt-BR')} a ${new Date(contractData.current_end_date).toLocaleDateString('pt-BR')}`, 14, 63);
  
  // Data de geração
  doc.setFontSize(10);
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 70);
  doc.text(`Por: ${userName}`, 14, 77);
  
  let yPosition = 90;
  
  // Tabela de Alterações
  if (amendments.length > 0) {
    doc.setFontSize(14);
    doc.text('Histórico de Alterações', 14, yPosition);
    yPosition += 10;
    
    const tableData = amendments.map((amendment, index) => {
      const typeLabel = amendment.type === 'tenure' ? 'Vigência' : 'Valor';
      const amendmentTypeLabel = formatAmendmentType(amendment.amendment_type);
      const date = new Date(amendment.amendment_date).toLocaleDateString('pt-BR');
      const status = amendment.is_active ? 'Ativo' : 'Cancelado';
      
      let details = '';
      if (amendment.type === 'value') {
        details = `R$ ${(amendment.amendment_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
      } else {
        details = `${new Date(amendment.new_start_date || '').toLocaleDateString('pt-BR')} a ${new Date(amendment.new_end_date || '').toLocaleDateString('pt-BR')}`;
      }
      
      return [
        (index + 1).toString(),
        typeLabel,
        amendmentTypeLabel,
        date,
        details,
        status
      ];
    });
    
    autoTable(doc, {
      startY: yPosition,
      head: [['#', 'Tipo', 'Alteração', 'Data', 'Detalhes', 'Status']],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 139, 202] }
    });
    
    yPosition = (doc as any).lastAutoTable.finalY + 15;
  }
  
  // Resumo
  doc.setFontSize(12);
  doc.text('Resumo', 14, yPosition);
  yPosition += 10;
  
  const activeValueAmendments = amendments.filter(a => a.type === 'value' && a.is_active);
  const totalValueChange = activeValueAmendments.reduce((sum, a) => sum + (a.amendment_value || 0), 0);
  
  doc.setFontSize(10);
  doc.text(`Total de Alterações: ${amendments.length}`, 14, yPosition);
  yPosition += 7;
  doc.text(`Alterações de Valor Ativas: ${activeValueAmendments.length}`, 14, yPosition);
  yPosition += 7;
  doc.text(`Variação Total: R$ ${totalValueChange.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 14, yPosition);
  
  // Salvar PDF
  const fileName = `relatorio-alteracoes-${contractData.contract_number}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};

const formatAmendmentType = (type: string): string => {
  const types: Record<string, string> = {
    extension: 'Prorrogação',
    early_termination: 'Encerramento Antecipado',
    addition: 'Acréscimo',
    suppression: 'Supressão',
    readjustment: 'Reajuste',
    renegotiation: 'Repactuação'
  };
  return types[type] || type;
};
