import React, { useState, useEffect, useMemo } from 'react';
import { 
  Activity, 
  BarChart3, 
  Calendar, 
  Search, 
  Download, 
  Layers, 
  Users, 
  Briefcase, 
  Clock, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Filter, 
  RefreshCw,
  Building2,
  User,
  CheckCircle2,
  FileSpreadsheet,
  X,
  Eye,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// Helper to format seconds to standard hh:mm:ss
function formatSecondsToHms(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

const getMonthName = (m: number) => {
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  return months[(m - 1) % 12] || '';
};

export default function AnalisesView() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [rawData, setRawData] = useState<any[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Period ranges selection
  const [startPeriod, setStartPeriod] = useState<string>('');
  const [endPeriod, setEndPeriod] = useState<string>('');
  const [availablePeriods, setAvailablePeriods] = useState<{ value: string; label: string; ano: number; mes: number }[]>([]);

  // Dimension / View Mode
  type DimensionType = 'grupo' | 'empresa' | 'departamento' | 'colaborador' | 'tarefa';
  const [dimension, setDimension] = useState<DimensionType>('grupo');

  // Search and Sort
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortField, setSortField] = useState<string>('tempo_segundos');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Drilldown Modal States (Grupo, Empresa e Departamento)
  interface DrilldownModalTarget {
    type: 'grupo' | 'empresa' | 'departamento' | 'tarefa' | 'colaborador';
    key: string;
    name: string;
    secondaryName?: string;
    empresa_id?: string;
    depto_id?: string;
  }
  const [selectedEntityModal, setSelectedEntityModal] = useState<DrilldownModalTarget | null>(null);
  const isSpecial4LevelView = selectedEntityModal?.type === 'tarefa' || selectedEntityModal?.type === 'colaborador';
  const [modalLoading, setModalLoading] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalRecords, setModalRecords] = useState<any[]>([]);
  const [modalExpandedPrimary, setModalExpandedPrimary] = useState<Set<string>>(new Set());
  const [modalExpandedTasks, setModalExpandedTasks] = useState<Set<string>>(new Set());
  const [modalExpandedLevel3, setModalExpandedLevel3] = useState<Set<string>>(new Set());
  const [modalSearchTerm, setModalSearchTerm] = useState<string>('');

  // Discover periods on mount
  useEffect(() => {
    const initFilterOptions = async () => {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase
            .from('vw_apontamento_mensal_resumo')
            .select('aponta_ano, aponta_mes');

          if (!error && data && data.length > 0) {
            // Periods
            const pSet = new Set<string>();

            data.forEach((row: any) => {
              if (row.aponta_ano && row.aponta_mes) {
                pSet.add(`${row.aponta_ano}-${String(row.aponta_mes).padStart(2, '0')}`);
              }
            });

            const sortedPeriods = Array.from(pSet).sort().reverse().map(p => {
              const [y, m] = p.split('-').map(Number);
              return {
                value: p,
                label: `${getMonthName(m)} / ${y}`,
                ano: y,
                mes: m
              };
            });

            if (sortedPeriods.length > 0) {
              setAvailablePeriods(sortedPeriods);
              // Default to latest 3 periods or latest 1 if available
              if (!startPeriod && !endPeriod) {
                setStartPeriod(sortedPeriods[Math.min(sortedPeriods.length - 1, 5)]?.value || sortedPeriods[0].value);
                setEndPeriod(sortedPeriods[0].value);
              }
            }
          }
        } catch (err) {
          console.error('Error loading filter options:', err);
        }
      }
    };
    initFilterOptions();
  }, [refreshTrigger]);

  // Fetch appointment effort data based on selected periods and department
  useEffect(() => {
    const fetchData = async () => {
      if (!isSupabaseConfigured || !supabase) {
        setIsLoading(false);
        setErrorMsg('Supabase não configurado.');
        return;
      }

      if (availablePeriods.length === 0) return;

      setIsLoading(true);
      setErrorMsg(null);

      try {
        let allRecords: any[] = [];
        let page = 0;
        const pageSize = 1000;
        let hasMore = true;

        // Determine active period range
        const startIndex = availablePeriods.findIndex(p => p.value === startPeriod);
        const endIndex = availablePeriods.findIndex(p => p.value === endPeriod);
        const activePeriods = availablePeriods.filter((_, idx) => {
          const minIdx = Math.min(startIndex, endIndex);
          const maxIdx = Math.max(startIndex, endIndex);
          return idx >= minIdx && idx <= maxIdx;
        });

        const activeYears = Array.from(new Set(activePeriods.map(p => p.ano)));
        const activeMonths = Array.from(new Set(activePeriods.map(p => p.mes)));

        while (hasMore) {
          let query = supabase
            .from(dimension === 'colaborador' || dimension === 'tarefa' ? 'vw_apontamento_mensal_detalhe' : 'vw_apontamento_mensal_resumo')
            .select('*');

          if (activeYears.length > 0) {
            query = query.in('aponta_ano', activeYears);
          }
          if (activeMonths.length > 0) {
            query = query.in('aponta_mes', activeMonths);
          }

          const { data, error } = await query.range(page * pageSize, (page + 1) * pageSize - 1);
          if (error) throw error;

          if (data && data.length > 0) {
            const validPeriodSet = new Set(activePeriods.map(p => `${p.ano}-${p.mes}`));
            const filtered = data.filter((row: any) => {
              const matchPeriod = validPeriodSet.has(`${row.aponta_ano}-${row.aponta_mes}`);
              const matchDeptCalc = row.depto_calcula_sn === true || row.depto_calcula_sn === 'S' || row.depto_calcula_sn === 's' || row.depto_calcula_sn === 1 || row.depto_calcula_sn === '1' || row.depto_calcula_sn === undefined;
              return matchPeriod && matchDeptCalc;
            });
            allRecords = [...allRecords, ...filtered];

            if (data.length < pageSize || allRecords.length > 30000) {
              hasMore = false;
            }
          } else {
            hasMore = false;
          }
          page++;
        }

        setRawData(allRecords);
      } catch (err: any) {
        console.error('Error fetching effort analysis data:', err);
        setErrorMsg(err.message || 'Erro ao carregar dados de esforço.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [startPeriod, endPeriod, availablePeriods, refreshTrigger, dimension]);

  // Fetch detailed records for selected entity (grupo ou empresa) from vw_apontamento_mensal_detalhe
  const fetchEntityDetails = async (target: DrilldownModalTarget) => {
    if (!supabase || !isSupabaseConfigured) return;
    setModalLoading(true);
    setModalError(null);
    setModalRecords([]);
    setModalExpandedPrimary(new Set());
    setModalExpandedTasks(new Set());
    setModalSearchTerm('');

    try {
      const startIndex = availablePeriods.findIndex(p => p.value === startPeriod);
      const endIndex = availablePeriods.findIndex(p => p.value === endPeriod);
      const activePeriods = availablePeriods.filter((_, idx) => {
        const minIdx = Math.min(startIndex, endIndex);
        const maxIdx = Math.max(startIndex, endIndex);
        return idx >= minIdx && idx <= maxIdx;
      });

      const activeYears = Array.from(new Set(activePeriods.map(p => p.ano)));
      const activeMonths = Array.from(new Set(activePeriods.map(p => p.mes)));
      const validPeriodSet = new Set(activePeriods.map(p => `${p.ano}-${p.mes}`));

      let allRecords: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from('vw_apontamento_mensal_detalhe')
          .select('*');

        if (target.type === 'grupo') {
          if (target.name === 'SEM GRUPO' || !target.name) {
            query = query.or('grupo_nome.is.null,grupo_nome.eq.SEM GRUPO,grupo_nome.eq.""');
          } else {
            query = query.eq('grupo_nome', target.name);
          }
        } else if (target.type === 'empresa') {
          if (target.empresa_id) {
            query = query.eq('empresa_id', target.empresa_id);
          } else {
            query = query.eq('empresa_nome', target.name);
          }
        } else if (target.type === 'departamento') {
          if (target.depto_id && !isNaN(Number(target.depto_id))) {
            query = query.eq('depto_id', Number(target.depto_id));
          } else if (!target.name || target.name === 'Sem Departamento' || target.name === 'SEM DEPTO' || target.name === 'SEM DEPARTAMENTO') {
            query = query.or('depto_nome.is.null,depto_nome.eq.Sem Departamento,depto_nome.eq.SEM DEPARTAMENTO,depto_nome.eq.""');
          } else {
            query = query.eq('depto_nome', target.name);
          }
        } else if (target.type === 'tarefa') {
          query = query.eq('tarefa_nome', target.name);
        } else if (target.type === 'colaborador') {
          if (target.name === 'SEM COLABORADOR' || !target.name) {
            query = query.or('colaborador_nome.is.null,colaborador_nome.eq.SEM COLABORADOR,colaborador_nome.eq.""');
          } else {
            query = query.eq('colaborador_nome', target.name);
          }
        }

        if (activeYears.length > 0) {
          query = query.in('aponta_ano', activeYears);
        }
        if (activeMonths.length > 0) {
          query = query.in('aponta_mes', activeMonths);
        }

        const { data, error } = await query.range(page * pageSize, (page + 1) * pageSize - 1);
        if (error) {
          console.warn('Erro ao consultar vw_apontamento_mensal_detalhe:', error);
          break;
        }

        if (data && data.length > 0) {
          const validData = data.filter((row: any) => {
            const matchPeriod = validPeriodSet.has(`${row.aponta_ano}-${row.aponta_mes}`);
            const matchDeptCalc = row.depto_calcula_sn === true || row.depto_calcula_sn === 'S' || row.depto_calcula_sn === 's' || row.depto_calcula_sn === 1 || row.depto_calcula_sn === '1' || row.depto_calcula_sn === undefined;
            return matchPeriod && matchDeptCalc;
          });
          allRecords = [...allRecords, ...validData];
          if (data.length < pageSize || allRecords.length > 30000) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
        page++;
      }

      // Se detalhe não retornou registros ou falhou, usar fallback a partir de rawData
      if (allRecords.length === 0 && rawData.length > 0) {
        let fallbackRows: any[] = [];
        if (target.type === 'grupo') {
          const normGroup = (target.name || 'SEM GRUPO').trim().toUpperCase();
          fallbackRows = rawData.filter(r => (r.grupo_nome || 'SEM GRUPO').trim().toUpperCase() === normGroup);
        } else if (target.type === 'empresa') {
          const normEmpName = (target.name || '').trim().toUpperCase();
          fallbackRows = rawData.filter(r => {
            if (target.empresa_id && (String(r.empresa_id) === String(target.empresa_id) || String(r.cliente_id) === String(target.empresa_id))) {
              return true;
            }
            const rName = (r.empresa_nome || r.cliente_nome || '').trim().toUpperCase();
            return rName === normEmpName;
          });
        } else if (target.type === 'departamento') {
          const normDept = (target.name || '').trim().toUpperCase();
          fallbackRows = rawData.filter(r => {
            if (target.depto_id && String(r.depto_id) === String(target.depto_id)) return true;
            const rName = (r.depto_nome || '').trim().toUpperCase();
            return rName === normDept || (!rName && (normDept === 'SEM DEPARTAMENTO' || normDept === 'SEM DEPTO'));
          });
        } else if (target.type === 'tarefa') {
          const normTask = (target.name || '').trim().toUpperCase();
          fallbackRows = rawData.filter(r => {
            const rTask = (r.tarefa_nome || r.tarefa || '').trim().toUpperCase();
            return rTask === normTask;
          });
        } else if (target.type === 'colaborador') {
          const normColab = (target.name || '').trim().toUpperCase();
          fallbackRows = rawData.filter(r => {
            const rColab = (r.colaborador_nome || '').trim().toUpperCase();
            return rColab === normColab || (!rColab && normColab === 'SEM COLABORADOR');
          });
        }

        if (fallbackRows.length > 0) {
          allRecords = fallbackRows.map(r => ({
            grupo_nome: r.grupo_nome,
            empresa_id: r.empresa_id || r.cliente_id,
            empresa_nome: r.empresa_nome || r.cliente_nome || (target.type === 'empresa' ? target.name : 'Empresa Geral'),
            depto_id: r.depto_id || (target.type === 'departamento' ? target.depto_id : undefined),
            depto_nome: r.depto_nome || (target.type === 'departamento' ? target.name : 'Sem Departamento'),
            tarefa_nome: r.tarefa_nome || r.tarefa || 'Atividade Operacional Geral',
            colaborador_nome: r.colaborador_nome || 'Colaboradores',
            aponta_qtde_segundos: Number(r.aponta_qtde_segundos) || Number(r.tempo_segundos) || 0,
            aponta_qtde_lancamentos: Number(r.aponta_qtde_lancamentos) || Number(r.qtde_lancamentos) || 1,
            aponta_ano: r.aponta_ano,
            aponta_mes: r.aponta_mes,
            depto_calcula_sn: true
          }));
        }
      }

      setModalRecords(allRecords);
    } catch (err: any) {
      console.error('Error fetching modal details:', err);
      setModalError(err.message || 'Erro ao carregar detalhamento.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleOpenEntityModal = (
    item: { key: string; name: string; secondaryName?: string; empresa_id?: string; depto_id?: string; depto_nome?: string }, 
    type: 'grupo' | 'empresa' | 'departamento' | 'tarefa' | 'colaborador'
  ) => {
    const target: DrilldownModalTarget = {
      type,
      key: item.key,
      name: item.name,
      secondaryName: item.secondaryName,
      empresa_id: item.empresa_id,
      depto_id: item.depto_id || (type === 'departamento' ? item.key : undefined)
    };
    setSelectedEntityModal(target);
    fetchEntityDetails(target);
  };

  const handleCloseEntityModal = () => {
    setSelectedEntityModal(null);
    setModalRecords([]);
  };

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedEntityModal) {
        handleCloseEntityModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedEntityModal]);

  const togglePrimaryExpand = (primaryName: string) => {
    const next = new Set(modalExpandedPrimary);
    if (next.has(primaryName)) {
      next.delete(primaryName);
    } else {
      next.add(primaryName);
    }
    setModalExpandedPrimary(next);
  };

  const toggleTaskExpand = (primaryName: string, taskName: string) => {
    const key = `${primaryName}:::${taskName}`;
    const next = new Set(modalExpandedTasks);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setModalExpandedTasks(next);
  };

  const toggleLevel3Expand = (primName: string, taskName: string, colabName: string) => {
    const key = `${primName}:::${taskName}:::${colabName}`;
    const next = new Set(modalExpandedLevel3);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setModalExpandedLevel3(next);
  };

  // Hierarchy for the drilldown modal:
  // - When target.type === 'departamento': Empresa -> Atividade / Tarefa -> Colaborador
  // - When target.type === 'grupo' | 'empresa': Departamento -> Atividade / Tarefa -> Colaborador
  const modalHierarchy = useMemo(() => {
    let totalGroupSeconds = 0;
    let totalGroupLancamentos = 0;

    interface EmpresaItem {
      empresa_nome: string;
      tempo_segundos: number;
      lancamentos: number;
      media_segundos: number;
    }

    interface ColabItem {
      colaborador_nome: string;
      tempo_segundos: number;
      lancamentos: number;
      media_segundos: number;
      empresas: Record<string, EmpresaItem>;
    }

    interface TaskItem {
      tarefa_nome: string;
      tempo_segundos: number;
      lancamentos: number;
      media_segundos: number;
      colaboradores: Record<string, ColabItem>;
    }

    interface PrimaryGroupItem {
      primary_nome: string;
      tempo_segundos: number;
      lancamentos: number;
      media_segundos: number;
      tarefas: Record<string, TaskItem>;
    }

    const groups: Record<string, PrimaryGroupItem> = {};
    const isDeptView = selectedEntityModal?.type === 'departamento';
    const isTaskView = selectedEntityModal?.type === 'tarefa';
    const isColabView = selectedEntityModal?.type === 'colaborador';
    const isSpecial4LevelView = isTaskView || isColabView;

    modalRecords.forEach((row: any) => {
      const primaryName = isSpecial4LevelView
        ? (row.depto_nome || 'SEM DEPARTAMENTO')
        : isDeptView
        ? (row.empresa_nome || row.cliente_nome || 'SEM EMPRESA')
        : (row.depto_nome || 'SEM DEPARTAMENTO');

      const taskName = isTaskView
        ? (row.colaborador_nome || row.colaborador || row.nome_colab || row.usuario_nome || 'SEM COLABORADOR')
        : isColabView
        ? (row.tarefa_nome || row.tarefa || selectedEntityModal?.name || 'SEM IDENTIFICAÇÃO')
        : (row.tarefa_nome || row.tarefa || 'SEM IDENTIFICAÇÃO');

      const colabName = isSpecial4LevelView
        ? (row.grupo_nome || 'SEM GRUPO')
        : (row.colaborador_nome || row.colaborador || row.nome_colab || row.usuario_nome || 'SEM COLABORADOR');

      const empresaName = isSpecial4LevelView
        ? (row.empresa_nome || row.cliente_nome || 'SEM EMPRESA')
        : null;

      const secs = Number(row.aponta_qtde_segundos) || Number(row.tempo_segundos) || 0;
      const count = Number(row.aponta_qtde_lancamentos) || Number(row.qtde_lancamentos) || 1;

      totalGroupSeconds += secs;
      totalGroupLancamentos += count;

      if (!groups[primaryName]) {
        groups[primaryName] = {
          primary_nome: primaryName,
          tempo_segundos: 0,
          lancamentos: 0,
          media_segundos: 0,
          tarefas: {}
        };
      }
      groups[primaryName].tempo_segundos += secs;
      groups[primaryName].lancamentos += count;

      if (!groups[primaryName].tarefas[taskName]) {
        groups[primaryName].tarefas[taskName] = {
          tarefa_nome: taskName,
          tempo_segundos: 0,
          lancamentos: 0,
          media_segundos: 0,
          colaboradores: {}
        };
      }
      groups[primaryName].tarefas[taskName].tempo_segundos += secs;
      groups[primaryName].tarefas[taskName].lancamentos += count;

      const taskItem = groups[primaryName].tarefas[taskName];

      if (!taskItem.colaboradores[colabName]) {
        taskItem.colaboradores[colabName] = {
          colaborador_nome: colabName,
          tempo_segundos: 0,
          lancamentos: 0,
          media_segundos: 0,
          empresas: {}
        };
      }
      taskItem.colaboradores[colabName].tempo_segundos += secs;
      taskItem.colaboradores[colabName].lancamentos += count;

      if (isSpecial4LevelView && empresaName) {
        const colabItem = taskItem.colaboradores[colabName];
        if (!colabItem.empresas[empresaName]) {
          colabItem.empresas[empresaName] = {
            empresa_nome: empresaName,
            tempo_segundos: 0,
            lancamentos: 0,
            media_segundos: 0
          };
        }
        colabItem.empresas[empresaName].tempo_segundos += secs;
        colabItem.empresas[empresaName].lancamentos += count;
      }
    });

    Object.values(groups).forEach(g => {
      g.media_segundos = g.lancamentos > 0 ? Math.round(g.tempo_segundos / g.lancamentos) : 0;
      Object.values(g.tarefas).forEach(t => {
        t.media_segundos = t.lancamentos > 0 ? Math.round(t.tempo_segundos / t.lancamentos) : 0;
        Object.values(t.colaboradores).forEach(c => {
          c.media_segundos = c.lancamentos > 0 ? Math.round(c.tempo_segundos / c.lancamentos) : 0;
          if (isSpecial4LevelView) {
            Object.values(c.empresas).forEach(e => {
              e.media_segundos = e.lancamentos > 0 ? Math.round(e.tempo_segundos / e.lancamentos) : 0;
            });
          }
        });
      });
    });

    const mediaGroup = totalGroupLancamentos > 0 ? Math.round(totalGroupSeconds / totalGroupLancamentos) : 0;

    return {
      totalGroupSeconds,
      totalGroupLancamentos,
      mediaGroup,
      primaryGroups: groups
    };
  }, [modalRecords, selectedEntityModal]);

  const handleModalExpandAll = () => {
    const allPrimaries = new Set<string>();
    const allTasks = new Set<string>();
    const allLevel3 = new Set<string>();
    Object.keys(modalHierarchy.primaryGroups).forEach(primName => {
      allPrimaries.add(primName);
      const group = modalHierarchy.primaryGroups[primName];
      Object.keys(group.tarefas).forEach(taskName => {
        const taskKey = `${primName}:::${taskName}`;
        allTasks.add(taskKey);
        const taskItem = group.tarefas[taskName];
        Object.keys(taskItem.colaboradores).forEach(colabName => {
          allLevel3.add(`${taskKey}:::${colabName}`);
        });
      });
    });
    setModalExpandedPrimary(allPrimaries);
    setModalExpandedTasks(allTasks);
    setModalExpandedLevel3(allLevel3);
  };

  const handleModalCollapseAll = () => {
    setModalExpandedPrimary(new Set());
    setModalExpandedTasks(new Set());
    setModalExpandedLevel3(new Set());
  };

  // Aggregate data according to chosen dimension
  const aggregatedData = useMemo(() => {
    const map = new Map<string, {
      key: string;
      name: string;
      secondaryName?: string;
      empresa_id?: string;
      depto_id?: string;
      depto_nome?: string;
      deptosMap: Map<string, number>;
      tempo_segundos: number;
      count: number;
      entitiesSet: Set<string>;
    }>();

    rawData.forEach(row => {
      let key = 'N/A';
      let name = 'Não Informado';
      let secondaryName = undefined;
      let empresa_id = undefined;
      let depto_id = undefined;
      let depto_nome = undefined;

      const secs = row.aponta_qtde_segundos || row.tempo_segundos || 0;

      switch (dimension) {
        case 'grupo':
          key = row.grupo_nome || 'SEM GRUPO';
          name = key;
          break;
        case 'empresa':
          key = String(row.empresa_id || row.cliente_id || row.empresa_nome || 'SEM EMPRESA');
          name = row.empresa_nome || row.cliente_nome || 'Empresa sem nome';
          secondaryName = row.grupo_nome;
          empresa_id = row.empresa_id ? String(row.empresa_id) : row.cliente_id ? String(row.cliente_id) : undefined;
          break;
        case 'departamento':
          key = String(row.depto_id || row.depto_nome || 'SEM DEPTO');
          name = row.depto_nome || 'Sem Departamento';
          depto_id = row.depto_id ? String(row.depto_id) : undefined;
          break;
        case 'colaborador':
          key = row.colaborador_id || row.colaborador_nome || 'SEM COLABORADOR';
          name = row.colaborador_nome || 'Colaborador não identificado';
          depto_id = row.depto_id ? String(row.depto_id) : undefined;
          depto_nome = row.depto_nome || row.departamento || undefined;
          break;
        case 'tarefa':
          key = row.tarefa_nome || row.tarefa || 'SEM TAREFA';
          name = key;
          break;
      }

      if (!map.has(key)) {
        map.set(key, {
          key,
          name,
          secondaryName,
          empresa_id,
          depto_id,
          depto_nome,
          deptosMap: new Map<string, number>(),
          tempo_segundos: 0,
          count: 0,
          entitiesSet: new Set()
        });
      }

      const item = map.get(key)!;
      item.tempo_segundos += secs;
      item.count += 1;
      if (row.empresa_id || row.empresa_nome) {
        item.entitiesSet.add(row.empresa_id || row.empresa_nome);
      }
      const rowDepto = (row.depto_nome || row.departamento || '').trim();
      if (rowDepto) {
        item.deptosMap.set(rowDepto, (item.deptosMap.get(rowDepto) || 0) + secs);
      }
    });

    const list = Array.from(map.values()).map(item => {
      let resolvedDepto = item.depto_nome;
      if (item.deptosMap && item.deptosMap.size > 0) {
        const sortedDeptos = Array.from(item.deptosMap.entries()).sort((a, b) => b[1] - a[1]);
        resolvedDepto = sortedDeptos[0][0];
      }
      return {
        ...item,
        depto_nome: resolvedDepto || 'Sem Departamento',
        empresasCount: item.entitiesSet.size,
        media_segundos: item.count > 0 ? Math.round(item.tempo_segundos / item.count) : 0
      };
    });

    // Filter by search term
    const filtered = list.filter(item => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        item.name.toLowerCase().includes(term) ||
        (item.secondaryName && item.secondaryName.toLowerCase().includes(term)) ||
        (item.depto_nome && item.depto_nome.toLowerCase().includes(term))
      );
    });

    // Sort
    return filtered.sort((a, b) => {
      let fieldKey = sortField;
      if (fieldKey === 'grupo' || fieldKey === 'empresa') {
        fieldKey = 'name';
      } else if (fieldKey === 'grupo_empresa') {
        fieldKey = 'secondaryName';
      } else if (fieldKey === 'departamento' || fieldKey === 'depto') {
        fieldKey = 'depto_nome';
      } else if (fieldKey === 'horas' || fieldKey === 'participacao' || fieldKey === 'share') {
        fieldKey = 'tempo_segundos';
      } else if (fieldKey === 'lancamentos') {
        fieldKey = 'count';
      } else if (fieldKey === 'media') {
        fieldKey = 'media_segundos';
      }

      let valA: any = a[fieldKey as keyof typeof a];
      let valB: any = b[fieldKey as keyof typeof b];

      if (valA === undefined || valA === null) valA = typeof valB === 'string' ? '' : 0;
      if (valB === undefined || valB === null) valB = typeof valA === 'string' ? '' : 0;

      if (typeof valA === 'string') {
        return sortAsc ? valA.localeCompare(valB, 'pt-BR', { sensitivity: 'base' }) : valB.localeCompare(valA, 'pt-BR', { sensitivity: 'base' });
      }
      return sortAsc ? (Number(valA) - Number(valB)) : (Number(valB) - Number(valA));
    });
  }, [rawData, dimension, searchTerm, sortField, sortAsc]);

  // Total metrics
  const totalSecondsAll = useMemo(() => rawData.reduce((acc, curr) => acc + (curr.aponta_qtde_segundos || curr.tempo_segundos || 0), 0), [rawData]);
  const totalEntriesCount = useMemo(() => rawData.length, [rawData]);
  const uniqueCollaboratorsCount = useMemo(() => new Set(rawData.map(r => r.colaborador_nome || r.colaborador_id).filter(Boolean)).size, [rawData]);
  const uniqueCompaniesCount = useMemo(() => new Set(rawData.map(r => r.empresa_id || r.empresa_nome).filter(Boolean)).size, [rawData]);

  const handleSort = (field: string) => {
    let target = field;
    if (target === 'grupo' || target === 'empresa') {
      target = 'name';
    } else if (target === 'grupo_empresa') {
      target = 'secondaryName';
    } else if (target === 'departamento' || target === 'depto') {
      target = 'depto_nome';
    } else if (target === 'horas' || target === 'participacao' || target === 'share') {
      target = 'tempo_segundos';
    } else if (target === 'lancamentos') {
      target = 'count';
    } else if (target === 'media') {
      target = 'media_segundos';
    }

    if (sortField === target) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(target);
      // Strings (name, secondaryName, depto_nome) default to A-Z (true); numbers default to highest first (false)
      if (target === 'name' || target === 'secondaryName' || target === 'depto_nome') {
        setSortAsc(true);
      } else {
        setSortAsc(false);
      }
    }
  };

  const renderSortIcon = (field: string) => {
    let target = field;
    if (target === 'grupo' || target === 'empresa') target = 'name';
    if (target === 'grupo_empresa') target = 'secondaryName';
    if (target === 'departamento' || target === 'depto') target = 'depto_nome';
    if (target === 'horas' || target === 'participacao' || target === 'share') target = 'tempo_segundos';
    if (target === 'lancamentos') target = 'count';
    if (target === 'media') target = 'media_segundos';

    const isActive = sortField === target;
    if (!isActive) {
      return <ArrowUpDown size={12} className="opacity-40 group-hover:opacity-100 transition-opacity shrink-0" />;
    }
    return sortAsc ? (
      <ArrowUp size={12} className="text-brand-primary font-bold shrink-0 animate-in fade-in" />
    ) : (
      <ArrowDown size={12} className="text-brand-primary font-bold shrink-0 animate-in fade-in" />
    );
  };

  const handleExportCSV = () => {
    if (aggregatedData.length === 0) return;
    try {
      const headers = dimension === 'colaborador'
        ? ['Visão', 'Colaborador', 'Departamento', 'Tempo Total (HH:MM:SS)', 'Horas Decimais', 'Total de Apontamentos', 'Média/Ativ (HH:MM:SS)', 'Participação (%)']
        : ['Visão', 'Nome', 'Tempo Total (HH:MM:SS)', 'Horas Decimais', 'Total de Apontamentos', 'Média/Ativ (HH:MM:SS)', 'Participação (%)'];
      const csvRows = [headers.join(';')];

      aggregatedData.forEach(item => {
        const hoursDec = (item.tempo_segundos / 3600).toFixed(2).replace('.', ',');
        const share = totalSecondsAll > 0 ? ((item.tempo_segundos / totalSecondsAll) * 100).toFixed(1).replace('.', ',') + '%' : '0%';
        const row = [
          dimension.toUpperCase(),
          `"${item.name.replace(/"/g, '""')}"`,
          ...(dimension === 'colaborador' ? [`"${(item.depto_nome || 'Sem Departamento').replace(/"/g, '""')}"`] : []),
          `"${formatSecondsToHms(item.tempo_segundos)}"`,
          hoursDec,
          item.count,
          `"${formatSecondsToHms(item.media_segundos)}"`,
          share
        ];
        csvRows.push(row.join(';'));
      });

      const blob = new Blob(["\uFEFF" + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `analise_esforco_${dimension}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('Erro ao exportar CSV:', e);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-brand-bg font-sans text-brand-text">
      {/* Top Header Bar */}
      <header className="h-16 border-b border-brand-border bg-brand-card px-6 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
            <Activity size={22} />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-wide">Análises de Esforço Operacional</h1>
            <p className="text-xs text-brand-text-muted">Análise multidimensional de horas trabalhadas (sem valores financeiros)</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setRefreshTrigger(prev => prev + 1)}
            disabled={isLoading}
            className="px-3 py-1.5 bg-brand-card hover:bg-brand-card-bright text-brand-text text-xs font-semibold rounded-lg border border-brand-border flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
            title="Atualizar dados"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-brand-primary' : ''} />
            <span>Atualizar</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={aggregatedData.length === 0}
            className="px-3.5 py-1.5 bg-brand-primary hover:bg-brand-primary/90 text-white text-xs font-semibold rounded-lg shadow-md shadow-brand-primary/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <FileSpreadsheet size={15} />
            <span>Exportar CSV</span>
          </button>
        </div>
      </header>

      {/* Filters & Dimensions Bar */}
      <div className="p-6 pb-3 bg-brand-card/30 border-b border-brand-border/60 shrink-0 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Start Period */}
          <div>
            <label className="block text-[11px] font-bold text-brand-text-muted uppercase tracking-wider mb-1">Período Inicial</label>
            <select
              value={startPeriod}
              onChange={(e) => setStartPeriod(e.target.value)}
              className="w-full bg-brand-card border border-brand-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-primary"
            >
              {availablePeriods.map(p => (
                <option key={`start_${p.value}`} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* End Period */}
          <div>
            <label className="block text-[11px] font-bold text-brand-text-muted uppercase tracking-wider mb-1">Período Final</label>
            <select
              value={endPeriod}
              onChange={(e) => setEndPeriod(e.target.value)}
              className="w-full bg-brand-card border border-brand-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-primary"
            >
              {availablePeriods.map(p => (
                <option key={`end_${p.value}`} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Search Bar */}
          <div>
            <label className="block text-[11px] font-bold text-brand-text-muted uppercase tracking-wider mb-1">Buscar na Visão</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-brand-text-muted" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filtrar por nome..."
                className="w-full bg-brand-card border border-brand-border rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-brand-text-muted/50 focus:outline-none focus:border-brand-primary"
              />
            </div>
          </div>
        </div>

        {/* Dimension Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar pt-2">
          <span className="text-xs font-bold text-brand-text-muted uppercase tracking-wider mr-2 shrink-0">Visão Analítica:</span>
          {[
            { id: 'grupo', label: 'Grupo de Empresa', icon: Layers },
            { id: 'empresa', label: 'Empresas do Grupo', icon: Building2 },
            { id: 'departamento', label: 'Departamento', icon: Briefcase },
            { id: 'colaborador', label: 'Colaborador', icon: User },
            { id: 'tarefa', label: 'Tarefa', icon: CheckCircle2 },
          ].map((tab) => {
            const IconComp = tab.icon;
            const isSelected = dimension === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setDimension(tab.id as DimensionType)}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/20 border border-brand-primary'
                    : 'bg-brand-card hover:bg-brand-card-bright text-brand-text-muted hover:text-white border border-brand-border/60'
                }`}
              >
                <IconComp size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary KPI Cards (Effort Only) */}
      <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
        <div className="bg-brand-card border border-brand-border/60 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-text-muted">Total de Horas Trabalhadas</span>
            <div className="text-lg font-mono font-black text-white mt-1">
              {formatSecondsToHms(totalSecondsAll)}
            </div>
            <span className="text-[10px] text-brand-primary font-mono mt-0.5 block">
              {(totalSecondsAll / 3600).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}h decimais
            </span>
          </div>
          <div className="p-3 rounded-xl bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
            <Clock size={20} />
          </div>
        </div>

        <div className="bg-brand-card border border-brand-border/60 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-text-muted">Total de Lançamentos</span>
            <div className="text-lg font-mono font-black text-white mt-1">
              {totalEntriesCount.toLocaleString('pt-BR')}
            </div>
            <span className="text-[10px] text-sky-400 font-mono mt-0.5 block">
              Média geral: {formatSecondsToHms(totalEntriesCount > 0 ? Math.round(totalSecondsAll / totalEntriesCount) : 0)}/ativ
            </span>
          </div>
          <div className="p-3 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Activity size={20} />
          </div>
        </div>

        <div className="bg-brand-card border border-brand-border/60 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-text-muted">Colaboradores Envolvidos</span>
            <div className="text-lg font-mono font-black text-white mt-1">
              {uniqueCollaboratorsCount.toLocaleString('pt-BR')}
            </div>
            <span className="text-[10px] text-emerald-400 font-mono mt-0.5 block">
              Equipe ativa no período
            </span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Users size={20} />
          </div>
        </div>

        <div className="bg-brand-card border border-brand-border/60 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-text-muted">Empresas / Clientes</span>
            <div className="text-lg font-mono font-black text-white mt-1">
              {uniqueCompaniesCount.toLocaleString('pt-BR')}
            </div>
            <span className="text-[10px] text-amber-500 font-mono mt-0.5 block">
              Atendidos no escopo
            </span>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Building2 size={20} />
          </div>
        </div>
      </div>

      {/* Main Content Table */}
      <div className="flex-1 px-6 pb-6 overflow-hidden flex flex-col">
        <div className="flex-1 bg-brand-card border border-brand-border/60 rounded-xl overflow-hidden shadow-md flex flex-col">
          <div className="px-5 py-3 bg-brand-card-light/40 border-b border-brand-border/60 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-text-muted">
              Resultado da Visão: <strong className="text-white">{dimension.toUpperCase()}</strong> ({aggregatedData.length} registros)
            </span>
          </div>

          <div className="flex-1 overflow-auto custom-scrollbar">
            {isLoading ? (
              <div className="py-24 text-center space-y-3">
                <RefreshCw size={32} className="animate-spin text-brand-primary mx-auto" />
                <p className="text-sm text-brand-text-muted">Carregando dados de esforço analítico...</p>
              </div>
            ) : errorMsg ? (
              <div className="py-24 text-center space-y-3 text-rose-400">
                <p className="text-sm">{errorMsg}</p>
              </div>
            ) : aggregatedData.length === 0 ? (
              <div className="py-24 text-center space-y-3">
                <BarChart3 size={40} className="text-brand-text-muted/30 mx-auto" />
                <p className="text-sm italic text-brand-text-muted">Nenhum dado de esforço encontrado para os filtros selecionados.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-brand-card-light z-10 shadow border-b border-brand-border/60">
                  <tr className="text-[11px] font-bold text-brand-text-muted/80 tracking-wider uppercase select-none">
                    <th className="py-3 px-4">
                      <button 
                        type="button" 
                        onClick={() => handleSort('name')}
                        className={`flex items-center gap-1.5 transition-colors cursor-pointer group select-none ${
                          sortField === 'name' ? 'text-brand-primary font-bold' : 'hover:text-white'
                        }`}
                        title={dimension === 'grupo' ? 'Ordenar por Grupo de Empresas (A-Z ou Z-A)' : 'Ordenar por Nome'}
                      >
                        <span>{dimension === 'grupo' ? 'Grupo de Empresas' : dimension === 'empresa' ? 'Empresa / Cliente' : dimension === 'departamento' ? 'Departamento' : dimension === 'colaborador' ? 'Colaborador' : dimension === 'tarefa' ? 'Tarefa' : dimension === 'tipo_pessoa' ? 'Tipo de Pessoa' : 'Período'}</span>
                        {renderSortIcon('name')}
                      </button>
                    </th>
                    {dimension === 'colaborador' && (
                      <th className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => handleSort('depto_nome')}
                          className={`flex items-center gap-1.5 transition-colors cursor-pointer group select-none ${
                            sortField === 'depto_nome' ? 'text-brand-primary font-bold' : 'hover:text-white'
                          }`}
                          title="Ordenar por Departamento (A-Z ou Z-A)"
                        >
                          <span>Departamento</span>
                          {renderSortIcon('depto_nome')}
                        </button>
                      </th>
                    )}
                    {dimension === 'empresa' && (
                      <th className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => handleSort('secondaryName')}
                          className={`flex items-center gap-1.5 transition-colors cursor-pointer group select-none ${
                            sortField === 'secondaryName' ? 'text-brand-primary font-bold' : 'hover:text-white'
                          }`}
                          title="Ordenar por Grupo (A-Z ou Z-A)"
                        >
                          <span>Grupo</span>
                          {renderSortIcon('secondaryName')}
                        </button>
                      </th>
                    )}
                    <th className="py-3 px-4 text-center">
                      <button 
                        type="button" 
                        onClick={() => handleSort('count')}
                        className={`flex items-center justify-center gap-1.5 transition-colors cursor-pointer w-full group select-none ${
                          sortField === 'count' ? 'text-brand-primary font-bold' : 'hover:text-white'
                        }`}
                        title="Ordenar por Lançamentos (Maior ou Menor)"
                      >
                        <span>Lançamentos</span>
                        {renderSortIcon('count')}
                      </button>
                    </th>
                    <th className="py-3 px-4 text-right">
                      <button 
                        type="button" 
                        onClick={() => handleSort('tempo_segundos')}
                        className={`flex items-center justify-end gap-1.5 transition-colors cursor-pointer w-full group select-none ${
                          sortField === 'tempo_segundos' ? 'text-brand-primary font-bold' : 'hover:text-white'
                        }`}
                        title="Ordenar por Horas Trabalhadas (Maior ou Menor)"
                      >
                        <span>Horas Trabalhadas</span>
                        {renderSortIcon('tempo_segundos')}
                      </button>
                    </th>
                    <th className="py-3 px-4 text-center">
                      <button 
                        type="button" 
                        onClick={() => handleSort('media_segundos')}
                        className={`flex items-center justify-center gap-1.5 transition-colors cursor-pointer w-full group select-none ${
                          sortField === 'media_segundos' ? 'text-brand-primary font-bold' : 'hover:text-white'
                        }`}
                        title="Ordenar por Média de Horas por Lançamento/Atividade (Horas / Lançamentos)"
                      >
                        <span>Média/Ativ</span>
                        {renderSortIcon('media_segundos')}
                      </button>
                    </th>
                    <th className="py-3 px-4 text-right">
                      <button 
                        type="button" 
                        onClick={() => handleSort('tempo_segundos')}
                        className={`flex items-center justify-end gap-1.5 transition-colors cursor-pointer w-full group select-none ${
                          sortField === 'tempo_segundos' ? 'text-brand-primary font-bold' : 'hover:text-white'
                        }`}
                        title="Ordenar por Participação (%)"
                      >
                        <span>Participação (%)</span>
                        {renderSortIcon('tempo_segundos')}
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/20 font-sans text-xs">
                  {aggregatedData.map((item, idx) => {
                    const share = totalSecondsAll > 0 ? (item.tempo_segundos / totalSecondsAll) * 100 : 0;
                    const isClickable = dimension === 'grupo' || dimension === 'empresa' || dimension === 'departamento' || dimension === 'tarefa' || dimension === 'colaborador';
                    return (
                      <tr 
                        key={`row_${idx}`} 
                        onClick={() => isClickable && handleOpenEntityModal(item, dimension)}
                        className={`hover:bg-brand-card-bright/10 transition-colors group ${isClickable ? 'cursor-pointer' : ''}`}
                      >
                        <td className="py-3 px-4">
                          {isClickable ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEntityModal(item, dimension);
                              }}
                              className="text-left group/btn flex items-center gap-2 cursor-pointer focus:outline-none flex-wrap"
                              title={
                                dimension === 'departamento'
                                  ? `Clique para abrir o detalhamento por empresa, atividade e colaborador de ${item.name}`
                                  : `Clique para abrir o detalhamento por departamento, atividade e colaborador de ${item.name}`
                              }
                            >
                              <span className="font-extrabold text-white text-[13px] group-hover/btn:text-brand-primary group-hover/btn:underline transition-colors">
                                {item.name}
                              </span>
                              {dimension === 'grupo' && item.empresasCount !== undefined && item.empresasCount > 0 && (
                                <span className="text-[10px] text-brand-text-muted bg-brand-primary/10 border border-brand-primary/20 px-1.5 py-0.5 rounded font-mono font-medium">
                                  {item.empresasCount} {item.empresasCount === 1 ? 'empresa' : 'empresas'}
                                </span>
                              )}
                              <span className="p-1 rounded bg-brand-primary/10 text-brand-primary border border-brand-primary/20 opacity-70 group-hover/btn:opacity-100 group-hover/btn:scale-110 transition-all shrink-0">
                                <Eye size={12} />
                              </span>
                            </button>
                          ) : (
                            <div className="font-extrabold text-white text-[13px]">{item.name}</div>
                          )}
                          {item.secondaryName && dimension !== 'empresa' && (
                            <div className="text-[10px] text-brand-text-muted font-mono mt-0.5">Grupo: {item.secondaryName}</div>
                          )}
                        </td>
                        {dimension === 'colaborador' && (
                          <td className="py-3 px-4 text-xs">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-brand-primary/10 text-brand-primary border border-brand-primary/20 text-xs font-semibold">
                              <Briefcase size={12} className="shrink-0 text-brand-primary" />
                              <span className="truncate max-w-[220px]" title={item.depto_nome || 'Sem Departamento'}>
                                {item.depto_nome || 'Sem Departamento'}
                              </span>
                            </span>
                          </td>
                        )}
                        {dimension === 'empresa' && (
                          <td className="py-3 px-4 font-mono text-xs text-brand-text-muted">{item.secondaryName || '-'}</td>
                        )}
                        <td className="py-3 px-4 text-center font-mono font-semibold text-sky-400">
                          {item.count.toLocaleString('pt-BR')}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-extrabold text-white text-sm">
                          {formatSecondsToHms(item.tempo_segundos)}
                          <span className="text-[10px] text-brand-text-muted font-normal block">
                            {(item.tempo_segundos / 3600).toFixed(1)}h decimais
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono">
                          <span className="font-extrabold text-brand-primary text-xs bg-brand-primary/10 border border-brand-primary/20 px-2 py-0.5 rounded inline-block">
                            {formatSecondsToHms(item.media_segundos)}
                          </span>
                          <span className="text-[10px] text-brand-text-muted/60 font-mono block mt-0.5">
                            {(item.media_segundos / 3600).toFixed(2)}h/ativ
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          <div className="flex items-center justify-end gap-2">
                            <span className="font-bold text-brand-primary">{share.toFixed(1)}%</span>
                            <div className="w-24 bg-brand-card-light rounded-full h-2 overflow-hidden border border-brand-border/40 hidden sm:block">
                              <div 
                                className="bg-brand-primary h-full rounded-full" 
                                style={{ width: `${Math.min(100, Math.max(2, share))}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Detalhamento por Departamento > Atividade > Colaborador */}
      {selectedEntityModal && (
        <div 
          onClick={handleCloseEntityModal}
          className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-brand-card border border-brand-border/80 rounded-2xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 bg-brand-card-light/60 border-b border-brand-border/60 flex flex-wrap items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 rounded-xl bg-brand-primary/10 text-brand-primary border border-brand-primary/20 shrink-0">
                  {selectedEntityModal.type === 'empresa' ? (
                    <Building2 size={22} />
                  ) : selectedEntityModal.type === 'departamento' ? (
                    <Briefcase size={22} />
                  ) : selectedEntityModal.type === 'tarefa' ? (
                    <CheckCircle2 size={22} />
                  ) : selectedEntityModal.type === 'colaborador' ? (
                    <User size={22} />
                  ) : (
                    <Layers size={22} />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-brand-primary bg-brand-primary/10 border border-brand-primary/20 px-2 py-0.5 rounded">
                      {selectedEntityModal.type === 'empresa'
                        ? 'Empresa / Cliente'
                        : selectedEntityModal.type === 'departamento'
                        ? 'Departamento'
                        : selectedEntityModal.type === 'tarefa'
                        ? 'Tarefa'
                        : selectedEntityModal.type === 'colaborador'
                        ? 'Colaborador'
                        : 'Grupo de Empresa'}
                    </span>
                    <h2 className="text-base font-extrabold text-white truncate max-w-xl">
                      {selectedEntityModal.name}
                    </h2>
                  </div>
                  <p className="text-xs text-brand-text-muted mt-0.5">
                    {selectedEntityModal.type === 'tarefa' ? (
                      <span>Detalhamento de esforço por <strong className="text-brand-text-muted/90">Departamento &gt; Colaborador &gt; Grupo &gt; Empresa</strong></span>
                    ) : selectedEntityModal.type === 'colaborador' ? (
                      <span>Detalhamento de esforço por <strong className="text-brand-text-muted/90">Departamento &gt; Tarefa &gt; Grupo &gt; Empresa</strong></span>
                    ) : selectedEntityModal.type === 'departamento' ? (
                      <span>Detalhamento de esforço por <strong className="text-brand-text-muted/90">Empresa &gt; Tarefa &gt; Colaborador</strong></span>
                    ) : selectedEntityModal.type === 'empresa' && selectedEntityModal.secondaryName ? (
                      <span>Grupo: <strong className="text-brand-text-muted/90">{selectedEntityModal.secondaryName}</strong> • Detalhamento por <strong className="text-brand-text-muted/90">Departamento &gt; Atividade &gt; Colaborador</strong></span>
                    ) : (
                      <span>Detalhamento de esforço por <strong className="text-brand-text-muted/90">Departamento &gt; Atividade &gt; Colaborador</strong></span>
                    )}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleModalExpandAll}
                  disabled={modalLoading || modalRecords.length === 0}
                  className="px-3 py-1.5 text-xs font-semibold text-brand-primary bg-brand-primary/10 hover:bg-brand-primary/20 border border-brand-primary/20 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  Expandir Tudo
                </button>
                <button
                  type="button"
                  onClick={handleModalCollapseAll}
                  disabled={modalLoading || modalRecords.length === 0}
                  className="px-3 py-1.5 text-xs font-semibold text-brand-text-muted bg-brand-bg hover:bg-brand-card/40 border border-brand-border/60 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  Recolher Tudo
                </button>
                <button
                  type="button"
                  onClick={handleCloseEntityModal}
                  className="p-1.5 text-brand-text-muted hover:text-white hover:bg-brand-border/40 rounded-lg transition-colors cursor-pointer ml-1"
                  title="Fechar"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal KPI Strip & Search */}
            <div className="px-6 py-3 bg-brand-bg/40 border-b border-brand-border/40 flex flex-wrap items-center justify-between gap-4 shrink-0">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] uppercase font-bold text-brand-text-muted">Horas Totais:</span>
                  <span className="font-mono text-sm font-extrabold text-white">
                    {formatSecondsToHms(modalHierarchy.totalGroupSeconds)}
                  </span>
                  <span className="text-[10px] text-brand-text-muted font-mono">
                    ({(modalHierarchy.totalGroupSeconds / 3600).toFixed(1)}h)
                  </span>
                </div>
                <div className="h-4 w-px bg-brand-border/60 hidden sm:block" />
                <div className="flex items-center gap-2">
                  <span className="text-[11px] uppercase font-bold text-brand-text-muted">Lançamentos:</span>
                  <span className="font-mono text-sm font-extrabold text-sky-400">
                    {modalHierarchy.totalGroupLancamentos.toLocaleString('pt-BR')}
                  </span>
                </div>
                <div className="h-4 w-px bg-brand-border/60 hidden sm:block" />
                <div className="flex items-center gap-2">
                  <span className="text-[11px] uppercase font-bold text-brand-text-muted">Média/Ativ:</span>
                  <span className="font-mono text-sm font-extrabold text-brand-primary">
                    {formatSecondsToHms(modalHierarchy.mediaGroup)}
                  </span>
                </div>
              </div>

              {/* Quick filter in modal */}
              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-2.5 text-brand-text-muted" />
                <input
                  type="text"
                  value={modalSearchTerm}
                  onChange={(e) => setModalSearchTerm(e.target.value)}
                  placeholder={
                    selectedEntityModal.type === 'departamento'
                      ? 'Filtrar empresa, tarefa, colaborador...'
                      : 'Filtrar departamento, atividade, colaborador...'
                  }
                  className="w-full bg-brand-card border border-brand-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-brand-text-muted/50 focus:outline-none focus:border-brand-primary"
                />
              </div>
            </div>

            {/* Modal Body: Tree Table */}
            <div className="flex-1 overflow-auto custom-scrollbar p-6 bg-brand-bg/20">
              {modalLoading ? (
                <div className="py-24 text-center space-y-3">
                  <RefreshCw size={36} className="animate-spin text-brand-primary mx-auto" />
                  <p className="text-sm font-medium text-brand-text-muted">
                    {selectedEntityModal.type === 'empresa'
                      ? 'Carregando apontamentos detalhados da empresa...'
                      : selectedEntityModal.type === 'departamento'
                      ? 'Carregando apontamentos detalhados do departamento...'
                      : 'Carregando apontamentos detalhados do grupo...'}
                  </p>
                </div>
              ) : modalError ? (
                <div className="py-24 text-center space-y-3 text-rose-400">
                  <p className="text-sm">{modalError}</p>
                </div>
              ) : Object.keys(modalHierarchy.primaryGroups).length === 0 ? (
                <div className="py-24 text-center space-y-3">
                  {selectedEntityModal.type === 'departamento' ? (
                    <Briefcase size={40} className="text-brand-text-muted/30 mx-auto" />
                  ) : selectedEntityModal.type === 'empresa' ? (
                    <Building2 size={40} className="text-brand-text-muted/30 mx-auto" />
                  ) : (
                    <Layers size={40} className="text-brand-text-muted/30 mx-auto" />
                  )}
                  <p className="text-sm italic text-brand-text-muted">
                    {selectedEntityModal.type === 'empresa'
                      ? 'Nenhum apontamento detalhado encontrado para esta empresa no período selecionado.'
                      : selectedEntityModal.type === 'departamento'
                      ? 'Nenhum apontamento detalhado encontrado para este departamento no período selecionado.'
                      : 'Nenhum apontamento detalhado encontrado para este grupo no período selecionado.'}
                  </p>
                </div>
              ) : (
                <div className="border border-brand-border/60 rounded-xl overflow-hidden bg-brand-card/40">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-brand-card-light/80 sticky top-0 z-10 border-b border-brand-border/60">
                      <tr className="text-[11px] font-bold text-brand-text-muted/80 tracking-wider uppercase select-none">
                        <th className="py-3 px-4">
                          {selectedEntityModal.type === 'departamento'
                            ? 'Empresa / Tarefa / Colaborador'
                            : selectedEntityModal.type === 'tarefa'
                            ? 'Departamento / Colaborador / Grupo / Empresa'
                            : selectedEntityModal.type === 'colaborador'
                            ? 'Departamento / Tarefa / Grupo / Empresa'
                            : 'Departamento / Atividade / Colaborador'}
                        </th>
                        <th className="py-3 px-4 text-center w-32">Lançamentos</th>
                        <th className="py-3 px-4 text-right w-40">Horas Trabalhadas</th>
                        <th className="py-3 px-4 text-center w-36">Média/Ativ</th>
                        <th className="py-3 px-4 text-right w-36">Participação (%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border/20 font-sans text-xs">
                      {Object.keys(modalHierarchy.primaryGroups)
                        .filter(primaryName => {
                          if (!modalSearchTerm) return true;
                          const term = modalSearchTerm.toLowerCase();
                          if (primaryName.toLowerCase().includes(term)) return true;
                          const group = modalHierarchy.primaryGroups[primaryName];
                          return Object.keys(group.tarefas).some(tName => {
                            if (tName.toLowerCase().includes(term)) return true;
                            const task = group.tarefas[tName];
                            return Object.keys(task.colaboradores).some(cName => cName.toLowerCase().includes(term));
                          });
                        })
                        .sort((a, b) => modalHierarchy.primaryGroups[b].tempo_segundos - modalHierarchy.primaryGroups[a].tempo_segundos)
                        .map(primaryName => {
                          const group = modalHierarchy.primaryGroups[primaryName];
                          const isPrimaryExpanded = modalExpandedPrimary.has(primaryName);
                          const primaryShare = modalHierarchy.totalGroupSeconds > 0 
                            ? (group.tempo_segundos / modalHierarchy.totalGroupSeconds) * 100 
                            : 0;
                          const isDeptModal = selectedEntityModal.type === 'departamento';

                          return (
                            <React.Fragment key={`prim_${primaryName}`}>
                              {/* Level 1: Empresa (se modal departamento) ou Departamento (se modal grupo/empresa) */}
                              <tr className="bg-brand-card/70 hover:bg-brand-card-bright/20 transition-colors font-semibold border-t border-brand-border/40">
                                <td className="py-3 px-4">
                                  <button
                                    type="button"
                                    onClick={() => togglePrimaryExpand(primaryName)}
                                    className="flex items-center gap-2 text-left cursor-pointer focus:outline-none w-full"
                                  >
                                    <span className={`text-brand-primary shrink-0 transition-transform duration-200 ${isPrimaryExpanded ? 'rotate-90' : 'rotate-0'}`}>
                                      <ChevronRight size={16} />
                                    </span>
                                    <div className="p-1 px-1.5 rounded bg-brand-primary/10 text-brand-primary border border-brand-primary/15 shrink-0">
                                      {isDeptModal ? <Building2 size={14} /> : <Briefcase size={14} />}
                                    </div>
                                    <span className="font-extrabold text-white text-[13px] tracking-wide">
                                      {primaryName}
                                    </span>
                                    <span className="text-[10px] text-brand-text-muted font-mono font-normal ml-1">
                                      ({Object.keys(group.tarefas).length} {Object.keys(group.tarefas).length === 1 ? (isDeptModal ? 'tarefa' : 'atividade') : (isDeptModal ? 'tarefas' : 'atividades')})
                                    </span>
                                  </button>
                                </td>
                                <td className="py-3 px-4 text-center font-mono font-bold text-sky-400">
                                  {group.lancamentos.toLocaleString('pt-BR')}
                                </td>
                                <td className="py-3 px-4 text-right font-mono font-extrabold text-white text-sm">
                                  {formatSecondsToHms(group.tempo_segundos)}
                                  <span className="text-[10px] text-brand-text-muted font-normal block">
                                    {(group.tempo_segundos / 3600).toFixed(1)}h
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-center font-mono">
                                  <span className="font-extrabold text-brand-primary text-xs bg-brand-primary/10 border border-brand-primary/20 px-2 py-0.5 rounded inline-block">
                                    {formatSecondsToHms(group.media_segundos)}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-right font-mono">
                                  <div className="flex items-center justify-end gap-2">
                                    <span className="font-bold text-brand-primary">{primaryShare.toFixed(1)}%</span>
                                    <div className="w-16 bg-brand-card-light rounded-full h-1.5 overflow-hidden border border-brand-border/40 hidden sm:block">
                                      <div className="bg-brand-primary h-full rounded-full" style={{ width: `${Math.min(100, Math.max(3, primaryShare))}%` }} />
                                    </div>
                                  </div>
                                </td>
                              </tr>

                              {/* Level 2: Tarefas / Atividades (Drill Down 1) */}
                              {isPrimaryExpanded && Object.keys(group.tarefas)
                                .sort((a, b) => group.tarefas[b].tempo_segundos - group.tarefas[a].tempo_segundos)
                                .map(taskName => {
                                  const task = group.tarefas[taskName];
                                  const taskKey = `${primaryName}:::${taskName}`;
                                  const isTaskExpanded = modalExpandedTasks.has(taskKey);
                                  const taskShare = group.tempo_segundos > 0 
                                    ? (task.tempo_segundos / group.tempo_segundos) * 100 
                                    : 0;

                                  return (
                                    <React.Fragment key={`task_${taskKey}`}>
                                      <tr className="bg-brand-bg/40 hover:bg-brand-card-bright/15 transition-colors border-t border-brand-border/15">
                                        <td className="py-2.5 px-4 pl-10">
                                          <button
                                            type="button"
                                            onClick={() => toggleTaskExpand(primaryName, taskName)}
                                            className="flex items-center gap-2 text-left cursor-pointer focus:outline-none w-full"
                                          >
                                            <span className={`text-emerald-400 shrink-0 transition-transform duration-200 ${isTaskExpanded ? 'rotate-90' : 'rotate-0'}`}>
                                              <ChevronRight size={14} />
                                            </span>
                                            <div className="p-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 shrink-0">
                                              <CheckCircle2 size={12} />
                                            </div>
                                            <span className="font-bold text-white/90 text-xs">
                                              {taskName}
                                            </span>
                                            <span className="text-[9px] text-brand-text-muted font-mono font-normal ml-1">
                                              ({Object.keys(task.colaboradores).length} {Object.keys(task.colaboradores).length === 1 ? 'colab' : 'colabs'})
                                            </span>
                                          </button>
                                        </td>
                                        <td className="py-2.5 px-4 text-center font-mono text-xs font-semibold text-sky-400/90">
                                          {task.lancamentos.toLocaleString('pt-BR')}
                                        </td>
                                        <td className="py-2.5 px-4 text-right font-mono font-bold text-white/90 text-xs">
                                          {formatSecondsToHms(task.tempo_segundos)}
                                          <span className="text-[9px] text-brand-text-muted font-normal block">
                                            {(task.tempo_segundos / 3600).toFixed(1)}h
                                          </span>
                                        </td>
                                        <td className="py-2.5 px-4 text-center font-mono">
                                          <span className="font-bold text-emerald-400 text-xs bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded inline-block">
                                            {formatSecondsToHms(task.media_segundos)}
                                          </span>
                                        </td>
                                        <td className="py-2.5 px-4 text-right font-mono">
                                          <div className="flex items-center justify-end gap-2">
                                            <span className="font-semibold text-emerald-400 text-xs">{taskShare.toFixed(1)}%</span>
                                            <div className="w-16 bg-brand-card-light rounded-full h-1.5 overflow-hidden border border-brand-border/40 hidden sm:block">
                                              <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${Math.min(100, Math.max(3, taskShare))}%` }} />
                                            </div>
                                          </div>
                                        </td>
                                      </tr>

                                      {/* Level 3: Colaboradores (Drill Down 2) */}
                                      {isTaskExpanded && Object.keys(task.colaboradores)
                                        .sort((a, b) => task.colaboradores[b].tempo_segundos - task.colaboradores[a].tempo_segundos)
                                        .map(colabName => {
                                          const colab = task.colaboradores[colabName];
                                          const colabShare = task.tempo_segundos > 0 
                                            ? (colab.tempo_segundos / task.tempo_segundos) * 100 
                                            : 0;

                                          return (
                                            <tr key={`colab_${taskKey}_${colabName}`} className="bg-black/20 hover:bg-brand-card-bright/10 transition-colors border-t border-brand-border/10">
                                              <td className="py-2 px-4 pl-16">
                                                {isSpecial4LevelView && Object.keys(colab.empresas).length > 0 ? (
                                                  <button
                                                    type="button"
                                                    onClick={() => toggleLevel3Expand(primaryName, taskName, colabName)}
                                                    className="flex items-center gap-2 text-left cursor-pointer focus:outline-none w-full"
                                                  >
                                                    <span className={`text-amber-400 shrink-0 transition-transform duration-200 ${modalExpandedLevel3.has(`${taskKey}:::${colabName}`) ? 'rotate-90' : 'rotate-0'}`}>
                                                      <ChevronRight size={12} />
                                                    </span>
                                                    <div className="p-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/15 shrink-0">
                                                      <Layers size={12} />
                                                    </div>
                                                    <span className="text-white/90 font-semibold text-xs">
                                                      {colabName}
                                                    </span>
                                                    <span className="text-[9px] text-brand-text-muted font-mono font-normal ml-1">
                                                      ({Object.keys(colab.empresas).length} {Object.keys(colab.empresas).length === 1 ? 'empresa' : 'empresas'})
                                                    </span>
                                                  </button>
                                                ) : (
                                                  <div className="flex items-center gap-2">
                                                    <div className="p-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/15 shrink-0">
                                                      <User size={12} />
                                                    </div>
                                                    <span className="text-white/80 font-medium text-xs">
                                                      {colabName}
                                                    </span>
                                                  </div>
                                                )}
                                              </td>
                                              <td className="py-2 px-4 text-center font-mono text-xs text-sky-400/80">
                                                {colab.lancamentos.toLocaleString('pt-BR')}
                                              </td>
                                              <td className="py-2 px-4 text-right font-mono font-medium text-white/80 text-xs">
                                                {formatSecondsToHms(colab.tempo_segundos)}
                                                <span className="text-[9px] text-brand-text-muted font-normal block">
                                                  {(colab.tempo_segundos / 3600).toFixed(1)}h
                                                </span>
                                              </td>
                                              <td className="py-2 px-4 text-center font-mono">
                                                <span className="text-amber-400 text-xs font-mono bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded inline-block">
                                                  {formatSecondsToHms(colab.media_segundos)}
                                                </span>
                                              </td>
                                              <td className="py-2 px-4 text-right font-mono">
                                                <div className="flex items-center justify-end gap-2">
                                                  <span className="text-amber-400 text-xs font-mono">{colabShare.toFixed(1)}%</span>
                                                  <div className="w-16 bg-brand-card-light rounded-full h-1 overflow-hidden border border-brand-border/40 hidden sm:block">
                                                    <div className="bg-amber-400 h-full rounded-full" style={{ width: `${Math.min(100, Math.max(3, colabShare))}%` }} />
                                                  </div>
                                                </div>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                    </React.Fragment>
                                  );
                                })}
                            </React.Fragment>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
