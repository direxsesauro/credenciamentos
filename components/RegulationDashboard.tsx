
import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SisregRecord } from '../types';
import { fetchAgendamentosAmbulatoriais } from '../services/sisreg/sisreg.service';
import { useToast } from '../hooks/use-toast';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  AreaChart, Area
} from 'recharts';

interface RegulationDashboardProps {
  isDarkMode?: boolean;
}

const RegulationDashboard: React.FC<RegulationDashboardProps> = ({ isDarkMode }) => {
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState({ gte: '', lte: '' });
  const [codigoCentralReguladora, setCodigoCentralReguladora] = useState('');

  // Query para buscar dados da API
  const { 
    data: apiData = [], 
    isLoading, 
    error,
    refetch 
  } = useQuery<SisregRecord[]>({
    queryKey: ['sisreg-agendamentos', dateRange.gte, dateRange.lte, codigoCentralReguladora],
    queryFn: async () => {
      if (!dateRange.gte || !dateRange.lte || !codigoCentralReguladora.trim()) {
        return [];
      }
      
      // Garantir que as datas estão no formato YYYY-MM-DD
      // Inputs type="date" já retornam YYYY-MM-DD, mas garantimos aqui também
      const dataInicio = dateRange.gte.trim();
      const dataFim = dateRange.lte.trim();
      
      // Validar formato básico
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(dataInicio) || !dateRegex.test(dataFim)) {
        throw new Error('Formato de data inválido. As datas devem estar no formato YYYY-MM-DD.');
      }
      
      return fetchAgendamentosAmbulatoriais({
        dataInicio,
        dataFim,
        codigoCentralReguladora: codigoCentralReguladora.trim(),
      });
    },
    enabled: !!dateRange.gte && !!dateRange.lte && !!codigoCentralReguladora.trim(),
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos (renomeado de cacheTime no React Query v5)
    retry: 2,
    retryDelay: 1000,
  });

  // Tratar erros
  useEffect(() => {
    if (error) {
      toast({
        title: "Erro ao carregar dados do SISREG",
        description: error instanceof Error ? error.message : "Não foi possível carregar os dados. Verifique sua conexão e tente novamente.",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  // Usar dados da API
  const data: SisregRecord[] = apiData || [];

  const axisColor = isDarkMode ? '#94a3b8' : '#64748b';
  const gridColor = isDarkMode ? '#1e293b' : '#f1f5f9';

  // Os dados já vêm filtrados da API, mas mantemos o filtro para compatibilidade
  const filteredData = useMemo(() => {
    return data.filter(item => {
      const date = item.data_aprovacao;
      const gteMatch = !dateRange.gte || date >= dateRange.gte;
      const lteMatch = !dateRange.lte || date <= dateRange.lte;
      return gteMatch && lteMatch;
    });
  }, [data, dateRange]);

  const chartData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredData.forEach(item => {
      map[item.data_aprovacao] = (map[item.data_aprovacao] || 0) + 1;
    });
    return Object.entries(map)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredData]);

  const unitData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredData.forEach(item => {
      map[item.nome_unidade_executante] = (map[item.nome_unidade_executante] || 0) + 1;
    });
    return Object.entries(map).map(([unit, count]) => ({ unit, count }));
  }, [filteredData]);

  // Estado de loading ou quando não há filtros
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-slate-500 animate-pulse">Consultando dados no SISREG-RO...</p>
      </div>
    );
  }

  if (!dateRange.gte || !dateRange.lte || !codigoCentralReguladora.trim()) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-20">
        <div className="bg-blue-600 p-6 rounded-2xl text-white shadow-lg">
          <div className="mb-4">
            <h2 className="text-xl font-bold mb-2">Monitoramento de Agendamentos (SISREG)</h2>
            <p className="text-blue-100 text-sm">Consultas via API REST - Marcação Ambulatorial</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-blue-100 text-xs font-semibold mb-1 uppercase">
                Código da Central Reguladora
              </label>
              <input 
                type="text" 
                placeholder="Ex: 11C000"
                className="w-full bg-blue-700 border-none rounded-lg p-2 text-sm focus:ring-2 focus:ring-white outline-none placeholder-blue-300"
                value={codigoCentralReguladora}
                onChange={(e) => setCodigoCentralReguladora(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-blue-100 text-xs font-semibold mb-1 uppercase">
                Data Início
              </label>
              <input 
                type="date" 
                className="w-full bg-blue-700 border-none rounded-lg p-2 text-sm focus:ring-2 focus:ring-white outline-none"
                value={dateRange.gte}
                onChange={(e) => setDateRange(prev => ({ ...prev, gte: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-blue-100 text-xs font-semibold mb-1 uppercase">
                Data Fim
              </label>
              <input 
                type="date" 
                className="w-full bg-blue-700 border-none rounded-lg p-2 text-sm focus:ring-2 focus:ring-white outline-none"
                value={dateRange.lte}
                onChange={(e) => setDateRange(prev => ({ ...prev, lte: e.target.value }))}
              />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm text-center">
          <p className="text-slate-500 dark:text-slate-400 text-lg mb-2">
            Preencha os campos acima para consultar os agendamentos
          </p>
          <p className="text-slate-400 dark:text-slate-500 text-sm">
            Informe o código da central reguladora e selecione o intervalo de datas
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="bg-blue-600 p-6 rounded-2xl text-white shadow-lg">
        <div className="mb-4">
          <h2 className="text-xl font-bold mb-2">Monitoramento de Agendamentos (SISREG)</h2>
          <p className="text-blue-100 text-sm">Consultas via API REST - Marcação Ambulatorial</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-blue-100 text-xs font-semibold mb-1 uppercase">
              Código da Central Reguladora
            </label>
            <input 
              type="text" 
              placeholder="Ex: 11C000"
              className="w-full bg-blue-700 border-none rounded-lg p-2 text-sm focus:ring-2 focus:ring-white outline-none placeholder-blue-300"
              value={codigoCentralReguladora}
              onChange={(e) => setCodigoCentralReguladora(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-blue-100 text-xs font-semibold mb-1 uppercase">
              Data Início
            </label>
            <input 
              type="date" 
              className="w-full bg-blue-700 border-none rounded-lg p-2 text-sm focus:ring-2 focus:ring-white outline-none"
              value={dateRange.gte}
              onChange={(e) => setDateRange(prev => ({ ...prev, gte: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-blue-100 text-xs font-semibold mb-1 uppercase">
              Data Fim
            </label>
            <input 
              type="date" 
              className="w-full bg-blue-700 border-none rounded-lg p-2 text-sm focus:ring-2 focus:ring-white outline-none"
              value={dateRange.lte}
              onChange={(e) => setDateRange(prev => ({ ...prev, lte: e.target.value }))}
            />
          </div>
          {error && (
            <button
              onClick={() => refetch()}
              className="bg-blue-500 hover:bg-blue-400 px-4 py-2 rounded-lg text-sm font-semibold transition h-[42px]"
            >
              Tentar Novamente
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <p className="text-slate-400 text-xs font-bold uppercase mb-1">Total de Agendados</p>
          <h3 className="text-3xl font-black text-slate-800 dark:text-white">{filteredData.length}</h3>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <p className="text-slate-400 text-xs font-bold uppercase mb-1">Aguardando Executante</p>
          <h3 className="text-3xl font-black text-amber-500">
            {filteredData.filter(d => d.status_solicitacao.includes('PENDENTE')).length}
          </h3>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <p className="text-slate-400 text-xs font-bold uppercase mb-1">Autorizados</p>
          <h3 className="text-3xl font-black text-emerald-500">
            {filteredData.filter(d => d.status_solicitacao.includes('AUTORIZADA')).length}
          </h3>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <p className="text-slate-400 text-xs font-bold uppercase mb-1">Unidades com Demanda</p>
          <h3 className="text-3xl font-black text-blue-500">{unitData.length}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <h4 className="text-lg font-bold mb-6 dark:text-white">Aprovações por Data</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: axisColor}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: axisColor}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: isDarkMode ? '#1e293b' : '#fff', border: 'none', borderRadius: '8px', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="count" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <h4 className="text-lg font-bold mb-6 dark:text-white">Demanda por Unidade</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={unitData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={gridColor} />
                <XAxis type="number" hide />
                <YAxis dataKey="unit" type="category" width={150} tick={{fontSize: 9, fill: axisColor}} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: isDarkMode ? '#1e293b' : '#fff', border: 'none', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <h4 className="font-bold dark:text-white">Lista Detalhada de Agendamentos</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4">ID Solicitação</th>
                <th className="px-6 py-4">Data Aprovação</th>
                <th className="px-6 py-4">Procedimento</th>
                <th className="px-6 py-4">Unidade Executante</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredData.slice(0, 15).map((item) => (
                <tr key={item.codigo_solicitacao} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-blue-600 dark:text-blue-400">{item.codigo_solicitacao}</td>
                  <td className="px-6 py-4 dark:text-slate-300">{new Date(item.data_aprovacao).toLocaleDateString('pt-BR')}</td>
                  <td className="px-6 py-4">
                    <div className="font-medium dark:text-slate-200">{item.descricao_interna_procedimento}</div>
                    <div className="text-[10px] text-slate-400">{item.codigo_interno_procedimento}</div>
                  </td>
                  <td className="px-6 py-4 dark:text-slate-300 text-xs">{item.nome_unidade_executante}</td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${
                      item.status_solicitacao.includes('PENDENTE') 
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    }`}>
                      {item.status_solicitacao}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RegulationDashboard;
