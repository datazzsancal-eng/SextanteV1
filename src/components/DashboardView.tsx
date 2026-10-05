import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Bell, 
  User, 
  Filter, 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  ChevronDown, 
  MapPin, 
  CheckCircle,
  HelpCircle,
  Plus,
  RefreshCw,
  Sliders,
  DollarSign,
  Briefcase,
  Users,
  Clock,
  ClipboardList,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  ChevronRight,
  Folder,
  Calendar,
  X,
  Layers
} from 'lucide-react';
import { Contract, SinaleiraConfig } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface DashboardViewProps {
  contracts: Contract[];
  onUpdateContract: (id: string, updatedFields: Partial<Contract>) => void;
  onAddContract: (newContract: Contract) => void;
  sinaleira: { dentro: SinaleiraConfig; atencao: SinaleiraConfig; critico: SinaleiraConfig };
  motives: string[];
  actions: { name: string; id: string }[];
}

export default function DashboardView({
  contracts,
  onUpdateContract,
  onAddContract,
  sinaleira,
  motives,
  actions
}: DashboardViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('all'); // all, alto, medio, estavel
  const [showAddForm, setShowAddForm] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState('');

  const [apontamentos, setApontamentos] = useState<any[]>([]);
  const [isLoadingApontamentos, setIsLoadingApontamentos] = useState(false);
  const [apontamentosError, setApontamentosError] = useState<string | null>(null);

  // States for viw_agr_tempo_cli_anomes
  const [tempoCliData, setTempoCliData] = useState<any[]>([]);
  const [honorariosData, setHonorariosData] = useState<any[]>([]);
  const [isLoadingTempoCli, setIsLoadingTempoCli] = useState(false);
  const [tempoCliError, setTempoCliError] = useState<string | null>(null);
  const [tempoCliSearchTerm, setTempoCliSearchTerm] = useState<string>('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Pre-aggregate honorarios by grupo_raiz for client hours table
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

  // Pre-aggregate honorarios by group name for group hours table
  const honorariosByGrupoCliente = useMemo(() => {
    const raizToGroupMap = new Map<string, string>();
    tempoCliData.forEach(row => {
      const raiz = row.grupo_raiz || '';
      const grpName = row.grupo_cliente_nome || 'Sem Grupo';
      if (raiz) {
        raizToGroupMap.set(raiz, grpName);
      }
    });

    const groupMap = new Map<string, number>();
    honorariosData.forEach(item => {
      const raiz = item.grupo_raiz || '';
      const grpName = raizToGroupMap.get(raiz) || 'Sem Grupo';
      groupMap.set(grpName, (groupMap.get(grpName) || 0) + (item.hnr_valor || 0));
    });

    return groupMap;
  }, [tempoCliData, honorariosData]);

  // States for table sorting
  const [tempoCliSortField, setTempoCliSortField] = useState<'cliente_nome' | 'grupo_raiz' | 'cliente_codigo' | 'total_segundos' | 'valor_lacto'>('total_segundos');
  const [tempoCliSortAsc, setTempoCliSortAsc] = useState<boolean>(false);

  const handleSortTempoCli = (field: 'cliente_nome' | 'grupo_raiz' | 'cliente_codigo' | 'total_segundos' | 'valor_lacto') => {
    if (tempoCliSortField === field) {
      setTempoCliSortAsc(!tempoCliSortAsc);
    } else {
      setTempoCliSortField(field);
      // text fields default to ascending (A-Z), numeric/seconds default to descending (largest first)
      setTempoCliSortAsc(field !== 'total_segundos' && field !== 'valor_lacto');
    }
  };

  const renderSortIcon = (field: 'cliente_nome' | 'grupo_raiz' | 'cliente_codigo' | 'total_segundos' | 'valor_lacto') => {
    if (tempoCliSortField !== field) {
      return <ArrowUpDown size={12} className="text-brand-text-muted/30 shrink-0" />;
    }
    if (tempoCliSortAsc) {
      return <ArrowUp size={12} className="text-brand-primary font-bold shrink-0" />;
    }
    return <ArrowDown size={12} className="text-brand-primary font-bold shrink-0" />;
  };

  // States for 6-month hours chart data
  const [hoursHistoryData, setHoursHistoryData] = useState<{ label: string; value: number; hms: string; active: boolean }[]>([]);
  const [isLoadingChart, setIsLoadingChart] = useState(false);
  const [totalHoursFromResumo, setTotalHoursFromResumo] = useState<string | null>(null);
  const [totalSecondsFromResumo, setTotalSecondsFromResumo] = useState<number | null>(null);
  const [isLoadingTotalHours, setIsLoadingTotalHours] = useState(false);

  // States for previous year comparison metrics
  const [prevDistinctClients, setPrevDistinctClients] = useState<number | null>(null);
  const [prevTotalValorLacto, setPrevTotalValorLacto] = useState<number | null>(null);
  const [prevTotalHours, setPrevTotalHours] = useState<string | null>(null);
  const [prevTotalSeconds, setPrevTotalSeconds] = useState<number | null>(null);
  const [isLoadingPrevMetrics, setIsLoadingPrevMetrics] = useState(false);

  // States for viw_resumo_tarefa_ano_mes Drill-down Modal
  const [selectedClientDetail, setSelectedClientDetail] = useState<any | null>(null);
  const [detailTasksData, setDetailTasksData] = useState<any[]>([]);
  const [isLoadingDetailTasks, setIsLoadingDetailTasks] = useState(false);
  const [detailTasksError, setDetailTasksError] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // States for hours view mode (cliente vs grupo)
  const [hoursViewMode, setHoursViewMode] = useState<'cliente' | 'grupo'>('cliente');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [groupDeptData, setGroupDeptData] = useState<Record<string, { setor: string; tempo_segundos: number; valor_lacto: number; clientes: any[] }[]>>({});
  const [loadingGroupDepts, setLoadingGroupDepts] = useState<Record<string, boolean>>({});
  const [expandedGroupDepts, setExpandedGroupDepts] = useState<Set<string>>(new Set());

  const toggleGroupExpand = async (groupName: string, clientesNoGrupo: any[]) => {
    const key = groupName;
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
      setExpandedGroups(newExpanded);
      return;
    }
    
    newExpanded.add(key);
    setExpandedGroups(newExpanded);
    
    if (groupDeptData[key]) return;
    
    setLoadingGroupDepts(prev => ({ ...prev, [key]: true }));
    try {
      let allData: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;
      
      const clientNames = clientesNoGrupo.map(c => c.cliente_nome).filter(Boolean);
      
      while (hasMore) {
        let query = supabase
          .from('vwm_agr_cli_set_trf')
          .select('cliente_nome, setor, tempo_segundos, valor_lacto');
          
        if (periodsInInterval.length === 1) {
          const [y, m] = periodsInInterval[0].split('-');
          query = query.eq('ano', parseInt(y)).eq('mes', parseInt(m));
        } else if (periodsInInterval.length > 1) {
          const orCondition = periodsInInterval.map(p => {
            const [y, m] = p.split('-');
            return `and(ano.eq.${parseInt(y)},mes.eq.${parseInt(m)})`;
          }).join(',');
          if (orCondition) {
            query = query.or(orCondition);
          }
        }
        
        if (clientNames.length > 0) {
           query = query.in('cliente_nome', clientNames);
        } else {
           // Should not happen, but safeguard
           query = query.eq('cliente_nome', 'NENHUM_CLIENTE_MATCH');
        }
        
        const { data, error } = await query.range(page * pageSize, (page + 1) * pageSize - 1);
        if (error) throw error;
        
        if (data && data.length > 0) {
          allData = [...allData, ...data];
          if (data.length < pageSize) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
        page++;
      }
      
      // Group by setor, then by cliente
      const deptsMap = new Map<string, any>();
      for (const row of allData) {
        const deptName = row.setor || 'Sem Departamento';
        if (!deptsMap.has(deptName)) {
          deptsMap.set(deptName, { setor: deptName, tempo_segundos: 0, valor_lacto: 0, clientesMap: new Map() });
        }
        const d = deptsMap.get(deptName);
        d.tempo_segundos += (row.tempo_segundos || 0);
        d.valor_lacto += (row.valor_lacto || 0);
        
        if (!d.clientesMap.has(row.cliente_nome)) {
          d.clientesMap.set(row.cliente_nome, { cliente_nome: row.cliente_nome, tempo_segundos: 0, valor_lacto: 0 });
        }
        const c = d.clientesMap.get(row.cliente_nome);
        c.tempo_segundos += (row.tempo_segundos || 0);
        c.valor_lacto += (row.valor_lacto || 0);
      }
      
      // Convert to array
      const deptsArray = Array.from(deptsMap.values()).map(d => ({
        setor: d.setor,
        tempo_segundos: d.tempo_segundos,
        valor_lacto: d.valor_lacto,
        clientes: Array.from(d.clientesMap.values()).sort((a: any, b: any) => b.tempo_segundos - a.tempo_segundos)
      })).sort((a: any, b: any) => b.tempo_segundos - a.tempo_segundos);
      
      setGroupDeptData(prev => ({ ...prev, [key]: deptsArray }));
    } catch (err) {
      console.error('Error fetching group depts:', err);
    } finally {
      setLoadingGroupDepts(prev => ({ ...prev, [key]: false }));
    }
  };

  const toggleGroupDeptExpand = (groupName: string, deptName: string) => {
    const key = `${groupName}_${deptName}`;
    const newExpanded = new Set(expandedGroupDepts);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedGroupDepts(newExpanded);
  };

  // States for in-grid client department drill-down
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [clientDeptData, setClientDeptData] = useState<Record<string, { setor: string; total_segundos: number; valor_lacto: number }[]>>({});
  const [loadingClientDepts, setLoadingClientDepts] = useState<Record<string, boolean>>({});



  const toggleClientExpand = async (clientRow: any) => {
    const clientKey = clientRow.cliente_nome || 'Sem Nome';
    const newExpanded = new Set(expandedClients);
    if (newExpanded.has(clientKey)) {
      newExpanded.delete(clientKey);
      setExpandedClients(newExpanded);
      return;
    }
    
    newExpanded.add(clientKey);
    setExpandedClients(newExpanded);
    
    if (clientDeptData[clientKey]) return;
    
    setLoadingClientDepts(prev => ({ ...prev, [clientKey]: true }));
    try {
      let allData: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;
      
      while (hasMore) {
        let query = supabase
          .from('vwm_agr_cli_set_trf')
          .select('setor, tempo_segundos, valor_lacto');
          
        if (periodsInInterval.length === 1) {
          const [y, m] = periodsInInterval[0].split('-');
          query = query.eq('ano', parseInt(y)).eq('mes', parseInt(m));
        } else if (periodsInInterval.length > 1) {
          const orCondition = periodsInInterval.map(p => {
            const [y, m] = p.split('-');
            return `and(ano.eq.${parseInt(y)},mes.eq.${parseInt(m)})`;
          }).join(',');
          if (orCondition) {
            query = query.or(orCondition);
          }
        }
        
        if (clientRow.grupo_raiz) {
          query = query.eq('grupo_raiz', clientRow.grupo_raiz);
        } else {
          query = query.eq('cliente_nome', clientRow.cliente_nome);
        }
        
        const { data, error } = await query.range(page * pageSize, (page + 1) * pageSize - 1);
        if (error) throw error;
        
        if (data && data.length > 0) {
          allData = [...allData, ...data];
          if (data.length < pageSize) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
        page++;
      }
      
      const deptMap = new Map<string, { setor: string; total_segundos: number; valor_lacto: number }>();
      for (const item of allData) {
        const deptName = item.setor || 'OUTROS';
        if (!deptMap.has(deptName)) {
          deptMap.set(deptName, {
            setor: deptName,
            total_segundos: 0,
            valor_lacto: 0,
          });
        }
        const current = deptMap.get(deptName)!;
        current.total_segundos += (item.tempo_segundos || 0);
        current.valor_lacto += (item.valor_lacto || 0);
      }
      
      const aggregated = Array.from(deptMap.values()).sort((a, b) => b.total_segundos - a.total_segundos);
      
      setClientDeptData(prev => ({
        ...prev,
        [clientKey]: aggregated,
      }));
    } catch (err) {
      console.error('Error fetching client departments:', err);
    } finally {
      setLoadingClientDepts(prev => ({ ...prev, [clientKey]: false }));
    }
  };

  const toggleNodeExpression = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const expandAllNodes = (groupedData: any) => {
    const ids = new Set<string>();
    Object.keys(groupedData).forEach(deptKey => {
      ids.add(`dept:${deptKey}`);
      Object.keys(groupedData[deptKey].clients).forEach(cliKey => {
        ids.add(`dept:${deptKey}|cli_cod:${cliKey}`);
      });
    });
    setExpandedNodes(ids);
  };

  const collapseAllNodes = () => {
    setExpandedNodes(new Set());
  };

  const hierarchicallyGroupedDetails = useMemo(() => {
    // We group by Departamento -> Cliente Código -> Tarefa
    const depts: Record<string, {
      total_segundos: number;
      valor_lacto: number;
      clients: Record<string, {
        total_segundos: number;
        valor_lacto: number;
        cliente_nome: string;
        tasks: { tarefa: string; total_segundos: number; valor_lacto: number }[];
      }>;
    }> = {};

    let totalAll = 0;
    let totalValorAll = 0;

    detailTasksData.forEach(row => {
      const deptName = row.departamento || "OUTROS";
      const cliCode = row.cliente_codigo || "S/C";
      const taskName = row.tarefa || "Tarefa Sem Especificação";
      const secs = row.total_segundos || 0;
      const valLacto = row.valor_lacto || 0;

      totalAll += secs;
      totalValorAll += valLacto;

      if (!depts[deptName]) {
        depts[deptName] = { total_segundos: 0, valor_lacto: 0, clients: {} };
      }
      depts[deptName].total_segundos += secs;
      depts[deptName].valor_lacto += valLacto;

      if (!depts[deptName].clients[cliCode]) {
        depts[deptName].clients[cliCode] = {
          total_segundos: 0,
          valor_lacto: 0,
          cliente_nome: row.cliente_nome || "",
          tasks: []
        };
      }
      depts[deptName].clients[cliCode].total_segundos += secs;
      depts[deptName].clients[cliCode].valor_lacto += valLacto;
      
      depts[deptName].clients[cliCode].tasks.push({
        tarefa: taskName,
        total_segundos: secs,
        valor_lacto: valLacto
      });
    });

    // Sort tasks and clients in descending order of total_segundos
    Object.keys(depts).forEach(deptName => {
      Object.keys(depts[deptName].clients).forEach(cliCode => {
        depts[deptName].clients[cliCode].tasks.sort((a, b) => b.total_segundos - a.total_segundos);
      });
    });

    return { departments: depts, total_hours: totalAll, total_valor_lacto: totalValorAll };
  }, [detailTasksData]);

  const [startPeriod, setStartPeriod] = useState<string>(() => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  });
  const [endPeriod, setEndPeriod] = useState<string>(() => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  });
  const [availablePeriods, setAvailablePeriods] = useState<{ value: string; label: string }[]>([]);

  const periodsInInterval = useMemo(() => {
    if (!startPeriod || !endPeriod) return [];
    
    // Ensure startPeriod <= endPeriod chronologically
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

  // Fetch or mock detail tasks from vwm_agr_cli_set_trf
  React.useEffect(() => {
    const fetchDetailTasks = async () => {
      if (!selectedClientDetail) {
        setDetailTasksData([]);
        setExpandedNodes(new Set());
        return;
      }

      const row = selectedClientDetail;
      if (isSupabaseConfigured && supabase) {
        setIsLoadingDetailTasks(true);
        setDetailTasksError(null);
        try {
          let allData: any[] = [];
          let page = 0;
          const pageSize = 1000;
          let hasMore = true;

          while (hasMore) {
            let query = supabase
              .from('vwm_agr_cli_set_trf')
              .select('codigo, grupo_raiz, cliente_nome, setor, tarefa, ano, mes, tempo_segundos, tempo_horas, valor_lacto');

            if (periodsInInterval.length === 1) {
              const [y, m] = periodsInInterval[0].split('-');
              query = query.eq('ano', parseInt(y)).eq('mes', parseInt(m));
            } else if (periodsInInterval.length > 1) {
              const orCondition = periodsInInterval.map(p => {
                const [y, m] = p.split('-');
                return `and(ano.eq.${parseInt(y)},mes.eq.${parseInt(m)})`;
              }).join(',');

              if (orCondition) {
                query = query.or(orCondition);
              }
            }

            if (row.grupo_raiz) {
              query = query.eq('grupo_raiz', row.grupo_raiz);
            } else {
              query = query.eq('cliente_nome', row.cliente_nome);
            }

            // Order by tempo_segundos descending so it is sorted with largest hours first
            query = query.order('tempo_segundos', { ascending: false });

            const { data, error } = await query.range(page * pageSize, (page + 1) * pageSize - 1);
            if (error) throw error;

            if (data && data.length > 0) {
              allData = [...allData, ...data];
              if (data.length < pageSize) {
                hasMore = false;
              }
            } else {
              hasMore = false;
            }
            page++;
          }

          // Map view fields to downstream code expectations
          const mapped = allData.map((item: any) => ({
            ...item,
            cliente_codigo: item.codigo,
            departamento: item.setor || "OUTROS",
            total_segundos: item.tempo_segundos || 0,
            valor_lacto: item.valor_lacto || 0,
          }));

          setDetailTasksData(mapped);
          
          // Auto-expand all departments by default for high quality UX!
          const deptIds = new Set<string>();
          mapped.forEach((d: any) => {
            if (d.departamento) {
              deptIds.add(`dept:${d.departamento}`);
            }
          });
          setExpandedNodes(deptIds);

        } catch (err: any) {
          console.error('Error fetching vwm_agr_cli_set_trf:', err);
          setDetailTasksError(err?.message || 'Erro ao carregar detalhes do banco.');
        } finally {
          setIsLoadingDetailTasks(false);
        }
      } else {
        // Não envia dados fakes se o banco estiver desconectado
        setDetailTasksData([]);
        setExpandedNodes(new Set());
      }
    };

    fetchDetailTasks();
  }, [selectedClientDetail, periodsInInterval]);

  const getMonthAbbrUpper = (monthNum: number) => {
    const months = [
      'JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN',
      'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'
    ];
    return months[monthNum - 1] || String(monthNum);
  };

  // Discover available periods on mount
  React.useEffect(() => {
    const discoverPeriods = async () => {
      if (isSupabaseConfigured && supabase) {
        try {
          // Fetch from viw_resumo_hora_mes which is extremely light and contains all year/month combinations
          const { data, error } = await supabase
            .from('viw_resumo_hora_mes')
            .select('ano, mes');

          if (error) {
            console.error('Error fetching periods from viw_resumo_hora_mes:', error);
            return;
          }

          const periodsSet = new Set<string>();
          data?.forEach((row: any) => {
            if (row.ano && row.mes) {
              periodsSet.add(`${row.ano}-${String(row.mes).padStart(2, '0')}`);
            }
          });

          // In case viw_resumo_hora_mes didn't return any data, try viw_agr_tempo_cli_anomes
          if (periodsSet.size === 0) {
            const { data: altData, error: altError } = await supabase
              .from('viw_agr_tempo_cli_anomes')
              .select('ano, mes');
            
            if (!altError && altData) {
              altData.forEach((row: any) => {
                if (row.ano && row.mes) {
                  periodsSet.add(`${row.ano}-${String(row.mes).padStart(2, '0')}`);
                }
              });
            }
          }

          // If still empty, try vwm_agr_hora_cli which is also aggregated and has only ~9k rows
          if (periodsSet.size === 0) {
            const { data: altData, error: altError } = await supabase
              .from('vwm_agr_hora_cli')
              .select('ano, mes');
            
            if (!altError && altData) {
              altData.forEach((row: any) => {
                if (row.ano && row.mes) {
                  periodsSet.add(`${row.ano}-${String(row.mes).padStart(2, '0')}`);
                }
              });
            }
          }

          const sortedPeriods = Array.from(periodsSet)
            .sort()
            .reverse()
            .map(p => {
              const [year, month] = p.split('-');
              const monthAbbr = getMonthAbbrUpper(parseInt(month));
              return {
                value: p,
                label: `${monthAbbr}/${year}`
              };
            });

          setAvailablePeriods(sortedPeriods);

          if (sortedPeriods.length > 0) {
            const today = new Date();
            const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
            const hasCurrentMonth = sortedPeriods.some(p => p.value === currentMonthStr);

            if (hasCurrentMonth) {
              setStartPeriod(currentMonthStr);
              setEndPeriod(currentMonthStr);
            } else {
              // Otherwise, display the most recent period available in the database
              setStartPeriod(sortedPeriods[0].value);
              setEndPeriod(sortedPeriods[0].value);
            }
          }
        } catch (err) {
          console.error('Catch error discovering periods:', err);
        }
      } else {
        // Sem simulação se o banco estiver desconectado
        setAvailablePeriods([]);
        setStartPeriod('');
        setEndPeriod('');
      }
    };

    discoverPeriods();
  }, []);

  // No longer fetching 30k+ raw records from vw_apontamento reactively to prevent database timeouts/errors
  React.useEffect(() => {
    setIsLoadingApontamentos(false);
    setApontamentos([]);
    setApontamentosError(null);
  }, [periodsInInterval, refreshTrigger]);

  // Map numbers to MonYy format
  const formatMonYy = (anoNum: number, mesNum: number) => {
    const abbrevs = [
      'JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN',
      'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'
    ];
    const abb = abbrevs[mesNum - 1] || 'S/M';
    const yy = String(anoNum).slice(-2);
    return `${abb}/${yy}`;
  };

  // Convert seconds to readable hour format as horas:min:seg
  const formatSecondsToHms = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    const minsStr = String(mins).padStart(2, '0');
    const secsStr = String(secs).padStart(2, '0');
    return `${hrs}:${minsStr}:${secsStr}`;
  };

  // Fetch vwm_agr_hora_cli
  React.useEffect(() => {
    const fetchTempoCli = async () => {
      if (isSupabaseConfigured && supabase) {
        if (periodsInInterval.length === 0) return;

        setIsLoadingTempoCli(true);
        setTempoCliError(null);
        try {
          let allData: any[] = [];
          let page = 0;
          const pageSize = 1000;
          let hasMore = true;

          while (hasMore) {
            let query = supabase
              .from('vwm_agr_hora_cli')
              .select('grupo_raiz, cliente_nome, tipo_pessoa, cliente_ativo, grupo_cliente_nome, ano, mes, tempo_segundos, tempo_horas, valor_lacto');

            if (periodsInInterval.length === 1) {
              const [y, m] = periodsInInterval[0].split('-');
              query = query.eq('ano', parseInt(y)).eq('mes', parseInt(m));
            } else {
              const orCondition = periodsInInterval.map(p => {
                const [y, m] = p.split('-');
                return `and(ano.eq.${parseInt(y)},mes.eq.${parseInt(m)})`;
              }).join(',');

              if (orCondition) {
                query = query.or(orCondition);
              }
            }

            // Show clients ordered alphabetically by cliente_nome
            query = query.order('cliente_nome', { ascending: true });

            const { data, error } = await query.range(page * pageSize, (page + 1) * pageSize - 1);
            if (error) throw error;

            if (data && data.length > 0) {
              allData = [...allData, ...data];
              if (data.length < pageSize) {
                hasMore = false;
              }
            } else {
              hasMore = false;
            }
            page++;
          }
          
          // Group and sum the results by cliente_nome
          const groupedMap = new Map<string, any>();
          
          for (const item of allData) {
            const clientName = item.cliente_nome || 'Sem Nome';
            if (!groupedMap.has(clientName)) {
              groupedMap.set(clientName, {
                grupo_raiz: item.grupo_raiz,
                cliente_nome: clientName,
                tipo_pessoa: item.tipo_pessoa,
                cliente_ativo: item.cliente_ativo,
                grupo_cliente_nome: item.grupo_cliente_nome,
                tempo_segundos: 0,
                valor_lacto: 0,
                ano: item.ano,
                mes: item.mes,
              });
            }
            const current = groupedMap.get(clientName);
            current.tempo_segundos += (item.tempo_segundos || 0);
            current.valor_lacto += (item.valor_lacto || 0);
            if (item.cliente_ativo === true) {
              current.cliente_ativo = true;
            }
            if (item.grupo_raiz && !current.grupo_raiz) {
              current.grupo_raiz = item.grupo_raiz;
            }
            if (item.grupo_cliente_nome && !current.grupo_cliente_nome) {
              current.grupo_cliente_nome = item.grupo_cliente_nome;
            }
          }

          const aggregatedList = Array.from(groupedMap.values());
          
          // Map to match former total_segundos field for downstream code stability
          const mapped = aggregatedList.map((item: any) => ({
            ...item,
            total_segundos: item.tempo_segundos || 0,
            valor_lacto: item.valor_lacto || 0,
          }));

          setTempoCliData(mapped);

          // Also fetch honorarios from viw_acomp_honor_mensal
          let honorList: any[] = [];
          if (periodsInInterval.length > 0) {
            const periodsInt = periodsInInterval.map(p => {
              const [y, m] = p.split('-');
              return parseInt(`${y}${String(m).padStart(2, '0')}`);
            });

            let honPage = 0;
            const honPageSize = 1000;
            let honHasMore = true;

            while (honHasMore) {
              let queryHon = supabase
                .from('viw_acomp_honor_mensal')
                .select('grupo_raiz, cli_codigo, hnr_valor, hnr_periodo_int');

              if (periodsInt.length === 1) {
                queryHon = queryHon.eq('hnr_periodo_int', periodsInt[0]);
              } else if (periodsInt.length > 1) {
                queryHon = queryHon.in('hnr_periodo_int', periodsInt);
              }

              const { data: honData, error: honError } = await queryHon.range(honPage * honPageSize, (honPage + 1) * honPageSize - 1);
              if (honError) {
                console.error('Error fetching honorarios:', honError);
                break;
              }

              if (honData && honData.length > 0) {
                honorList = [...honorList, ...honData];
                if (honData.length < honPageSize) {
                  honHasMore = false;
                }
              } else {
                honHasMore = false;
              }
              honPage++;
            }
          }
          setHonorariosData(honorList);
        } catch (err: any) {
          console.error('Error fetching vwm_agr_hora_cli:', err);
          setTempoCliError(err?.message || 'Erro de conexão com o banco.');
        } finally {
          setIsLoadingTempoCli(false);
        }
      } else {
        // Sem simulação se o banco estiver desconectado
        setTempoCliData([]);
        setHonorariosData([]);
      }
    };

    fetchTempoCli();
  }, [periodsInInterval, refreshTrigger]);

  // Client-side search & filtering logic
  const filteredTempoCli = useMemo(() => {
    let result = [...tempoCliData];
    
    if (tempoCliSearchTerm.trim()) {
      const term = tempoCliSearchTerm.toLowerCase().trim();
      result = result.filter(row => 
        (row.cliente_nome && row.cliente_nome.toLowerCase().includes(term)) ||
        (row.grupo_raiz && row.grupo_raiz.toLowerCase().includes(term))
      );
    }
    
    // Custom dynamic sorting based on user interaction on headers
    result.sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      if (tempoCliSortField === 'cliente_nome') {
        valA = (a.cliente_nome || '').toLowerCase().trim();
        valB = (b.cliente_nome || '').toLowerCase().trim();
        const comp = valA.localeCompare(valB, 'pt-BR');
        if (comp !== 0) return tempoCliSortAsc ? comp : -comp;
      } else if (tempoCliSortField === 'grupo_raiz') {
        valA = (a.grupo_raiz || '').toLowerCase().trim();
        valB = (b.grupo_raiz || '').toLowerCase().trim();
        const comp = valA.localeCompare(valB, 'pt-BR');
        if (comp !== 0) return tempoCliSortAsc ? comp : -comp;
      } else if (tempoCliSortField === 'cliente_codigo') {
        const codeA = String(a.cliente_codigo || '').trim();
        const codeB = String(b.cliente_codigo || '').trim();
        const numA = Number(codeA);
        const numB = Number(codeB);
        if (codeA && codeB && !isNaN(numA) && !isNaN(numB)) {
          if (numA !== numB) return tempoCliSortAsc ? numA - numB : numB - numA;
        } else {
          const comp = codeA.localeCompare(codeB, 'pt-BR');
          if (comp !== 0) return tempoCliSortAsc ? comp : -comp;
        }
      } else if (tempoCliSortField === 'total_segundos') {
        valA = a.total_segundos || 0;
        valB = b.total_segundos || 0;
        if (valA !== valB) return tempoCliSortAsc ? valA - valB : valB - valA;
      } else if (tempoCliSortField === 'valor_lacto') {
        valA = a.valor_lacto || 0;
        valB = b.valor_lacto || 0;
        if (valA !== valB) return tempoCliSortAsc ? valA - valB : valB - valA;
      }

      // Secondary fallback ordering: year, month descending, then name ascending
      if (a.ano !== b.ano) {
        return b.ano - a.ano;
      }
      if (a.mes !== b.mes) {
        return b.mes - a.mes;
      }
      return (a.cliente_nome || '').localeCompare((b.cliente_nome || ''), 'pt-BR');
    });
    
    return result;
  }, [tempoCliData, tempoCliSearchTerm, tempoCliSortField, tempoCliSortAsc]);

  const filteredGroupsData = useMemo(() => {
    const map = new Map<string, any>();
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
      const g = map.get(groupName);
      g.tempo_segundos += cli.total_segundos || 0;
      g.valor_lacto += cli.valor_lacto || 0;
      g.clientes.push(cli);
    });
    return Array.from(map.values()).sort((a, b) => b.tempo_segundos - a.tempo_segundos);
  }, [filteredTempoCli]);

  // Dynamic Score / Ranking calculation based on tempoCliData
  const clientRankings = useMemo(() => {
    const sortedBySeconds = [...tempoCliData].sort((a, b) => (b.total_segundos || 0) - (a.total_segundos || 0));
    const sortedByValor = [...tempoCliData].sort((a, b) => (b.valor_lacto || 0) - (a.valor_lacto || 0));

    const secondsRankMap = new Map<string, number>();
    const valorRankMap = new Map<string, number>();

    let currentRankSec = 1;
    for (let i = 0; i < sortedBySeconds.length; i++) {
      const item = sortedBySeconds[i];
      const key = item.cliente_nome || '';
      if (i > 0 && (sortedBySeconds[i].total_segundos || 0) < (sortedBySeconds[i - 1].total_segundos || 0)) {
        currentRankSec = i + 1;
      }
      secondsRankMap.set(key, currentRankSec);
    }

    let currentRankVal = 1;
    for (let i = 0; i < sortedByValor.length; i++) {
      const item = sortedByValor[i];
      const key = item.cliente_nome || '';
      if (i > 0 && (sortedByValor[i].valor_lacto || 0) < (sortedByValor[i - 1].valor_lacto || 0)) {
        currentRankVal = i + 1;
      }
      valorRankMap.set(key, currentRankVal);
    }

    return { secondsRankMap, valorRankMap };
  }, [tempoCliData]);

  // Dynamic Score / Ranking calculation based on tempoCliData (aggregated by group)
  const groupRankings = useMemo(() => {
    const map = new Map<string, any>();
    tempoCliData.forEach(cli => {
      const groupName = cli.grupo_cliente_nome || 'Sem Grupo';
      if (!map.has(groupName)) {
        map.set(groupName, {
          grupo_cliente_nome: groupName,
          tempo_segundos: 0,
          valor_lacto: 0,
        });
      }
      const g = map.get(groupName);
      g.tempo_segundos += cli.total_segundos || 0;
      g.valor_lacto += cli.valor_lacto || 0;
    });
    
    const allGroups = Array.from(map.values());
    const sortedBySeconds = [...allGroups].sort((a, b) => (b.tempo_segundos || 0) - (a.tempo_segundos || 0));
    const sortedByValor = [...allGroups].sort((a, b) => (b.valor_lacto || 0) - (a.valor_lacto || 0));

    const secondsRankMap = new Map<string, number>();
    const valorRankMap = new Map<string, number>();

    let currentRankSec = 1;
    for (let i = 0; i < sortedBySeconds.length; i++) {
      const item = sortedBySeconds[i];
      const key = item.grupo_cliente_nome;
      if (i > 0 && (sortedBySeconds[i].tempo_segundos || 0) < (sortedBySeconds[i - 1].tempo_segundos || 0)) {
        currentRankSec = i + 1;
      }
      secondsRankMap.set(key, currentRankSec);
    }

    let currentRankVal = 1;
    for (let i = 0; i < sortedByValor.length; i++) {
      const item = sortedByValor[i];
      const key = item.grupo_cliente_nome;
      if (i > 0 && (sortedByValor[i].valor_lacto || 0) < (sortedByValor[i - 1].valor_lacto || 0)) {
        currentRankVal = i + 1;
      }
      valorRankMap.set(key, currentRankVal);
    }

    return { secondsRankMap, valorRankMap };
  }, [tempoCliData]);

  // Fetch historical 12-month chart data (Acompanhamento de Horas) from viw_resumo_hora_mes
  React.useEffect(() => {
    const fetchChartData = async () => {
      // Determine the 12 months ending in the currently selected period (or the latest month)
      let refPeriod = endPeriod;
      if (!refPeriod) {
        refPeriod = availablePeriods.length > 0 ? availablePeriods[0].value : '2026-06';
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

      const targetYears = Array.from(new Set(targets.map(t => parseInt(t.split('-')[0]))));

      if (isSupabaseConfigured && supabase) {
        setIsLoadingChart(true);
        try {
          const aggMap: Record<string, number> = {};
          const hmsMap: Record<string, string> = {};
          targets.forEach(t => { 
            aggMap[t] = 0; 
            hmsMap[t] = '00:00:00';
          });

          // Fetch from the new highly accurate view
          const { data, error } = await supabase
            .from('viw_resumo_hora_mes')
            .select('ano, mes, tempo_segundos, tempo_horas');
          
          if (error) throw error;

          data?.forEach((row: any) => {
            const pKey = `${row.ano}-${String(row.mes).padStart(2, '0')}`;
            if (pKey in aggMap) {
              aggMap[pKey] = row.tempo_segundos || 0;
              hmsMap[pKey] = row.tempo_horas || '00:00:00';
            }
          });

          const formattedChart = targets.map((t) => {
            const [yStr, mStr] = t.split('-');
            const mNum = parseInt(mStr);
            const label = formatMonYy(parseInt(yStr), mNum);
            const totalSecs = aggMap[t] || 0;
            const hmsValue = hmsMap[t] || formatSecondsToHms(totalSecs);
            return {
              label,
              value: totalSecs,
              hms: hmsValue,
              active: periodsInInterval.includes(t)
            };
          });

          setHoursHistoryData(formattedChart);
        } catch (err) {
          console.error('Error fetching historical chart hours from viw_resumo_hora_mes:', err);
        } finally {
          setIsLoadingChart(false);
        }
      } else {
        // Sem simulação se o banco estiver desconectado
        setHoursHistoryData([]);
      }
    };

    fetchChartData();
  }, [startPeriod, endPeriod, periodsInInterval, availablePeriods, refreshTrigger]);

  // Fetch or mock total hours specifically from viw_resumo_hora_mes for Card 2
  React.useEffect(() => {
    const fetchTotalHoursCard = async () => {
      if (isSupabaseConfigured && supabase) {
        if (periodsInInterval.length === 0) return;

        setIsLoadingTotalHours(true);
        try {
          let query = supabase
            .from('viw_resumo_hora_mes')
            .select('*');

          if (periodsInInterval.length === 1) {
            const [y, m] = periodsInInterval[0].split('-');
            query = query.eq('ano', parseInt(y)).eq('mes', parseInt(m));
          } else {
            const orCondition = periodsInInterval.map(p => {
              const [y, m] = p.split('-');
              return `and(ano.eq.${parseInt(y)},mes.eq.${parseInt(m)})`;
            }).join(',');

            if (orCondition) {
              query = query.or(orCondition);
            }
          }

          const { data, error } = await query;
          if (error) throw error;

          const totalSecs = data?.reduce((acc: number, cur: any) => acc + (cur.tempo_segundos || 0), 0) || 0;
          setTotalHoursFromResumo(formatSecondsToHms(totalSecs));
          setTotalSecondsFromResumo(totalSecs);
        } catch (err) {
          console.error('Error fetching card total hours from viw_resumo_hora_mes:', err);
          setTotalHoursFromResumo('00:00:00');
          setTotalSecondsFromResumo(0);
        } finally {
          setIsLoadingTotalHours(false);
        }
      } else {
        // Sem simulação se o banco estiver desconectado
        setTotalHoursFromResumo('00:00:00');
        setTotalSecondsFromResumo(0);
      }
    };

    fetchTotalHoursCard();
  }, [periodsInInterval, refreshTrigger]);

  // Fetch previous year metrics reactively when prevYearPeriodsInInterval changes
  React.useEffect(() => {
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
        setPrevTotalHours(null);
        setPrevTotalSeconds(null);
        return;
      }

      setIsLoadingPrevMetrics(true);
      try {
        // 1. Fetch vwm_agr_hora_cli for previous year interval to get distinct clients and total valor_lacto
        let colabData: any[] = [];
        let page = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
          let queryColab = supabase
            .from('vwm_agr_hora_cli')
            .select('*');

          const prevYears = Array.from(new Set(validPrevPeriods.map(p => parseInt(p.split('-')[0]))));
          if (prevYears.length > 0) {
            queryColab = queryColab.in('ano', prevYears);
          }

          const { data, error: colabError } = await queryColab.range(page * pageSize, (page + 1) * pageSize - 1);
          if (colabError) throw colabError;

          if (data && data.length > 0) {
            const validSet = new Set(validPrevPeriods.map(p => {
              const [y, m] = p.split('-');
              return `${parseInt(y)}-${parseInt(m)}`;
            }));
            const filteredData = data.filter((row: any) => validSet.has(`${row.ano}-${row.mes}`));
            colabData = [...colabData, ...filteredData];
            if (data.length < pageSize) {
              hasMore = false;
            }
          } else {
            hasMore = false;
          }
          page++;
        }

        const uniqueClients = new Set<string>();
        let sumValorLacto = 0;
        colabData.forEach((row: any) => {
          if (row.cliente_nome && row.cliente_nome.trim() !== '') {
            uniqueClients.add(row.cliente_nome.trim());
          }
          sumValorLacto += Number(row.valor_lacto || 0);
        });

        setPrevDistinctClients(uniqueClients.size);
        setPrevTotalValorLacto(sumValorLacto);

        // 2. Fetch viw_resumo_hora_mes for previous year interval to get total hours and total seconds
        let queryHours = supabase
          .from('viw_resumo_hora_mes')
          .select('*');

        const prevYearsHours = Array.from(new Set(validPrevPeriods.map(p => parseInt(p.split('-')[0]))));
        if (prevYearsHours.length > 0) {
          queryHours = queryHours.in('ano', prevYearsHours);
        }

        const { data: hoursData, error: hoursError } = await queryHours;
        if (hoursError) throw hoursError;

        const validSetHours = new Set(validPrevPeriods.map(p => {
          const [y, m] = p.split('-');
          return `${parseInt(y)}-${parseInt(m)}`;
        }));
        const filteredHoursData = hoursData?.filter((row: any) => validSetHours.has(`${row.ano}-${row.mes}`)) || [];

        const totalSecs = filteredHoursData.reduce((acc: number, cur: any) => acc + (cur.tempo_segundos || 0), 0) || 0;
        setPrevTotalHours(formatSecondsToHms(totalSecs));
        setPrevTotalSeconds(totalSecs);

      } catch (err) {
        console.error('Error fetching previous year metrics DETAILS:', JSON.stringify(err, null, 2), err);
        setPrevDistinctClients(0);
        setPrevTotalValorLacto(0);
        setPrevTotalHours('00:00:00');
        setPrevTotalSeconds(0);
      } finally {
        setIsLoadingPrevMetrics(false);
      }
    };

    fetchPreviousYearMetrics();
  }, [prevYearPeriodsInInterval, refreshTrigger]);

  const apontamentosMetrics = useMemo(() => {
    let clientSet = new Set<string>();
    let totalSeconds = 0;

    tempoCliData.forEach((row) => {
      // Find client using 'cliente_nome' as requested
      const clientVal = row.cliente_nome;
      if (clientVal !== undefined && clientVal !== null && String(clientVal).trim() !== '') {
        clientSet.add(String(clientVal).trim());
      }

      // Sum seconds
      const seconds = Number(row.total_segundos || 0);
      totalSeconds += seconds;
    });

    // Format HHH:MM:SS
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    
    const formattedHours = String(hours).padStart(2, '0');
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSecs = String(secs).padStart(2, '0');
    const formattedDuration = `${formattedHours}:${formattedMinutes}:${formattedSecs}`;

    return {
      distinctClients: clientSet.size,
      distinctTasks: 0,
      totalHours: formattedDuration,
      totalSeconds
    };
  }, [tempoCliData]);

  const totalValorLacto = useMemo(() => {
    return tempoCliData.reduce((acc, curr) => acc + (curr.valor_lacto || 0), 0);
  }, [tempoCliData]);

  // New Contract temporal state
  const [newContractName, setNewContractName] = useState('');
  const [newRentability, setNewRentability] = useState('15.0');
  const [newImpact, setNewImpact] = useState('-25000');
  const [newDeviation, setNewDeviation] = useState('12.5');
  const [newMotive, setNewMotive] = useState(motives[0] || 'Outros');
  const [newAction, setNewAction] = useState(actions[0]?.name || 'Sem ação');
  const [newResponsible, setNewResponsible] = useState('Alex Thompson');

  // Helper to determine status color relative to Sinaleira limits
  const getSinaleiraStatus = (deviation: number) => {
    if (deviation >= sinaleira.critico.min) {
      return { label: sinaleira.critico.name, color: sinaleira.critico.color, level: 'alto' };
    } else if (deviation >= sinaleira.atencao.min) {
      return { label: sinaleira.atencao.name, color: sinaleira.atencao.color, level: 'medio' };
    } else {
      return { label: sinaleira.dentro.name, color: sinaleira.dentro.color, level: 'estavel' };
    }
  };

  // Filter & Search logic
  const filteredContracts = useMemo(() => {
    return contracts
      .filter((c) => {
        const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              c.responsible.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              c.motive.toLowerCase().includes(searchTerm.toLowerCase());
        
        const status = getSinaleiraStatus(c.deviation);
        const matchesFilter = riskFilter === 'all' || status.level === riskFilter;

        return matchesSearch && matchesFilter;
      })
      // Sort: High deviation first
      .sort((a, b) => b.deviation - a.deviation);
  }, [contracts, searchTerm, riskFilter, sinaleira]);

  // Formatter for Currency
  const formatBRL = (value: number) => {
    const isNegative = value < 0;
    const absValue = Math.abs(value);
    const formatted = absValue.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    return `${isNegative ? '- ' : '' }R$ ${formatted}`;
  };

  // Dynamic values calculated from current loaded contracts
  const totals = useMemo(() => {
    const totalImpact = contracts.reduce((acc, curr) => acc + curr.monthlyImpact, 0);
    const avgRentability = contracts.length > 0 
      ? contracts.reduce((acc, curr) => acc + curr.rentability, 0) / contracts.length
      : 0;
    
    // Count active risk priorities
    let highCount = 0;
    let mediumCount = 0;
    let greenCount = 0;
    contracts.forEach(c => {
      const level = getSinaleiraStatus(c.deviation).level;
      if (level === 'alto') highCount++;
      else if (level === 'medio') mediumCount++;
      else greenCount++;
    });

    return {
      totalImpact,
      avgRentability,
      highCount,
      mediumCount,
      greenCount
    };
  }, [contracts, sinaleira]);

  const handleExportPDF = () => {
    setIsExporting(true);
    setExportMessage('Consolidando dados financeiros e estruturantes...');
    setTimeout(() => {
      setExportMessage('Gerando layout vetorial em alta resolução (PDF)...');
      setTimeout(() => {
        setExportMessage('Relatório SEXTANTE_CONTROLE_FINANCEIRO.pdf pronto para salvar!');
        setTimeout(() => {
          setIsExporting(false);
          setExportMessage('');
          alert('Relatório consolidado exportado com sucesso! Arquivo: SEXTANTE_FINANCEIRO_COMPLETO.pdf');
        }, 1200);
      }, 1000);
    }, 1000);
  };

  const handleCreateContract = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContractName.trim()) return;

    const newObj: Contract = {
      id: Math.random().toString(36).substr(2, 9),
      name: newContractName,
      rentability: parseFloat(newRentability) || 15.0,
      monthlyImpact: parseFloat(newImpact) || -10000,
      deviation: parseFloat(newDeviation) || 10.0,
      motive: newMotive,
      action: newAction,
      responsible: newResponsible
    };

    onAddContract(newObj);
    // Reset state
    setNewContractName('');
    setNewRentability('15.0');
    setNewImpact('-25000');
    setNewDeviation('12.5');
    setShowAddForm(false);
  };

  const { currentLabel, prevLabel, isAllPeriod } = useMemo(() => {
    if (!startPeriod || !endPeriod) {
      return { currentLabel: 'Nenhum', prevLabel: '--', isAllPeriod: true };
    }

    const [startYStr, startMStr] = startPeriod.split('-');
    const [endYStr, endMStr] = endPeriod.split('-');

    const startLabel = formatMonYy(parseInt(startYStr), parseInt(startMStr));
    const endLabel = formatMonYy(parseInt(endYStr), parseInt(endMStr));

    const prevStartLabel = formatMonYy(parseInt(startYStr) - 1, parseInt(startMStr));
    const prevEndLabel = formatMonYy(parseInt(endYStr) - 1, parseInt(endMStr));

    if (startPeriod === endPeriod) {
      return {
        currentLabel: startLabel,
        prevLabel: prevStartLabel,
        isAllPeriod: false
      };
    }

    return {
      currentLabel: `${startLabel} - ${endLabel}`,
      prevLabel: `${prevStartLabel} - ${prevEndLabel}`,
      isAllPeriod: false
    };
  }, [startPeriod, endPeriod]);

  const renderComparison = (
    currentValue: number,
    prevValue: number | null,
    prevLabelStr: string,
    valueType: 'number' | 'currency' | 'duration'
  ) => {
    if (isAllPeriod) {
      return null;
    }

    if (prevValue === null || isLoadingPrevMetrics) {
      return (
        <div className="mt-3 pt-3 border-t border-brand-border/30 flex items-center justify-between text-xs text-brand-text-muted/50 select-none animate-pulse">
          <span>vs {prevLabelStr}: --</span>
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider">Carregando...</span>
        </div>
      );
    }

    const delta = prevValue === 0 ? (currentValue > 0 ? 100 : 0) : ((currentValue - prevValue) / prevValue) * 100;
    const isPositive = delta > 0;
    const isZero = Math.abs(delta) < 0.01;

    let formattedPrev = '';
    if (valueType === 'number') {
      formattedPrev = String(prevValue);
    } else if (valueType === 'currency') {
      formattedPrev = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(prevValue);
    } else if (valueType === 'duration') {
      formattedPrev = prevTotalHours || '00:00:00';
    }

    return (
      <div className="mt-3 pt-3 border-t border-brand-border/30 flex items-center justify-between text-sm select-none">
        <div className="flex items-center gap-1.5 text-brand-text-muted/80 text-[13px] sm:text-sm">
          <span>vs {prevLabelStr}:</span>
          <span className="font-extrabold text-white">{formattedPrev}</span>
        </div>
        <div className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${
          isZero 
            ? 'bg-slate-500/10 text-slate-400 border border-slate-500/20' 
            : isPositive 
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
        }`}>
          {!isZero && (isPositive ? '+' : '')}
          {delta.toFixed(1)}%
        </div>
      </div>
    );
  };

  const maxHoursVal = Math.max(...hoursHistoryData.map(d => d.value), 3600);
  const avgHoursVal = hoursHistoryData.length > 0 ? Math.round(hoursHistoryData.reduce((acc, curr) => acc + curr.value, 0) / hoursHistoryData.length) : 0;
  const avgSelectedHoursVal = (() => {
    const selected = hoursHistoryData.filter(d => d.active);
    if (selected.length === 0) return 0;
    return Math.round(selected.reduce((acc, curr) => acc + curr.value, 0) / selected.length);
  })();
  const activeRange = (() => {
    const first = hoursHistoryData.findIndex(d => d.active);
    const last = hoursHistoryData.map(d => d.active).lastIndexOf(true);
    return { first, last, count: hoursHistoryData.filter(d => d.active).length };
  })();

  return (
    <div id="dashboard-view-root" className="flex-1 p-8 overflow-y-auto max-w-7xl mx-auto w-full space-y-8">
      
      {/* Top Header Row */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-brand-border/40 pb-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white mb-1">
            Controle Financeiro Executivo
          </h2>
          <p className="text-sm font-medium text-brand-text-muted">
            Monitore a rentabilidade de contratos corporativos e tome decisões ágeis fundamentadas em desvios.
          </p>
        </div>

        {/* Global Toolbar */}
        <div className="flex items-center gap-4 w-full sm:w-auto">
          {/* Custom Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-muted/50" size={16} />
            <input
              type="text"
              id="global-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Procurar contrato..."
              className="w-full bg-brand-bg text-brand-text placeholder-brand-text-muted/45 pl-9 pr-4 py-2 rounded border border-brand-border hover:border-brand-text-muted/40 focus:border-brand-primary outline-none text-sm transition-all duration-200"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-brand-primary font-bold hover:underline"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Simple controls */}
          <button className="p-2 rounded bg-brand-card hover:bg-brand-card-bright text-brand-text-muted hover:text-white transition-colors relative">
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-brand-accent animate-pulse" />
            <Bell size={18} />
          </button>
        </div>
      </header>

      {/* PDF Export Floating Overlay Status */}
      {isExporting && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-brand-card p-8 rounded-lg max-w-md w-full border border-brand-border text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full border-4 border-brand-accent border-t-transparent animate-spin mx-auto" />
            <h3 className="font-extrabold text-xl text-white">Exportação Ativa</h3>
            <p className="text-brand-text-muted text-sm">{exportMessage}</p>
          </div>
        </div>
      )}

      {/* 3 New Dynamic Cards from vw_apontamento */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in" id="apontamentos-summary-metrics">
        
        {/* Card 1: Empresas Distintas */}
        <div className="bg-brand-card rounded-lg p-6 border border-brand-border border-l-4 border-l-brand-accent relative overflow-hidden group shadow-md transition-all duration-200 hover:border-brand-primary/20 flex flex-col justify-between">
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider text-brand-text-muted/80 uppercase block">
                  Empresas Distintas ({currentLabel})
                </span>
                {isSupabaseConfigured && (
                  <span className="text-[9px] font-mono bg-brand-primary/10 text-brand-primary px-1.5 py-0.5 rounded border border-brand-primary/20">
                    Real-Time
                  </span>
                )}
              </div>
              <h3 className="text-4xl font-extrabold text-white tracking-tight leading-none mb-3 mt-2">
                {isLoadingApontamentos ? (
                  <span className="animate-pulse opacity-50 text-xl font-medium text-brand-text-muted">...</span>
                ) : (
                  apontamentosMetrics.distinctClients
                )}
              </h3>
            </div>
          </div>
          {renderComparison(
            apontamentosMetrics.distinctClients,
            prevDistinctClients,
            prevLabel,
            'number'
          )}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-text-muted/5 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
            <Users size={80} />
          </div>
        </div>

        {/* Card 2: Valor Total */}
        <div className="bg-brand-card rounded-lg p-6 border border-brand-border border-l-4 border-l-brand-accent relative overflow-hidden group shadow-md transition-all duration-200 hover:border-brand-primary/20 flex flex-col justify-between">
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider text-brand-text-muted/80 uppercase block">
                  Valor Total ({currentLabel})
                </span>
                {isSupabaseConfigured && (
                  <span className="text-[9px] font-mono bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/20">
                    BRL
                  </span>
                )}
              </div>
              <h3 className="text-3xl font-black text-amber-500 tracking-tight leading-none mb-3 mt-2.5 font-mono">
                {isLoadingTempoCli ? (
                  <span className="animate-pulse opacity-50 text-xl font-medium text-brand-text-muted">...</span>
                ) : (
                  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValorLacto)
                )}
              </h3>
            </div>
          </div>
          {renderComparison(
            totalValorLacto,
            prevTotalValorLacto,
            prevLabel,
            'currency'
          )}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-text-muted/5 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
            <DollarSign size={80} />
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
                {isSupabaseConfigured && (
                  <span className="text-[9px] font-mono bg-brand-primary/10 text-brand-primary px-1.5 py-0.5 rounded border border-brand-primary/20">
                    Real-Time
                  </span>
                )}
              </div>
              <h3 className="text-3xl font-black text-white tracking-tight leading-none mb-3 mt-2.5 font-mono">
                {isLoadingTotalHours ? (
                  <span className="animate-pulse opacity-50 text-xl font-medium text-brand-text-muted">...</span>
                ) : totalHoursFromResumo !== null ? (
                  totalHoursFromResumo
                ) : isLoadingApontamentos ? (
                  <span className="animate-pulse opacity-50 text-xl font-medium text-brand-text-muted">...</span>
                ) : (
                  apontamentosMetrics.totalHours
                )}
              </h3>
            </div>
          </div>
          {renderComparison(
            totalSecondsFromResumo !== null ? totalSecondsFromResumo : apontamentosMetrics.totalSeconds,
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
              Horas por Cliente
              <span className="text-[11px] font-semibold bg-brand-accent/20 text-brand-primary border border-brand-accent/30 py-0.5 px-2.5 rounded-full">
                {filteredTempoCli.length} registros
              </span>
            </h3>
            <p className="text-xs text-brand-text-muted/80 mt-1">
              Visualização consolidada de apontamento de horas
            </p>
          </div>

          {/* Table Filters Toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex bg-brand-bg/60 border border-brand-border rounded p-0.5">
              <button
                onClick={() => setHoursViewMode('cliente')}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded transition-colors ${hoursViewMode === 'cliente' ? 'bg-brand-primary text-brand-card' : 'text-brand-text-muted hover:text-white'}`}
              >
                Por Cliente
              </button>
              <button
                onClick={() => setHoursViewMode('grupo')}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded transition-colors ${hoursViewMode === 'grupo' ? 'bg-brand-primary text-brand-card' : 'text-brand-text-muted hover:text-white'}`}
              >
                Por Grupo
              </button>
            </div>
            
            {/* Global Search */}
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-muted/50" size={14} />
              <input
                type="text"
                value={tempoCliSearchTerm}
                onChange={(e) => setTempoCliSearchTerm(e.target.value)}
                placeholder="Nome ou Grupo Raiz..."
                className="w-full bg-brand-bg text-brand-text placeholder-brand-text-muted/40 pl-9 pr-3 py-1.5 rounded border border-brand-border focus:border-brand-primary outline-none text-xs transition-colors"
                id="client-hours-search"
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

            {/* Filtro Geral Ativo Select - Início e Fim */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-brand-bg/60 border border-brand-border py-1.5 px-3 rounded text-xs text-brand-text-muted font-semibold" id="client-hours-period-info">
              <div className="flex items-center gap-2 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse inline-block shrink-0" />
                <span className="text-[10px] uppercase tracking-wider font-bold text-brand-text-muted/80">Período:</span>
                {(isLoadingApontamentos || isLoadingTempoCli) ? (
                  <RefreshCw size={11} className="animate-spin text-brand-primary shrink-0" />
                ) : null}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-brand-text-muted/60 font-bold uppercase tracking-wide">DE</span>
                <select
                  value={startPeriod}
                  onChange={(e) => {
                    const val = e.target.value;
                    setStartPeriod(val);
                    if (val > endPeriod) {
                      setEndPeriod(val);
                    }
                  }}
                  className="bg-brand-card-bright text-white border-0 py-1 pl-2 pr-6 rounded font-extrabold text-[11px] tracking-wider outline-none focus:ring-1 focus:ring-brand-primary cursor-pointer uppercase transition-all duration-205"
                >
                  {availablePeriods.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>

                <span className="text-[10px] text-brand-text-muted/60 font-bold uppercase tracking-wide ml-1">ATÉ</span>
                <select
                  value={endPeriod}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEndPeriod(val);
                    if (val < startPeriod) {
                      setStartPeriod(val);
                    }
                  }}
                  className="bg-brand-card-bright text-white border-0 py-1 pl-2 pr-6 rounded font-extrabold text-[11px] tracking-wider outline-none focus:ring-1 focus:ring-brand-primary cursor-pointer uppercase transition-all duration-205"
                >
                  {availablePeriods.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Responsive Scrollable Client Hours Table */}
        <div className="overflow-auto max-h-[450px] border border-brand-border/30 rounded-lg mt-6 bg-brand-bg/25 relative custom-scrollbar">
          {isLoadingTempoCli ? (
            <div className="py-20 text-center text-brand-text-muted italic flex flex-col items-center justify-center gap-3">
              <RefreshCw className="animate-spin text-brand-primary" size={24} />
              <span className="text-sm">Carregando dados da view de horas do Supabase...</span>
            </div>
          ) : tempoCliError ? (
            <div className="py-16 text-center text-red-400 font-medium">
              <p>Ocorreu um erro ao carregar os dados: {tempoCliError}</p>
              <button
                type="button"
                onClick={() => setRefreshTrigger(prev => prev + 1)}
                className="mt-3 px-3 py-1.5 bg-brand-primary/10 hover:bg-brand-primary/20 border border-brand-primary/20 text-brand-primary rounded text-xs transition-colors"
              >
                Tentar novamente
              </button>
            </div>
          ) : filteredTempoCli.length === 0 ? (
            <div className="py-16 text-center text-brand-text-muted/60 italic text-sm">
              Nenhuma correspondência encontrada com os filtros atuais.
            </div>
          ) : (
            (() => {
              const totalFilteredValorLacto = filteredTempoCli.reduce((acc, curr) => acc + (curr.valor_lacto || 0), 0);
              return hoursViewMode === 'grupo' ? (
                  <table className="w-full text-left border-collapse" id="group-hours-table">
                    <thead className="sticky top-0 bg-brand-card-light z-10 shadow border-b border-brand-border/60">
                      <tr className="text-[11px] font-bold text-brand-text-muted/80 tracking-wider uppercase select-none">
                        <th className="py-3 px-3 w-1/3 bg-brand-card-light">Grupo de Clientes</th>
                        <th className="py-3 px-3 text-center bg-brand-card-light w-24">Score</th>
                        <th className="py-3 px-4 text-center bg-brand-card-light w-32">
                          <div className="flex items-center justify-center gap-1.5">
                            <Clock size={12} className="text-brand-text-muted/50" />
                            <span>Horas</span>
                          </div>
                        </th>
                        <th className="py-3 px-4 text-right bg-brand-card-light w-32">Valor Lançamento</th>
                        <th className="py-3 px-4 text-right bg-brand-card-light w-32">Honorário</th>
                        <th className="py-3 px-4 text-right bg-brand-card-light w-20">% Share</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border/30 font-sans text-xs">
                      {filteredGroupsData.map((group, gIdx) => {
                        const sharePercent = totalFilteredValorLacto > 0 ? (group.valor_lacto / totalFilteredValorLacto) * 100 : 0;
                        const isExpanded = expandedGroups.has(group.grupo_cliente_nome);
                        const isLoading = loadingGroupDepts[group.grupo_cliente_nome];
                        const deptData = groupDeptData[group.grupo_cliente_nome];
                        
                        const rankSec = groupRankings.secondsRankMap.get(group.grupo_cliente_nome) || 1;
                        const rankVal = groupRankings.valorRankMap.get(group.grupo_cliente_nome) || 1;
                        const scoreStr = `${String(rankSec).padStart(3, '0')}/${String(rankVal).padStart(3, '0')}`;

                        return (
                          <React.Fragment key={`grp_${gIdx}`}>
                            <tr className="hover:bg-brand-card-bright/10 transition-colors group">
                              <td className="py-3.5 px-3 font-mono">
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => toggleGroupExpand(group.grupo_cliente_nome, group.clientes)}
                                    className="p-1 rounded text-brand-text-muted hover:text-brand-primary hover:bg-brand-primary/10 transition-colors focus:outline-none cursor-pointer"
                                  >
                                    {isExpanded ? <ChevronDown size={14} className="text-brand-primary" /> : <ChevronRight size={14} />}
                                  </button>
                                  <span className="font-extrabold text-[13px] text-white group-hover:text-brand-primary transition-colors block">
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
                              <td className="py-3.5 px-4 text-right">
                                <span className="font-mono text-sm font-extrabold text-amber-500">
                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(group.valor_lacto)}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <span className="font-mono text-sm font-extrabold text-sky-400">
                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(honorariosByGrupoCliente.get(group.grupo_cliente_nome) || 0)}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono font-bold text-[11px] text-emerald-400">
                                {sharePercent.toFixed(1)}%
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr className="bg-brand-bg/40 border-t border-brand-border/30">
                                <td colSpan={6} className="p-0">
                                  {isLoading ? (
                                    <div className="py-8 text-center flex flex-col items-center justify-center gap-2 text-brand-text-muted">
                                      <RefreshCw className="animate-spin text-brand-primary" size={16} />
                                      <span className="text-xs">Carregando departamentos...</span>
                                    </div>
                                  ) : deptData && deptData.length > 0 ? (
                                    <div className="p-4 pl-10 border-l-2 border-brand-primary/30">
                                      <table className="w-full text-left text-[11px]">
                                        <thead>
                                          <tr className="text-brand-text-muted/60 uppercase font-bold border-b border-brand-border/40">
                                            <th className="pb-2">Departamento</th>
                                            <th className="pb-2 text-right">Horas</th>
                                            <th className="pb-2 text-right">Valor</th>
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
                                                <tr className="hover:bg-brand-card-light transition-colors group/dept">
                                                  <td className="py-2 flex items-center gap-2">
                                                    <button
                                                      type="button"
                                                      onClick={() => toggleGroupDeptExpand(group.grupo_cliente_nome, dept.setor)}
                                                      className="p-1 rounded text-brand-text-muted hover:text-white hover:bg-brand-border/40 transition-colors focus:outline-none cursor-pointer"
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
                                                  <td className="py-2 text-right font-mono text-amber-500 font-semibold">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dept.valor_lacto || 0)}
                                                  </td>
                                                  <td className="py-2 text-right font-mono text-[11px]">
                                                    <div className="flex flex-col items-end">
                                                      <span className="text-brand-primary font-bold">
                                                        {hoursShare.toFixed(1)}% <span className="text-[9px] text-brand-text-muted font-normal">(Horas)</span>
                                                      </span>
                                                      <span className="text-emerald-400 font-bold">
                                                        {valorShare.toFixed(1)}% <span className="text-[9px] text-brand-text-muted font-normal">(Valor)</span>
                                                      </span>
                                                    </div>
                                                  </td>
                                                </tr>
                                                {isDeptExpanded && dept.clientes && dept.clientes.length > 0 && (
                                                  <tr className="bg-black/20">
                                                    <td colSpan={5} className="p-0">
                                                      <div className="pl-14 pr-4 py-3 border-l-2 border-brand-accent/30 bg-brand-bg/50">
                                                        <table className="w-full text-left text-[10px]">
                                                          <thead>
                                                            <tr className="text-brand-text-muted/50 uppercase font-bold border-b border-brand-border/20">
                                                              <th className="pb-1.5">Cliente</th>
                                                              <th className="pb-1.5 text-right">Horas</th>
                                                              <th className="pb-1.5 text-right">Valor</th>
                                                            </tr>
                                                          </thead>
                                                          <tbody className="divide-y divide-brand-border/10">
                                                            {dept.clientes.map((cli: any, cIdx: number) => (
                                                              <tr key={`cli_${cIdx}`} className="hover:bg-brand-card transition-colors">
                                                                <td className="py-1.5 text-white font-medium">
                                                                  {cli.cliente_nome}
                                                                </td>
                                                                <td className="py-1.5 text-right font-mono text-brand-text-muted">
                                                                  {formatSecondsToHms(cli.tempo_segundos)}
                                                                </td>
                                                                <td className="py-1.5 text-right font-mono text-brand-text-muted">
                                                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cli.valor_lacto)}
                                                                </td>
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
                                  ) : (
                                    <div className="py-8 text-center text-brand-text-muted/60 text-xs italic">
                                      Nenhum apontamento detalhado encontrado para este grupo.
                                    </div>
                                  )}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-brand-bg/80 border-t-2 border-brand-border/80 sticky bottom-0 z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.2)]">
                      <tr className="text-xs uppercase tracking-wider font-extrabold text-white">
                        <td className="py-3 px-3">Total Acumulado</td>
                        <td className="py-3 px-3"></td>
                        <td className="py-3 px-4 text-center text-brand-primary">
                          {formatSecondsToHms(filteredGroupsData.reduce((acc, curr) => acc + curr.tempo_segundos, 0))}
                        </td>
                        <td className="py-3 px-4 text-right text-amber-500">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalFilteredValorLacto)}
                        </td>
                        <td className="py-3 px-4 text-right text-sky-400">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                            filteredGroupsData.reduce((acc, curr) => acc + (honorariosByGrupoCliente.get(curr.grupo_cliente_nome) || 0), 0)
                          )}
                        </td>
                        <td className="py-3 px-4 text-right text-emerald-400">100.0%</td>
                      </tr>
                    </tfoot>
                  </table>
                ) : (
<table className="w-full text-left border-collapse" id="client-hours-table">
                  <thead className="sticky top-0 bg-brand-card-light z-10 shadow border-b border-brand-border/60">
                    <tr className="text-[11px] font-bold text-brand-text-muted/80 tracking-wider uppercase select-none">
                      <th className="py-3 px-3 w-1/6 bg-brand-card-light">
                        <button 
                          type="button" 
                          onClick={() => handleSortTempoCli('grupo_raiz')}
                          className="flex items-center gap-1.5 hover:text-white transition-colors focus:outline-none cursor-pointer"
                        >
                          Grupo Raiz
                          {renderSortIcon('grupo_raiz')}
                        </button>
                      </th>
                      <th className="py-3 px-3 w-1/3 bg-brand-card-light">
                        <button 
                          type="button" 
                          onClick={() => handleSortTempoCli('cliente_nome')}
                          className="flex items-center gap-1.5 hover:text-white transition-colors focus:outline-none cursor-pointer"
                          title="Ordenar por Nome de Cliente"
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
                            className="flex items-center gap-1.5 hover:text-white transition-colors focus:outline-none cursor-pointer"
                            title="Ordenar por Total de Horas"
                          >
                            Horas Trabalhadas
                            {renderSortIcon('total_segundos')}
                          </button>
                        </div>
                      </th>
                      <th className="py-3 px-4 bg-brand-card-light">
                        <div className="flex justify-end">
                          <button 
                            type="button" 
                            onClick={() => handleSortTempoCli('valor_lacto')}
                            className="flex items-center gap-1.5 hover:text-white transition-colors focus:outline-none cursor-pointer"
                            title="Ordenar por Valor Lançamento"
                          >
                            Valor Lançamento
                            {renderSortIcon('valor_lacto')}
                          </button>
                        </div>
                      </th>
                      <th className="py-3 px-4 text-right bg-brand-card-light w-32">Honorário</th>
                      <th className="py-3 px-4 text-right bg-brand-card-light w-20">% Share</th>
                      <th className="py-3 px-4 text-center bg-brand-card-light w-20">Detalhes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border/30 font-sans text-xs">
                    {filteredTempoCli.map((row, index) => {
                      const isCliAtivo = row.cliente_ativo === true;
                      const sharePercent = totalFilteredValorLacto > 0 ? ((row.valor_lacto || 0) / totalFilteredValorLacto) * 100 : 0;

                      const key = row.cliente_nome || '';
                      const rankSec = clientRankings.secondsRankMap.get(key) || 1;
                      const rankVal = clientRankings.valorRankMap.get(key) || 1;
                      const scoreStr = `${String(rankSec).padStart(3, '0')}/${String(rankVal).padStart(3, '0')}`;

                      return (
                        <React.Fragment key={`${row.grupo_raiz || ''}_${row.cliente_nome || ''}_${index}`}>
                          <tr className="hover:bg-brand-card-bright/10 transition-colors group">
                            {/* Grupo Raiz Badge */}
                            <td className="py-3.5 px-3 font-mono">
                              <span className="bg-brand-bg border border-brand-border text-brand-primary/80 font-bold px-2 py-0.5 rounded select-all">
                                {row.grupo_raiz || 'N/A'}
                              </span>
                            </td>

                            {/* Cliente Nome and Código */}
                            <td className="py-3.5 px-3">
                              <div className="flex items-center gap-2">
                                {/* Chevron expander */}
                                <button
                                  type="button"
                                  onClick={() => toggleClientExpand(row)}
                                  className="p-1 rounded text-brand-text-muted hover:text-brand-primary hover:bg-brand-primary/10 transition-colors focus:outline-none cursor-pointer"
                                  title="Expandir/Recolher departamentos"
                                >
                                  {expandedClients.has(key) ? (
                                    <ChevronDown size={14} className="text-brand-primary" />
                                  ) : (
                                    <ChevronRight size={14} />
                                  )}
                                </button>

                                <span 
                                  className={`w-2 h-2 rounded-full inline-block shrink-0 ${isCliAtivo ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-gray-500 shadow-[0_0_6px_rgba(100,116,139,0.4)]'}`} 
                                  title={isCliAtivo ? 'Cliente Ativo' : 'Cliente Inativo'} 
                                />
                                <div>
                                  <span className="font-extrabold text-[13px] text-white group-hover:text-brand-primary transition-colors block">
                                    {row.cliente_nome || 'Sem Nome'}
                                  </span>
                                  {row.grupo_cliente_nome && (
                                    <span className="text-[9px] text-brand-text-muted bg-brand-primary/10 border border-brand-primary/20 px-1.5 py-0.5 rounded font-mono font-bold uppercase inline-block mt-1">GRP: {row.grupo_cliente_nome}</span>
                                  )}
                                  {row.cliente_codigo && (
                                    <span className="text-[10px] text-brand-text-muted/60 font-medium font-mono block mt-0.5">Cód: {row.cliente_codigo}</span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* SCORE Badge (hoursIndex/valueIndex) */}
                            <td className="py-3.5 px-3 text-center font-mono">
                              <span className="inline-block px-2 py-0.5 rounded text-[11px] font-extrabold bg-brand-primary/10 text-brand-primary border border-brand-primary/20" title="Posição Horas / Posição Valor">
                                {scoreStr}
                              </span>
                            </td>

                            {/* Total seconds converted to hours */}
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex flex-col items-end">
                                <span className="font-mono text-sm font-extrabold text-white">
                                  {formatSecondsToHms(row.total_segundos || 0)}
                                </span>
                                <span className="text-[10px] text-brand-text-muted/40 font-mono">
                                  horas:min:seg
                                </span>
                              </div>
                            </td>

                            {/* Valor Lançamento cell */}
                            <td className="py-3.5 px-4 text-right">
                              <span className="font-mono text-sm font-extrabold text-amber-500">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(row.valor_lacto || 0)}
                              </span>
                            </td>

                            {/* Honorário cell */}
                            <td className="py-3.5 px-4 text-right">
                              <span className="font-mono text-sm font-extrabold text-sky-400">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(honorariosByGrupoRaiz.get(row.grupo_raiz || '') || 0)}
                              </span>
                            </td>

                            {/* Share % cell */}
                            <td className="py-3.5 px-4 text-right">
                              <span className="font-mono text-sm font-bold text-emerald-400">
                                {sharePercent.toFixed(1)}%
                              </span>
                            </td>

                            {/* Access Details Drill-down button */}
                            <td className="py-3.5 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => setSelectedClientDetail(row)}
                                className="p-1.5 rounded bg-brand-primary/10 hover:bg-brand-primary/20 border border-brand-primary/20 text-brand-primary hover:text-white transition-all cursor-pointer active:scale-95"
                                title="Ver detalhamento de tarefas por departamento"
                              >
                                <Eye size={14} />
                              </button>
                            </td>
                          </tr>

                          {/* Expanded sub-row with sector details */}
                          {expandedClients.has(key) && (
                            <tr className="bg-brand-bg/40">
                              <td colSpan={8} className="py-4 px-6 pl-12">
                                <div className="border border-brand-border/30 rounded-lg overflow-hidden bg-brand-bg/80 shadow-md">
                                  <div className="bg-brand-card-light/40 px-4 py-2 flex items-center justify-between border-b border-brand-border/20">
                                    <span className="text-[10px] uppercase font-black tracking-wider text-brand-text-muted">
                                      Detalhamento por Departamento: {row.cliente_nome}
                                    </span>
                                    <span className="text-[9px] font-mono text-brand-text-muted/70">
                                      Considerando período selecionado
                                    </span>
                                  </div>
                                  
                                  {loadingClientDepts[key] ? (
                                    <div className="flex items-center gap-2 text-brand-text-muted text-xs py-4 pl-4 bg-brand-card/10">
                                      <RefreshCw size={12} className="animate-spin text-brand-primary" />
                                      <span>Carregando totais por departamento...</span>
                                    </div>
                                  ) : clientDeptData[key] && clientDeptData[key].length > 0 ? (
                                    <div className="divide-y divide-brand-border/15">
                                      <div className="grid grid-cols-4 bg-brand-card-light/20 px-4 py-2 text-[9px] uppercase font-bold tracking-wider text-brand-text-muted/80">
                                        <div>Departamento</div>
                                        <div className="text-right">Horas</div>
                                        <div className="text-right">Valor</div>
                                        <div className="text-right">Share dentro do Cliente</div>
                                      </div>
                                      {clientDeptData[key].map((dept) => {
                                        const totalClientSeconds = row.total_segundos || 1;
                                        const totalClientValor = row.valor_lacto || 1;
                                        const hoursShare = ((dept.total_segundos || 0) / totalClientSeconds) * 100;
                                        const valorShare = ((dept.valor_lacto || 0) / totalClientValor) * 100;
                                        
                                        return (
                                          <div key={dept.setor} className="grid grid-cols-4 px-4 py-2.5 text-xs items-center hover:bg-brand-card-bright/5 transition-colors">
                                            <div className="font-semibold text-white/95 flex items-center gap-2">
                                              <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                                              {dept.setor}
                                            </div>
                                            <div className="text-right font-mono font-bold text-white/90">
                                              {formatSecondsToHms(dept.total_segundos)}
                                            </div>
                                            <div className="text-right font-mono font-bold text-amber-500">
                                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dept.valor_lacto || 0)}
                                            </div>
                                            <div className="text-right font-mono text-[11px]">
                                              <div className="flex flex-col items-end">
                                                <span className="text-brand-primary font-bold">
                                                  {hoursShare.toFixed(1)}% <span className="text-[9px] text-brand-text-muted font-normal">(Horas)</span>
                                                </span>
                                                <span className="text-emerald-400 font-bold">
                                                  {valorShare.toFixed(1)}% <span className="text-[9px] text-brand-text-muted font-normal">(Valor)</span>
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <div className="p-4 text-center text-brand-text-muted italic text-xs">
                                      Nenhum registro por departamento encontrado para este cliente.
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>

                  {/* Total Hours Sticky Footer Summary */}
                  <tfoot className="sticky bottom-0 bg-brand-card-light border-t border-brand-border shadow-inner z-10">
                    <tr className="font-bold">
                      <td colSpan={3} className="py-3 px-3 text-xs font-bold uppercase tracking-wider text-brand-text-muted bg-brand-card-light">
                        Total Acumulado (Filtro Corrente)
                      </td>
                      <td className="py-3 px-4 text-right bg-brand-card-light">
                        <div className="flex flex-col items-end">
                          <span className="font-mono text-base font-black text-brand-primary">
                            {formatSecondsToHms(filteredTempoCli.reduce((acc, curr) => acc + (curr.total_segundos || 0), 0))}
                          </span>
                          <span className="text-[11px] text-brand-text-muted/45 font-mono">
                            tempo total
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right bg-brand-card-light">
                        <div className="flex flex-col items-end">
                          <span className="font-mono text-base font-black text-amber-500">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalFilteredValorLacto)}
                          </span>
                          <span className="text-[11px] text-brand-text-muted/45 font-mono">
                            valor total
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right bg-brand-card-light">
                        <div className="flex flex-col items-end">
                          <span className="font-mono text-base font-black text-sky-400">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                              filteredTempoCli.reduce((acc, curr) => acc + (honorariosByGrupoRaiz.get(curr.grupo_raiz || '') || 0), 0)
                            )}
                          </span>
                          <span className="text-[11px] text-brand-text-muted/45 font-mono">
                            total honorário
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right bg-brand-card-light">
                        <div className="flex flex-col items-end">
                          <span className="font-mono text-sm font-black text-emerald-400">
                            100.0%
                          </span>
                          <span className="text-[10px] text-brand-text-muted/45 font-mono">
                            share total
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 bg-brand-card-light"></td>
                    </tr>
                  </tfoot>
                </table>
                )
            })()
          )}
        </div>
      </section>

      {/* Chart Section - Expanded to Full Width */}
      <section className="w-full">
        
        {/* Acompanhamento de Horas Custom Chart - Full Width */}
        <div className="bg-brand-card p-6 rounded-lg border border-brand-border shadow-lg" id="hours-chart-module">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-brand-border/40 mb-6">
            <div>
              <h3 className="text-lg font-bold text-white">Acompanhamento de Horas</h3>
              <p className="text-xs text-brand-text-muted">Total consolidado de apontamentos nos últimos 12 meses com linhas de média geral e do período selecionado</p>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3 self-end sm:self-auto flex-wrap">
              <div className="text-right text-xs bg-brand-bg py-1.5 px-3 rounded border border-brand-border text-brand-text font-bold">
                <span className="text-brand-text-muted font-normal mr-1.5">Total:</span>
                <span className="text-white font-mono">{formatSecondsToHms(hoursHistoryData.reduce((acc, curr) => acc + curr.value, 0))}</span>
              </div>
              <div className="text-right text-xs bg-amber-500/10 py-1.5 px-3 rounded border border-amber-500/30 text-amber-400 font-bold flex items-center gap-1.5 shadow-sm">
                <span className="w-2.5 h-0.5 border-t-2 border-dashed border-amber-400 inline-block" />
                <span className="text-amber-300/80 font-normal mr-1">Média:</span>
                <span className="font-mono">{formatSecondsToHms(avgHoursVal)}</span>
              </div>
              {avgSelectedHoursVal > 0 && (
                <div className="text-right text-xs bg-sky-500/10 py-1.5 px-3 rounded border border-sky-500/30 text-sky-400 font-bold flex items-center gap-1.5 shadow-sm">
                  <span className="w-2.5 h-0.5 bg-sky-400 inline-block shadow-[0_0_4px_#38bdf8]" />
                  <span className="text-sky-300/80 font-normal mr-1">Média Sel ({activeRange.count}M):</span>
                  <span className="font-mono">{formatSecondsToHms(avgSelectedHoursVal)}</span>
                </div>
              )}
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

                {/* Average Line crossing all bars at the average height */}
                {avgHoursVal > 0 && (
                  <div 
                    className="absolute inset-x-0 z-20 pointer-events-none flex items-center"
                    style={{ bottom: `${28 + (avgHoursVal / maxHoursVal) * 180}px` }}
                  >
                    {/* Left indicator tag */}
                    <div className="absolute left-2 sm:left-6 -translate-y-1/2 bg-amber-500/20 backdrop-blur-md border border-amber-500/50 text-amber-400 text-[9px] font-mono font-bold px-2 py-0.5 rounded shadow-lg z-30 pointer-events-auto hidden sm:flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                      <span>MÉDIA</span>
                    </div>

                    {/* Horizontal line crossing all bars */}
                    <div className="w-full border-t-2 border-dashed border-amber-400/90 shadow-[0_0_8px_rgba(245,158,11,0.6)]" />

                    {/* Right average badge */}
                    <div 
                      className="absolute right-2 sm:right-6 -translate-y-1/2 bg-amber-500 text-slate-950 font-bold text-[10px] font-mono px-2 py-0.5 rounded shadow-lg border border-amber-300 z-30 pointer-events-auto cursor-help flex items-center gap-1"
                      title={`Média calculada: ${formatSecondsToHms(avgHoursVal)}`}
                    >
                      <span className="font-extrabold uppercase text-[9px] tracking-wider sm:inline hidden">Média:</span>
                      <span className="font-black">{formatSecondsToHms(avgHoursVal)}</span>
                    </div>
                  </div>
                )}

                {/* Linha da Média dos Períodos Selecionados (apenas nos períodos selecionados) */}
                {avgSelectedHoursVal > 0 && activeRange.first !== -1 && activeRange.last !== -1 && (
                  <div 
                    className="absolute inset-x-2 sm:inset-x-6 z-25 pointer-events-none"
                    style={{ bottom: `${28 + (avgSelectedHoursVal / maxHoursVal) * 180}px` }}
                  >
                    <div 
                      className="absolute flex items-center"
                      style={{
                        left: `${(activeRange.first / hoursHistoryData.length) * 100}%`,
                        width: `${((activeRange.last - activeRange.first + 1) / hoursHistoryData.length) * 100}%`
                      }}
                    >
                      {/* Ponto inicial */}
                      <span className="w-2 h-2 rounded-full bg-sky-400 border border-white shadow-[0_0_8px_#38bdf8] shrink-0 -ml-1 z-35" />

                      {/* Linha cruzando apenas as barras selecionadas */}
                      <div className="flex-1 border-t-2 border-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.9)]" />

                      {/* Ponto final */}
                      <span className="w-2 h-2 rounded-full bg-sky-400 border border-white shadow-[0_0_8px_#38bdf8] shrink-0 -mr-1 z-35" />

                      {/* Badge sobre a média selecionada */}
                      <div 
                        className="absolute -top-4 left-1/2 -translate-x-1/2 bg-sky-500 text-slate-950 font-bold text-[9px] font-mono px-2 py-0.5 rounded shadow-lg border border-sky-300 whitespace-nowrap z-35 pointer-events-auto cursor-help flex items-center gap-1"
                        title={`Média dos períodos selecionados (${activeRange.count} ${activeRange.count === 1 ? 'mês' : 'meses'}): ${formatSecondsToHms(avgSelectedHoursVal)}`}
                      >
                        <span className="font-extrabold uppercase text-[8px] tracking-wider">Média Sel ({activeRange.count}M):</span>
                        <span className="font-black">{formatSecondsToHms(avgSelectedHoursVal)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Dynamic SVG bar mappings */}
                {hoursHistoryData.map((data, index) => {
                  const heightPercent = Math.min((data.value / maxHoursVal) * 100, 100);
                  
                  return (
                    <div 
                      key={index} 
                      className="flex flex-col items-center flex-1 group/bar relative z-10"
                    >
                      {/* Hover state Popover Value tooltip */}
                      <div className="absolute -top-16 scale-0 group-hover/bar:scale-100 transition-all duration-150 origin-bottom bg-brand-card-bright border border-brand-primary/40 py-1.5 px-3 rounded text-xs text-white font-mono font-bold shadow-2xl z-30 whitespace-nowrap pointer-events-none">
                        <div className="text-[9px] text-brand-primary uppercase font-extrabold tracking-wider mb-0.5 text-center">{data.label}</div>
                        <div className="text-sm font-black text-white text-center">{data.hms}</div>
                        {avgHoursVal > 0 && (
                          <div className={`text-[9px] font-semibold mt-1 pt-1 border-t border-brand-border/40 text-center flex items-center justify-center gap-1 ${
                            data.value >= avgHoursVal ? 'text-emerald-400' : 'text-amber-400'
                          }`}>
                            <span>{data.value >= avgHoursVal ? '▲' : '▼'}</span>
                            <span>{data.value >= avgHoursVal ? '+' : '-'}{formatSecondsToHms(Math.abs(data.value - avgHoursVal))}</span>
                            <span className="text-brand-text-muted font-normal text-[8px]">vs média</span>
                          </div>
                        )}
                        {data.active && avgSelectedHoursVal > 0 && activeRange.count > 1 && (
                          <div className={`text-[9px] font-semibold pt-0.5 text-center flex items-center justify-center gap-1 ${
                            data.value >= avgSelectedHoursVal ? 'text-sky-300' : 'text-sky-400'
                          }`}>
                            <span>{data.value >= avgSelectedHoursVal ? '▲' : '▼'}</span>
                            <span>{data.value >= avgSelectedHoursVal ? '+' : '-'}{formatSecondsToHms(Math.abs(data.value - avgSelectedHoursVal))}</span>
                            <span className="text-brand-text-muted font-normal text-[8px]">vs média sel</span>
                          </div>
                        )}
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
            <div className="flex flex-wrap items-center justify-center gap-6 mt-6 pt-4 border-t border-brand-border/40 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-[#2e2e2e] border border-brand-border inline-block" />
                <span className="text-brand-text-muted">Histórico consolidado</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-gradient-to-b from-brand-primary to-brand-accent border border-brand-primary inline-block animate-pulse" />
                <span className="text-white font-semibold font-mono">Filtro Geral Ativo</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-0.5 border-t-2 border-dashed border-amber-400 inline-block" />
                <span className="text-amber-400 font-semibold font-mono">Média ({formatSecondsToHms(avgHoursVal)})</span>
              </div>
              {avgSelectedHoursVal > 0 && (
                <div className="flex items-center gap-2">
                  <span className="w-4 h-0.5 bg-sky-400 inline-block shadow-[0_0_4px_#38bdf8]" />
                  <span className="text-sky-400 font-semibold font-mono">Média Período Sel ({formatSecondsToHms(avgSelectedHoursVal)})</span>
                </div>
              )}
            </div>
          </div>
        </div>

      </section>

      {/* Interactive Detail Drill-down Modal (Departamento -> Código Cliente -> Tarefa) */}
      {selectedClientDetail && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in p-4 overflow-y-auto">
          <div className="bg-brand-card border border-brand-border rounded-xl max-w-3xl w-full shadow-2xl flex flex-col h-full max-h-[85vh] overflow-hidden animate-scale-up" id="drilldown-modal">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-brand-border/60 flex items-start justify-between bg-brand-card-light">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1 px-1.5 rounded text-[10px] font-mono tracking-wider font-bold bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                    DETALHAMENTO DE HORAS TRABALHADAS
                  </span>
                </div>
                <h3 className="font-extrabold text-xl text-white mt-1 select-all">
                  {selectedClientDetail.cliente_nome || 'Cliente Sem Nome'}
                </h3>
                <p className="text-xs text-brand-text-muted mt-1 font-medium flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span>Grupo Raiz:</span>
                  <span className="font-mono text-white font-bold bg-brand-bg px-1.5 py-0.5 rounded border border-brand-border/40 select-all">
                    {selectedClientDetail.grupo_raiz || 'N/A'}
                  </span>
                  <span className="text-brand-text-muted/40">•</span>
                  <span>Período:</span>
                  <span className="font-mono text-white font-black uppercase">
                    {currentLabel}
                  </span>
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedClientDetail(null)}
                className="p-1.5 bg-brand-bg hover:bg-red-500/10 hover:text-red-400 border border-brand-border/40 hover:border-red-500/30 rounded-lg text-brand-text-muted transition-all duration-150 active:scale-95 cursor-pointer"
                title="Fechar Detalhamento"
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
                      {isLoadingDetailTasks ? (
                        <span className="animate-pulse opacity-40">...</span>
                      ) : (
                        formatSecondsToHms(hierarchicallyGroupedDetails.total_hours)
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 sm:border-l sm:border-brand-border/30 sm:pl-6">
                  <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg border border-amber-500/15 shrink-0">
                    <DollarSign size={16} />
                  </div>
                  <div>
                    <div className="text-brand-text-muted text-[10px] uppercase font-bold tracking-wider">Valor Total Lançado</div>
                    <div className="text-base font-mono font-black text-amber-500 leading-tight">
                      {isLoadingDetailTasks ? (
                        <span className="animate-pulse opacity-40">...</span>
                      ) : (
                        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(hierarchicallyGroupedDetails.total_valor_lacto)
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 md:self-center">
                <button
                  type="button"
                  onClick={() => expandAllNodes(hierarchicallyGroupedDetails.departments)}
                  disabled={isLoadingDetailTasks || detailTasksData.length === 0}
                  className="px-2.5 py-1 text-[10px] font-bold tracking-wider text-brand-primary bg-brand-primary/10 hover:bg-brand-primary/15 border border-brand-primary/20 rounded-md transition-colors uppercase disabled:opacity-40 cursor-pointer"
                >
                  Expandir Tudo
                </button>
                <button
                  type="button"
                  onClick={collapseAllNodes}
                  disabled={isLoadingDetailTasks || detailTasksData.length === 0}
                  className="px-2.5 py-1 text-[10px] font-bold tracking-wider text-brand-text-muted bg-brand-bg hover:bg-brand-card/40 border border-brand-border/60 rounded-md transition-colors uppercase disabled:opacity-40 cursor-pointer"
                >
                  Recolher Tudo
                </button>
              </div>
            </div>

            {/* Modal Body / Scroll Content */}
            <div className="p-5 overflow-auto flex-1 custom-scrollbar space-y-4 bg-brand-bg/15">
              {isLoadingDetailTasks ? (
                <div className="py-24 text-center space-y-3">
                  <RefreshCw className="animate-spin text-brand-primary mx-auto" size={28} />
                  <p className="text-sm font-semibold text-brand-text-muted animate-pulse">
                    Consultando detalhes na view de tarefas (<code className="font-mono text-[11px] bg-black/40 px-1 py-0.5 rounded text-brand-primary">viw_resumo_tarefa_ano_mes</code>)...
                  </p>
                </div>
              ) : detailTasksError ? (
                <div className="p-5 border border-red-500/20 bg-red-500/10 rounded-lg text-center space-y-3">
                  <AlertTriangle className="text-red-400 mx-auto" size={24} />
                  <p className="text-sm font-semibold text-red-100">Erro: {detailTasksError}</p>
                  <p className="text-xs text-brand-text-muted">A view do Drill Down pode não existir ou a query falhou.</p>
                </div>
              ) : detailTasksData.length === 0 ? (
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
                          
                          {/* Level 1: Departamento (Clickable bar) */}
                          <button
                            type="button"
                            onClick={() => toggleNodeExpression(deptKey)}
                            className="w-full text-left p-4 hover:bg-brand-card-bright/10 active:bg-brand-card/85 flex items-center justify-between gap-4 transition-colors duration-150 select-none border-b border-brand-border/25"
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
                                  ({Object.keys(deptItem.clients).length} {Object.keys(deptItem.clients).length === 1 ? 'cliente' : 'clientes'})
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                              {/* Visual relative weight bar */}
                              <div className="hidden sm:flex items-center gap-2">
                                <div className="w-16 bg-brand-border h-1.5 rounded-full overflow-hidden">
                                  <div 
                                    className="bg-brand-primary h-full rounded-full" 
                                    style={{ width: `${deptPercentage}%` }}
                                  />
                                </div>
                                <span className="text-[10px] font-mono text-brand-text-muted">{deptPercentage}%</span>
                              </div>

                              <span className="font-mono text-xs font-black text-brand-primary bg-brand-primary/5 px-2 py-0.5 rounded border border-brand-primary/10" title="Tempo total do setor">
                                {formatSecondsToHms(deptItem.total_segundos)}
                              </span>

                              <span className="font-mono text-xs font-black text-amber-500 bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/10" title="Valor total do setor">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(deptItem.valor_lacto)}
                              </span>
                            </div>
                          </button>

                          {/* Render Level 2 (Sub-clients) under this department if expanded */}
                          {isDeptExpanded && (
                            <div className="divide-y divide-brand-border/20 bg-black/10 font-sans">
                              {Object.keys(deptItem.clients)
                                .sort((a, b) => deptItem.clients[b].total_segundos - deptItem.clients[a].total_segundos)
                                .map((cliCode) => {
                                  const clientItem = deptItem.clients[cliCode];
                                  const cliKey = `${deptKey}|cli_cod:${cliCode}`;
                                  const isCliExpanded = expandedNodes.has(cliKey);
                                  const cliPercentage = deptItem.total_segundos > 0
                                    ? Math.round((clientItem.total_segundos / deptItem.total_segundos) * 100)
                                    : 0;

                                  return (
                                    <div key={cliKey} className="transition-all">
                                      
                                      {/* Level 2: Cliente-Código Row */}
                                      <button
                                        type="button"
                                        onClick={() => toggleNodeExpression(cliKey)}
                                        className="w-full text-left py-3 px-6 pl-8 hover:bg-brand-card-bright/5 active:bg-brand-card-bright/10 flex items-center justify-between gap-4 transition-colors duration-150 select-none bg-brand-card-light/40"
                                      >
                                        <div className="flex items-center gap-2.5">
                                          <span className={`text-brand-text-muted/60 shrink-0 transition-transform duration-200 ${isCliExpanded ? 'rotate-90' : 'rotate-0'}`}>
                                            <ChevronRight size={14} />
                                          </span>
                                          <div className="p-0.5 px-1 bg-amber-500/10 text-amber-500 border border-amber-500/15 rounded text-[10px] font-mono font-bold">
                                            Cód: {cliCode}
                                          </div>
                                          <span className="font-bold text-xs text-white tracking-wide truncate max-w-[280px]" title={clientItem.cliente_nome}>
                                            {clientItem.cliente_nome ? clientItem.cliente_nome : 'Cliente Identificado'}
                                          </span>
                                        </div>

                                        <div className="flex items-center gap-3">
                                          {/* Sub percentage under department */}
                                          <span className="text-[9px] font-mono text-brand-text-muted/50 hidden md:inline">({cliPercentage}% do dept)</span>
                                          <span className="font-mono text-xs font-bold text-brand-primary bg-brand-primary/5 px-1.5 py-0.5 rounded border border-brand-primary/5">
                                            {formatSecondsToHms(clientItem.total_segundos)}
                                          </span>
                                          <span className="font-mono text-xs font-semibold text-amber-500 bg-amber-500/5 px-1.5 py-0.5 rounded border border-amber-500/5">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(clientItem.valor_lacto)}
                                          </span>
                                        </div>
                                      </button>

                                      {/* Render Level 3 (Tasks) under this client code if expanded */}
                                      {isCliExpanded && (
                                        <div className="bg-brand-bg/40 divide-y divide-brand-border/10 font-sans">
                                          {clientItem.tasks.map((task, idx) => {
                                            const taskPercentage = clientItem.total_segundos > 0
                                              ? Math.round((task.total_segundos / clientItem.total_segundos) * 100)
                                              : 0;

                                            return (
                                              <div 
                                                key={`${cliKey}-task-${idx}`}
                                                className="py-2.5 px-8 pl-14 flex items-center justify-between gap-4 text-xs group/task hover:bg-brand-card-bright/5 transition-all text-brand-text-muted"
                                              >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                  <span className="w-1.5 h-1.5 rounded-full bg-brand-primary shrink-0" />
                                                  <span className="font-medium text-brand-text/90 truncate pr-2 group-hover/task:text-white transition-colors" title={task.tarefa}>
                                                    {task.tarefa}
                                                  </span>
                                                </div>

                                                <div className="flex items-center gap-3 shrink-0 font-sans">
                                                  <span className="text-[10px] font-mono text-brand-text-muted/40 font-semibold group-hover/task:text-brand-text-muted/65 transition-colors">
                                                    {taskPercentage}% de {cliCode}
                                                  </span>
                                                  <span className="font-mono text-xs font-medium text-brand-text-muted tracking-wider">
                                                    {formatSecondsToHms(task.total_segundos)}
                                                  </span>
                                                  <span className="font-mono text-xs font-bold text-amber-500 tracking-wider">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(task.valor_lacto)}
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

            {/* Modal Footer */}
            <div className="p-4 border-t border-brand-border/60 bg-brand-card-light flex items-center justify-between text-[11px] text-brand-text-muted">
              <span>Auditoria de tempos do ERP finalizada com sucesso.</span>
              <button
                type="button"
                onClick={() => setSelectedClientDetail(null)}
                className="px-4 py-1.5 bg-brand-primary hover:bg-brand-primary-dark text-white font-bold rounded shadow-md active:scale-95 duration-100 cursor-pointer"
              >
                Voltar ao Dashboard
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
