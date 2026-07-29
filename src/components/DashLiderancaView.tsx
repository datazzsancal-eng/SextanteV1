import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Calendar, 
  TrendingUp, 
  DollarSign, 
  Clock, 
  Users, 
  Layers, 
  Download, 
  RefreshCw, 
  ChevronDown, 
  ChevronRight, 
  X,
  Award,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  Bell,
  ClipboardList,
  AlertTriangle,
  Briefcase
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// Helper to compute formatted grupo_raiz from PJ/PF documents
function getGrupoRaiz(tipoPessoa: string, documento: string): string {
  if (!documento) return 'N/A';
  const cleanDoc = documento.replace(/\D/g, '');
  if (tipoPessoa === 'PJ') {
    if (cleanDoc.length >= 8) {
      return `${cleanDoc.substring(0, 2)}.${cleanDoc.substring(2, 5)}.${cleanDoc.substring(5, 8)}`;
    }
  } else {
    if (cleanDoc.length >= 9) {
      const p1 = cleanDoc.substring(0, 3);
      const p2 = cleanDoc.substring(3, 6);
      const p3 = cleanDoc.substring(6, 9);
      const p4 = cleanDoc.substring(9, 11);
      return `${p1}.${p2}.${p3}${p4 ? '-' + p4 : ''}`;
    }
  }
  return cleanDoc;
}

// Convert month number to Portuguese abbreviation
const getMonthAbbrUpper = (m: number) => {
  const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  return months[(m - 1) % 12] || '';
};

