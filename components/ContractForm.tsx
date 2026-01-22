
import React, { useState, useEffect } from 'react';
import { Contract } from '../types';
import CurrencyInput from './CurrencyInput';

interface ContractFormProps {
  initialData?: Contract;
  onSubmit: (contract: Contract | Omit<Contract, 'id'>) => void;
  onCancel: () => void;
}

const ContractForm: React.FC<ContractFormProps> = ({ initialData, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState<Partial<Contract>>({
    cnpj: '',
    empresa: '',
    numero_contrato: '',
    id_contrato: '',
    numero_processo: '',
    natureza: '',
    objeto: '',
    valor_global_anul: 0,
    valor_original: 0,
    inicio_vigencia: new Date().toISOString().split('T')[0],
    fim_vigencia: ''
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Para novos contratos, não definir ID - será gerado pelo Firestore
    // Para edição, usar o ID existente
    const contract: Omit<Contract, 'id'> | Contract = initialData 
      ? {
          ...formData as Contract,
          id: initialData.id,
          valor_original: formData.valor_original || formData.valor_global_anul || 0
        }
      : {
          ...formData as Omit<Contract, 'id'>,
          valor_original: formData.valor_original || formData.valor_global_anul || 0
        };
    onSubmit(contract as Contract);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 max-w-4xl mx-auto overflow-hidden animate-in slide-in-from-bottom-4 duration-300 transition-colors">
      <div className="bg-slate-900 dark:bg-slate-950 p-6 text-white flex justify-between items-center transition-colors">
        <div>
          <h3 className="text-xl font-bold">{initialData ? 'Editar Contrato' : 'Cadastrar Novo Contrato'}</h3>
          <p className="text-slate-400 text-sm">Informações de credenciamento e vigência.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">CNPJ da Empresa</label>
            <input
              name="cnpj"
              value={formData.cnpj}
              onChange={handleChange}
              placeholder="00.000.000/0000-00"
              required
              className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">Nome da Empresa / Razão Social</label>
            <input
              name="empresa"
              value={formData.empresa}
              onChange={handleChange}
              required
              className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">Número do Contrato</label>
            <input
              name="numero_contrato"
              value={formData.numero_contrato}
              onChange={handleChange}
              placeholder="Ex: 120/SESAU/2023"
              required
              className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">Número do Processo</label>
            <input
              name="numero_processo"
              value={formData.numero_processo}
              onChange={handleChange}
              placeholder="0012.XXXXXX/202X-XX"
              required
              className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">Valor Global Anual (R$)</label>
            <CurrencyInput
              value={formData.valor_global_anul || 0}
              onChange={(value) => setFormData(prev => ({ ...prev, valor_global_anul: value }))}
              placeholder="R$ 0,00"
              required
              className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">Início da Vigência</label>
            <input
              type="date"
              name="inicio_vigencia"
              value={formData.inicio_vigencia}
              onChange={handleChange}
              required
              className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">Fim da Vigência</label>
            <input
              type="date"
              name="fim_vigencia"
              value={formData.fim_vigencia || ''}
              onChange={handleChange}
              className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">Natureza do Serviço</label>
          <input
            name="natureza"
            value={formData.natureza}
            onChange={handleChange}
            placeholder="Ex: Serviços Médicos Hospitalares"
            className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">Objeto do Contrato</label>
          <textarea
            name="objeto"
            value={formData.objeto}
            onChange={handleChange}
            rows={3}
            required
            className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none transition-colors"
          ></textarea>
        </div>

        <div className="flex items-center justify-end gap-4 pt-4">
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
            {initialData ? 'Salvar Alterações' : 'Confirmar Cadastro'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ContractForm;
