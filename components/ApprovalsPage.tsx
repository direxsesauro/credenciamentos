import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ApprovalRecord } from '../types';
import { fetchApprovalsFromDrive } from '../services/google-drive/regulacao-approvals.service';
import { useToast } from '../hooks/use-toast';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell,
} from 'recharts';

const fileId = import.meta.env.VITE_GOOGLE_DRIVE_JSON_REG_ID || '';

/** Duração em horas entre data_aprovacao e data_solicitacao */
function getDurationHours(solicitacao: string, aprovacao: string): number | null {
  if (!solicitacao || !aprovacao) return null;
  const a = new Date(aprovacao).getTime();
  const s = new Date(solicitacao).getTime();
  if (isNaN(a) || isNaN(s)) return null;
  return (a - s) / (1000 * 60 * 60);
}

function formatDuration(hours: number | null): string {
  if (hours === null) return '—';
  if (hours < 1) return `${Math.floor(hours * 60)} min`;
  if (hours < 24) return `${Math.floor(hours)} h`;
  return `${Math.floor(hours / 24)} dias`;
}

function toDateOnly(iso: string): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

/** Retorna chave do mês "YYYY-MM" para agregação. */
function toMonthKey(iso: string): string {
  if (!iso) return '';
  return iso.slice(0, 7);
}

/** Formata "YYYY-MM" para exibição no eixo (ex.: "Jan/2026"). */
function formatMonthLabel(monthKey: string): string {
  if (!monthKey || monthKey.length < 7) return monthKey;
  const [year, month] = monthKey.split('-');
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const m = parseInt(month, 10);
  return `${monthNames[m - 1] ?? month}/${year}`;
}

interface ApprovalsPageProps {
  isDarkMode?: boolean;
}

