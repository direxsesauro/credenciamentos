
import React, { useState, useEffect, useRef } from 'react';
import { Contract, PaymentRecord, PaymentEntry, Invoice } from '../types';
import { MONTHS } from '../constants';
import CurrencyInput from './CurrencyInput';
import { getPagamentoByOB } from '../services/google-drive/pagamentos.service';

interface PaymentFormProps {
  contracts: Contract[];
  initialContract: Contract | null;
  initialData?: PaymentRecord; // Novo: dados iniciais para edição
  onSubmit: (payment: PaymentRecord) => void;
  onCancel: () => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ contracts, initialContract, initialData, onSubmit, onCancel }) => {
  const [selectedContractId, setSelectedContractId] = useState(initialContract?.id || '');

  // Estado para gerenciar múltiplas notas fiscais
  const createEmptyInvoice = (): Invoice => ({
    id: Math.random().toString(36).substr(2, 9),
    numero_nf: '',
    valor_nfe: 0,
    mes_competencia: new Date().getMonth() + 1,
    ano_competencia: new Date().getFullYear()
  });

  const [invoices, setInvoices] = useState<Invoice[]>([createEmptyInvoice()]);

  const createEmptyEntry = (): PaymentEntry => ({
    id: Math.random().toString(36).substr(2, 9),
    valor: 0,
    referencia_ob: '',
    data_ob: new Date().toISOString().split('T')[0],
    numero_empenho: '',
    invoice_id: '' // Inicialmente vazio, será selecionado
  });

  // Unificar todas as ordens bancárias em uma única lista (removendo separação Federal/Estadual)
  const [entries, setEntries] = useState<PaymentEntry[]>([createEmptyEntry()]);
  const [loadingOB, setLoadingOB] = useState<{ [key: string]: boolean }>({});
  const [autoFilledOBs, setAutoFilledOBs] = useState<{ [key: string]: boolean }>({});
  const debounceTimers = useRef<{ [key: string]: NodeJS.Timeout }>({});

  // Carregar dados iniciais se estiver editando
  useEffect(() => {
    if (initialData) {
      // Encontrar o contrato pelo numero_contrato
      const contract = contracts.find(c => c.numero_contrato === initialData.numero_contrato);
      if (contract) {
        setSelectedContractId(contract.id);
      }

      // Carregar notas fiscais
      if (initialData.invoices && initialData.invoices.length > 0) {
        setInvoices(initialData.invoices);
      } else {
        // Compatibilidade com dados antigos (migração)
        setInvoices([{
          id: Math.random().toString(36).substr(2, 9),
          numero_nf: (initialData as any).numero_nf || '',
          valor_nfe: (initialData as any).valor_nfe || 0,
          mes_competencia: (initialData as any).mes_competencia || new Date().getMonth() + 1,
          ano_competencia: (initialData as any).ano_competencia || new Date().getFullYear()
        }]);
      }

      // Carregar ordens bancárias existentes (unificar fed e est)
      const allEntries: PaymentEntry[] = [];
      if (initialData.pagamentos_fed && initialData.pagamentos_fed.length > 0) {
        allEntries.push(...initialData.pagamentos_fed);
      }
      if (initialData.pagamentos_est && initialData.pagamentos_est.length > 0) {
        allEntries.push(...initialData.pagamentos_est);
      }
      if (allEntries.length > 0) {
        setEntries(allEntries);
      }
    }
  }, [initialData, contracts]);

  // Funções para gerenciar notas fiscais
  const addInvoice = () => setInvoices([...invoices, createEmptyInvoice()]);
  const removeInvoice = (id: string) => {
    // Verificar se alguma ordem bancária está usando esta nota fiscal
    const isUsed = entries.some(entry => entry.invoice_id === id);
    if (isUsed) {
      alert('Não é possível remover esta nota fiscal pois ela está sendo usada por uma ordem bancária.');
      return;
    }
    setInvoices(invoices.filter(inv => inv.id !== id));
  };
  const updateInvoice = (id: string, field: keyof Invoice, value: any) => {
    setInvoices(invoices.map(inv => inv.id === id ? { ...inv, [field]: value } : inv));
  };

  // Funções para gerenciar ordens bancárias
  const addEntry = () => setEntries([...entries, createEmptyEntry()]);
  const removeEntry = (id: string) => setEntries(entries.filter(e => e.id !== id));
  
  const updateEntry = (id: string, field: keyof PaymentEntry, value: any) => {
    setEntries(entries.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  // Buscar dados do pagamento quando o número da OB for digitado (com debounce)
  const handleOBChange = async (entryId: string, obValue: string) => {
    // Atualizar o campo primeiro
    updateEntry(entryId, 'referencia_ob', obValue);

    // Limpar timer anterior se existir
    if (debounceTimers.current[entryId]) {
      clearTimeout(debounceTimers.current[entryId]);
    }

    // Se o valor estiver vazio, limpar campos e marcar como não preenchido
    const obNormalizado = obValue.trim().toUpperCase();
    if (!obNormalizado) {
      setEntries(prevEntries => 
        prevEntries.map(e => 
          e.id === entryId 
            ? { ...e, data_ob: new Date().toISOString().split('T')[0], numero_empenho: '', valor: 0 }
            : e
        )
      );
      setAutoFilledOBs(prev => ({ ...prev, [entryId]: false }));
      return;
    }

    // Se o valor for muito curto ou não contiver "OB", não buscar ainda
    if (obNormalizado.length < 5 || !obNormalizado.includes('OB')) {
      return;
    }

    // Debounce: aguardar 800ms após o usuário parar de digitar
    debounceTimers.current[entryId] = setTimeout(async () => {
      // Marcar como carregando
      setLoadingOB(prev => ({ ...prev, [entryId]: true }));

      try {
        console.log('Buscando pagamento para OB:', obNormalizado);
        const pagamento = await getPagamentoByOB(obNormalizado);
        console.log('Resultado da busca:', pagamento);
        
        if (pagamento) {
          // Preencher automaticamente os campos usando setEntries para garantir atualização correta
          setEntries(prevEntries => 
            prevEntries.map(e => 
              e.id === entryId 
                ? { 
                    ...e, 
                    data_ob: pagamento.data || e.data_ob,
                    numero_empenho: pagamento.numero_empenho || '',
                    valor: pagamento.valor || 0
                  }
                : e
            )
          );
          // Marcar que esta OB foi preenchida automaticamente
          setAutoFilledOBs(prev => ({ ...prev, [entryId]: true }));
          console.log('Campos preenchidos automaticamente:', {
            data_ob: pagamento.data,
            numero_empenho: pagamento.numero_empenho,
            valor: pagamento.valor
          });
        } else {
          console.warn(`Ordem bancária ${obNormalizado} não encontrada no relatório de pagamentos.`);
          setAutoFilledOBs(prev => ({ ...prev, [entryId]: false }));
        }
      } catch (error) {
        console.error('Erro ao buscar dados da ordem bancária:', error);
        setAutoFilledOBs(prev => ({ ...prev, [entryId]: false }));
        // Mostrar erro ao usuário
        if (error instanceof Error) {
          alert(`Erro ao buscar dados da ordem bancária: ${error.message}`);
        }
      } finally {
        setLoadingOB(prev => ({ ...prev, [entryId]: false }));
      }
    }, 800);
  };

  // Limpar timers ao desmontar
  useEffect(() => {
    return () => {
      Object.values(debounceTimers.current).forEach(timer => clearTimeout(timer));
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const contract = contracts.find(c => c.id === selectedContractId);
    if (!contract) return;

    // Validar que todas as ordens bancárias têm uma nota fiscal selecionada
    const entriesWithInvoice = entries.filter(e => e.valor > 0 || e.referencia_ob);
    const entriesWithoutInvoice = entriesWithInvoice.filter(e => !e.invoice_id);
    
    if (entriesWithoutInvoice.length > 0) {
      alert('Todas as ordens bancárias devem estar associadas a uma nota fiscal.');
      return;
    }

    // Validar que há pelo menos uma nota fiscal válida
    const validInvoices = invoices.filter(inv => inv.numero_nf && inv.valor_nfe > 0);
    if (validInvoices.length === 0) {
      alert('É necessário cadastrar pelo menos uma nota fiscal válida.');
      return;
    }

    // Filtrar apenas entradas válidas
    const validEntries = entries.filter(e => e.valor > 0 || e.referencia_ob);

    // Se estiver editando, preservar o ID original; caso contrário, não incluir ID (será gerado)
    // Manter compatibilidade: colocar todos os pagamentos em pagamentos_est e deixar pagamentos_fed vazio
    const payment: PaymentRecord = {
      id: initialData?.id || '',
      numero_contrato: contract.numero_contrato,
      invoices: validInvoices,
      pagamentos_fed: [], // Mantido vazio para compatibilidade
      pagamentos_est: validEntries, // Todos os pagamentos unificados aqui
      data_cadastro: initialData?.data_cadastro || new Date().toISOString()
    };

    onSubmit(payment);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 max-w-6xl mx-auto overflow-hidden animate-in slide-in-from-bottom-4 duration-300 mb-12 transition-colors">
      <div className="bg-slate-900 dark:bg-slate-950 p-6 text-white transition-colors">
        <h3 className="text-xl font-bold">{initialData ? 'Editar Pagamento' : 'Novo Evento de Pagamento'}</h3>
        <p className="text-slate-400 text-sm">
          {initialData
            ? 'Adicione novas notas fiscais e ordens bancárias ou edite as existentes.'
            : 'Registre as NF-e e as ordens bancárias de liquidação.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-8">
        {/* Seleção de Contrato */}
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">Contrato Associado</label>
          <select
            value={selectedContractId}
            onChange={(e) => setSelectedContractId(e.target.value)}
            required
            disabled={!!initialData}
            className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">Selecione um contrato...</option>
            {contracts.map(c => (
              <option key={c.id} value={c.id}>{c.numero_contrato} - {c.empresa}</option>
            ))}
          </select>
        </div>

        <hr className="border-slate-100 dark:border-slate-800 transition-colors" />

        {/* Seção de Notas Fiscais */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-purple-600 dark:text-purple-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-600 dark:bg-purple-400"></span>
              Notas Fiscais
            </h4>
            <button
              type="button"
              onClick={addInvoice}
              className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 px-3 py-1.5 rounded-lg border border-purple-200 dark:border-purple-900/40 transition"
            >
              + Adicionar Nota Fiscal
            </button>
          </div>

          <div className="space-y-3">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-purple-50/50 dark:bg-purple-900/10 p-4 rounded-xl border border-purple-100 dark:border-purple-900/20 transition-colors">
                <div className="md:col-span-3 space-y-1">
                  <label className="text-[10px] uppercase font-bold text-purple-400 dark:text-purple-500/60">N° da Nota Fiscal</label>
                  <input
                    placeholder="Ex: NF-12345"
                    value={invoice.numero_nf}
                    onChange={(e) => updateInvoice(invoice.id, 'numero_nf', e.target.value)}
                    required
                    className="w-full p-2 bg-white dark:bg-slate-800 border border-purple-100 dark:border-slate-700 dark:text-slate-100 rounded-lg focus:outline-purple-400 text-sm transition-colors"
                  />
                </div>
                <div className="md:col-span-3 space-y-1">
                  <label className="text-[10px] uppercase font-bold text-purple-400 dark:text-purple-500/60">Valor Bruto NF (R$)</label>
                  <CurrencyInput
                    value={invoice.valor_nfe}
                    onChange={(value) => updateInvoice(invoice.id, 'valor_nfe', value)}
                    placeholder="R$ 0,00"
                    required
                    className="w-full p-2 bg-white dark:bg-slate-800 border border-purple-100 dark:border-slate-700 dark:text-slate-100 rounded-lg focus:outline-purple-400 text-sm transition-colors"
                  />
                </div>
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] uppercase font-bold text-purple-400 dark:text-purple-500/60">Mês Competência</label>
                  <select
                    value={invoice.mes_competencia}
                    onChange={(e) => updateInvoice(invoice.id, 'mes_competencia', parseInt(e.target.value))}
                    className="w-full p-2 bg-white dark:bg-slate-800 border border-purple-100 dark:border-slate-700 dark:text-slate-100 rounded-lg focus:outline-purple-400 text-sm transition-colors"
                  >
                    {MONTHS.map((m, idx) => <option key={m} value={idx + 1}>{m}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] uppercase font-bold text-purple-400 dark:text-purple-500/60">Ano Competência</label>
                  <input
                    type="number"
                    value={invoice.ano_competencia}
                    onChange={(e) => updateInvoice(invoice.id, 'ano_competencia', parseInt(e.target.value))}
                    required
                    min="2000"
                    max="2100"
                    className="w-full p-2 bg-white dark:bg-slate-800 border border-purple-100 dark:border-slate-700 dark:text-slate-100 rounded-lg focus:outline-purple-400 text-sm transition-colors"
                  />
                </div>
                <div className="md:col-span-2 text-right pb-1">
                  <button 
                    type="button" 
                    onClick={() => removeInvoice(invoice.id)} 
                    disabled={invoices.length === 1}
                    className="text-red-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <span className="text-xl">×</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <hr className="border-slate-100 dark:border-slate-800 transition-colors" />

        {/* Seção de Ordens Bancárias (Unificada) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400"></span>
              Ordens Bancárias
            </h4>
            <button
              type="button"
              onClick={addEntry}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-900/40 transition"
            >
              + Adicionar Ordem Bancária
            </button>
          </div>

          <div className="space-y-3">
            {entries.map((entry) => (
              <div key={entry.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/20 transition-colors">
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] uppercase font-bold text-blue-400 dark:text-blue-500/60">Nota Fiscal *</label>
                  <select
                    value={entry.invoice_id}
                    onChange={(e) => updateEntry(entry.id, 'invoice_id', e.target.value)}
                    className="w-full p-2 bg-white dark:bg-slate-800 border border-blue-100 dark:border-slate-700 dark:text-slate-100 rounded-lg focus:outline-blue-400 text-sm transition-colors"
                  >
                    <option value="">Selecione...</option>
                    {invoices
                      .filter(inv => inv.numero_nf && inv.valor_nfe > 0)
                      .map(inv => (
                        <option key={inv.id} value={inv.id}>
                          {inv.numero_nf} - {MONTHS[inv.mes_competencia - 1]}/{inv.ano_competencia}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="md:col-span-3 space-y-1">
                  <label className="text-[10px] uppercase font-bold text-blue-400 dark:text-blue-500/60">
                    N° Ordem Bancária (OB) {loadingOB[entry.id] && <span className="text-xs text-blue-500">(buscando...)</span>}
                  </label>
                  <input
                    placeholder="202XOBXXXXX"
                    value={entry.referencia_ob}
                    onChange={(e) => handleOBChange(entry.id, e.target.value)}
                    onBlur={(e) => {
                      // Também buscar ao perder o foco, caso não tenha encontrado antes
                      if (e.target.value.trim() && !entry.numero_empenho) {
                        handleOBChange(entry.id, e.target.value);
                      }
                    }}
                    className="w-full p-2 bg-white dark:bg-slate-800 border border-blue-100 dark:border-slate-700 dark:text-slate-100 rounded-lg focus:outline-blue-400 text-sm transition-colors"
                  />
                </div>
                <div className="md:col-span-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] uppercase font-bold text-blue-400 dark:text-blue-500/60">
                      Data da OB
                      {autoFilledOBs[entry.id] && <span className="text-green-500 ml-1" title="Preenchido automaticamente">✓</span>}
                    </label>
                    {autoFilledOBs[entry.id] && (
                      <button
                        type="button"
                        onClick={() => setAutoFilledOBs(prev => ({ ...prev, [entry.id]: false }))}
                        className="text-xs text-blue-500 hover:text-blue-700"
                        title="Permitir edição manual"
                      >
                        Editar
                      </button>
                    )}
                  </div>
                  <input
                    type="date"
                    value={entry.data_ob}
                    onChange={(e) => updateEntry(entry.id, 'data_ob', e.target.value)}
                    disabled={autoFilledOBs[entry.id]}
                    className="w-full p-2 bg-white dark:bg-slate-800 border border-blue-100 dark:border-slate-700 dark:text-slate-100 rounded-lg focus:outline-blue-400 text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-900"
                  />
                </div>
                <div className="md:col-span-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] uppercase font-bold text-blue-400 dark:text-blue-500/60">
                      N° Empenho (NE)
                      {autoFilledOBs[entry.id] && <span className="text-green-500 ml-1" title="Preenchido automaticamente">✓</span>}
                    </label>
                    {autoFilledOBs[entry.id] && (
                      <button
                        type="button"
                        onClick={() => setAutoFilledOBs(prev => ({ ...prev, [entry.id]: false }))}
                        className="text-xs text-blue-500 hover:text-blue-700"
                        title="Permitir edição manual"
                      >
                        Editar
                      </button>
                    )}
                  </div>
                  <input
                    placeholder="202XNEXXXXX"
                    value={entry.numero_empenho}
                    onChange={(e) => updateEntry(entry.id, 'numero_empenho', e.target.value)}
                    disabled={autoFilledOBs[entry.id]}
                    className="w-full p-2 bg-white dark:bg-slate-800 border border-blue-100 dark:border-slate-700 dark:text-slate-100 rounded-lg focus:outline-blue-400 text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-900"
                  />
                </div>
                <div className="md:col-span-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] uppercase font-bold text-blue-400 dark:text-blue-500/60">
                      Valor Pago (R$)
                      {autoFilledOBs[entry.id] && <span className="text-green-500 ml-1" title="Preenchido automaticamente">✓</span>}
                    </label>
                    {autoFilledOBs[entry.id] && (
                      <button
                        type="button"
                        onClick={() => setAutoFilledOBs(prev => ({ ...prev, [entry.id]: false }))}
                        className="text-xs text-blue-500 hover:text-blue-700"
                        title="Permitir edição manual"
                      >
                        Editar
                      </button>
                    )}
                  </div>
                  <CurrencyInput
                    value={entry.valor}
                    onChange={(value) => updateEntry(entry.id, 'valor', value)}
                    placeholder="R$ 0,00"
                    disabled={autoFilledOBs[entry.id]}
                    className="w-full p-2 bg-white dark:bg-slate-800 border border-blue-100 dark:border-slate-700 dark:text-slate-100 rounded-lg focus:outline-blue-400 text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-900"
                  />
                </div>
                <div className="md:col-span-1 text-right pb-1">
                  <button type="button" onClick={() => removeEntry(entry.id)} className="text-red-400 hover:text-red-600">
                    <span className="text-xl">×</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-4 pt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 text-slate-500 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-10 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-200 dark:shadow-blue-900/20 hover:bg-blue-700 transition"
          >
            {initialData ? 'Salvar Alterações' : 'Confirmar Lançamento'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PaymentForm;
