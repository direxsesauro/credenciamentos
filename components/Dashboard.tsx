import React, { useState, useMemo } from 'react';
import { Contract, PaymentRecord, EmpenhoFinanceiro, ApprovalRecord } from '../types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Line, LineChart, ComposedChart,
  RadialBarChart, RadialBar, PolarAngleAxis,
  ReferenceDot
} from 'recharts';
import { MONTHS } from '../constants';
import { useQuery } from '@tanstack/react-query';
import { getEmpenhosByNumbers } from '../services/google-drive/empenhos.service';
import { fetchApprovalsFromSupabase, isSupabaseConfigured } from '../services/supabase/regulacao-approvals.service';

interface DashboardProps {
  contracts: Contract[];
  payments: PaymentRecord[];
  isDarkMode?: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ contracts, payments, isDarkMode }) => {
  const [filterContract, setFilterContract] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>(new Date().getFullYear().toString());
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showCharts, setShowCharts] = useState<boolean>(true);
  const [filterRegulacaoYear, setFilterRegulacaoYear] = useState<string>(new Date().getFullYear().toString());
  const [filterRegulacaoMonth, setFilterRegulacaoMonth] = useState<string>('all');

  // Cores adaptativas para o gráfico
  const axisColor = isDarkMode ? '#94a3b8' : '#64748b';
  const gridColor = isDarkMode ? '#1e293b' : '#f1f5f9';

  const years = useMemo(() => {
    const allYears = new Set<string>();
    payments.forEach(p => {
      if (p.invoices && p.invoices.length > 0) {
        p.invoices.forEach(inv => allYears.add(inv.ano_competencia.toString()));
      } else if ((p as any).ano_competencia) {
        // Compatibilidade com dados antigos
        allYears.add((p as any).ano_competencia.toString());
      }
    });
    return Array.from(allYears).sort().reverse();
  }, [payments]);

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
      if (filterYear === 'all') return matchesContract;
      
      // Verificar se alguma nota fiscal do pagamento corresponde ao ano filtrado
      if (p.invoices && p.invoices.length > 0) {
        const hasMatchingYear = p.invoices.some(inv => inv.ano_competencia.toString() === filterYear);
        return matchesContract && hasMatchingYear;
      } else if ((p as any).ano_competencia) {
        // Compatibilidade com dados antigos
        return matchesContract && (p as any).ano_competencia.toString() === filterYear;
      }
      return false;
    });
  }, [payments, filterContract, filterYear]);

  const monthlyData = useMemo(() => {
    const monthNumToIndex = (index: number) => index + 1; // 1-12

    const data = MONTHS.map((month, index) => {
      const mesCompetencia = monthNumToIndex(index);

      // Total Pago na Competência: somar valor de cada OB pela competência da NF associada à OB
      // Cada ordem bancária conta apenas no mês/ano da sua nota fiscal (invoice_id -> mes_competencia, ano_competencia)
      let fed = 0;
      let est = 0;

      filteredPayments.forEach(p => {
        const getInvoice = (invoiceId: string) => p.invoices?.find(inv => inv.id === invoiceId);

        (p.pagamentos_fed || []).forEach(entry => {
          const inv = getInvoice(entry.invoice_id);
          const matchYear = filterYear === 'all' || (inv && inv.ano_competencia.toString() === filterYear);
          const matchMonth = inv && inv.mes_competencia === mesCompetencia;
          if (matchMonth && matchYear) {
            fed += entry.valor;
          }
        });

        (p.pagamentos_est || []).forEach(entry => {
          const inv = getInvoice(entry.invoice_id);
          const matchYear = filterYear === 'all' || (inv && inv.ano_competencia.toString() === filterYear);
          const matchMonth = inv && inv.mes_competencia === mesCompetencia;
          if (matchMonth && matchYear) {
            est += entry.valor;
          }
        });
      });

      const total = fed + est;

      // Valor das Notas Fiscais: soma dos valor_nfe das NFs com competência = este mês/ano
      const nfe = filteredPayments.reduce((acc, p) => {
        if (p.invoices && p.invoices.length > 0) {
          return acc + p.invoices
            .filter(inv => inv.mes_competencia === mesCompetencia && (filterYear === 'all' || inv.ano_competencia.toString() === filterYear))
            .reduce((sum, inv) => sum + inv.valor_nfe, 0);
        }
        if ((p as any).mes_competencia === mesCompetencia && (filterYear === 'all' || (p as any).ano_competencia?.toString() === filterYear)) {
          return acc + ((p as any).valor_nfe || 0);
        }
        return acc;
      }, 0);

      return {
        name: month,
        fed,
        est,
        total,
        nfe,
        expected: expectedMonthlyValue
      };
    });

    // Determinar o mês inicial do gráfico
    let startMonthIndex = 0;
    
    // Se um contrato específico está selecionado, usar o mês de início da vigência
    if (filterContract !== 'all') {
      const selectedContract = contracts.find(c => c.numero_contrato === filterContract);
      if (selectedContract && selectedContract.inicio_vigencia) {
        const startDate = new Date(selectedContract.inicio_vigencia);
        const startMonth = startDate.getMonth(); // 0-11 (janeiro = 0)
        const startYear = startDate.getFullYear();
        
        // Verificar se o ano de início corresponde ao ano filtrado
        if (filterYear === 'all' || startYear.toString() === filterYear) {
          startMonthIndex = startMonth; // Usar o mês de início (0-11, convertido para índice do array)
        }
      }
    } else {
      // Se não há contrato específico, usar o primeiro mês com dados
      const firstMonthWithData = data.findIndex(d => d.total > 0);
      if (firstMonthWithData !== -1) {
        startMonthIndex = firstMonthWithData;
      }
    }

    return data.slice(startMonthIndex);
  }, [filteredPayments, expectedMonthlyValue, filterContract, filterYear, contracts]);

  // Coletar todos os números de empenhos dos contratos filtrados
  const numerosEmpenhos = useMemo(() => {
    const empenhosSet = new Set<string>();
    filteredContractsForExpected.forEach(contract => {
      contract.empenhos?.forEach(empenho => {
        empenhosSet.add(empenho.numero_empenho);
      });
    });
    return Array.from(empenhosSet);
  }, [filteredContractsForExpected]);

  // Buscar dados financeiros dos empenhos cadastrados na aplicação
  const { data: empenhosFinanceiros = [] } = useQuery<EmpenhoFinanceiro[]>({
    queryKey: ['empenhos-financeiros-dashboard', numerosEmpenhos.join(',')],
    queryFn: () => getEmpenhosByNumbers(numerosEmpenhos),
    enabled: numerosEmpenhos.length > 0,
    retry: 2,
    retryDelay: 1000,
  });

  // Calcular totalPaid a partir dos empenhos financeiros cadastrados na aplicação
  const totalPaid = useMemo(() => {
    return empenhosFinanceiros.reduce((total, empenho) => {
      return total + (empenho.pagamentos_do_exercicio || 0);
    }, 0);
  }, [empenhosFinanceiros]);

  // Manter totalFed e totalEst para o gráfico de pizza (mas não usar para totalPaid)
  const totalFed = useMemo(() => filteredPayments.reduce((acc, p) => acc + p.pagamentos_fed.reduce((v, e) => v + e.valor, 0), 0), [filteredPayments]);
  const totalEst = useMemo(() => filteredPayments.reduce((acc, p) => acc + p.pagamentos_est.reduce((v, e) => v + e.valor, 0), 0), [filteredPayments]);

  // Somatório das notas fiscais (valor_nfe de todas as NFs dos pagamentos filtrados)
  const totalNotasFiscais = useMemo(() => {
    return filteredPayments.reduce((acc, p) => {
      if (p.invoices && p.invoices.length > 0) {
        return acc + p.invoices.reduce((s, inv) => s + (inv.valor_nfe || 0), 0);
      }
      return acc + ((p as any).valor_nfe || 0);
    }, 0);
  }, [filteredPayments]);

  // Média do valor das notas fiscais por mês (competências distintas)
  const mediaNotasFiscaisPorMes = useMemo(() => {
    const meses = new Set<string>();
    filteredPayments.forEach(p => {
      if (p.invoices && p.invoices.length > 0) {
        p.invoices.forEach(inv => meses.add(`${inv.ano_competencia}-${inv.mes_competencia}`));
      } else if ((p as any).ano_competencia != null && (p as any).mes_competencia != null) {
        meses.add(`${(p as any).ano_competencia}-${(p as any).mes_competencia}`);
      }
    });
    const qtdMeses = meses.size;
    return qtdMeses > 0 ? totalNotasFiscais / qtdMeses : 0;
  }, [filteredPayments, totalNotasFiscais]);

  // Total somado das ordens bancárias (OBs) lançadas no sistema
  const totalFromOBs = useMemo(() => totalFed + totalEst, [totalFed, totalEst]);

  // Calculo do Valor Total dos Contratos Selecionados
  const totalContractValue = useMemo(() => {
    return filteredContractsForExpected.reduce((acc, c) => acc + c.valor_global_anul, 0);
  }, [filteredContractsForExpected]);

  // Consumo do contrato pelas NFs (%): (somatório NFs / valor global) * 100 (pode ultrapassar 100%)
  const consumoPercentRaw = useMemo(() => {
    if (totalContractValue <= 0) return 0;
    return (totalNotasFiscais / totalContractValue) * 100;
  }, [totalNotasFiscais, totalContractValue]);

  const overflowPercent = useMemo(() => Math.max(0, consumoPercentRaw - 100), [consumoPercentRaw]);

  // Restante: valor global do contrato menos somatório das NFs
  const restanteContratoMenosNFs = useMemo(() => totalContractValue - totalNotasFiscais, [totalContractValue, totalNotasFiscais]);

  // Dados para o gráfico: até 100% verde; acima de 100% prolongamento em vermelho
  const radialProgressData = useMemo(() => {
    const consumo = Math.round(consumoPercentRaw * 10) / 10;
    if (overflowPercent > 0) {
      return [
        { name: 'Consumo', value: 100, fill: '#10b981' },
        { name: 'Prolongamento', value: Math.round(overflowPercent * 10) / 10, fill: '#ef4444' }
      ];
    }
    return [{ name: 'Consumo', value: consumo, fill: '#10b981' }];
  }, [consumoPercentRaw, overflowPercent]);

  // Restante a Pagar = Valor das NF's − Total Pago (somatório dos empenhos, não das ordens)
  const remainingToPay = useMemo(() => {
    return totalNotasFiscais - totalPaid;
  }, [totalNotasFiscais, totalPaid]);

  const pieData = [
    { name: 'Fonte Federal', value: totalFed },
    { name: 'Fonte Estadual', value: totalEst },
  ];

  const COLORS = ['#2563eb', '#10b981'];

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // Contrato selecionado e unidade executante (para regulação)
  const selectedContract = useMemo(() => {
    if (filterContract === 'all') return null;
    return contracts.find(c => c.numero_contrato === filterContract) ?? null;
  }, [contracts, filterContract]);

  const nomeUnidadeExecutante = selectedContract?.nome_unidade_executante?.trim() ?? '';

  const useSupabase = isSupabaseConfigured();
  const { data: approvalsFromSupabase = [] } = useQuery<ApprovalRecord[]>({
    queryKey: ['supabase-approvals-dashboard'],
    queryFn: fetchApprovalsFromSupabase,
    enabled: useSupabase && filterContract !== 'all' && !!nomeUnidadeExecutante,
    staleTime: 5 * 60 * 1000,
  });

  const approvalsFilteredByUnidade = useMemo(() => {
    if (!nomeUnidadeExecutante) return [];
    return approvalsFromSupabase.filter(
      r => (r.nome_unidade_executante || '').trim() === nomeUnidadeExecutante
    );
  }, [approvalsFromSupabase, nomeUnidadeExecutante]);

  const parseYearMonth = (dateStr: string): { year: number; month: number } | null => {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const s = dateStr.trim().slice(0, 10);
    const match = s.match(/^(\d{4})-(\d{2})/);
    if (!match) return null;
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    if (month < 1 || month > 12) return null;
    return { year, month };
  };

  const regulacaoChartData = useMemo(() => {
    const year = parseInt(filterRegulacaoYear, 10);
    if (isNaN(year)) return [];
    const monthsToShow = filterRegulacaoMonth === 'all'
      ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
      : [parseInt(filterRegulacaoMonth, 10)];

    return monthsToShow.map(mes => {
      let solicitacoes = 0;
      let aprovacoes = 0;
      approvalsFilteredByUnidade.forEach(r => {
        const sol = parseYearMonth(r.data_solicitacao ?? '');
        if (sol && sol.year === year && sol.month === mes) solicitacoes++;
        const apr = parseYearMonth(r.data_aprovacao ?? '');
        if (apr && apr.year === year && apr.month === mes) aprovacoes++;
      });
      return {
        name: MONTHS[mes - 1],
        solicitacoes,
        aprovacoes,
      };
    });
  }, [approvalsFilteredByUnidade, filterRegulacaoYear, filterRegulacaoMonth]);

  const totalAprovadosNoPeriodo = useMemo(() => {
    const year = parseInt(filterRegulacaoYear, 10);
    if (isNaN(year)) return 0;
    const monthsToShow = filterRegulacaoMonth === 'all'
      ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
      : [parseInt(filterRegulacaoMonth, 10)];

    let total = 0;
    approvalsFilteredByUnidade.forEach(r => {
      const apr = parseYearMonth(r.data_aprovacao ?? '');
      if (apr && apr.year === year && monthsToShow.includes(apr.month)) total++;
    });
    return total;
  }, [approvalsFilteredByUnidade, filterRegulacaoYear, filterRegulacaoMonth]);

  const approvalsInPeriod = useMemo(() => {
    const year = parseInt(filterRegulacaoYear, 10);
    if (isNaN(year)) return [];
    const monthsToShow = filterRegulacaoMonth === 'all'
      ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
      : [parseInt(filterRegulacaoMonth, 10)];

    return approvalsFilteredByUnidade.filter(r => {
      const apr = parseYearMonth(r.data_aprovacao ?? '');
      return apr && apr.year === year && monthsToShow.includes(apr.month);
    });
  }, [approvalsFilteredByUnidade, filterRegulacaoYear, filterRegulacaoMonth]);

  const tabelaProcedimentosPorAprovacoes = useMemo(() => {
    const map = new Map<string, number>();
    approvalsInPeriod.forEach(r => {
      const nome = (r.descricao_sigtap_procedimento || r.descricao_interna_procedimento || 'Não informado').trim();
      map.set(nome, (map.get(nome) ?? 0) + 1);
    });
    const mockPrecoUnitario = (procedimento: string): number => {
      let hash = 0;
      for (let i = 0; i < procedimento.length; i++) hash = ((hash << 5) - hash) + procedimento.charCodeAt(i);
      return 80 + (Math.abs(hash) % 320);
    };
    return Array.from(map.entries())
      .map(([procedimento, quantidade]) => {
        const precoUnitario = mockPrecoUnitario(procedimento);
        return { procedimento, quantidade, precoUnitario, total: quantidade * precoUnitario };
      })
      .sort((a, b) => b.quantidade - a.quantidade);
  }, [approvalsInPeriod]);

  const valorEstimadoMes = useMemo(() => {
    return tabelaProcedimentosPorAprovacoes.reduce((acc, row) => acc + row.total, 0);
  }, [tabelaProcedimentosPorAprovacoes]);

  // Dados do gráfico de evolução + ponto extra "Estimado" (valor estimado para o mês)
  const chartEvolutionData = useMemo(() => [
    ...monthlyData,
    { name: 'Estimado', total: 0, fed: 0, est: 0, nfe: valorEstimadoMes, expected: expectedMonthlyValue }
  ], [monthlyData, valorEstimadoMes, expectedMonthlyValue]);

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
      // Obter informações da nota fiscal associada a cada entrada
      const getInvoiceInfo = (invoiceId: string) => {
        if (payment.invoices && payment.invoices.length > 0) {
          const invoice = payment.invoices.find(inv => inv.id === invoiceId);
          if (invoice) {
            return { nf: invoice.numero_nf, mes: invoice.mes_competencia, ano: invoice.ano_competencia };
          }
        }
        // Fallback para dados antigos
        return {
          nf: (payment as any).numero_nf || '',
          mes: (payment as any).mes_competencia || new Date().getMonth() + 1,
          ano: (payment as any).ano_competencia || new Date().getFullYear()
        };
      };
      
      // Federal
      payment.pagamentos_fed.forEach(entry => {
        const invoiceInfo = getInvoiceInfo(entry.invoice_id);
        obs.push({
          id: `${payment.id}-fed-${entry.id}`,
          referencia_ob: entry.referencia_ob,
          data_ob: entry.data_ob,
          numero_empenho: entry.numero_empenho,
          nf: invoiceInfo.nf,
          source: 'Federal',
          mes: invoiceInfo.mes,
          ano: invoiceInfo.ano,
          valor: entry.valor,
          time: parseDateToTime(entry.data_ob)
        });
      });
      // Estadual
      payment.pagamentos_est.forEach(entry => {
        const invoiceInfo = getInvoiceInfo(entry.invoice_id);
        obs.push({
          id: `${payment.id}-est-${entry.id}`,
          referencia_ob: entry.referencia_ob,
          data_ob: entry.data_ob,
          numero_empenho: entry.numero_empenho,
          nf: invoiceInfo.nf,
          source: 'Estadual',
          mes: invoiceInfo.mes,
          ano: invoiceInfo.ano,
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
        <div className="bg-white dark:bg-slate-900 p-4 lg:p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors flex flex-col items-center justify-center text-center">
          <p className="text-slate-500 dark:text-slate-400 text-xs lg:text-sm font-medium">Valor do Contrato</p>
          <h3 className="text-xl lg:text-2xl font-bold text-slate-700 dark:text-slate-200 mt-1">{formatCurrency(totalContractValue)}</h3>
        </div>



        <div className="bg-white dark:bg-slate-900 p-4 lg:p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors flex flex-col items-center justify-center text-center">
          <p className="text-slate-500 dark:text-slate-400 text-xs lg:text-sm font-medium">Somatório das Notas Fiscais</p>
          <h3 className="text-xl lg:text-2xl font-bold text-blue-600 dark:text-blue-500 mt-1">{formatCurrency(totalNotasFiscais)}</h3>
          <p className="text-slate-500 dark:text-slate-500 text-xs mt-2.5">Média por mês: {formatCurrency(mediaNotasFiscaisPorMes)}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 lg:p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors flex flex-col items-center">
          <p className="text-slate-500 dark:text-slate-400 text-xs lg:text-sm font-medium mb-1">Consumo do contrato (NFs)</p>
          <div className="relative w-full flex-1 min-h-[200px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height={200}>
              <RadialBarChart
                cx="50%"
                cy="50%"
                innerRadius="60%"
                outerRadius="85%"
                barSize={14}
                data={radialProgressData}
                startAngle={90}
                endAngle={overflowPercent > 0 ? 90 - 360 - (overflowPercent / 100) * 360 : -270}
              >
                <PolarAngleAxis
                  type="number"
                  domain={overflowPercent > 0 ? [0, 100 + overflowPercent] : [0, 100]}
                  tick={false}
                />
                <RadialBar background dataKey="value" cornerRadius={6} stackId="consumo" />
              </RadialBarChart>
            </ResponsiveContainer>
            <span className={`absolute inset-0 flex items-center justify-center text-2xl font-bold pointer-events-none ${overflowPercent > 0 ? 'text-red-600 dark:text-red-500' : 'text-emerald-600 dark:text-emerald-500'}`}>
              {consumoPercentRaw.toFixed(0)}%
            </span>
          </div>
          <p className={`mt-2 px-3 py-2 rounded-lg text-sm font-semibold text-center ${overflowPercent > 0 ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'}`}>
            Saldo Contratual: {formatCurrency(restanteContratoMenosNFs)}
          </p>
        </div>

        

        <div className="bg-white dark:bg-slate-900 p-4 lg:p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors flex flex-col items-center justify-center text-center">
          <p className="text-slate-500 dark:text-slate-400 text-xs lg:text-sm font-medium">Total Pago (Extrato de Empenhos)</p>
          <h3 className="text-xl lg:text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{formatCurrency(totalPaid)}</h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1.5">Ordens bancárias: {formatCurrency(totalFromOBs)}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 lg:p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors flex flex-col items-center justify-center text-center">
          <p className="text-slate-500 dark:text-slate-400 text-xs lg:text-sm font-medium">Restante a Pagar</p>
          <h3 className="text-xl lg:text-2xl font-bold text-red-600 dark:text-amber-500 mt-1">{formatCurrency(remainingToPay)}</h3>
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
            <ComposedChart data={chartEvolutionData}>
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
                name="Somatório das Notas Fiscais"
                stroke="#f97316"
                strokeWidth={1}
                dot={{ r: 2, fill: '#f97316' }}
                activeDot={{ r: 6 }}
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

              <ReferenceDot
                x="Estimado"
                y={valorEstimadoMes}
                r={8}
                fill="#ccc"
                stroke="#ccc"
                strokeWidth={2}
                label={{ value: formatCurrency(valorEstimadoMes), position: 'left', fontSize: 10, fill: axisColor }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Solicitações e Aprovações (Regulação) – só quando um contrato estiver selecionado */}
      {filterContract !== 'all' && useSupabase && nomeUnidadeExecutante && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Solicitações e Aprovações (Regulação)</h4>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <label className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <span>Ano:</span>
                <select
                  value={filterRegulacaoYear}
                  onChange={(e) => setFilterRegulacaoYear(e.target.value)}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 px-2 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {[new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2].map(y => (
                    <option key={y} value={String(y)}>{y}</option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <span>Mês:</span>
                <select
                  value={filterRegulacaoMonth}
                  onChange={(e) => setFilterRegulacaoMonth(e.target.value)}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 px-2 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="all">Todos</option>
                  {MONTHS.map((m, idx) => (
                    <option key={idx} value={String(idx + 1)}>{m}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          <div className="flex flex-col lg:flex-row gap-6 items-stretch">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors max-w-3xl w-full">
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Unidade: {nomeUnidadeExecutante}</p>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={regulacaoChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: axisColor }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: axisColor }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '12px',
                        border: 'none',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        fontSize: '12px',
                        backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                        color: isDarkMode ? '#f8fafc' : '#1e293b',
                      }}
                    />
                    <Legend iconType="circle" />
                    <Line type="monotone" dataKey="solicitacoes" name="Solicitações" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="aprovacoes" name="Aprovações" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="flex flex-col gap-6 min-w-0 lg:min-w-[320px]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors flex flex-col justify-center">
                  <p className="text-slate-500 dark:text-slate-400 text-xs lg:text-sm font-medium">Registros aprovados no período</p>
                  <h3 className="text-2xl lg:text-3xl font-bold text-emerald-600 dark:text-emerald-500 mt-2">{totalAprovadosNoPeriodo}</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    {filterRegulacaoMonth === 'all' ? `Ano ${filterRegulacaoYear}` : `${MONTHS[parseInt(filterRegulacaoMonth, 10) - 1]} ${filterRegulacaoYear}`}
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors flex flex-col justify-center">
                  <p className="text-slate-500 dark:text-slate-400 text-xs lg:text-sm font-medium">Valor estimado para o mês</p>
                  <h3 className="text-2xl lg:text-3xl font-bold text-blue-600 dark:text-blue-500 mt-2">{formatCurrency(valorEstimadoMes)}</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    Soma dos procedimentos (Qtd. × Preço unitário mock)
                  </p>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors overflow-hidden">
                <p className="text-slate-600 dark:text-slate-300 text-sm font-semibold mb-3">Procedimento × Aprovações</p>
                <div className="overflow-x-auto max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/95 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                      <tr>
                        <th className="py-2 pr-2 font-semibold">Procedimento</th>
                        <th className="py-2 px-2 font-semibold text-right whitespace-nowrap">Qtd.</th>
                        <th className="py-2 px-2 font-semibold text-right whitespace-nowrap">Preço Unitário</th>
                        <th className="py-2 pl-2 font-semibold text-right whitespace-nowrap">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {tabelaProcedimentosPorAprovacoes.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-4 text-slate-400 dark:text-slate-500 text-center text-xs">
                            Nenhuma aprovação no período
                          </td>
                        </tr>
                      ) : (
                        tabelaProcedimentosPorAprovacoes.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="py-2 pr-2 text-slate-700 dark:text-slate-200" title={row.procedimento}>
                              <span className="line-clamp-2">{row.procedimento}</span>
                            </td>
                            <td className="py-2 px-2 text-right font-medium text-slate-800 dark:text-slate-100 whitespace-nowrap">
                              {row.quantidade}
                            </td>
                            <td className="py-2 px-2 text-right text-slate-600 dark:text-slate-300 whitespace-nowrap">
                              {formatCurrency(row.precoUnitario)}
                            </td>
                            <td className="py-2 pl-2 text-right font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                              {formatCurrency(row.total)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Seção de gráficos por fonte com botão Ocultar/Ver */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Gráficos por fonte</h3>
          <button
            type="button"
            onClick={() => setShowCharts(!showCharts)}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
            aria-expanded={showCharts}
          >
            {showCharts ? 'Ocultar gráficos' : 'Ver gráficos'}
          </button>
        </div>

        {showCharts && (
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
        )}
      </div>

      {/* Summary Table Section (também controlada pelo botão Ocultar/Ver gráficos) */}
      {filterContract !== 'all' && showCharts && (
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
