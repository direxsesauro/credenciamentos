
import React, { useState } from 'react';
import { Contract, PaymentRecord } from '../types';

interface ContractListProps {
  contracts: Contract[];
  payments: PaymentRecord[];
  onLaunchPayment: (contract: Contract) => void;
  onEdit: (contract: Contract) => void;
  onDelete: (id: string) => void;
  onAddNew: () => void;
}

const ContractList: React.FC<ContractListProps> = ({ contracts, payments, onLaunchPayment, onEdit, onDelete, onAddNew }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = contracts.filter(c => 
    c.empresa.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.numero_contrato.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.cnpj.includes(searchTerm)
  );

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const getContractFinancials = (contractNumber: string, globalValue: number) => {
    const contractPayments = payments.filter(p => p.numero_contrato === contractNumber);
    
    const totalPaid = contractPayments.reduce((acc, p) => {
      const fed = p.pagamentos_fed.reduce((sum, entry) => sum + entry.valor, 0);
      const est = p.pagamentos_est.reduce((sum, entry) => sum + entry.valor, 0);
      return acc + fed + est;
    }, 0);

    const balance = globalValue - totalPaid;

    return { totalPaid, balance };
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-colors">
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Contratos Registrados</h4>
          <p className="text-xs text-slate-400 dark:text-slate-500">Gerencie os prestadores credenciados à rede SESAU.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-64 transition-colors"
            />
            <span className="absolute left-3 top-2.5 text-slate-400">🔍</span>
          </div>
          <button 
            onClick={onAddNew}
            className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition"
            title="Novo Contrato"
          >
            <span className="font-bold px-2">+ Novo</span>
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4 font-semibold">Empresa / CNPJ</th>
              <th className="px-6 py-4 font-semibold">Contrato / Processo</th>
              <th className="px-6 py-4 font-semibold">Valor Global</th>
              <th className="px-6 py-4 font-semibold">Total Pago</th>
              <th className="px-6 py-4 font-semibold">Saldo</th>
              <th className="px-6 py-4 font-semibold">Vigência</th>
              <th className="px-6 py-4 font-semibold text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((contract) => {
              const { totalPaid, balance } = getContractFinancials(contract.numero_contrato, contract.valor_global_anul);
              
              return (
                <tr key={contract.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition group">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-800 dark:text-slate-100">{contract.empresa}</div>
                    <div className="text-xs text-slate-400 dark:text-slate-500">{contract.cnpj}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-blue-600 dark:text-blue-400">{contract.numero_contrato}</div>
                    <div className="text-xs text-slate-400 dark:text-slate-500">Proc: {contract.numero_processo}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-semibold dark:text-slate-200">{formatCurrency(contract.valor_global_anul)}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-500">{formatCurrency(totalPaid)}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className={`text-sm font-bold ${balance > 0 ? 'text-amber-600 dark:text-amber-500' : 'text-slate-400 dark:text-slate-600'}`}>
                      {formatCurrency(balance)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-600 dark:text-slate-400">{new Date(contract.inicio_vigencia).toLocaleDateString('pt-BR')}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => onLaunchPayment(contract)}
                        className="text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 p-2 rounded-lg transition"
                        title="Lançar Pagamento"
                      >
                        💰
                      </button>
                      <button 
                        onClick={() => onEdit(contract)}
                        className="text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 p-2 rounded-lg transition"
                        title="Editar"
                      >
                        ✏️
                      </button>
                      <button 
                        onClick={() => onDelete(contract.id)}
                        className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition"
                        title="Excluir"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && (
        <div className="p-12 text-center text-slate-400 dark:text-slate-600">
          Nenhum contrato encontrado.
        </div>
      )}
    </div>
  );
};

export default ContractList;
