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
  FileSpreadsheet
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

  // Department filter
  const [availableDepartments, setAvailableDepartments] = useState<{ id: string; nome: string }[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('all');

  // Dimension / View Mode
  type DimensionType = 'grupo' | 'empresa' | 'departamento' | 'colaborador' | 'tarefa' | 'tipo_pessoa' | 'periodo';
  const [dimension, setDimension] = useState<DimensionType>('grupo');

  // Search and Sort
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortField, setSortField] = useState<string>('tempo_segundos');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Discover periods and departments on mount
  useEffect(() => {
    const initFilterOptions = async () => {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase
            .from('vw_apontamento_mensal_resumo')
            .select('aponta_ano, aponta_mes, depto_id, depto_nome, depto_calcula_sn');

          if (!error && data && data.length > 0) {
            // Periods
            const pSet = new Set<string>();
            const deptMap = new Map<string, string>();

            data.forEach((row: any) => {
              if (row.aponta_ano && row.aponta_mes) {
                pSet.add(`${row.aponta_ano}-${String(row.aponta_mes).padStart(2, '0')}`);
              }
              if (row.depto_id !== undefined && row.depto_id !== null && row.depto_nome && (row.depto_calcula_sn === true || row.depto_calcula_sn === 'S' || row.depto_calcula_sn === '1' || row.depto_calcula_sn === undefined)) {
                deptMap.set(String(row.depto_id), String(row.depto_nome).trim());
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

            const deptsList = Array.from(deptMap.entries())
              .map(([id, nome]) => ({ id, nome }))
              .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
            if (deptsList.length > 0) {
              setAvailableDepartments(deptsList);
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
            .from('vw_apontamento_mensal_resumo')
            .select('*');

          if (activeYears.length > 0) {
            query = query.in('aponta_ano', activeYears);
          }
          if (activeMonths.length > 0) {
            query = query.in('aponta_mes', activeMonths);
          }
          if (selectedDepartmentId !== 'all') {
            query = query.eq('depto_id', selectedDepartmentId);
          }

          const { data, error } = await query.range(page * pageSize, (page + 1) * pageSize - 1);
          if (error) throw error;

          if (data && data.length > 0) {
            const validPeriodSet = new Set(activePeriods.map(p => `${p.ano}-${p.mes}`));
            const filtered = data.filter((row: any) => 
              validPeriodSet.has(`${row.aponta_ano}-${row.aponta_mes}`) &&
              (selectedDepartmentId === 'all' || String(row.depto_id) === String(selectedDepartmentId))
            );
            allRecords = [...allRecords, ...filtered];

            if (data.length < pageSize) {
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
  }, [startPeriod, endPeriod, selectedDepartmentId, availablePeriods, refreshTrigger]);

  // Aggregate data according to chosen dimension
  const aggregatedData = useMemo(() => {
    const map = new Map<string, { key: string; name: string; secondaryName?: string; tempo_segundos: number; count: number; entitiesSet: Set<string> }>();

    rawData.forEach(row => {
      let key = 'N/A';
      let name = 'Não Informado';
      let secondaryName = undefined;

      const secs = row.aponta_qtde_segundos || row.tempo_segundos || 0;

      switch (dimension) {
        case 'grupo':
          key = row.grupo_nome || 'SEM GRUPO';
          name = key;
          break;
        case 'empresa':
          key = row.empresa_id || row.cliente_id || row.empresa_nome || 'SEM EMPRESA';
          name = row.empresa_nome || row.cliente_nome || 'Empresa sem nome';
          secondaryName = row.grupo_nome;
          break;
        case 'departamento':
          key = String(row.depto_id || row.depto_nome || 'SEM DEPTO');
          name = row.depto_nome || 'Sem Departamento';
          break;
        case 'colaborador':
          key = row.colaborador_id || row.colaborador_nome || 'SEM COLABORADOR';
          name = row.colaborador_nome || 'Colaborador não identificado';
          break;
        case 'tarefa':
          key = row.tarefa_nome || row.tarefa || 'SEM TAREFA';
          name = key;
          break;
        case 'tipo_pessoa':
          key = row.tipo_pessoa || 'OUTROS';
          name = key === 'PJ' ? 'Pessoa Jurídica (PJ)' : key === 'PF' ? 'Pessoa Física (PF)' : key;
          break;
        case 'periodo':
          key = `${row.aponta_ano}-${String(row.aponta_mes).padStart(2, '0')}`;
          name = `${getMonthName(row.aponta_mes)} / ${row.aponta_ano}`;
          break;
      }

      if (!map.has(key)) {
        map.set(key, { key, name, secondaryName, tempo_segundos: 0, count: 0, entitiesSet: new Set() });
      }

      const item = map.get(key)!;
      item.tempo_segundos += secs;
      item.count += 1;
      if (row.empresa_id || row.empresa_nome) {
        item.entitiesSet.add(row.empresa_id || row.empresa_nome);
      }
    });

    const list = Array.from(map.values()).map(item => ({
      ...item,
      empresasCount: item.entitiesSet.size
    }));

    // Filter by search term
    const filtered = list.filter(item => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return item.name.toLowerCase().includes(term) || (item.secondaryName && item.secondaryName.toLowerCase().includes(term));
    });

    // Sort
    return filtered.sort((a, b) => {
      let valA: any = a[sortField as keyof typeof a];
      let valB: any = b[sortField as keyof typeof b];

      if (typeof valA === 'string') {
        return sortAsc ? valA.localeCompare(valB, 'pt-BR') : valB.localeCompare(valA, 'pt-BR');
      }
      return sortAsc ? valA - valB : valB - valA;
    });
  }, [rawData, dimension, searchTerm, sortField, sortAsc]);

  // Total metrics
  const totalSecondsAll = useMemo(() => rawData.reduce((acc, curr) => acc + (curr.aponta_qtde_segundos || curr.tempo_segundos || 0), 0), [rawData]);
  const totalEntriesCount = useMemo(() => rawData.length, [rawData]);
  const uniqueCollaboratorsCount = useMemo(() => new Set(rawData.map(r => r.colaborador_nome || r.colaborador_id).filter(Boolean)).size, [rawData]);
  const uniqueCompaniesCount = useMemo(() => new Set(rawData.map(r => r.empresa_id || r.empresa_nome).filter(Boolean)).size, [rawData]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const handleExportCSV = () => {
    if (aggregatedData.length === 0) return;
    try {
      const headers = ['Visão', 'Nome', 'Tempo Total (HH:MM:SS)', 'Horas Decimais', 'Total de Apontamentos', 'Participação (%)'];
      const csvRows = [headers.join(';')];

      aggregatedData.forEach(item => {
        const hoursDec = (item.tempo_segundos / 3600).toFixed(2).replace('.', ',');
        const share = totalSecondsAll > 0 ? ((item.tempo_segundos / totalSecondsAll) * 100).toFixed(1).replace('.', ',') + '%' : '0%';
        const row = [
          dimension.toUpperCase(),
          `"${item.name.replace(/"/g, '""')}"`,
          `"${formatSecondsToHms(item.tempo_segundos)}"`,
          hoursDec,
          item.count,
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

          {/* Department Filter */}
          <div>
            <label className="block text-[11px] font-bold text-brand-text-muted uppercase tracking-wider mb-1">Departamento</label>
            <select
              value={selectedDepartmentId}
              onChange={(e) => setSelectedDepartmentId(e.target.value)}
              className="w-full bg-brand-card border border-brand-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-primary"
            >
              <option value="all">Todos os Departamentos</option>
              {availableDepartments.map(d => (
                <option key={`dept_${d.id}`} value={d.id}>{d.nome}</option>
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
            { id: 'tipo_pessoa', label: 'Tipo de Pessoa (PJ/PF)', icon: Users },
            { id: 'periodo', label: 'Período (Mês/Ano)', icon: Calendar },
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
            <span className="text-[10px] text-brand-text-muted font-mono mt-0.5 block">
              Registros de apontamento
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
                        className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
                      >
                        <span>{dimension === 'grupo' ? 'Grupo de Empresas' : dimension === 'empresa' ? 'Empresa / Cliente' : dimension === 'departamento' ? 'Departamento' : dimension === 'colaborador' ? 'Colaborador' : dimension === 'tarefa' ? 'Tarefa' : dimension === 'tipo_pessoa' ? 'Tipo de Pessoa' : 'Período'}</span>
                        <ArrowUpDown size={12} />
                      </button>
                    </th>
                    {dimension === 'empresa' && (
                      <th className="py-3 px-4">Grupo</th>
                    )}
                    <th className="py-3 px-4 text-center">
                      <button 
                        type="button" 
                        onClick={() => handleSort('count')}
                        className="flex items-center justify-center gap-1.5 hover:text-white transition-colors cursor-pointer w-full"
                      >
                        <span>Lançamentos</span>
                        <ArrowUpDown size={12} />
                      </button>
                    </th>
                    <th className="py-3 px-4 text-right">
                      <button 
                        type="button" 
                        onClick={() => handleSort('tempo_segundos')}
                        className="flex items-center justify-end gap-1.5 hover:text-white transition-colors cursor-pointer w-full"
                      >
                        <span>Horas Trabalhadas</span>
                        <ArrowUpDown size={12} />
                      </button>
                    </th>
                    <th className="py-3 px-4 text-right">Participação (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/20 font-sans text-xs">
                  {aggregatedData.map((item, idx) => {
                    const share = totalSecondsAll > 0 ? (item.tempo_segundos / totalSecondsAll) * 100 : 0;
                    return (
                      <tr key={`row_${idx}`} className="hover:bg-brand-card-bright/10 transition-colors group">
                        <td className="py-3 px-4">
                          <div className="font-extrabold text-white text-[13px]">{item.name}</div>
                          {item.secondaryName && (
                            <div className="text-[10px] text-brand-text-muted font-mono mt-0.5">Grupo: {item.secondaryName}</div>
                          )}
                        </td>
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
    </div>
  );
}
