
import React, { useState, useMemo } from 'react';
import { Contract, PaymentRecord } from '../types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Line, ComposedChart
} from 'recharts';
import { MONTHS } from '../constants';

interface DashboardProps {
  contracts: Contract[];
  payments: PaymentRecord[];
  isDarkMode?: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ contracts, payments, isDarkMode }) => {
  const [filterContract, setFilterContract] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>(new Date().getFullYear().toString());
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Cores adaptativas para o gráfico
  const axisColor = isDarkMode ? '#94a3b8' : '#64748b';
  const gridColor = isDarkMode ? '#1e293b' : '#f1f5f9';

  const years = useMemo(() => Array.from(new Set(payments.map(p => p.ano_competencia.toString()))).sort().reverse(), [payments]);

  // Contratos filtrados por empresa (para o dropdown de contratos)
  const contractsForDropdown = contracts;

  const filteredContractsForExpected = useMemo(() => {
    return contracts.filter(c => {
      const matchesContract = filterContract === 'all' || c.numero_contrato === filterContract;
      return matchesContract;
    });
  }, [contracts, filterContract]);

  const expectedMonthlyValue = useMemo(() => {
    const totalGlobal = filteredContractsForExpected.reduce((acc, c) => acc + c.valor_global_anul, 0);
    return totalGlobal / 12;
  }, [filteredContractsForExpected]);

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const matchesContract = filterContract === 'all' || p.numero_contrato === filterContract;
      const matchesYear = filterYear === 'all' || p.ano_competencia.toString() === filterYear;
      return matchesContract && matchesYear;
    });
  }, [payments, filterContract, filterYear]);

  const monthlyData = useMemo(() => {
    const data = MONTHS.map((month, index) => {
      const monthPayments = filteredPayments.filter(p => p.mes_competencia === index + 1);
      const fed = monthPayments.reduce((acc, p) => acc + p.pagamentos_fed.reduce((v, e) => v + e.valor, 0), 0);
      const est = monthPayments.reduce((acc, p) => acc + p.pagamentos_est.reduce((v, e) => v + e.valor, 0), 0);
      const nfe = monthPayments.reduce((acc, p) => acc + p.valor_nfe, 0);
      return {
        name: month,
        fed,
        est,
        total: fed + est,
        nfe,
        expected: expectedMonthlyValue
      };
    });

    // Encontra o index do primeiro mês que possui uma ordem bancária (total > 0)
    const firstMonthWithData = data.findIndex(d => d.total > 0);
    return firstMonthWithData === -1 ? data : data.slice(firstMonthWithData);
  }, [filteredPayments, expectedMonthlyValue]);

  const totalFed = useMemo(() => filteredPayments.reduce((acc, p) => acc + p.pagamentos_fed.reduce((v, e) => v + e.valor, 0), 0), [filteredPayments]);
  const totalEst = useMemo(() => filteredPayments.reduce((acc, p) => acc + p.pagamentos_est.reduce((v, e) => v + e.valor, 0), 0), [filteredPayments]);
  const totalPaid = totalFed + totalEst;

  // Calculo do Valor Total dos Contratos Selecionados
  const totalContractValue = useMemo(() => {
    return filteredContractsForExpected.reduce((acc, c) => acc + c.valor_global_anul, 0);
  }, [filteredContractsForExpected]);

  // Calculo do Restante a Pagar (Total do Contrato - Total Pago Geral dos Contratos selecionados [ignorando filtro de ano])
  const remainingToPay = useMemo(() => {
    // Precisamos pegar TODOS os pagamentos dos contratos selecionados, independente do ano
    const contractNumbers = filteredContractsForExpected.map(c => c.numero_contrato);
    const allRelatedPayments = payments.filter(p => contractNumbers.includes(p.numero_contrato));

    const paidAllTime = allRelatedPayments.reduce((acc, p) => {
      const fed = p.pagamentos_fed.reduce((v, e) => v + e.valor, 0);
      const est = p.pagamentos_est.reduce((v, e) => v + e.valor, 0);
      return acc + fed + est;
    }, 0);

    return totalContractValue - paidAllTime;
  }, [payments, filteredContractsForExpected, totalContractValue]);

  const pieData = [
    { name: 'Fonte Federal', value: totalFed },
    { name: 'Fonte Estadual', value: totalEst },
  ];

  const COLORS = ['#2563eb', '#10b981'];

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // Calculo de todas as Ordens Bancarias para a lista detalhada
  // Helper para parsing de data consistente (sempre local para evitar shift de timezone)
  const parseDateToTime = (dateStr: string) => {
    if (!dateStr) return 0;
    const cleanDate = dateStr.trim();

    // Formato DD/MM/YYYY
    if (cleanDate.includes('/')) {
      const parts = cleanDate.split('/');
      if (parts.length === 3) {
        const [day, month, year] = parts.map(Number);
        return new Date(year, month - 1, day).getTime();
      }
    }

    // Formato YYYY-MM-DD
    if (cleanDate.includes('-')) {
      const parts = cleanDate.split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) { // YYYY-MM-DD
          const [y, m, d] = parts.map(Number);
          return new Date(y, m - 1, d).getTime();
        } else { // DD-MM-YYYY
          const [d, m, y] = parts.map(Number);
          return new Date(y, m - 1, d).getTime();
        }
      }
    }

    const d = new Date(cleanDate);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  };

  // Calculo de todas as Ordens Bancarias para a lista detalhada
  const allOBs = useMemo(() => {
    const obs: {
      id: string;
      referencia_ob: string;
      data_ob: string;
      numero_empenho: string;
      nf: string;
      source: 'Federal' | 'Estadual';
      mes: number;
      ano: number;
      valor: number;
      time: number;
    }[] = [];

    filteredPayments.forEach(payment => {
      // Federal
      payment.pagamentos_fed.forEach(entry => {
        obs.push({
          id: `${payment.id}-fed-${entry.id}`,
          referencia_ob: entry.referencia_ob,
          data_ob: entry.data_ob,
          numero_empenho: entry.numero_empenho,
          nf: payment.numero_nf,
          source: 'Federal',
          mes: payment.mes_competencia,
          ano: payment.ano_competencia,
          valor: entry.valor,
          time: parseDateToTime(entry.data_ob)
        });
      });
      // Estadual
      payment.pagamentos_est.forEach(entry => {
        obs.push({
          id: `${payment.id}-est-${entry.id}`,
          referencia_ob: entry.referencia_ob,
          data_ob: entry.data_ob,
          numero_empenho: entry.numero_empenho,
          nf: payment.numero_nf,
          source: 'Estadual',
          mes: payment.mes_competencia,
          ano: payment.ano_competencia,
          valor: entry.valor,
          time: parseDateToTime(entry.data_ob)
        });
      });
    });

    return obs.sort((a, b) => {
      if (a.time !== b.time) {
        return sortOrder === 'asc' ? a.time - b.time : b.time - a.time;
      }
      return b.referencia_ob.localeCompare(a.referencia_ob);
    });
  }, [filteredPayments, sortOrder]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Filters Section */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end transition-colors">

        <div className="lg:col-span-3 space-y-1">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Contratos
            {contractsForDropdown.length > 1 && (
              <span className="ml-1 text-amber-500">({contractsForDropdown.length} contratos)</span>
            )}
          </label>
          <select
            value={filterContract}
            onChange={(e) => setFilterContract(e.target.value)}
            className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
          >
            <option value="all">Todos os Contratos</option>
            {contractsForDropdown.map(c => (
              <option key={c.id || c.numero_contrato} value={c.numero_contrato}>
                {c.numero_contrato} - {c.empresa} - {c.natureza}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ano</label>
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="w-full p-2 bg-slate-60 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
          >
            <option value="all">Todos os Anos</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Contract Details Card */}
      {filterContract !== 'all' && (() => {
        const selectedContract = contracts.find(c => c.numero_contrato === filterContract);
        if (!selectedContract) return null;
        return (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors animate-in fade-in slide-in-from-top-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Empresa</p>
                <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">{selectedContract.empresa}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Início da Vigência</p>
                <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">{new Date(selectedContract.inicio_vigencia).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 lg:p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
          <p className="text-slate-500 dark:text-slate-400 text-xs lg:text-sm font-medium">Valor do Contrato</p>
          <h3 className="text-xl lg:text-2xl font-bold text-slate-700 dark:text-slate-200 mt-1">{formatCurrency(totalContractValue)}</h3>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 lg:p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
          <p className="text-slate-500 dark:text-slate-400 text-xs lg:text-sm font-medium">Restante a Pagar</p>
          <h3 className="text-xl lg:text-2xl font-bold text-amber-600 dark:text-amber-500 mt-1">{formatCurrency(remainingToPay)}</h3>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 lg:p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
          <p className="text-slate-500 dark:text-slate-400 text-xs lg:text-sm font-medium">Pago (Federal)</p>
          <h3 className="text-xl lg:text-2xl font-bold text-blue-600 dark:text-blue-500 mt-1">{formatCurrency(totalFed)}</h3>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 lg:p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
          <p className="text-slate-500 dark:text-slate-400 text-xs lg:text-sm font-medium">Pago (Estadual)</p>
          <h3 className="text-xl lg:text-2xl font-bold text-emerald-600 dark:text-emerald-500 mt-1">{formatCurrency(totalEst)}</h3>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 lg:p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
          <p className="text-slate-500 dark:text-slate-400 text-xs lg:text-sm font-medium">Total Pago</p>
          <h3 className="text-xl lg:text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{formatCurrency(totalPaid)}</h3>
        </div>
      </div>

      {/* Composed Chart */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Evolução dos Pagamentos</h4>
            <p className="text-xs text-slate-400 dark:text-slate-500">Comparativo entre o valor mensal esperado vs executado.</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <div className="w-4 h-0 border-t-2 border-orange-500"></div>
              <span>Valor NF</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <div className="w-4 h-0 border-t-2 border-dashed border-blue-500"></div>
              <span>Meta (Global / 12)</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <div className="w-4 h-4 rounded bg-emerald-500/20 border border-emerald-500"></div>
              <span>Total Liquidado</span>
            </div>
          </div>
        </div>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={monthlyData}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: axisColor }} />
              <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `R$ ${val / 1000}k`} tick={{ fontSize: 11, fill: axisColor }} />
              <Tooltip
                formatter={(val: number) => formatCurrency(val)}
                contentStyle={{
                  borderRadius: '12px',
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  fontSize: '12px',
                  backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                  color: isDarkMode ? '#f8fafc' : '#1e293b'
                }}
              />
              <Legend iconType="circle" />

              <Area
                type="monotone"
                dataKey="total"
                name="Total Pago na Competência"
                stroke="#10b981"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorTotal)"
              />

              <Line
                type="monotone"
                dataKey="nfe"
                name="Valor das Notas Fiscais"
                stroke="#f97316"
                strokeWidth={1}
                dot={{ r: 2, fill: '#f97316' }}
              // activeDot={{ r: 6 }}
              />

              <Line
                type="step"
                dataKey="expected"
                name="Meta Mensal (Global/12)"
                stroke="#3b82f6"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                activeDot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
          <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-6">Volume Mensal por Fonte</h4>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: axisColor }} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `R$ ${val / 1000}k`} tick={{ fontSize: 12, fill: axisColor }} />
                <Tooltip
                  formatter={(val: number) => formatCurrency(val)}
                  contentStyle={{
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                    color: isDarkMode ? '#f8fafc' : '#1e293b'
                  }}
                />
                <Legend iconType="circle" />
                <Bar name="Federal" dataKey="fed" fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Bar name="Estadual" dataKey="est" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
          <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-6">Proporção Federal vs Estadual</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: number) => formatCurrency(val)}
                  contentStyle={{
                    backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                    border: 'none',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                Federal
              </div>
              <span className="text-sm font-bold dark:text-slate-200">{totalPaid > 0 ? ((totalFed / totalPaid) * 100).toFixed(1) : 0}%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <div className="w-3 h-3 rounded-full bg-emerald-600"></div>
                Estadual
              </div>
              <span className="text-sm font-bold dark:text-slate-200">{totalPaid > 0 ? ((totalEst / totalPaid) * 100).toFixed(1) : 0}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Table Section */}
      {filterContract !== 'all' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden animate-in slide-in-from-bottom-4 duration-500 transition-colors">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800">
            <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100">Detalhamento de Ordens Bancárias</h4>
            <p className="text-xs text-slate-400 dark:text-slate-500">Listagem completa de liquidações para o contrato selecionado.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-4">N° Ordem (OB)</th>
                  <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group" onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}>
                    <div className="flex items-center gap-2">
                      Data OB
                      <span className={`transition-transform duration-200 ${sortOrder === 'asc' ? 'rotate-180' : ''}`}>▼</span>
                    </div>
                  </th>
                  <th className="px-6 py-4">N° Empenho (NE)</th>
                  <th className="px-6 py-4">Nota Fiscal</th>
                  <th className="px-6 py-4">Fonte</th>
                  <th className="px-6 py-4">Competência</th>
                  <th className="px-6 py-4 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {allOBs.map((ob) => (
                  <tr key={ob.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-200">{ob.referencia_ob}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                      {(() => {
                        if (!ob.data_ob) return "-";
                        // Se já está no formato DD/MM/YYYY, exibe direto para evitar problemas de parsing
                        if (ob.data_ob.includes('/')) return ob.data_ob;
                        // Senão tenta converter
                        const d = new Date(ob.time);
                        return isNaN(d.getTime()) ? ob.data_ob : d.toLocaleDateString('pt-BR');
                      })()}
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{ob.numero_empenho}</td>
                    <td className="px-6 py-4 text-blue-600 dark:text-blue-400 font-medium">{ob.nf}</td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${ob.source === 'Federal'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        }`}>
                        {ob.source}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                      {MONTHS[ob.mes - 1]} / {ob.ano}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-slate-800 dark:text-slate-100">
                      {formatCurrency(ob.valor)}
                    </td>
                  </tr>
                ))}
                {allOBs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-slate-400 dark:text-slate-600">
                      Nenhuma ordem bancária encontrada para este contrato no período/filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
              {allOBs.length > 0 && (
                <tfoot className="bg-slate-50 dark:bg-slate-800/50 font-bold">
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-right text-slate-500 dark:text-slate-400 uppercase text-xs tracking-wider">Total Acumulado</td>
                    <td className="px-6 py-4 text-right text-slate-800 dark:text-slate-100 text-lg">
                      {formatCurrency(allOBs.reduce((acc, curr) => acc + curr.valor, 0))}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
