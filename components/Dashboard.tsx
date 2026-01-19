
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
  const [filterCompany, setFilterCompany] = useState<string>('all');
  const [filterObject, setFilterObject] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>(new Date().getFullYear().toString());

  // Cores adaptativas para o gráfico
  const axisColor = isDarkMode ? '#94a3b8' : '#64748b';
  const gridColor = isDarkMode ? '#1e293b' : '#f1f5f9';

  const companies = useMemo(() => Array.from(new Set(contracts.map(c => c.empresa))), [contracts]);
  const objects = useMemo(() => Array.from(new Set(contracts.map(c => c.objeto))), [contracts]);
  const years = useMemo(() => Array.from(new Set(payments.map(p => p.ano_competencia.toString()))).sort().reverse(), [payments]);

  const filteredContractsForExpected = useMemo(() => {
    return contracts.filter(c => {
      const matchesCompany = filterCompany === 'all' || c.empresa === filterCompany;
      const matchesObject = filterObject === 'all' || c.objeto === filterObject;
      return matchesCompany && matchesObject;
    });
  }, [contracts, filterCompany, filterObject]);

  const expectedMonthlyValue = useMemo(() => {
    const totalGlobal = filteredContractsForExpected.reduce((acc, c) => acc + c.valor_global_anul, 0);
    return totalGlobal / 12;
  }, [filteredContractsForExpected]);

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const contract = contracts.find(c => c.numero_contrato === p.numero_contrato);
      const matchesCompany = filterCompany === 'all' || contract?.empresa === filterCompany;
      const matchesObject = filterObject === 'all' || contract?.objeto === filterObject;
      const matchesYear = filterYear === 'all' || p.ano_competencia.toString() === filterYear;
      return matchesCompany && matchesObject && matchesYear;
    });
  }, [payments, contracts, filterCompany, filterObject, filterYear]);

  const monthlyData = useMemo(() => {
    return MONTHS.map((month, index) => {
      const monthPayments = filteredPayments.filter(p => p.mes_competencia === index + 1);
      const fed = monthPayments.reduce((acc, p) => acc + p.pagamentos_fed.reduce((v, e) => v + e.valor, 0), 0);
      const est = monthPayments.reduce((acc, p) => acc + p.pagamentos_est.reduce((v, e) => v + e.valor, 0), 0);
      return { 
        name: month, 
        fed, 
        est, 
        total: fed + est,
        expected: expectedMonthlyValue 
      };
    });
  }, [filteredPayments, expectedMonthlyValue]);

  const totalFed = useMemo(() => filteredPayments.reduce((acc, p) => acc + p.pagamentos_fed.reduce((v, e) => v + e.valor, 0), 0), [filteredPayments]);
  const totalEst = useMemo(() => filteredPayments.reduce((acc, p) => acc + p.pagamentos_est.reduce((v, e) => v + e.valor, 0), 0), [filteredPayments]);
  const totalPaid = totalFed + totalEst;

  const pieData = [
    { name: 'Fonte Federal', value: totalFed },
    { name: 'Fonte Estadual', value: totalEst },
  ];

  const COLORS = ['#2563eb', '#10b981'];

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Filters Section */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end transition-colors">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Empresa</label>
          <select 
            value={filterCompany}
            onChange={(e) => setFilterCompany(e.target.value)}
            className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
          >
            <option value="all">Todas as Empresas</option>
            {companies.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Objeto do Contrato</label>
          <select 
            value={filterObject}
            onChange={(e) => setFilterObject(e.target.value)}
            className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
          >
            <option value="all">Todos os Objetos</option>
            {objects.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ano</label>
          <select 
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
          >
            <option value="all">Todos os Anos</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <div>
          <button 
            onClick={() => { setFilterCompany('all'); setFilterObject('all'); setFilterYear(new Date().getFullYear().toString()); }}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 transition"
          >
            Limpar Filtros
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Pago (Federal)</p>
          <h3 className="text-2xl font-bold text-blue-600 dark:text-blue-500 mt-1">{formatCurrency(totalFed)}</h3>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Pago (Estadual)</p>
          <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-500 mt-1">{formatCurrency(totalEst)}</h3>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Consolidado</p>
          <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{formatCurrency(totalPaid)}</h3>
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
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: axisColor}} />
              <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `R$ ${val / 1000}k`} tick={{fontSize: 11, fill: axisColor}} />
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
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: axisColor}} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `R$ ${val / 1000}k`} tick={{fontSize: 12, fill: axisColor}} />
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
    </div>
  );
};

export default Dashboard;