const ApprovalsPage: React.FC<ApprovalsPageProps> = ({ isDarkMode }) => {
  const { toast } = useToast();
  const [filterUnidade, setFilterUnidade] = useState('');
  const [filterProcedimentoSigtap, setFilterProcedimentoSigtap] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const { data: apiData = [], isLoading, error, refetch } = useQuery<ApprovalRecord[]>({
    queryKey: ['drive-approvals', fileId],
    queryFn: fetchApprovalsFromDrive,
    enabled: !!fileId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    retryDelay: 1000,
  });

  useEffect(() => {
    if (error) {
      toast({
        title: 'Erro ao carregar Aprovações',
        description: error instanceof Error ? error.message : 'Não foi possível carregar os dados do Google Drive.',
        variant: 'destructive',
      });
    }
  }, [error, toast]);

  // Opções de unidade: influenciadas pelo filtro de procedimento (só unidades que têm o procedimento selecionado)
  const unidadeOptions = useMemo(() => {
    let source = apiData;
    if (filterProcedimentoSigtap) {
      source = apiData.filter(
        (r) => (r.descricao_sigtap_procedimento || '').trim() === filterProcedimentoSigtap
      );
    }
    const set = new Set<string>();
    source.forEach((r) => {
      const u = (r.nome_unidade_executante || '').trim();
      if (u) set.add(u);
    });
    return Array.from(set).sort();
  }, [apiData, filterProcedimentoSigtap]);

  // Opções de procedimento SIGTAP: influenciadas pelo filtro de unidade (só procedimentos da unidade digitada)
  const procedimentoSigtapOptions = useMemo(() => {
    let source = apiData;
    if (filterUnidade.trim()) {
      const q = filterUnidade.trim().toLowerCase();
      source = apiData.filter((r) =>
        (r.nome_unidade_executante || '').toLowerCase().includes(q)
      );
    }
    const set = new Set<string>();
    source.forEach((r) => {
      const p = (r.descricao_sigtap_procedimento || '').trim();
      if (p) set.add(p);
    });
    return Array.from(set).sort();
  }, [apiData, filterUnidade]);

  const unidadeSuggestions = useMemo(() => {
    if (!filterUnidade.trim()) return unidadeOptions.slice(0, 30);
    const q = filterUnidade.trim().toLowerCase();
    return unidadeOptions
      .filter((u) => u.toLowerCase().includes(q))
      .slice(0, 30);
  }, [unidadeOptions, filterUnidade]);

  const data = useMemo(() => {
    let result = apiData;
    if (filterUnidade.trim()) {
      const q = filterUnidade.trim().toLowerCase();
      result = result.filter((item) =>
        (item.nome_unidade_executante || '').toLowerCase().includes(q)
      );
    }
    if (filterProcedimentoSigtap) {
      result = result.filter(
        (item) => (item.descricao_sigtap_procedimento || '').trim() === filterProcedimentoSigtap
      );
    }
    return result;
  }, [apiData, filterUnidade, filterProcedimentoSigtap]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const durationHoursList = useMemo(() => {
    return data
      .map((r) => getDurationHours(r.data_solicitacao || '', r.data_aprovacao || ''))
      .filter((h): h is number => h !== null);
  }, [data]);

  // Apresentar o número inteiro sem arredondamento
  const durationMedia = durationHoursList.length
    ? Math.round(durationHoursList.reduce((a, b) => a + b, 0) / durationHoursList.length)
    : null;

  const chartDataByDateSolicitacao = useMemo(() => {
    const map: Record<string, number> = {};
    data.forEach((item) => {
      const monthKey = toMonthKey(item.data_solicitacao || '');
      if (monthKey) map[monthKey] = (map[monthKey] || 0) + 1;
    });
    return Object.entries(map)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [data]);

  const chartDataByDateAprovacao = useMemo(() => {
    const map: Record<string, number> = {};
    data.forEach((item) => {
      const monthKey = toMonthKey(item.data_aprovacao || '');
      if (monthKey) map[monthKey] = (map[monthKey] || 0) + 1;
    });
    return Object.entries(map)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [data]);

  const unitData = useMemo(() => {
    const map: Record<string, number> = {};
    data.forEach((item) => {
      const u = item.nome_unidade_executante || '(vazio)';
      map[u] = (map[u] || 0) + 1;
    });
    return Object.entries(map)
      .map(([unit, count]) => ({ unit, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [data]);

  // // types distintos deve ser o total de procedimento "descricao_sigtap_procedimento"
  // const typeData = useMemo(() => {
  //   const map: Record<string, number> = {};
  //   data.forEach((item) => {
  //     const t = item.type || '(vazio)';
  //     map[t] = (map[t] || 0) + 1;
  //   });
  //   return Object.entries(map).map(([name, value]) => ({ name, value }));
  // }, [data]);

  const procedimentoData = useMemo(() => {
    const map: Record<string, number> = {};
    data.forEach((item) => {
      const p = (item.descricao_sigtap_procedimento || '').trim().slice(0, 50) || '(vazio)';
      map[p] = (map[p] || 0) + 1;
    });
    return Object.entries(map)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [data]);

  const axisColor = isDarkMode ? '#94a3b8' : '#64748b';
  const gridColor = isDarkMode ? '#1e293b' : '#f1f5f9';
  const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  if (!fileId) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <p className="text-slate-500 dark:text-slate-400">Configure VITE_GOOGLE_DRIVE_JSON_REG_ID no .env.local</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" />
        <p className="text-slate-500 animate-pulse">Carregando aprovações do Google Drive...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="bg-blue-600 p-6 rounded-2xl text-white shadow-lg">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-wrap items-end gap-4 flex-1 min-w-0">
            <div className="flex-1 min-w-[200px] max-w-md relative" ref={suggestionsRef}>
              <label className="block text-blue-100 text-xs font-semibold mb-1 uppercase">
                Buscar por unidade executante
              </label>
              <input
                type="text"
                placeholder="Digite o nome da unidade..."
                className="w-full bg-blue-700 border-none rounded-lg p-2 text-sm focus:ring-2 focus:ring-white outline-none placeholder-blue-300"
                value={filterUnidade}
                onChange={(e) => {
                  setFilterUnidade(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
              />
              {showSuggestions && unidadeSuggestions.length > 0 && (
                <ul className="absolute z-20 left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {unidadeSuggestions.map((nome) => (
                    <li key={nome}>
                      <button
                        type="button"
                        className="w-full text-left px-4 py-2 text-sm text-slate-800 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/30 focus:bg-blue-50 dark:focus:bg-blue-900/30 focus:outline-none"
                        onClick={() => {
                          setFilterUnidade(nome);
                          setShowSuggestions(false);
                        }}
                      >
                        {nome}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {showSuggestions && filterUnidade.trim() && unidadeSuggestions.length === 0 && (
                <div className="absolute z-20 left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                  Nenhuma unidade encontrada.
                </div>
              )}
            </div>
            <div className="min-w-[200px] max-w-md flex-shrink-0">
              <label className="block text-blue-100 text-xs font-semibold mb-1 uppercase">
                Procedimento SIGTAP
              </label>
              <select
                value={filterProcedimentoSigtap}
                onChange={(e) => setFilterProcedimentoSigtap(e.target.value)}
                className="w-full bg-blue-700 border-none rounded-lg p-2 text-sm text-white focus:ring-2 focus:ring-white outline-none appearance-none cursor-pointer"
                style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em', paddingRight: '2rem' }}
              >
                <option value="">Todos</option>
                {procedimentoSigtapOptions.map((proc) => (
                  <option key={proc} value={proc} className="bg-slate-800 text-white">
                    {proc.length > 60 ? `${proc.slice(0, 57)}...` : proc}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-blue-100 text-sm hidden sm:block">
              {data.length} de {apiData.length} registros
            </p>
            <button
              onClick={() => refetch()}
              className="bg-blue-500 hover:bg-blue-400 px-4 py-2 rounded-lg text-sm font-semibold transition"
            >
              Atualizar
            </button>
          </div>
        </div>
        <p className="text-blue-100 text-sm mt-2">Leitura do arquivo JSON de regulação (Google Drive)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <p className="text-slate-400 text-xs font-bold uppercase mb-1">Total de registros</p>
          <h3 className="text-3xl font-black text-slate-800 dark:text-white">{data.length}</h3>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <p className="text-slate-400 text-xs font-bold uppercase mb-1">Duração média</p>
          <h3 className="text-3xl font-black text-blue-600 dark:text-blue-400">
            {durationMedia !== null ? formatDuration(durationMedia) : '—'}
          </h3>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <p className="text-slate-400 text-xs font-bold uppercase mb-1">Unidade(s) Executante(s)</p>
          <h3 className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
            {unitData.length}
          </h3>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <p className="text-slate-400 text-xs font-bold uppercase mb-1">N° Procedimentos (SIGTAP)</p>
          <h3 className="text-3xl font-black text-amber-600 dark:text-amber-400">{procedimentoData.length}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <h4 className="text-lg font-bold mb-6 dark:text-white">Por data de solicitação</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartDataByDateSolicitacao}>
                <defs>
                  <linearGradient id="colorSolicitacao" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: axisColor }} tickFormatter={formatMonthLabel} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: axisColor }} />
                <Tooltip contentStyle={{ backgroundColor: isDarkMode ? '#1e293b' : '#fff', border: 'none', borderRadius: '8px', fontSize: '12px' }} labelFormatter={formatMonthLabel} />
                <Area type="monotone" dataKey="count" stroke="#3b82f6" fillOpacity={1} fill="url(#colorSolicitacao)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <h4 className="text-lg font-bold mb-6 dark:text-white">Por data de aprovação</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartDataByDateAprovacao}>
                <defs>
                  <linearGradient id="colorAprovacao" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: axisColor }} tickFormatter={formatMonthLabel} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: axisColor }} />
                <Tooltip contentStyle={{ backgroundColor: isDarkMode ? '#1e293b' : '#fff', border: 'none', borderRadius: '8px', fontSize: '12px' }} labelFormatter={formatMonthLabel} />
                <Area type="monotone" dataKey="count" stroke="#10b981" fillOpacity={1} fill="url(#colorAprovacao)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <h4 className="text-lg font-bold mb-6 dark:text-white">Top unidades</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={unitData} layout="vertical" margin={{ left: 8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={gridColor} />
                <XAxis type="number" hide />
                <YAxis dataKey="unit" type="category" width={140} tick={{ fontSize: 9, fill: axisColor }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: isDarkMode ? '#1e293b' : '#fff', border: 'none', borderRadius: '8px', fontSize: '12px' }} />
                <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <h4 className="text-lg font-bold mb-6 dark:text-white">Top procedimentos (SIGTAP)</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={procedimentoData} layout="vertical" margin={{ left: 8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={gridColor} />
                <XAxis type="number" hide />
                <YAxis dataKey="label" type="category" width={180} tick={{ fontSize: 8, fill: axisColor }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: isDarkMode ? '#1e293b' : '#fff', border: 'none', borderRadius: '8px', fontSize: '12px' }} />
                <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <h4 className="text-lg font-bold mb-6 dark:text-white">Por type</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={procedimentoData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {procedimentoData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: isDarkMode ? '#1e293b' : '#fff', border: 'none', borderRadius: '8px', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <h4 className="font-bold dark:text-white">Lista de aprovações</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4">ID Solicitação</th>
                <th className="px-6 py-4">Unidade executante</th>
                <th className="px-6 py-4">Data solicitação</th>
                <th className="px-6 py-4">Data aprovação</th>
                <th className="px-6 py-4">Duração</th>
                <th className="px-6 py-4">Procedimento SIGTAP</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.map((item, idx) => {
                const hours = getDurationHours(item.data_solicitacao || '', item.data_aprovacao || '');
                const key = String(item.codigo_solicitacao ?? idx);
                return (
                  <tr key={key} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-blue-600 dark:text-blue-400">{item.codigo_solicitacao}</td>
                    <td className="px-6 py-4 dark:text-slate-300 text-xs">{item.nome_unidade_executante || '—'}</td>
                    <td className="px-6 py-4 dark:text-slate-300">{item.data_solicitacao ? new Date(item.data_solicitacao).toLocaleString('pt-BR') : '—'}</td>
                    <td className="px-6 py-4 dark:text-slate-300">{item.data_aprovacao ? new Date(item.data_aprovacao).toLocaleString('pt-BR') : '—'}</td>
                    <td className="px-6 py-4 dark:text-slate-300">{formatDuration(hours)}</td>
                    <td className="px-6 py-4 dark:text-slate-300 text-xs max-w-[200px] truncate" title={item.descricao_sigtap_procedimento || ''}>
                      {item.descricao_sigtap_procedimento?.trim() || '—'}
                    </td>
                    <td className="px-6 py-4 dark:text-slate-300 text-xs">{item.type || '—'}</td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] px-2 py-1 rounded-full font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        {item.status_solicitacao || '—'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-xs">
          Exibindo todos os {data.length} registros.
        </div>
      </div>
    </div>
  );
};

export default ApprovalsPage;