// Format seconds to standard hh:mm:ss
function formatSecondsToHms(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

interface DashLiderancaViewProps {
  isExecutiveView?: boolean;
  toggleExecutiveView?: () => void;
}

export default function DashLiderancaView({ isExecutiveView = false, toggleExecutiveView }: DashLiderancaViewProps = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [apontamentosData, setApontamentosData] = useState<any[]>([]);
  const [honorariosData, setHonorariosData] = useState<any[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Period ranges selection
  const [startPeriod, setStartPeriod] = useState<string>('');
  const [endPeriod, setEndPeriod] = useState<string>('');
  const [availablePeriods, setAvailablePeriods] = useState<{ value: string; label: string }[]>([]);

  // Search and view state
  const [hoursViewMode, setHoursViewMode] = useState<'cliente' | 'grupo'>('cliente');
  const [tempoCliSearchTerm, setTempoCliSearchTerm] = useState<string>('');
  
  // Sorting states
  const [tempoCliSortField, setTempoCliSortField] = useState<'cliente_nome' | 'grupo_raiz' | 'cliente_codigo' | 'total_segundos' | 'valor_lacto'>('total_segundos');
  const [tempoCliSortAsc, setTempoCliSortAsc] = useState<boolean>(false);

  // Nested expansion sets
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedGroupDepts, setExpandedGroupDepts] = useState<Set<string>>(new Set());

  // Previous year comparison metrics
  const [prevDistinctClients, setPrevDistinctClients] = useState<number | null>(null);
  const [prevTotalValorLacto, setPrevTotalValorLacto] = useState<number | null>(null);
  const [prevTotalSeconds, setPrevTotalSeconds] = useState<number | null>(null);
  const [isLoadingPrevMetrics, setIsLoadingPrevMetrics] = useState(false);

  // Drilldown Modal
  const [selectedClientDetail, setSelectedClientDetail] = useState<any | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [modalDetails, setModalDetails] = useState<any[]>([]);
  const [isModalLoading, setIsModalLoading] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // 12-Month Chart States
  const [hoursHistoryData, setHoursHistoryData] = useState<{ label: string; value: number; hms: string; active: boolean }[]>([]);
  const [isLoadingChart, setIsLoadingChart] = useState<boolean>(false);

  // Selected client IDs for filtering cards and charts
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());

  // Discover period options
  useEffect(() => {
    const discoverPeriods = async () => {
      if (isSupabaseConfigured && supabase) {
        try {
          const periodsSet = new Set<string>();

          // Fetch from viw_resumo_hora_mes first, which is extremely lightweight and pre-aggregated by month
          const { data, error } = await supabase
            .from('viw_resumo_hora_mes')
            .select('ano, mes');

          if (!error && data) {
            data.forEach((row: any) => {
              if (row.ano && row.mes) {
                periodsSet.add(`${row.ano}-${String(row.mes).padStart(2, '0')}`);
              }
            });
          }

          // Fallback 1: Try the pre-aggregated vw_apontamento_mensal_resumo view with depto_calcula_sn = true
          if (periodsSet.size === 0) {
            let { data: altData, error: altError } = await supabase
              .from('vw_apontamento_mensal_resumo')
              .select('aponta_ano, aponta_mes')
              .eq('depto_calcula_sn', true);
            
            if (!altError && altData) {
              altData.forEach((row: any) => {
                if (row.aponta_ano && row.aponta_mes) {
                  periodsSet.add(`${row.aponta_ano}-${String(row.aponta_mes).padStart(2, '0')}`);
                }
              });
            }
          }
          
          if (periodsSet.size > 0) {
            const sortedPeriods = Array.from(periodsSet)
              .sort()
              .reverse()
              .map(p => {
                const [year, month] = p.split('-');
                return {
                  value: p,
                  label: `${getMonthAbbrUpper(parseInt(month))}/${year}`
                };
              });

            setAvailablePeriods(sortedPeriods);
            
            if (sortedPeriods.length > 0) {
              // Select the latest months by default
              setStartPeriod(sortedPeriods[Math.min(2, sortedPeriods.length - 1)].value);
              setEndPeriod(sortedPeriods[0].value);
            }
          } else {
            // Fallback mockup
            const fallback = [
              { value: '2025-02', label: 'FEV/2025' },
              { value: '2025-01', label: 'JAN/2025' },
              { value: '2024-12', label: 'DEZ/2024' },
              { value: '2024-11', label: 'NOV/2024' }
            ];
            setAvailablePeriods(fallback);
            setStartPeriod('2024-12');
            setEndPeriod('2025-02');
          }
        } catch (err) {
          console.error('Error finding periods:', err);
          const fallback = [
            { value: '2025-02', label: 'FEV/2025' },
            { value: '2025-01', label: 'JAN/2025' },
            { value: '2024-12', label: 'DEZ/2024' },
            { value: '2024-11', label: 'NOV/2024' }
          ];
          setAvailablePeriods(fallback);
          setStartPeriod('2024-12');
          setEndPeriod('2025-02');
        }
      } else {
        // Fallback mockup
        const fallback = [
          { value: '2025-02', label: 'FEV/2025' },
          { value: '2025-01', label: 'JAN/2025' },
          { value: '2024-12', label: 'DEZ/2024' },
          { value: '2024-11', label: 'NOV/2024' }
        ];
        setAvailablePeriods(fallback);
        setStartPeriod('2024-12');
        setEndPeriod('2025-02');
      }
    };
    discoverPeriods();
  }, []);

  // Selected periods list
  const periodsInInterval = useMemo(() => {
    if (!startPeriod || !endPeriod) return [];
    let start = startPeriod;
    let end = endPeriod;
    if (start > end) {
      start = endPeriod;
      end = startPeriod;
    }

    const list: string[] = [];
    const [startY, startM] = start.split('-').map(Number);
    const [endY, endM] = end.split('-').map(Number);

    if (isNaN(startY) || isNaN(startM) || isNaN(endY) || isNaN(endM)) {
      return [];
    }

    let curY = startY;
    let curM = startM;

    while (curY < endY || (curY === endY && curM <= endM)) {
      list.push(`${curY}-${String(curM).padStart(2, '0')}`);
      curM++;
      if (curM > 12) {
        curM = 1;
        curY++;
      }
    }
    return list;
  }, [startPeriod, endPeriod]);

  // Previous year intervals matching current ones
  const prevYearPeriodsInInterval = useMemo(() => {
    return periodsInInterval.map(p => {
      const [y, m] = p.split('-');
      return `${parseInt(y) - 1}-${m}`;
    }).filter(p => {
      const [y, m] = p.split('-');
      const year = parseInt(y);
      const month = parseInt(m);
      return !isNaN(year) && !isNaN(month);
    });
  }, [periodsInInterval]);

  // Max hours value for chart vertical scaling
  const maxHoursVal = useMemo(() => {
    return Math.max(...hoursHistoryData.map(d => d.value), 3600);
  }, [hoursHistoryData]);

  // Fetch historical 12-month chart data (Acompanhamento de Horas) from viw_resumo_hora_mes
  useEffect(() => {
    const fetchChartData = async () => {
      // Determine the 12 months ending in the currently selected period (or the latest month)
      let refPeriod = endPeriod;
      if (!refPeriod) {
        refPeriod = availablePeriods.length > 0 ? availablePeriods[0].value : '';
      }
      if (!refPeriod) {
        setHoursHistoryData([]);
        return;
      }
      
      const [yearStr, monthStr] = refPeriod.split('-');
      const year = parseInt(yearStr);
      const month = parseInt(monthStr);
      
      const targets: string[] = [];
      for (let i = 11; i >= 0; i--) {
        let m = month - i;
        let y = year;
        if (m <= 0) {
          m = 12 + m;
          y = year - 1;
        }
        targets.push(`${y}-${String(m).padStart(2, '0')}`);
      }

      if (isSupabaseConfigured && supabase) {
        setIsLoadingChart(true);
        try {
          const aggMap: Record<string, number> = {};
          targets.forEach(t => { 
            aggMap[t] = 0; 
          });

          let allChartFetched: any[] = [];
          let hasMore = true;
          let page = 0;
          const pageSize = 1000;

          while (hasMore) {
            let query = supabase
              .from('vw_apontamento_mensal_resumo')
              .select('empresa_id, aponta_ano, aponta_mes, aponta_qtde_segundos')
              .eq('depto_calcula_sn', true);

            const targetPeriods = targets.map(t => {
              const [y, m] = t.split('-');
              return { ano: parseInt(y), mes: parseInt(m) };
            });
            const orCond = targetPeriods.map(p => `and(aponta_ano.eq.${p.ano},aponta_mes.eq.${p.mes})`).join(',');
            if (orCond) {
              query = query.or(orCond);
            }

            if (selectedClientIds.size > 0) {
              query = query.in('empresa_id', Array.from(selectedClientIds));
            }

            const { data, error } = await query.range(page * pageSize, (page + 1) * pageSize - 1);
            if (error) throw error;

            if (data && data.length > 0) {
              allChartFetched = [...allChartFetched, ...data];
              if (data.length < pageSize || allChartFetched.length > 50000) {
                hasMore = false;
              }
            } else {
              hasMore = false;
            }
            page++;
          }

          allChartFetched.forEach((row: any) => {
            const pKey = `${row.aponta_ano}-${String(row.aponta_mes).padStart(2, '0')}`;
            if (pKey in aggMap) {
              aggMap[pKey] += row.aponta_qtde_segundos || 0;
            }
          });

          const formattedChart = targets.map((t) => {
            const [yStr, mStr] = t.split('-');
            const mNum = parseInt(mStr);
            const label = `${getMonthAbbrUpper(mNum)}/${yStr.slice(-2)}`;
            const totalSecs = aggMap[t] || 0;
            const hmsValue = formatSecondsToHms(totalSecs);
            return {
              label,
              value: totalSecs,
              hms: hmsValue,
              active: periodsInInterval.includes(t)
            };
          });

          setHoursHistoryData(formattedChart);
        } catch (err) {
          console.error('Error fetching historical chart hours:', err);
        } finally {
          setIsLoadingChart(false);
        }
      } else {
        setHoursHistoryData([]);
      }
    };

    fetchChartData();
  }, [startPeriod, endPeriod, periodsInInterval, availablePeriods, refreshTrigger, selectedClientIds]);

  // Fetch current period data & honorarios from database
  useEffect(() => {
    const fetchData = async () => {
      if (periodsInInterval.length === 0) return;
      setIsLoading(true);
      setErrorMsg(null);

      if (isSupabaseConfigured && supabase) {
        try {
          const periodsInt = periodsInInterval.map(p => {
            const [y, m] = p.split('-');
            return { ano: parseInt(y), mes: parseInt(m) };
          });

          // Fetch primary data page by page from vw_apontamento_mensal_resumo
          let allFetched: any[] = [];
          let hasMore = true;
          let page = 0;
          const pageSize = 1000;

          while (hasMore) {
            let query = supabase.from('vw_apontamento_mensal_resumo')
              .select('*')
              .eq('depto_calcula_sn', true);

            if (periodsInt.length === 1) {
              query = query.eq('aponta_ano', periodsInt[0].ano).eq('aponta_mes', periodsInt[0].mes);
            } else {
              const orCond = periodsInt.map(p => `and(aponta_ano.eq.${p.ano},aponta_mes.eq.${p.mes})`).join(',');
              if (orCond) query = query.or(orCond);
            }

            const { data, error } = await query.range(page * pageSize, (page + 1) * pageSize - 1);
            if (error) throw error;

            if (data && data.length > 0) {
              const mappedData = data.map((row: any) => ({
                id: `${row.empresa_id}-${row.depto_id}-${row.aponta_ano}-${row.aponta_mes}`,
                grupo_id: row.grupo_id,
                grupo_nome: row.grupo_nome,
                cliente_id: row.empresa_id,
                codigo: row.empresa_codigo,
                tipo_pessoa: row.empresa_tp_pessoa || 'PJ',
                nome: row.empresa_nome,
                documento: row.empresa_documento,
                tipo_trib: row.empresa_tp_trib,
                usuario_id: null,
                nome_colab: null,
                colaborador_id: null,
                tarefa_id: null,
                tarefa: 'GERAL',
                departamento_id: row.depto_id,
                departamento: row.depto_nome,
                depto_calcula_sn: row.depto_calcula_sn,
                data_apontamento: `${row.aponta_ano}-${String(row.aponta_mes).padStart(2, '0')}-01`,
                ano: row.aponta_ano,
                mes: row.aponta_mes,
                qtde_segundos: row.aponta_qtde_segundos || 0,
                qtde_horas: row.aponta_qtde_horas || 0,
                tempo_horas: row.aponta_tempo_horas || '00:00:00',
                valor_hora: row.aponta_qtde_horas ? (row.aponta_valor_lancamento / row.aponta_qtde_horas) : 0,
                valor_lancamento: row.aponta_valor_lancamento || 0,
                carregado_em: null
              }));

              allFetched = [...allFetched, ...mappedData];
              if (data.length < pageSize || allFetched.length > 50000) {
                hasMore = false;
              }
            } else {
              hasMore = false;
            }
            page++;
          }
          setApontamentosData(allFetched);

          // Fetch monthly honorarios from viw_acomp_honor_mensal
          let honorList: any[] = [];
          const honPeriodsInt = periodsInInterval.map(p => {
            const [y, m] = p.split('-');
            return parseInt(`${y}${String(m).padStart(2, '0')}`);
          });

          let honPage = 0;
          const honPageSize = 1000;
          let honHasMore = true;

          while (honHasMore) {
            let queryHon = supabase.from('viw_acomp_honor_mensal').select('grupo_raiz, cli_codigo, hnr_valor, hnr_periodo_int');
            if (honPeriodsInt.length === 1) {
              queryHon = queryHon.eq('hnr_periodo_int', honPeriodsInt[0]);
            } else if (honPeriodsInt.length > 1) {
              queryHon = queryHon.in('hnr_periodo_int', honPeriodsInt);
            }

            const { data: honData, error: honError } = await queryHon.range(honPage * honPageSize, (honPage + 1) * honPageSize - 1);
            if (honError) {
              console.error('Error fetching honorarios:', honError);
              break;
            }

            if (honData && honData.length > 0) {
              honorList = [...honorList, ...honData];
              if (honData.length < honPageSize) honHasMore = false;
            } else {
              honHasMore = false;
            }
            honPage++;
          }
          setHonorariosData(honorList);

        } catch (err: any) {
          console.error('Error fetching dashboard data details:', err, err?.message, err?.details, err?.hint);
          setErrorMsg(err?.message || 'Erro ao sincronizar informações.');
        } finally {
          setIsLoading(false);
        }
      } else {
        // Offline mockup generator
        setTimeout(() => {
          const generated: any[] = [];
          periodsInInterval.forEach(p => {
            const [y, m] = p.split('-').map(Number);
            for (let i = 0; i < 60; i++) {
              const segs = Math.floor(3600 + Math.random() * 18000);
              const hrs = parseFloat((segs / 3600).toFixed(4));
              const doc = `03881553000${(i % 5) + 1}99`;
              generated.push({
                id: `mock-${y}-${m}-${i}`,
                grupo_id: i % 3 === 0 ? 'g-1' : null,
                grupo_nome: i % 3 === 0 ? 'GRUPO COMERCIAL SCHAEFER' : null,
                cliente_id: `cli-${i % 10}`,
                codigo: String(100 + (i % 10)),
                tipo_pessoa: 'PJ',
                nome: `CLIENTE CORPORATIVO ${(i % 10) + 1}`,
                documento: doc,
                tipo_trib: 'Lucro Presumido',
                usuario_id: `colab-${i % 4}`,
                nome_colab: `COLABORADOR EXECUTIVO ${(i % 4) + 1}`,
                tarefa_id: `task-${i % 5}`,
                tarefa: `AUDITORIA E CONSULTORIA ${(i % 5) + 1}`,
                departamento_id: `dept-${i % 3}`,
                departamento: i % 3 === 0 ? 'CONTÁBIL' : i % 3 === 1 ? 'FISCAL' : 'DEPARTAMENTO PESSOAL',
                data_apontamento: `${y}-${String(m).padStart(2, '0')}-${String(1 + Math.floor(Math.random() * 28)).padStart(2, '0')}`,
                ano: y,
                mes: m,
                qtde_segundos: segs,
                qtde_horas: hrs,
                valor_hora: 150,
                valor_lancamento: parseFloat((hrs * 150).toFixed(2)),
                carregado_em: new Date().toISOString()
              });
            }
          });
          setApontamentosData(generated);

          // Mock honorarios matching the generated documents
          const hList: any[] = [];
          periodsInInterval.forEach(p => {
            const [y, m] = p.split('-').map(Number);
            const pInt = parseInt(`${y}${String(m).padStart(2, '0')}`);
            for (let i = 0; i < 10; i++) {
              const doc = `03881553000${(i % 5) + 1}99`;
              hList.push({
                grupo_raiz: getGrupoRaiz('PJ', doc),
                cli_codigo: String(100 + i),
                hnr_valor: 1500 + (i * 200),
                hnr_periodo_int: pInt
              });
            }
          });
          setHonorariosData(hList);
          setIsLoading(false);
        }, 500);
      }
    };
    fetchData();
  }, [periodsInInterval, refreshTrigger]);

  // Fetch previous year data dynamically for KPI comparisons
  useEffect(() => {
    const fetchPreviousYearMetrics = async () => {
      const validPrevPeriods = prevYearPeriodsInInterval.filter(p => {
        const [y, m] = p.split('-');
        const year = parseInt(y);
        const month = parseInt(m);
        return !isNaN(year) && !isNaN(month);
      });

      if (!isSupabaseConfigured || !supabase || validPrevPeriods.length === 0) {
        setPrevDistinctClients(null);
        setPrevTotalValorLacto(null);
        setPrevTotalSeconds(null);
        return;
      }

      setIsLoadingPrevMetrics(true);
      try {
        let prevData: any[] = [];
        const periodsInt = validPrevPeriods.map(p => {
          const [y, m] = p.split('-');
          return { ano: parseInt(y), mes: parseInt(m) };
        });

        let page = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
          let query = supabase.from('vw_apontamento_mensal_resumo')
            .select('empresa_id, empresa_nome, aponta_qtde_segundos, aponta_valor_lancamento')
            .eq('depto_calcula_sn', true);

          if (periodsInt.length === 1) {
            query = query.eq('aponta_ano', periodsInt[0].ano).eq('aponta_mes', periodsInt[0].mes);
          } else {
            const orCond = periodsInt.map(p => `and(aponta_ano.eq.${p.ano},aponta_mes.eq.${p.mes})`).join(',');
            if (orCond) query = query.or(orCond);
          }

          const { data, error } = await query.range(page * pageSize, (page + 1) * pageSize - 1);
          if (error) throw error;

          if (data && data.length > 0) {
            const mappedData = data.map((row: any) => ({
              cliente_id: row.empresa_id,
              nome: row.empresa_nome,
              qtde_segundos: row.aponta_qtde_segundos || 0,
              valor_lancamento: row.aponta_valor_lancamento || 0
            }));

            prevData = [...prevData, ...mappedData];
            if (data.length < pageSize || prevData.length > 50000) hasMore = false;
          } else {
            hasMore = false;
          }
          page++;
        }

        const uniqueClients = new Set<string>();
        let sumValue = 0;
        let sumSeconds = 0;

        prevData.forEach((row: any) => {
          if (selectedClientIds.size > 0 && (!row.cliente_id || !selectedClientIds.has(row.cliente_id))) {
            return;
          }
          if (row.cliente_id) {
            uniqueClients.add(row.cliente_id);
          }
          sumValue += Number(row.valor_lancamento || 0);
          sumSeconds += Number(row.qtde_segundos || 0);
        });

        setPrevDistinctClients(uniqueClients.size);
        setPrevTotalValorLacto(sumValue);
        setPrevTotalSeconds(sumSeconds);

      } catch (err) {
        console.error('Error fetching previous year metrics:', err);
        setPrevDistinctClients(0);
        setPrevTotalValorLacto(0);
        setPrevTotalSeconds(0);
      } finally {
        setIsLoadingPrevMetrics(false);
      }
    };
    fetchPreviousYearMetrics();
  }, [prevYearPeriodsInInterval, refreshTrigger, selectedClientIds]);

  // Aggregate current metrics
  const currentMetrics = useMemo(() => {
    const distinctClients = new Set<string>();
    let totalSeconds = 0;
    let totalValorLacto = 0;

    apontamentosData.forEach(item => {
      if (selectedClientIds.size > 0 && (!item.cliente_id || !selectedClientIds.has(item.cliente_id))) {
        return;
      }
      if (item.cliente_id) distinctClients.add(item.cliente_id);
      totalSeconds += (item.qtde_segundos || 0);
      totalValorLacto += (item.valor_lancamento || 0);
    });

    return {
      distinctClients: distinctClients.size,
      totalSeconds,
      totalValorLacto
    };
  }, [apontamentosData, selectedClientIds]);

  // Pre-aggregate honorarios by client code / group_raiz
  const honorariosByGrupoRaiz = useMemo(() => {
    const map = new Map<string, number>();
    honorariosData.forEach(item => {
      const key = item.grupo_raiz || '';
      if (key) {
        map.set(key, (map.get(key) || 0) + (item.hnr_valor || 0));
      }
    });
    return map;
  }, [honorariosData]);

  // Pre-aggregate honorarios by group name
  const honorariosByGrupoCliente = useMemo(() => {
    const groupMap = new Map<string, number>();
    
    // Create mapping of client group_raiz to group_nome from current data
    const raizToGroupMap = new Map<string, string>();
    apontamentosData.forEach(row => {
      const gRaiz = getGrupoRaiz(row.tipo_pessoa || 'PJ', row.documento || '');
      const grpName = row.grupo_nome || 'Sem Grupo';
      if (gRaiz && grpName) {
        raizToGroupMap.set(gRaiz, grpName);
      }
    });

    honorariosData.forEach(item => {
      const raiz = item.grupo_raiz || '';
      const grpName = raizToGroupMap.get(raiz) || 'Sem Grupo';
      groupMap.set(grpName, (groupMap.get(grpName) || 0) + (item.hnr_valor || 0));
    });

    return groupMap;
  }, [apontamentosData, honorariosData]);

  // Aggregate current data by unique clients
  const tempoCliData = useMemo(() => {
    const groupedMap = new Map<string, any>();
    
    apontamentosData.forEach(item => {
      const clientId = item.cliente_id || item.nome || 'Sem ID';
      const clientName = item.nome || 'Sem Nome';
      const gRaiz = getGrupoRaiz(item.tipo_pessoa || 'PJ', item.documento || '');
      
      if (!groupedMap.has(clientId)) {
        groupedMap.set(clientId, {
          cliente_id: item.cliente_id,
          grupo_raiz: gRaiz,
          cliente_nome: clientName,
          tipo_pessoa: item.tipo_pessoa || 'PJ',
          cliente_ativo: true,
          grupo_cliente_nome: item.grupo_nome || null,
          cliente_codigo: item.codigo || 'S/C',
          total_segundos: 0,
          valor_lacto: 0,
        });
      }
      
      const current = groupedMap.get(clientId);
      current.total_segundos += (item.qtde_segundos || 0);
      current.valor_lacto += (item.valor_lancamento || 0);
    });

    return Array.from(groupedMap.values());
  }, [apontamentosData]);

  // Compute rankings/scores dynamically (Score format: Position Hours/Position Value)
  const clientRankings = useMemo(() => {
    const sortedBySeconds = [...tempoCliData].sort((a, b) => (b.total_segundos || 0) - (a.total_segundos || 0));
    const sortedByValor = [...tempoCliData].sort((a, b) => (b.valor_lacto || 0) - (a.valor_lacto || 0));

    const secondsRankMap = new Map<string, number>();
    const valorRankMap = new Map<string, number>();

    sortedBySeconds.forEach((item, index) => {
      secondsRankMap.set(item.cliente_nome, index + 1);
    });
    sortedByValor.forEach((item, index) => {
      valorRankMap.set(item.cliente_nome, index + 1);
    });

    return { secondsRankMap, valorRankMap };
  }, [tempoCliData]);

  // Client Filter & Search
  const filteredTempoCli = useMemo(() => {
    let result = [...tempoCliData];
    
    if (tempoCliSearchTerm.trim() !== '') {
      const search = tempoCliSearchTerm.toLowerCase().trim();
      result = result.filter(row => 
        (row.cliente_nome && row.cliente_nome.toLowerCase().includes(search)) ||
        (row.grupo_raiz && row.grupo_raiz.toLowerCase().includes(search)) ||
        (row.grupo_cliente_nome && row.grupo_cliente_nome.toLowerCase().includes(search))
      );
    }

    // Sort according to selected headers
    result.sort((a, b) => {
      let valA: any = a[tempoCliSortField];
      let valB: any = b[tempoCliSortField];

      if (valA === undefined || valA === null) return tempoCliSortAsc ? 1 : -1;
      if (valB === undefined || valB === null) return tempoCliSortAsc ? -1 : 1;

      if (typeof valA === 'string' && typeof valB === 'string') {
        return tempoCliSortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else {
        const numA = Number(valA);
        const numB = Number(valB);
        return tempoCliSortAsc ? (numA - numB) : (numB - numA);
      }
    });

    return result;
  }, [tempoCliData, tempoCliSearchTerm, tempoCliSortField, tempoCliSortAsc]);

  // Group-level aggregation
  const filteredGroupsData = useMemo(() => {
    const map = new Map<string, {
      grupo_cliente_nome: string;
      tempo_segundos: number;
      valor_lacto: number;
      clientes: any[];
    }>();

    filteredTempoCli.forEach(cli => {
      const groupName = cli.grupo_cliente_nome || 'Sem Grupo';
      if (!map.has(groupName)) {
        map.set(groupName, {
          grupo_cliente_nome: groupName,
          tempo_segundos: 0,
          valor_lacto: 0,
          clientes: []
        });
      }
      const g = map.get(groupName)!;
      g.tempo_segundos += cli.total_segundos || 0;
      g.valor_lacto += cli.valor_lacto || 0;
      g.clientes.push(cli);
    });

    return Array.from(map.values()).sort((a, b) => b.tempo_segundos - a.tempo_segundos);
  }, [filteredTempoCli]);

  // Group Rankings
  const groupRankings = useMemo(() => {
    const sortedBySeconds = [...filteredGroupsData].sort((a, b) => b.tempo_segundos - a.tempo_segundos);
    const sortedByValor = [...filteredGroupsData].sort((a, b) => b.valor_lacto - a.valor_lacto);

    const secondsRankMap = new Map<string, number>();
    const valorRankMap = new Map<string, number>();

    sortedBySeconds.forEach((g, index) => {
      secondsRankMap.set(g.grupo_cliente_nome, index + 1);
    });
    sortedByValor.forEach((g, index) => {
      valorRankMap.set(g.grupo_cliente_nome, index + 1);
    });

    return { secondsRankMap, valorRankMap };
  }, [filteredGroupsData]);

  // Client Department details (calculated instantly in memory from raw data)
  const getClientDeptData = (clientName: string) => {
    const map = new Map<string, { setor: string; total_segundos: number; valor_lacto: number }>();
    const clientRecords = apontamentosData.filter(item => item.nome === clientName);
    
    clientRecords.forEach(row => {
      const dept = row.departamento || 'SEM DEPARTAMENTO';
      if (!map.has(dept)) {
        map.set(dept, { setor: dept, total_segundos: 0, valor_lacto: 0 });
      }
      const current = map.get(dept)!;
      current.total_segundos += (row.qtde_segundos || 0);
      current.valor_lacto += (row.valor_lancamento || 0);
    });

    return Array.from(map.values()).sort((a, b) => b.total_segundos - a.total_segundos);
  };

  // Group Department details (calculated instantly in memory from raw data)
  const getGroupDeptData = (groupName: string) => {
    const map = new Map<string, { setor: string; tempo_segundos: number; valor_lacto: number; clientes: any[] }>();
    const groupRecords = apontamentosData.filter(row => (row.grupo_nome || 'Sem Grupo') === groupName);

    groupRecords.forEach(row => {
      const dept = row.departamento || 'SEM DEPARTAMENTO';
      if (!map.has(dept)) {
        map.set(dept, { setor: dept, tempo_segundos: 0, valor_lacto: 0, clientes: [] });
      }
      const current = map.get(dept)!;
      current.tempo_segundos += (row.qtde_segundos || 0);
      current.valor_lacto += (row.valor_lancamento || 0);

      // Unique clients in department
      if (!current.clientes.some((c: any) => c.cliente_nome === row.nome)) {
        current.clientes.push({
          cliente_nome: row.nome || 'Sem Nome',
          tempo_segundos: groupRecords.filter(r => r.nome === row.nome && r.departamento === dept).reduce((acc, curr) => acc + (curr.qtde_segundos || 0), 0),
          valor_lacto: groupRecords.filter(r => r.nome === row.nome && r.departamento === dept).reduce((acc, curr) => acc + (curr.valor_lancamento || 0), 0)
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.tempo_segundos - a.tempo_segundos);
  };

  // Hierarchy calculations for selected client drilldown modal using vw_apontamento_mensal_detalhe
  const hierarchicallyGroupedDetails = useMemo(() => {
    if (!selectedClientDetail) return { departments: {}, total_hours: 0, total_valor_lacto: 0 };
    
    let total_hours = 0;
    let total_valor_lacto = 0;
    const departments: Record<string, {
      total_segundos: number;
      valor_lacto: number;
      roles: Record<string, {
        role_nome: string;
        total_segundos: number;
        valor_lacto: number;
        collaborators: Record<string, {
          colaborador_nome: string;
          total_segundos: number;
          valor_lacto: number;
          tasks: Record<string, {
            tarefa_nome: string;
            total_segundos: number;
            valor_lacto: number;
          }>;
        }>;
      }>;
    }> = {};

    const records = modalDetails;
    
    records.forEach(item => {
      const deptName = item.depto_nome || 'SEM DEPARTAMENTO';
      const roleName = item.grp_crg_nome || 'SEM FUNÇÃO';
      const colabName = item.colaborador_nome || 'SEM COLABORADOR';
      const taskName = item.tarefa_nome || 'SEM IDENTIFICAÇÃO';
      const secs = item.aponta_qtde_segundos || 0;
      const val = parseFloat(item.aponta_valor_lancamento) || 0;
      
      total_hours += secs;
      total_valor_lacto += val;
      
      if (!departments[deptName]) {
        departments[deptName] = { total_segundos: 0, valor_lacto: 0, roles: {} };
      }
      departments[deptName].total_segundos += secs;
      departments[deptName].valor_lacto += val;
      
      if (!departments[deptName].roles[roleName]) {
        departments[deptName].roles[roleName] = {
          role_nome: roleName,
          total_segundos: 0,
          valor_lacto: 0,
          collaborators: {}
        };
      }
      departments[deptName].roles[roleName].total_segundos += secs;
      departments[deptName].roles[roleName].valor_lacto += val;

      if (!departments[deptName].roles[roleName].collaborators[colabName]) {
        departments[deptName].roles[roleName].collaborators[colabName] = {
          colaborador_nome: colabName,
          total_segundos: 0,
          valor_lacto: 0,
          tasks: {}
        };
      }
      departments[deptName].roles[roleName].collaborators[colabName].total_segundos += secs;
      departments[deptName].roles[roleName].collaborators[colabName].valor_lacto += val;
      
      if (!departments[deptName].roles[roleName].collaborators[colabName].tasks[taskName]) {
        departments[deptName].roles[roleName].collaborators[colabName].tasks[taskName] = {
          tarefa_nome: taskName,
          total_segundos: 0,
          valor_lacto: 0
        };
      }
      departments[deptName].roles[roleName].collaborators[colabName].tasks[taskName].total_segundos += secs;
      departments[deptName].roles[roleName].collaborators[colabName].tasks[taskName].valor_lacto += val;
    });
    
    return { departments, total_hours, total_valor_lacto };
  }, [selectedClientDetail, modalDetails]);

  // Helper to compute unique collaborators in department
  const getUniqueColabCountForDept = (deptItem: any) => {
    if (!deptItem || !deptItem.roles) return 0;
    const uniq = new Set<string>();
    Object.values(deptItem.roles).forEach((r: any) => {
      Object.keys(r.collaborators).forEach(name => uniq.add(name));
    });
    return uniq.size;
  };

  // Labels for current vs previous comparison
  const { currentLabel, prevLabel } = useMemo(() => {
    if (!startPeriod || !endPeriod) return { currentLabel: 'Nenhum', prevLabel: '--' };
    const [startY, startM] = startPeriod.split('-');
    const [endY, endM] = endPeriod.split('-');

    const formatMonYy = (y: number, m: number) => `${getMonthAbbrUpper(m)}/${String(y).substring(2)}`;
    const currentStartLabel = formatMonYy(parseInt(startY), parseInt(startM));
    const currentEndLabel = formatMonYy(parseInt(endY), parseInt(endM));
    const prevStartLabel = formatMonYy(parseInt(startY) - 1, parseInt(startM));
    const prevEndLabel = formatMonYy(parseInt(endY) - 1, parseInt(endM));

    return {
      currentLabel: currentStartLabel === currentEndLabel ? currentStartLabel : `${currentStartLabel} - ${currentEndLabel}`,
      prevLabel: prevStartLabel === prevEndLabel ? prevStartLabel : `${prevStartLabel} - ${prevEndLabel}`
    };
  }, [startPeriod, endPeriod]);

  // Render comparative metrics
  const renderComparison = (
    currentValue: number,
    prevValue: number | null,
    prevLabelStr: string,
    type: 'number' | 'currency' | 'duration'
  ) => {
    if (prevValue === null || isLoadingPrevMetrics) {
      return (
        <div className="text-[10px] text-brand-text-muted/50 font-bold tracking-wide mt-3 flex items-center gap-1">
          <span>vs {prevLabelStr}: --</span>
        </div>
      );
    }

    const delta = prevValue === 0 ? (currentValue > 0 ? 100 : 0) : ((currentValue - prevValue) / prevValue) * 100;
    const isPositive = delta > 0;
    const isZero = delta === 0;

    let formattedPrev = '';
    if (type === 'number') {
      formattedPrev = String(prevValue);
    } else if (type === 'currency') {
      formattedPrev = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(prevValue);
    } else {
      formattedPrev = formatSecondsToHms(prevValue);
    }

    return (
      <div className="text-[10px] text-brand-text-muted font-bold tracking-wide mt-3 flex items-center justify-between">
        <span>vs {prevLabelStr}: <strong className="text-white font-black">{formattedPrev}</strong></span>
        <span className={`font-mono text-[10px] font-black flex items-center gap-0.5 rounded px-1.5 py-0.5 border ${
          isZero 
            ? 'text-gray-400 bg-gray-500/10 border-gray-500/15' 
            : isPositive 
              ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/15' 
              : 'text-brand-primary bg-brand-primary/10 border-brand-primary/15'
        }`}>
          {isZero ? null : isPositive ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
          {isZero ? '0%' : `${isPositive ? '+' : ''}${delta.toFixed(0)}%`}
        </span>
      </div>
    );
  };

  const handleSortTempoCli = (field: typeof tempoCliSortField) => {
    if (tempoCliSortField === field) {
      setTempoCliSortAsc(!tempoCliSortAsc);
    } else {
      setTempoCliSortField(field);
      setTempoCliSortAsc(false);
    }
  };

  const renderSortIcon = (field: typeof tempoCliSortField) => {
    if (tempoCliSortField !== field) return <ArrowUpDown size={11} className="text-brand-text-muted/30 shrink-0" />;
    return tempoCliSortAsc ? <ArrowUp size={11} className="text-brand-primary shrink-0" /> : <ArrowDown size={11} className="text-brand-primary shrink-0" />;
  };

  const toggleClientExpand = (clientName: string) => {
    const next = new Set(expandedClients);
    if (next.has(clientName)) {
      next.delete(clientName);
    } else {
      next.add(clientName);
    }
    setExpandedClients(next);
  };

  const toggleGroupExpandLocal = (groupName: string) => {
    const next = new Set(expandedGroups);
    if (next.has(groupName)) {
      next.delete(groupName);
    } else {
      next.add(groupName);
    }
    setExpandedGroups(next);
  };

  const toggleGroupDeptExpand = (groupName: string, deptSetor: string) => {
    const key = `${groupName}_${deptSetor}`;
    const next = new Set(expandedGroupDepts);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setExpandedGroupDepts(next);
  };

  const toggleNodeExpression = (nodeKey: string) => {
    const next = new Set(expandedNodes);
    if (next.has(nodeKey)) {
      next.delete(nodeKey);
    } else {
      next.add(nodeKey);
    }
    setExpandedNodes(next);
  };

  const fetchClientDetails = async (clientRow: any) => {
    if (!supabase || !isSupabaseConfigured) {
      setIsModalLoading(true);
      setModalError(null);
      try {
        // Generate mock data for offline mode
        const mockDepts = ['FISCAL', 'CONTÁBIL', 'REGISTRO', 'DP'];
        const mockRoles = [
          'Coordenação de Controladoria',
          'Análise de Planejamento Financeiro',
          'Operações Fiscais',
          'Suporte Administrativo'
        ];
        const mockColabs = [
          'PAMELA LEDUR INÁCIO',
          'JÉSSICA CASTRO DA ROSA',
          'MARIA SILVA',
          'JOÃO SILVA',
          'CARLOS SOUZA'
        ];
        const mockTasks = [
          'ALTERAÇÃO CONTRATUAL ABERTURA DA FILIAL 07.',
          'Lançamento de Notas Fiscais de Entrada e Saída',
          'Apuração de Impostos do Simples Nacional',
          'Conciliação Bancária Mensal',
          'Processamento de Folha de Pagamento'
        ];
        
        const generated: any[] = [];
        const totalSecs = clientRow.total_segundos || 36000;
        let remainingSecs = totalSecs;

        for (let i = 0; i < 8; i++) {
          const dName = mockDepts[i % mockDepts.length];
          const rName = mockRoles[i % mockRoles.length];
          const colabName = mockColabs[i % mockColabs.length];
          const taskName = mockTasks[i % mockTasks.length];
          const share = i === 7 ? remainingSecs : Math.floor(Math.random() * (remainingSecs / 2)) + 1200;
          remainingSecs -= share;
          if (share <= 0) continue;

          generated.push({
            empresa_id: clientRow.cliente_id,
            empresa_nome: clientRow.cliente_nome,
            colaborador_nome: colabName,
            depto_nome: dName,
            grp_crg_nome: rName,
            tarefa_nome: taskName,
            aponta_qtde_segundos: share,
            aponta_valor_lancamento: (share / 3600) * 35.5,
            aponta_ano: 2025,
            aponta_mes: 3
          });
        }
        setModalDetails(generated);
      } catch (err) {
        console.error(err);
      } finally {
        setIsModalLoading(false);
      }
      return;
    }

    setIsModalLoading(true);
    setModalError(null);
    setModalDetails([]);

    try {
      const periodsInt = periodsInInterval.map(p => {
        const [y, m] = p.split('-');
        return { ano: parseInt(y), mes: parseInt(m) };
      });

      let allFetched: any[] = [];
      let hasMore = true;
      let page = 0;
      const pageSize = 1000;

      while (hasMore) {
        let query = supabase.from('vw_apontamento_mensal_detalhe')
          .select('*')
          .eq('depto_calcula_sn', true);

        if (clientRow.cliente_id) {
          query = query.eq('empresa_id', clientRow.cliente_id);
        } else {
          query = query.eq('empresa_nome', clientRow.cliente_nome);
        }

        if (periodsInt.length === 1) {
          query = query.eq('aponta_ano', periodsInt[0].ano).eq('aponta_mes', periodsInt[0].mes);
        } else if (periodsInt.length > 1) {
          const orCond = periodsInt.map(p => `and(aponta_ano.eq.${p.ano},aponta_mes.eq.${p.mes})`).join(',');
          if (orCond) query = query.or(orCond);
        }

        const { data, error } = await query.range(page * pageSize, (page + 1) * pageSize - 1);
        if (error) throw error;

        if (data && data.length > 0) {
          allFetched = [...allFetched, ...data];
          if (data.length < pageSize || allFetched.length > 20000) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
        page++;
      }

      setModalDetails(allFetched);
    } catch (err: any) {
      console.error('Error fetching modal details:', err);
      setModalError(err.message || 'Erro ao carregar detalhes do banco de dados.');
    } finally {
      setIsModalLoading(false);
    }
  };

  const expandAllNodes = (depts: any) => {
    const next = new Set<string>();
    Object.keys(depts).forEach(deptName => {
      const deptKey = `dept:${deptName}`;
      next.add(deptKey);
      const deptItem = depts[deptName];
      Object.keys(deptItem.roles).forEach(roleName => {
        const roleKey = `${deptKey}|role:${roleName}`;
        next.add(roleKey);
        const roleItem = deptItem.roles[roleName];
        Object.keys(roleItem.collaborators).forEach(colabName => {
          next.add(`${roleKey}|colab:${colabName}`);
        });
      });
    });
    setExpandedNodes(next);
  };

  const collapseAllNodes = () => {
    setExpandedNodes(new Set());
  };

  // CSV Exporter mimicking standard CSV exports
  const handleExportCSV = () => {
    try {
      if (apontamentosData.length === 0) return;

      const headers = [
        'ID', 'Código Cliente', 'Cliente Nome', 'Tipo Pessoa', 'Grupo Cliente', 
        'Colaborador Nome', 'Tarefa', 'Departamento', 'Data', 'Ano', 'Mes', 'Segundos', 'Horas Decimais', 'Valor Lançamento (R$)'
      ];

      const csvRows = [headers.join(';')];

      apontamentosData.forEach(row => {
        const line = [
          row.id || '',
          row.codigo || '',
          `"${(row.nome || '').replace(/"/g, '""')}"`,
          row.tipo_pessoa || '',
          `"${(row.grupo_nome || '').replace(/"/g, '""')}"`,
          `"${(row.nome_colab || '').replace(/"/g, '""')}"`,
          `"${(row.tarefa || '').replace(/"/g, '""')}"`,
          `"${(row.departamento || '').replace(/"/g, '""')}"`,
          row.data_apontamento || '',
          row.ano || '',
          row.mes || '',
          row.qtde_segundos || 0,
          row.qtde_horas ? String(row.qtde_horas).replace('.', ',') : '0',
          row.valor_lancamento ? String(row.valor_lancamento).replace('.', ',') : '0'
        ];
        csvRows.push(line.join(';'));
      });

      const csvContent = '\uFEFF' + csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `novo_dash_apontamentos_${startPeriod}_a_${endPeriod}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error exporting CSV:', err);
    }
  };

  const renderHoursChart = () => {
    return (
      <>
        {/* Acompanhamento de Horas Custom Chart - Full Width */}
        <div className="bg-brand-card p-6 rounded-lg border border-brand-border shadow-lg" id="hours-chart-module">
          <div className="flex items-center justify-between pb-6 border-b border-brand-border/40 mb-6">
            <div>
              <h3 className="text-lg font-bold text-white">Acompanhamento de Horas (12 Meses)</h3>
              <p className="text-xs text-brand-text-muted">Total consolidado de apontamentos nos últimos 12 meses (horas:min:seg)</p>
            </div>
            
            <div className="text-right text-xs bg-brand-bg py-1.5 px-3 rounded border border-brand-border text-brand-primary font-bold">
              Total 12M: {formatSecondsToHms(hoursHistoryData.reduce((acc, curr) => acc + curr.value, 0))}
            </div>
          </div>

          {/* Styled Responsive Custom SVG Bar Chart */}
          <div className="relative">
            {isLoadingChart ? (
              <div className="h-64 w-full flex items-center justify-center text-brand-text-muted italic gap-2 bg-brand-bg/5 rounded">
                <RefreshCw className="animate-spin text-brand-primary" size={20} />
                <span>Carregando histórico do gráfico...</span>
              </div>
            ) : hoursHistoryData.length === 0 ? (
              <div className="h-64 w-full flex items-center justify-center text-brand-text-muted italic bg-brand-bg/5 rounded">
                Não existem dados de horas suficientes para exibir o gráfico.
              </div>
            ) : (
              <div className="h-64 w-full flex items-end justify-between px-2 sm:px-6 pt-4 relative">
                
                {/* Backing Horizontal Guidelines */}
                <div className="absolute inset-x-0 top-0 h-px bg-brand-border/10 border-dashed" />
                <div className="absolute inset-x-0 top-1/3 h-px bg-brand-border/10 border-dashed" />
                <div className="absolute inset-x-0 top-2/3 h-px bg-brand-border/10 border-dashed" />
                
                {/* Left y-axis relative values */}
                <div className="absolute left-0 -top-1 text-[9px] text-brand-text-muted/30 font-mono">
                  {formatSecondsToHms(maxHoursVal)}
                </div>
                <div className="absolute left-0 top-[84px] text-[9px] text-brand-text-muted/30 font-mono font-medium">
                  {formatSecondsToHms(Math.floor(maxHoursVal * 0.66))}
                </div>
                <div className="absolute left-0 top-[168px] text-[9px] text-brand-text-muted/30 font-mono font-medium">
                  {formatSecondsToHms(Math.floor(maxHoursVal * 0.33))}
                </div>

                {/* Dynamic SVG bar mappings */}
                {hoursHistoryData.map((data, index) => {
                  const heightPercent = Math.min((data.value / maxHoursVal) * 100, 100);
                  
                  return (
                    <div 
                      key={index} 
                      className="flex flex-col items-center flex-1 group/bar relative z-10"
                    >
                      {/* Hover state Popover Value tooltip */}
                      <div className="absolute -top-12 scale-0 group-hover/bar:scale-100 transition-all duration-150 origin-bottom bg-brand-card-bright border border-brand-primary/40 py-1.5 px-3 rounded text-xs text-white font-mono font-bold shadow-2xl z-20 whitespace-nowrap">
                        <div className="text-[9px] text-brand-primary uppercase font-extrabold tracking-wider mb-0.5 text-center">Total Horas</div>
                        <div className="text-sm font-black text-white">{data.hms}</div>
                      </div>

                      {/* Display value top of each bar */}
                      <span className="text-[9px] sm:text-[10px] font-mono font-extrabold text-brand-primary mb-2 z-10 bg-brand-card/60 px-1 py-0.5 rounded border border-brand-border/20 shadow opacity-80 group-hover/bar:opacity-100">
                        {data.hms}
                      </span>

                      {/* Highly polished bar visually matching screenshot */}
                      <div 
                        className="w-8 sm:w-12 rounded-t-md transition-all duration-300 relative shadow-inner overflow-hidden cursor-pointer"
                        style={{ 
                          height: `${heightPercent * 1.8}px`,
                          background: data.active 
                            ? 'linear-gradient(180deg, #ff3b30 0%, #d32f2f 100%)' 
                            : 'linear-gradient(180deg, #2a2a2a 0%, #161616 100%)',
                          border: data.active ? '1.5px solid #d32f2f' : '1.5px solid #2e2e2e'
                        }}
                      >
                        {/* Internal light glow */}
                        <span className="absolute inset-x-0 top-0 h-1 bg-white/15" />
                      </div>

                      {/* Label below */}
                      <span 
                        className={`text-xs mt-3 select-none font-bold ${
                          data.active ? 'text-brand-primary' : 'text-brand-text-muted/60 group-hover/bar:text-white'
                        }`}
                      >
                        {data.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Bottom Chart Indicator details */}
            <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-brand-border/40 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-[#2e2e2e] border border-brand-border inline-block" />
                <span className="text-brand-text-muted">Histórico consolidado</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-gradient-to-b from-brand-primary to-brand-accent border border-brand-primary inline-block animate-pulse" />
                <span className="text-white font-semibold font-mono">Filtro Geral Ativo</span>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <div id="novo-dash-root" className="flex-1 p-8 overflow-y-auto max-w-7xl mx-auto w-full space-y-8">
      
      {/* Header Row */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-brand-border/40 pb-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white mb-1">
            Gestão Operacional
          </h2>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button 
            onClick={() => setRefreshTrigger(prev => prev + 1)}
            className="p-2 rounded bg-brand-card hover:bg-brand-card-bright text-brand-text-muted hover:text-white transition-colors"
            title="Atualizar dados"
          >
            <RefreshCw size={18} className={isLoading ? "animate-spin text-brand-primary" : ""} />
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded transition-colors shadow-md"
          >
            <Download size={14} />
            <span>Exportar CSV</span>
          </button>
        </div>
      </header>

      {/* 2 Top KPI Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in" id="kpis-novo-dash">
        
        {/* Card 1: Empresas Distintas */}
        <div className="bg-brand-card rounded-lg p-6 border border-brand-border border-l-4 border-l-brand-accent relative overflow-hidden group shadow-md transition-all duration-200 hover:border-brand-primary/20 flex flex-col justify-between">
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider text-brand-text-muted/80 uppercase block">
                  Empresas Distintas ({currentLabel})
                </span>
                <span className="text-[9px] font-mono bg-brand-primary/10 text-brand-primary px-1.5 py-0.5 rounded border border-brand-primary/20">
                  Real-Time
                </span>
              </div>
              <h3 className="text-4xl font-extrabold text-white tracking-tight leading-none mb-3 mt-2">
                {isLoading ? (
                  <span className="animate-pulse opacity-50 text-xl font-medium text-brand-text-muted">...</span>
                ) : (
                  currentMetrics.distinctClients
                )}
              </h3>
            </div>
          </div>
          {renderComparison(
            currentMetrics.distinctClients,
            prevDistinctClients,
            prevLabel,
            'number'
          )}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-text-muted/5 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
            <Users size={80} />
          </div>
        </div>

        {/* Card 3: Total de Horas */}
        <div className="bg-brand-card rounded-lg p-6 border border-brand-border border-l-4 border-l-brand-accent relative overflow-hidden group shadow-md transition-all duration-200 hover:border-brand-primary/20 flex flex-col justify-between">
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider text-brand-text-muted/80 uppercase block">
                  Total de Horas ({currentLabel})
                </span>
                <span className="text-[9px] font-mono bg-brand-primary/10 text-brand-primary px-1.5 py-0.5 rounded border border-brand-primary/20">
                  Real-Time
                </span>
              </div>
              <h3 className="text-3xl font-black text-white tracking-tight leading-none mb-3 mt-2.5 font-mono">
                {isLoading ? (
                  <span className="animate-pulse opacity-50 text-xl font-medium text-brand-text-muted">...</span>
                ) : (
                  formatSecondsToHms(currentMetrics.totalSeconds)
                )}
              </h3>
            </div>
          </div>
          {renderComparison(
            currentMetrics.totalSeconds,
            prevTotalSeconds,
            prevLabel,
            'duration'
          )}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-text-muted/5 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
            <Clock size={80} />
          </div>
        </div>

      </section>



      {/* Contract Hours List Module */}
      <section className="bg-brand-card rounded-lg border border-brand-border p-6 shadow-lg" id="client-hours-list-module">
        
        {/* Module Title and Filter Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-brand-border/40">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              Horas por Empresa e Grupo
              <span className="text-[11px] font-semibold bg-brand-accent/20 text-brand-primary border border-brand-accent/30 py-0.5 px-2.5 rounded-full">
                {hoursViewMode === 'grupo' ? filteredGroupsData.length : filteredTempoCli.length} registros
              </span>
            </h3>
            <p className="text-xs text-brand-text-muted/80 mt-1">
              Visualização consolidada baseada nos lançamentos e faturamento das horas trabalhadas
            </p>
          </div>

          {/* Table Filters Toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex bg-brand-bg/60 border border-brand-border rounded p-0.5">
              <button
                onClick={() => setHoursViewMode('cliente')}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded transition-colors cursor-pointer ${hoursViewMode === 'cliente' ? 'bg-brand-primary text-white' : 'text-brand-text-muted hover:text-white'}`}
              >
                Por Empresa
              </button>
              <button
                onClick={() => setHoursViewMode('grupo')}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded transition-colors cursor-pointer ${hoursViewMode === 'grupo' ? 'bg-brand-primary text-white' : 'text-brand-text-muted hover:text-white'}`}
              >
                Por Grupo
              </button>
            </div>
            
            {/* Search */}
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-muted/50" size={14} />
              <input
                type="text"
                value={tempoCliSearchTerm}
                onChange={(e) => setTempoCliSearchTerm(e.target.value)}
                placeholder="Procurar cliente ou grupo..."
                className="w-full bg-brand-bg text-brand-text placeholder-brand-text-muted/40 pl-9 pr-3 py-1.5 rounded border border-brand-border focus:border-brand-primary outline-none text-xs transition-colors"
              />
              {tempoCliSearchTerm && (
                <button
                  type="button"
                  onClick={() => setTempoCliSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-brand-primary font-bold hover:underline"
                >
                  Limpar
                </button>
              )}
            </div>

            {/* Period select drop-downs */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-brand-bg/60 border border-brand-border py-1.5 px-3 rounded text-xs text-brand-text-muted font-semibold">
              <div className="flex items-center gap-2 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse inline-block shrink-0" />
                <span className="text-[10px] uppercase tracking-wider font-bold text-brand-text-muted/80">Período:</span>
                {isLoading && <RefreshCw size={11} className="animate-spin text-brand-primary shrink-0" />}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-brand-text-muted/60 font-bold uppercase tracking-wide">DE</span>
                <select
                  value={startPeriod}
                  onChange={(e) => {
                    const val = e.target.value;
                    setStartPeriod(val);
                    if (val > endPeriod) setEndPeriod(val);
                  }}
                  className="bg-brand-card-bright text-white border-0 py-1 pl-2 pr-6 rounded font-extrabold text-[11px] tracking-wider outline-none cursor-pointer uppercase"
                >
                  {availablePeriods.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>

                <span className="text-[10px] text-brand-text-muted/60 font-bold uppercase tracking-wide ml-1">ATÉ</span>
                <select
                  value={endPeriod}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEndPeriod(val);
                    if (val < startPeriod) setStartPeriod(val);
                  }}
                  className="bg-brand-card-bright text-white border-0 py-1 pl-2 pr-6 rounded font-extrabold text-[11px] tracking-wider outline-none cursor-pointer uppercase"
                >
                  {availablePeriods.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {selectedClientIds.size > 0 && (
          <div className="mt-4 flex items-center justify-between bg-brand-primary/10 border border-brand-primary/30 rounded-lg p-3.5 text-xs animate-fade-in">
            <div className="flex items-center gap-2 text-white font-medium">
              <span className="w-2 h-2 rounded-full bg-brand-primary animate-pulse" />
              <span>
                Filtro Ativo: <strong>{selectedClientIds.size}</strong> {selectedClientIds.size === 1 ? 'empresa selecionada' : 'empresas selecionadas'}. Cards de KPI e Gráfico estão filtrados de acordo.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedClientIds(new Set())}
              className="px-2.5 py-1 bg-brand-primary/20 hover:bg-brand-primary/35 border border-brand-primary/40 text-brand-primary hover:text-white rounded transition-all font-bold uppercase tracking-wide text-[10px] cursor-pointer"
            >
              Limpar Filtro
            </button>
          </div>
        )}

        {/* Responsive Scrollable Table */}
        <div className="overflow-auto max-h-[550px] border border-brand-border/30 rounded-lg mt-6 bg-brand-bg/25 relative custom-scrollbar">
          {isLoading ? (
            <div className="py-20 text-center text-brand-text-muted italic flex flex-col items-center justify-center gap-3">
              <RefreshCw className="animate-spin text-brand-primary" size={24} />
              <span className="text-sm">Carregando dados unificados do Supabase...</span>
            </div>
          ) : errorMsg ? (
            <div className="py-16 text-center text-brand-primary font-medium">
              <p>Ocorreu um erro ao carregar os dados: {errorMsg}</p>
              <button
                type="button"
                onClick={() => setRefreshTrigger(prev => prev + 1)}
                className="mt-3 px-3 py-1.5 bg-brand-primary/10 hover:bg-brand-primary/20 border border-brand-primary/20 text-brand-primary rounded text-xs transition-colors"
              >
                Tentar novamente
              </button>
            </div>
          ) : (hoursViewMode === 'grupo' ? filteredGroupsData.length === 0 : filteredTempoCli.length === 0) ? (
            <div className="py-16 text-center text-brand-text-muted/60 italic text-sm">
              Nenhum lançamento de horas encontrado para este período.
            </div>
          ) : (
            (() => {
              const totalFilteredValorLacto = currentMetrics.totalValorLacto;
              return hoursViewMode === 'grupo' ? (
                         <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-brand-card-light z-10 shadow border-b border-brand-border/60">
                    <tr className="text-[11px] font-bold text-brand-text-muted/80 tracking-wider uppercase">
                      <th className="py-3 px-3 text-center bg-brand-card-light w-12">
                        <input
                          type="checkbox"
                          checked={
                            filteredGroupsData.length > 0 &&
                            filteredGroupsData.every(g => {
                              const ids = g.clientes.map((c: any) => c.cliente_id).filter(Boolean);
                              return ids.length > 0 && ids.every(id => selectedClientIds.has(id));
                            })
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              const allIds = new Set<string>();
                              filteredGroupsData.forEach(g => {
                                g.clientes.forEach((c: any) => {
                                  if (c.cliente_id) allIds.add(c.cliente_id);
                                });
                              });
                              setSelectedClientIds(allIds);
                            } else {
                              setSelectedClientIds(new Set());
                            }
                          }}
                          className="rounded border-brand-border text-brand-primary focus:ring-brand-primary/20 bg-brand-bg h-3.5 w-3.5 cursor-pointer accent-brand-primary"
                        />
                      </th>
                      <th className="py-3 px-3 w-1/3 bg-brand-card-light">Grupo de Clientes</th>
                      <th className="py-3 px-3 text-center bg-brand-card-light w-24">Score</th>
                      <th className="py-3 px-4 text-center bg-brand-card-light w-32">Horas</th>
                      <th className="py-3 px-4 text-right bg-brand-card-light w-20">% Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border/30 font-sans text-xs">
                    {filteredGroupsData.map((group, gIdx) => {
                      const sharePercent = totalFilteredValorLacto > 0 ? (group.valor_lacto / totalFilteredValorLacto) * 100 : 0;
                      const isExpanded = expandedGroups.has(group.grupo_cliente_nome);
                      const deptData = isExpanded ? getGroupDeptData(group.grupo_cliente_nome) : [];

                      const rankSec = groupRankings.secondsRankMap.get(group.grupo_cliente_nome) || 1;
                      const rankVal = groupRankings.valorRankMap.get(group.grupo_cliente_nome) || 1;
                      const scoreStr = `${String(rankSec).padStart(3, '0')}/${String(rankVal).padStart(3, '0')}`;

                      const allGroupClientIds = group.clientes.map((c: any) => c.cliente_id).filter(Boolean);
                      const isGroupFullySelected = allGroupClientIds.length > 0 && allGroupClientIds.every((id: string) => selectedClientIds.has(id));
                      const isGroupPartiallySelected = !isGroupFullySelected && allGroupClientIds.some((id: string) => selectedClientIds.has(id));

                      return (
                        <React.Fragment key={`grp_${gIdx}`}>
                          <tr className="hover:bg-brand-card-bright/10 transition-colors">
                            <td className="py-3.5 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={isGroupFullySelected}
                                style={{ opacity: isGroupPartiallySelected ? 0.6 : 1 }}
                                onChange={() => {
                                  const next = new Set(selectedClientIds);
                                  if (isGroupFullySelected) {
                                    allGroupClientIds.forEach((id: string) => next.delete(id));
                                  } else {
                                    allGroupClientIds.forEach((id: string) => next.add(id));
                                  }
                                  setSelectedClientIds(next);
                                }}
                                className="rounded border-brand-border text-brand-primary focus:ring-brand-primary/20 bg-brand-bg h-3.5 w-3.5 cursor-pointer accent-brand-primary"
                              />
                            </td>
                            <td className="py-3.5 px-3 font-mono">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => toggleGroupExpandLocal(group.grupo_cliente_nome)}
                                  className="p-1 rounded text-brand-text-muted hover:text-brand-primary hover:bg-brand-primary/10 transition-colors focus:outline-none cursor-pointer"
                                >
                                  {isExpanded ? <ChevronDown size={14} className="text-brand-primary" /> : <ChevronRight size={14} />}
                                </button>
                                <span className="font-extrabold text-[13px] text-white">
                                  {group.grupo_cliente_nome}
                                </span>
                                <span className="text-[9px] text-brand-text-muted bg-brand-primary/10 border border-brand-primary/20 px-1.5 py-0.5 rounded font-mono font-bold uppercase inline-block ml-2">
                                  {group.clientes.length} CLIENTE(S)
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5 px-3 text-center font-mono">
                              <span className="inline-block px-2 py-0.5 rounded text-[11px] font-extrabold bg-brand-primary/10 text-brand-primary border border-brand-primary/20" title="Posição Horas / Posição Valor">
                                {scoreStr}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className="font-mono text-sm font-extrabold text-white">
                                {formatSecondsToHms(group.tempo_segundos)}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-[11px] text-emerald-400">
                              {sharePercent.toFixed(1)}%
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-brand-bg/40 border-t border-brand-border/30">
                              <td colSpan={5} className="p-0">
                                <div className="p-4 pl-10 border-l-2 border-brand-primary/30">
                                  <table className="w-full text-left text-[11px]">
                                    <thead>
                                      <tr className="text-brand-text-muted/60 uppercase font-bold border-b border-brand-border/40">
                                        <th className="pb-2">Departamento</th>
                                        <th className="pb-2 text-right">Horas</th>
                                        <th className="pb-2 text-right">Share dentro do Grupo</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-brand-border/10">
                                      {deptData.map((dept, dIdx) => {
                                        const totalGroupSeconds = group.tempo_segundos || 1;
                                        const totalGroupValor = group.valor_lacto || 1;
                                        const hoursShare = ((dept.tempo_segundos || 0) / totalGroupSeconds) * 100;
                                        const valorShare = ((dept.valor_lacto || 0) / totalGroupValor) * 100;
                                        const isDeptExpanded = expandedGroupDepts.has(`${group.grupo_cliente_nome}_${dept.setor}`);
                                        
                                        return (
                                          <React.Fragment key={`dept_${dIdx}`}>
                                            <tr className="hover:bg-brand-card-light transition-colors">
                                              <td className="py-2 flex items-center gap-2">
                                                <button
                                                  type="button"
                                                  onClick={() => toggleGroupDeptExpand(group.grupo_cliente_nome, dept.setor)}
                                                  className="p-1 rounded text-brand-text-muted hover:text-white transition-colors"
                                                >
                                                  {isDeptExpanded ? <ChevronDown size={12} className="text-brand-primary" /> : <ChevronRight size={12} />}
                                                </button>
                                                <span className="font-bold text-white flex items-center gap-1.5">
                                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                                  {dept.setor}
                                                </span>
                                              </td>
                                              <td className="py-2 text-right font-mono text-white font-semibold">
                                                {formatSecondsToHms(dept.tempo_segundos)}
                                              </td>
                                              <td className="py-2 text-right font-mono">
                                                <span className="text-brand-primary font-bold">{hoursShare.toFixed(1)}% <span className="text-[9px] text-brand-text-muted font-normal">(Horas)</span></span>
                                              </td>
                                            </tr>
                                            {isDeptExpanded && dept.clientes && dept.clientes.length > 0 && (
                                              <tr className="bg-black/20">
                                                <td colSpan={3} className="p-0">
                                                  <div className="pl-14 pr-4 py-3 border-l-2 border-brand-accent/30 bg-brand-bg/50">
                                                    <table className="w-full text-left text-[10px]">
                                                      <thead>
                                                        <tr className="text-brand-text-muted/50 uppercase font-bold border-b border-brand-border/20">
                                                          <th className="pb-1.5">Cliente</th>
                                                          <th className="pb-1.5 text-right">Horas</th>
                                                        </tr>
                                                      </thead>
                                                      <tbody className="divide-y divide-brand-border/10">
                                                        {dept.clientes.map((cli: any, cIdx: number) => (
                                                          <tr key={`cli_${cIdx}`} className="hover:bg-brand-card transition-colors">
                                                            <td className="py-1.5 text-white font-medium">{cli.cliente_nome}</td>
                                                            <td className="py-1.5 text-right font-mono text-brand-text-muted">{formatSecondsToHms(cli.tempo_segundos)}</td>
                                                          </tr>
                                                        ))}
                                                      </tbody>
                                                    </table>
                                                  </div>
                                                </td>
                                              </tr>
                                            )}
                                          </React.Fragment>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                // POR EMPRESA Mode
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-brand-card-light z-10 shadow border-b border-brand-border/60">
                    <tr className="text-[11px] font-bold text-brand-text-muted/80 tracking-wider uppercase select-none">
                      <th className="py-3 px-3 text-center bg-brand-card-light w-12">
                        <input
                          type="checkbox"
                          checked={
                            filteredTempoCli.length > 0 &&
                            filteredTempoCli.every(row => row.cliente_id && selectedClientIds.has(row.cliente_id))
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              const allIds = new Set<string>();
                              filteredTempoCli.forEach(row => {
                                if (row.cliente_id) allIds.add(row.cliente_id);
                              });
                              setSelectedClientIds(allIds);
                            } else {
                              setSelectedClientIds(new Set());
                            }
                          }}
                          className="rounded border-brand-border text-brand-primary focus:ring-brand-primary/20 bg-brand-bg h-3.5 w-3.5 cursor-pointer accent-brand-primary"
                        />
                      </th>
                      <th className="py-3 px-3 w-1/6 bg-brand-card-light">
                        <button 
                          type="button" 
                          onClick={() => handleSortTempoCli('grupo_raiz')}
                          className="flex items-center gap-1.5 hover:text-white cursor-pointer"
                        >
                          Grupo Raiz
                          {renderSortIcon('grupo_raiz')}
                        </button>
                      </th>
                      <th className="py-3 px-3 w-1/3 bg-brand-card-light">
                        <button 
                          type="button" 
                          onClick={() => handleSortTempoCli('cliente_nome')}
                          className="flex items-center gap-1.5 hover:text-white cursor-pointer"
                        >
                          Cliente
                          {renderSortIcon('cliente_nome')}
                        </button>
                      </th>
                      <th className="py-3 px-3 text-center bg-brand-card-light">Score</th>
                      <th className="py-3 px-4 bg-brand-card-light">
                        <div className="flex justify-end">
                          <button 
                            type="button" 
                            onClick={() => handleSortTempoCli('total_segundos')}
                            className="flex items-center gap-1.5 hover:text-white cursor-pointer"
                          >
                            Horas Trabalhadas
                            {renderSortIcon('total_segundos')}
                          </button>
                        </div>
                      </th>
                      <th className="py-3 px-4 text-right bg-brand-card-light w-20">% Share</th>
                      <th className="py-3 px-4 text-center bg-brand-card-light w-20">Detalhes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border/30 font-sans text-xs">
                    {filteredTempoCli.map((row, index) => {
                      const sharePercent = totalFilteredValorLacto > 0 ? ((row.valor_lacto || 0) / totalFilteredValorLacto) * 100 : 0;
                      const isExpanded = expandedClients.has(row.cliente_nome);
                      const deptData = isExpanded ? getClientDeptData(row.cliente_nome) : [];

                      const rankSec = clientRankings.secondsRankMap.get(row.cliente_nome) || 1;
                      const rankVal = clientRankings.valorRankMap.get(row.cliente_nome) || 1;
                      const scoreStr = `${String(rankSec).padStart(3, '0')}/${String(rankVal).padStart(3, '0')}`;

                      return (
                        <React.Fragment key={`${row.grupo_raiz || ''}_${row.cliente_nome || ''}_${index}`}>
                          <tr className="hover:bg-brand-card-bright/10 transition-colors">
                            <td className="py-3.5 px-3 text-center">
                              {row.cliente_id ? (
                                <input
                                  type="checkbox"
                                  checked={selectedClientIds.has(row.cliente_id)}
                                  onChange={() => {
                                    const next = new Set(selectedClientIds);
                                    if (next.has(row.cliente_id!)) {
                                      next.delete(row.cliente_id!);
                                    } else {
                                      next.add(row.cliente_id!);
                                    }
                                    setSelectedClientIds(next);
                                  }}
                                  className="rounded border-brand-border text-brand-primary focus:ring-brand-primary/20 bg-brand-bg h-3.5 w-3.5 cursor-pointer accent-brand-primary"
                                />
                              ) : (
                                <span className="text-[9px] text-brand-text-muted italic">S/ ID</span>
                              )}
                            </td>
                            {/* Grupo Raiz */}
                            <td className="py-3.5 px-3 font-mono">
                              <span className="bg-brand-bg border border-brand-border text-brand-primary/80 font-bold px-2 py-0.5 rounded">
                                {row.grupo_raiz || 'N/A'}
                              </span>
                            </td>

                            {/* Client details */}
                            <td className="py-3.5 px-3">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => toggleClientExpand(row.cliente_nome)}
                                  className="p-1 rounded text-brand-text-muted hover:text-brand-primary hover:bg-brand-primary/10 transition-colors focus:outline-none cursor-pointer"
                                >
                                  {isExpanded ? <ChevronDown size={14} className="text-brand-primary" /> : <ChevronRight size={14} />}
                                </button>
                                <span className="w-2 h-2 rounded-full inline-block bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] shrink-0" />
                                <div>
                                  <span className="font-extrabold text-[13px] text-white block">{row.cliente_nome}</span>
                                  {row.grupo_cliente_nome && (
                                    <span className="text-[9px] text-brand-text-muted bg-brand-primary/10 border border-brand-primary/20 px-1.5 py-0.5 rounded font-mono font-bold uppercase inline-block mt-1">GRP: {row.grupo_cliente_nome}</span>
                                  )}
                                  {row.cliente_codigo && (
                                    <span className="text-[10px] text-brand-text-muted/60 font-medium font-mono block mt-0.5">Cód: {row.cliente_codigo}</span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Score */}
                            <td className="py-3.5 px-3 text-center font-mono">
                              <span className="inline-block px-2 py-0.5 rounded text-[11px] font-extrabold bg-brand-primary/10 text-brand-primary border border-brand-primary/20" title="Posição Horas / Posição Valor">
                                {scoreStr}
                              </span>
                            </td>

                            {/* Horas */}
                            <td className="py-3.5 px-4 text-right font-mono text-sm font-extrabold text-white">
                              {formatSecondsToHms(row.total_segundos || 0)}
                            </td>

                            {/* % Share */}
                            <td className="py-3.5 px-4 text-right font-mono text-sm font-bold text-emerald-400">
                              {sharePercent.toFixed(1)}%
                            </td>

                            {/* Detalhes Eye icon */}
                            <td className="py-3.5 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedClientDetail(row);
                                  setExpandedNodes(new Set());
                                  fetchClientDetails(row);
                                }}
                                className="p-1.5 rounded bg-brand-primary/10 hover:bg-brand-primary/20 border border-brand-primary/20 text-brand-primary hover:text-white transition-all cursor-pointer"
                                title="Ver detalhamento de tarefas por departamento"
                              >
                                <Eye size={14} />
                              </button>
                            </td>
                          </tr>

                          {/* Expanded sub-row with departments */}
                          {isExpanded && (
                            <tr className="bg-brand-bg/40">
                              <td colSpan={7} className="py-4 px-6 pl-12">
                                <div className="border border-brand-border/30 rounded-lg overflow-hidden bg-brand-bg/80 shadow-md">
                                  <div className="bg-brand-card-light/40 px-4 py-2 flex items-center justify-between border-b border-brand-border/20">
                                    <span className="text-[10px] uppercase font-black tracking-wider text-brand-text-muted">
                                      Detalhamento por Departamento: {row.cliente_nome}
                                    </span>
                                  </div>
                                  <div className="divide-y divide-brand-border/15">
                                    <div className="grid grid-cols-3 bg-brand-card-light/20 px-4 py-2 text-[9px] uppercase font-bold tracking-wider text-brand-text-muted/80">
                                      <div>Departamento</div>
                                      <div className="text-right">Horas</div>
                                      <div className="text-right">Share dentro do Cliente</div>
                                    </div>
                                    {deptData.map((dept) => {
                                      const totalClientSeconds = row.total_segundos || 1;
                                      const hoursShare = ((dept.total_segundos || 0) / totalClientSeconds) * 100;
                                      
                                      return (
                                        <div key={dept.setor} className="grid grid-cols-3 px-4 py-2.5 text-xs items-center hover:bg-brand-card-bright/5 transition-colors">
                                          <div className="font-semibold text-white/95 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                                            {dept.setor}
                                          </div>
                                          <div className="text-right font-mono font-bold text-white/90">
                                            {formatSecondsToHms(dept.total_segundos)}
                                          </div>
                                          <div className="text-right font-mono text-[11px] flex flex-col items-end">
                                            <span className="text-brand-primary font-bold">{hoursShare.toFixed(1)}% <span className="text-[9px] text-brand-text-muted font-normal">(Horas)</span></span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              );
            })()
          )}
        </div>
      </section>

      {renderHoursChart()}

      {/* Interactive Detail Drill-down Modal (Departamento -> Código Cliente -> Tarefa) */}
      {selectedClientDetail && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in p-4 overflow-y-auto">
          <div className="bg-brand-card border border-brand-border rounded-xl max-w-3xl w-full shadow-2xl flex flex-col h-full max-h-[85vh] overflow-hidden" id="drilldown-modal">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-brand-border/60 flex items-start justify-between bg-brand-card-light">
              <div>
                <span className="p-1 px-1.5 rounded text-[10px] font-mono tracking-wider font-bold bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                  DETALHAMENTO DE HORAS TRABALHADAS (NOVO DASH)
                </span>
                <h3 className="font-extrabold text-xl text-white mt-1">
                  {selectedClientDetail.cliente_nome}
                </h3>
                <p className="text-xs text-brand-text-muted mt-1 font-medium flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span>Grupo Raiz:</span>
                  <span className="font-mono text-white font-bold bg-brand-bg px-1.5 py-0.5 rounded border border-brand-border/40 select-all">
                    {selectedClientDetail.grupo_raiz || 'N/A'}
                  </span>
                  <span className="text-brand-text-muted/40">•</span>
                  <span>Período:</span>
                  <span className="font-mono text-white font-black uppercase">{currentLabel}</span>
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedClientDetail(null)}
                className="p-1.5 bg-brand-bg hover:bg-red-500/10 hover:text-red-400 border border-brand-border/40 hover:border-red-500/30 rounded-lg text-brand-text-muted transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Total Summary bar */}
            <div className="bg-brand-bg/60 p-4 border-b border-brand-border/35 flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-xs">
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-brand-primary/10 text-brand-primary rounded-lg border border-brand-primary/15 shrink-0">
                    <Clock size={16} />
                  </div>
                  <div>
                    <div className="text-brand-text-muted text-[10px] uppercase font-bold tracking-wider">Tempo Total Auditado</div>
                    <div className="text-base font-mono font-black text-white leading-tight">
                      {formatSecondsToHms(hierarchicallyGroupedDetails.total_hours)}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 md:self-center">
                <button
                  type="button"
                  onClick={() => expandAllNodes(hierarchicallyGroupedDetails.departments)}
                  className="px-2.5 py-1 text-[10px] font-bold tracking-wider text-brand-primary bg-brand-primary/10 hover:bg-brand-primary/15 border border-brand-primary/20 rounded-md transition-colors uppercase cursor-pointer"
                >
                  Expandir Tudo
                </button>
                <button
                  type="button"
                  onClick={collapseAllNodes}
                  className="px-2.5 py-1 text-[10px] font-bold tracking-wider text-brand-text-muted bg-brand-bg hover:bg-brand-card/40 border border-brand-border/60 rounded-md transition-colors uppercase cursor-pointer"
                >
                  Recolher Tudo
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-auto flex-1 custom-scrollbar space-y-4 bg-brand-bg/15">
              {isModalLoading ? (
                <div className="py-20 text-center space-y-4">
                  <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-sm text-brand-text-muted">Carregando detalhes dos apontamentos...</p>
                </div>
              ) : modalError ? (
                <div className="py-20 text-center space-y-3">
                  <div className="text-red-500 text-sm font-semibold">{modalError}</div>
                  <button
                    type="button"
                    onClick={() => fetchClientDetails(selectedClientDetail)}
                    className="px-4 py-2 bg-brand-primary hover:bg-brand-primary-dark text-white rounded text-xs font-bold"
                  >
                    Tentar Novamente
                  </button>
                </div>
              ) : Object.keys(hierarchicallyGroupedDetails.departments).length === 0 ? (
                <div className="py-20 text-center space-y-3">
                  <ClipboardList className="text-brand-text-muted/30 mx-auto" size={40} />
                  <p className="text-sm italic text-brand-text-muted">Nenhum detalhamento de tarefa cadastrado para este cliente neste período.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.keys(hierarchicallyGroupedDetails.departments)
                    .sort((a, b) => hierarchicallyGroupedDetails.departments[b].total_segundos - hierarchicallyGroupedDetails.departments[a].total_segundos)
                    .map((deptName) => {
                      const deptItem = hierarchicallyGroupedDetails.departments[deptName];
                      const deptKey = `dept:${deptName}`;
                      const isDeptExpanded = expandedNodes.has(deptKey);
                      const deptPercentage = hierarchicallyGroupedDetails.total_hours > 0 
                        ? Math.round((deptItem.total_segundos / hierarchicallyGroupedDetails.total_hours) * 100)
                        : 0;

                      return (
                        <div key={deptKey} className="border border-brand-border/40 rounded-lg overflow-hidden bg-brand-card/30">
                          
                          {/* Level 1: Departamento */}
                          <button
                            type="button"
                            onClick={() => toggleNodeExpression(deptKey)}
                            className="w-full text-left p-4 hover:bg-brand-card-bright/10 flex items-center justify-between gap-4 transition-colors duration-150 border-b border-brand-border/25 cursor-pointer"
                          >
                            <div className="flex items-center gap-3">
                              <span className={`text-brand-primary shrink-0 transition-transform duration-200 ${isDeptExpanded ? 'rotate-90' : 'rotate-0'}`}>
                                <ChevronRight size={16} />
                              </span>
                              <div className="p-1 px-1.5 rounded bg-brand-primary/10 text-brand-primary border border-brand-primary/15">
                                <Layers size={14} />
                              </div>
                              <div>
                                <span className="font-extrabold text-[13px] text-white tracking-wide">{deptName}</span>
                                <span className="text-[10px] text-brand-text-muted/60 font-medium ml-2 uppercase font-mono">
                                  ({getUniqueColabCountForDept(deptItem)} {getUniqueColabCountForDept(deptItem) === 1 ? 'colaborador' : 'colaboradores'})
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                              <span className="font-mono text-xs font-black text-brand-primary bg-brand-primary/5 px-2 py-0.5 rounded border border-brand-primary/10">
                                {formatSecondsToHms(deptItem.total_segundos)}
                              </span>
                            </div>
                          </button>

                          {/* Level 2: Roles (Funções) under Department */}
                          {isDeptExpanded && (
                            <div className="divide-y divide-brand-border/20 bg-black/15 font-sans">
                              {Object.keys(deptItem.roles)
                                .sort((a, b) => deptItem.roles[b].total_segundos - deptItem.roles[a].total_segundos)
                                .map((roleName) => {
                                  const roleItem = deptItem.roles[roleName];
                                  const roleKey = `${deptKey}|role:${roleName}`;
                                  const isRoleExpanded = expandedNodes.has(roleKey);
                                  const rolePercentage = deptItem.total_segundos > 0
                                    ? Math.round((roleItem.total_segundos / deptItem.total_segundos) * 100)
                                    : 0;

                                  return (
                                    <div key={roleKey} className="transition-all">
                                      
                                      {/* Clickable Role row */}
                                      <button
                                        type="button"
                                        onClick={() => toggleNodeExpression(roleKey)}
                                        className="w-full text-left py-3 px-6 pl-8 hover:bg-brand-card-bright/5 flex items-center justify-between gap-4 transition-colors duration-150 bg-brand-card-light/20 cursor-pointer"
                                      >
                                        <div className="flex items-center gap-2.5">
                                          <span className={`text-brand-text-muted/60 shrink-0 transition-transform duration-200 ${isRoleExpanded ? 'rotate-90' : 'rotate-0'}`}>
                                            <ChevronRight size={14} />
                                          </span>
                                          <div className="p-0.5 px-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/15 rounded text-[10px] font-mono font-bold flex items-center gap-1">
                                            <Briefcase size={10} />
                                            <span>Função</span>
                                          </div>
                                          <span className="font-bold text-xs text-brand-text/90 truncate max-w-[280px]">
                                            {roleItem.role_nome}
                                          </span>
                                          <span className="text-[10px] text-brand-text-muted/50 font-medium font-mono">
                                            ({Object.keys(roleItem.collaborators).length} {Object.keys(roleItem.collaborators).length === 1 ? 'colaborador' : 'colaboradores'})
                                          </span>
                                        </div>

                                        <div className="flex items-center gap-3">
                                          <span className="text-[9px] font-mono text-brand-text-muted/50">({rolePercentage}% do dept)</span>
                                          <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/5 px-1.5 py-0.5 rounded border border-indigo-500/5">
                                            {formatSecondsToHms(roleItem.total_segundos)}
                                          </span>
                                        </div>
                                      </button>

                                      {/* Level 3: Collaborators under Role */}
                                      {isRoleExpanded && (
                                        <div className="divide-y divide-brand-border/15 bg-black/5">
                                          {Object.keys(roleItem.collaborators)
                                            .sort((a, b) => roleItem.collaborators[b].total_segundos - roleItem.collaborators[a].total_segundos)
                                            .map((colabName) => {
                                              const colabItem = roleItem.collaborators[colabName];
                                              const colabKey = `${roleKey}|colab:${colabName}`;
                                              const isColabExpanded = expandedNodes.has(colabKey);
                                              const colabPercentage = roleItem.total_segundos > 0
                                                ? Math.round((colabItem.total_segundos / roleItem.total_segundos) * 100)
                                                : 0;

                                              return (
                                                <div key={colabKey} className="transition-all">
                                                  
                                                  {/* Clickable Collaborator row */}
                                                  <button
                                                    type="button"
                                                    onClick={() => toggleNodeExpression(colabKey)}
                                                    className="w-full text-left py-2.5 px-8 pl-12 hover:bg-brand-card-bright/5 flex items-center justify-between gap-4 transition-colors duration-150 bg-brand-card-light/40 cursor-pointer"
                                                  >
                                                    <div className="flex items-center gap-2.5">
                                                      <span className={`text-brand-text-muted/60 shrink-0 transition-transform duration-200 ${isColabExpanded ? 'rotate-90' : 'rotate-0'}`}>
                                                        <ChevronRight size={14} />
                                                      </span>
                                                      <div className="p-0.5 px-1 bg-amber-500/10 text-amber-500 border border-amber-500/15 rounded text-[10px] font-mono font-bold">
                                                        Colab
                                                      </div>
                                                      <span className="font-bold text-xs text-white truncate max-w-[280px]">
                                                        {colabItem.colaborador_nome}
                                                      </span>
                                                    </div>

                                                    <div className="flex items-center gap-3">
                                                      <span className="text-[9px] font-mono text-brand-text-muted/50">({colabPercentage}% da função)</span>
                                                      <span className="font-mono text-xs font-bold text-brand-primary bg-brand-primary/5 px-1.5 py-0.5 rounded border border-brand-primary/5">
                                                        {formatSecondsToHms(colabItem.total_segundos)}
                                                      </span>
                                                    </div>
                                                  </button>

                                                  {/* Level 4: Tasks list under Collaborator */}
                                                  {isColabExpanded && (
                                                    <div className="bg-brand-bg/40 divide-y divide-brand-border/10 font-sans">
                                                      {Object.keys(colabItem.tasks)
                                                        .sort((a, b) => colabItem.tasks[b].total_segundos - colabItem.tasks[a].total_segundos)
                                                        .map((taskName, idx) => {
                                                          const task = colabItem.tasks[taskName];
                                                          const taskPercentage = colabItem.total_segundos > 0
                                                            ? Math.round((task.total_segundos / colabItem.total_segundos) * 100)
                                                            : 0;

                                                          return (
                                                            <div 
                                                              key={`${colabKey}-task-${idx}`}
                                                              className="py-2.5 px-8 pl-18 flex items-center justify-between gap-4 text-xs group/task hover:bg-brand-card-bright/5 transition-all text-brand-text-muted"
                                                            >
                                                              <div className="flex items-center gap-2.5 min-w-0">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-brand-primary shrink-0" />
                                                                <span className="font-medium text-brand-text/90 truncate pr-2" title={task.tarefa_nome}>
                                                                  {task.tarefa_nome}
                                                                </span>
                                                              </div>

                                                              <div className="flex items-center gap-3 shrink-0">
                                                                <span className="text-[10px] font-mono text-brand-text-muted/40 font-semibold">
                                                                  {taskPercentage}%
                                                                </span>
                                                                <span className="font-mono text-xs font-medium text-brand-text-muted tracking-wider">
                                                                  {formatSecondsToHms(task.total_segundos)}
                                                                </span>
                                                              </div>
                                                            </div>
                                                          );
                                                        })}
                                                    </div>
                                                  )}

                                                </div>
                                              );
                                            })}
                                        </div>
                                      )}

                                    </div>
                                  );
                                })}
                            </div>
                          )}

                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-brand-border/60 bg-brand-card-light flex items-center justify-between text-[11px] text-brand-text-muted">
              <span>Auditoria finalizada com êxito.</span>
              <button
                type="button"
                onClick={() => setSelectedClientDetail(null)}
                className="px-4 py-1.5 bg-brand-primary hover:bg-brand-primary-dark text-white font-bold rounded shadow-md cursor-pointer transition-transform active:scale-95"
              >
                Voltar ao Dash Liderança
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
