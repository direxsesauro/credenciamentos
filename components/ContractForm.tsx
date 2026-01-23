
import React, { useState, useEffect } from 'react';
import { Contract, Empenho } from '../types';
import CurrencyInput from './CurrencyInput';
import { ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';

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

  const createEmptyEmpenho = (): Empenho => ({
    id: Math.random().toString(36).substr(2, 9),
    numero_empenho: ''
  });

  const [empenhos, setEmpenhos] = useState<Empenho[]>([]);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
      // Carregar empenhos existentes ou inicializar com array vazio
      setEmpenhos(initialData.empenhos && initialData.empenhos.length > 0 
        ? initialData.empenhos 
        : []);
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const addEmpenho = () => {
    setEmpenhos([...empenhos, createEmptyEmpenho()]);
  };

  const removeEmpenho = (id: string) => {
    setEmpenhos(empenhos.filter(e => e.id !== id));
  };

  const updateEmpenho = (id: string, field: keyof Empenho, value: any) => {
    setEmpenhos(empenhos.map(e => 
      e.id === id ? { ...e, [field]: value } : e
    ));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Para novos contratos, não definir ID - será gerado pelo Firestore
    // Para edição, usar o ID existente
    // Preparar objeto do contrato, omitindo empenhos se estiver vazio
    const contractData: any = {
      ...formData,
      valor_original: formData.valor_original || formData.valor_global_anul || 0,
    };

    // Incluir empenhos apenas se houver pelo menos um
    if (empenhos.length > 0) {
      contractData.empenhos = empenhos;
    }
    // Se não houver empenhos, não incluir o campo (não enviar undefined)

    const contract: Omit<Contract, 'id'> | Contract = initialData 
      ? {
          ...contractData as Contract,
          id: initialData.id,
        }
      : {
          ...contractData as Omit<Contract, 'id'>,
        };
    onSubmit(contract as Contract);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 max-w-4xl mx-auto overflow-hidden animate-in slide-in-from-bottom-4 duration-300 transition-colors">
      {/* Botão de voltar */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <Button 
          variant="ghost" 
          onClick={onCancel}
          className="p-2"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Voltar
        </Button>
      </div>

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

        {/* Seção de Empenhos */}
        <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <div>
            <h4 className="text-sm font-bold uppercase text-slate-700 dark:text-slate-300 tracking-wider">Empenhos</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Adicione um ou mais empenhos associados ao contrato</p>
          </div>

          {empenhos.length > 0 && (
            <div className="space-y-4">
              {empenhos.map((empenho, index) => (
                <div 
                  key={empenho.id}
                  className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                      Empenho #{index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeEmpenho(empenho.id)}
                      className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-600 font-bold text-lg leading-none"
                      title="Remover empenho"
                    >
                      ×
                    </button>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex-1 space-y-1">
                      <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                        Número do Empenho
                      </label>
                      <input
                        type="text"
                        value={empenho.numero_empenho}
                        onChange={(e) => updateEmpenho(empenho.id, 'numero_empenho', e.target.value)}
                        placeholder="Ex: 2024NE000123"
                        className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {empenhos.length === 0 && (
            <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">
              Nenhum empenho adicionado. Clique em "Adicionar Empenho" para incluir um empenho.
            </div>
          )}

          {/* Botão Adicionar Empenho movido para baixo */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={addEmpenho}
              className="px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 transition shadow-md flex items-center gap-2"
            >
              <span>+</span>
              <span>Adicionar Empenho</span>
            </button>
          </div>
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
