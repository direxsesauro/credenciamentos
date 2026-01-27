
import React from 'react';
import { PaymentRecord, Contract } from '../types';
import { MONTHS } from '../constants';

interface PaymentHistoryProps {
  payments: PaymentRecord[];
  contracts: Contract[];
  onEdit: (payment: PaymentRecord) => void;
}

const PaymentHistory: React.FC<PaymentHistoryProps> = ({ payments, contracts, onEdit }) => {
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const getSourceTotal = (entries: any[]) => entries.reduce((acc, e) => acc + e.valor, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Histórico de Lançamentos</h3>
        <span className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-3 py-1 rounded-full text-xs font-bold transition-colors">{payments.length} Registros</span>
      </div>

      <div className="grid gap-6">
        {payments.sort((a, b) => new Date(b.data_cadastro).getTime() - new Date(a.data_cadastro).getTime()).map(payment => {
          const contract = contracts.find(c => c.numero_contrato === payment.numero_contrato);
          const totalPaid = getSourceTotal(payment.pagamentos_fed) + getSourceTotal(payment.pagamentos_est);
          
          // Compatibilidade com dados antigos
          const invoices = payment.invoices || (payment as any).numero_nf ? [{
            id: 'legacy',
            numero_nf: (payment as any).numero_nf || '',
            valor_nfe: (payment as any).valor_nfe || 0,
            mes_competencia: (payment as any).mes_competencia || new Date().getMonth() + 1,
            ano_competencia: (payment as any).ano_competencia || new Date().getFullYear()
          }] : [];
          const totalInvoiceValue = invoices.reduce((sum, inv) => sum + inv.valor_nfe, 0);

          return (
            <div key={payment.id} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden group transition-colors">
              <div className="grid grid-cols-1 md:grid-cols-4 items-stretch">
                {/* Meta Column */}
                <div className="p-6 border-r border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 transition-colors">
                  <div className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-1">Notas Fiscais</div>
                  <div className="space-y-2">
                    {invoices.map((inv, idx) => (
                      <div key={inv.id || idx} className="text-sm">
                        <div className="font-bold text-blue-600 dark:text-blue-400">{inv.numero_nf}</div>
                        <div className="text-xs text-slate-600 dark:text-slate-500">
                          {MONTHS[inv.mes_competencia - 1]}/{inv.ano_competencia}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-1">Lançado em</div>
                  <div className="text-xs text-slate-600 dark:text-slate-500">{new Date(payment.data_cadastro).toLocaleString('pt-BR')}</div>
                </div>

                {/* Contract Info & Details */}
                <div className="p-6 md:col-span-2">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded transition-colors">CONTRATO {payment.numero_contrato}</span>
                  </div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-100 text-lg leading-tight">{contract?.empresa || 'Empresa não encontrada'}</h4>

                  <div className="mt-6 space-y-4">
                    {/* Federal Details */}
                    {payment.pagamentos_fed.length > 0 && (
                      <div className="bg-blue-50/30 dark:bg-blue-900/10 rounded-xl p-3 border border-blue-50 dark:border-blue-900/20">
                        <div className="text-[10px] font-bold text-blue-400 uppercase mb-2">Repasse Federal - {formatCurrency(getSourceTotal(payment.pagamentos_fed))}</div>
                        <div className="space-y-2">
                          {payment.pagamentos_fed.map(e => (
                            <div key={e.id} className="text-xs flex flex-wrap gap-x-4 gap-y-1 bg-white dark:bg-slate-800 p-2 rounded border border-blue-100 dark:border-blue-900/30">
                              <span className="font-medium dark:text-slate-200">OB: {e.referencia_ob}</span>
                              <span className="text-slate-400 dark:text-slate-500">Data: {new Date(e.data_ob).toLocaleDateString('pt-BR')}</span>
                              <span className="text-slate-400 dark:text-slate-500">NE: {e.numero_empenho}</span>
                              <span className="ml-auto font-bold text-blue-600 dark:text-blue-400">{formatCurrency(e.valor)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* State Details */}
                    {payment.pagamentos_est.length > 0 && (
                      <div className="bg-emerald-50/30 dark:bg-emerald-900/10 rounded-xl p-3 border border-emerald-50 dark:border-emerald-900/20">
                        <div className="text-[10px] font-bold text-emerald-400 uppercase mb-2">Recurso Estadual - {formatCurrency(getSourceTotal(payment.pagamentos_est))}</div>
                        <div className="space-y-2">
                          {payment.pagamentos_est.map(e => (
                            <div key={e.id} className="text-xs flex flex-wrap gap-x-4 gap-y-1 bg-white dark:bg-slate-800 p-2 rounded border border-emerald-100 dark:border-emerald-900/30">
                              <span className="font-medium dark:text-slate-200">OB: {e.referencia_ob}</span>
                              <span className="text-slate-400 dark:text-slate-500">Data: {new Date(e.data_ob).toLocaleDateString('pt-BR')}</span>
                              <span className="text-slate-400 dark:text-slate-500">NE: {e.numero_empenho}</span>
                              <span className="ml-auto font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(e.valor)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Total Column */}
                <div className="p-6 bg-slate-900 dark:bg-slate-800/80 text-white flex flex-col justify-center text-center transition-colors">
                  <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Total Liquidado</div>
                  <div className="text-2xl font-black">{formatCurrency(totalPaid)}</div>
                  <div className="text-[10px] text-slate-500 mt-2">Valor Total NF: {formatCurrency(totalInvoiceValue)}</div>
                  <div className="mt-4 pt-4 border-t border-slate-800 dark:border-slate-700">
                    <span className={`text-[10px] px-2 py-1 rounded font-bold ${totalPaid >= totalInvoiceValue ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                      {totalPaid >= totalInvoiceValue ? 'TOTALMENTE PAGO' : 'PAGAMENTO PARCIAL'}
                    </span>
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={() => onEdit(payment)}
                      className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition flex items-center justify-center gap-2"
                    >
                      <span>✏️</span> Editar Pagamento
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {payments.length === 0 && (
        <div className="bg-white dark:bg-slate-900 p-20 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 transition-colors">
          <div className="text-4xl mb-4">🗂️</div>
          <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100">Nenhum pagamento registrado</h4>
          <p className="text-slate-400 dark:text-slate-600">Clique em "Novo Lançamento" para começar.</p>
        </div>
      )}
    </div>
  );
};

export default PaymentHistory;
