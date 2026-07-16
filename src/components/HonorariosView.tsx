import React, { useState, useEffect, useMemo } from 'react';
import { 
  Coins, 
  Search, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  RefreshCw, 
  FileSpreadsheet, 
  Eye, 
  X, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface HonorarioRow {
  id: number;
  grupo: string; // ASSESSORIA, CONTABIL, NAO INFO based on CASE WHEN
  codigo: string | null;
  cliente: string | null;
  tar: string | null;
  data_inicio: string | null;
  tb: string | null;
  cnt_total_hr: number;
  cnt_total_vlr: number;
  fsc_total_hr: number;
  fsc_total_valor: number;
  psl_total_hr: number;
  psl_total_valor: number;
  custo_geral: number;
  margem: number;
  honor_atual: number;
  honor_ideal: number;

  // Raw fields for details
  cnt_lider: number | null;
  cnt_analista: number | null;
  cnt_demais: number | null;
  fsc_lider: number | null;
  fsc_analista: number | null;
  fsc_demais: number | null;
  psl_lider: number | null;
  psl_analista: number | null;
  psl_demais: number | null;
  folha_op: number | null;
}

export default function HonorariosView() {
  const [data, setData] = useState<HonorarioRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Group collapsible state
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    'ASSESSORIA': true,
    'CONTABIL': true,
    'NAO INFO': true
  });

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrupo, setSelectedGrupo] = useState('ALL');

  // Sorting state
  const [sortField, setSortField] = useState<keyof HonorarioRow>('cliente');
  const [sortAsc, setSortAsc] = useState(true);

  // Pagination state (by group)
  const [groupPages, setGroupPages] = useState<Record<string, number>>({
    'ASSESSORIA': 1,
    'CONTABIL': 1,
    'NAO INFO': 1
  });
  const [pageSize, setPageSize] = useState(15);

  // Detail Modal state
  const [selectedRow, setSelectedRow] = useState<HonorarioRow | null>(null);

  // Fetch data
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (!isSupabaseConfigured || !supabase) {
        throw new Error("Conexão com o Supabase não configurada.");
      }

      // We fetch the needed columns to calculate the final select state client-side
      const { data: rawData, error: queryError } = await supabase
        .from('acomp_honorarios')
        .select(`
          id,
          grupo,
          cliente,
          codigo,
          tar,
          data_inicio,
          tb,
          cnt_lider,
          cnt_analista,
          cnt_demais,
          cnt_total_vlr,
          fsc_lider,
          fsc_analista,
          fsc_demais,
          fsc_total_valor,
          psl_lider,
          psl_analista,
          psl_demais,
          psl_total_valor,
          custo_geral,
          margem,
          honor_atual,
          honor_ideal,
          folha_op
        `);

      if (queryError) {
        throw queryError;
      }

      if (rawData) {
        // Map raw data into the specified SQL-like select shape
        const mapped: HonorarioRow[] = rawData.map(row => {
          // group mapping
          let mappedGrupo = 'NAO INFO';
          if (row.grupo === 'A') {
            mappedGrupo = 'ASSESSORIA';
          } else if (row.grupo === 'C') {
            mappedGrupo = 'CONTABIL';
          }

          // sum calculations safely treating null as 0
          const cnt_total_hr = (row.cnt_lider || 0) + (row.cnt_analista || 0) + (row.cnt_demais || 0);
          const fsc_total_hr = (row.fsc_lider || 0) + (row.fsc_analista || 0) + (row.fsc_demais || 0);
          const psl_total_hr = (row.psl_lider || 0) + (row.psl_analista || 0) + (row.psl_demais || 0);

          return {
            id: row.id,
            grupo: mappedGrupo,
            codigo: row.codigo,
            cliente: row.cliente ? String(row.cliente).trim().toUpperCase() : null,
            tar: row.tar ? String(row.tar).toUpperCase() : null,
            data_inicio: row.data_inicio,
            tb: row.tb ? String(row.tb).toUpperCase() : null,
            cnt_total_hr,
            cnt_total_vlr: Number(row.cnt_total_vlr || 0),
            fsc_total_hr,
            fsc_total_valor: Number(row.fsc_total_valor || 0),
            psl_total_hr,
            psl_total_valor: Number(row.psl_total_valor || 0),
            custo_geral: Number(row.custo_geral || 0),
            margem: Number(row.margem || 0),
            honor_atual: Number(row.honor_atual || 0),
            honor_ideal: Number(row.honor_ideal || 0),
            
            // Keep raw for drill down
            cnt_lider: row.cnt_lider,
            cnt_analista: row.cnt_analista,
            cnt_demais: row.cnt_demais,
            fsc_lider: row.fsc_lider,
            fsc_analista: row.fsc_analista,
            fsc_demais: row.fsc_demais,
            psl_lider: row.psl_lider,
            psl_analista: row.psl_analista,
            psl_demais: row.psl_demais,
            folha_op: row.folha_op
          };
        });

        setData(mapped);
      }
    } catch (err: any) {
      console.error("Erro ao carregar acomp_honorarios:", err);
      setError(err?.message || "Erro desconhecido ao buscar dados de honorários.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter & Search processing
  const filteredData = useMemo(() => {
    return data.filter(row => {
      // search match
      const codeStr = String(row.codigo || '').toLowerCase();
      const cliStr = String(row.cliente || '').toLowerCase();
      const tarStr = String(row.tar || '').toLowerCase();
      const tbStr = String(row.tb || '').toLowerCase();
      const search = searchTerm.toLowerCase().trim();

      const matchesSearch = !search || 
        codeStr.includes(search) || 
        cliStr.includes(search) || 
        tarStr.includes(search) || 
        tbStr.includes(search);

      // group match
      const matchesGrupo = selectedGrupo === 'ALL' || row.grupo === selectedGrupo;

      return matchesSearch && matchesGrupo;
    });
  }, [data, searchTerm, selectedGrupo]);

  // Sort processing
  const sortedData = useMemo(() => {
    const sorted = [...filteredData];
    sorted.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (valA === null || valA === undefined) return sortAsc ? 1 : -1;
      if (valB === null || valB === undefined) return sortAsc ? -1 : 1;

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      return sortAsc 
        ? (valA as number) - (valB as number) 
        : (valB as number) - (valA as number);
    });
    return sorted;
  }, [filteredData, sortField, sortAsc]);

  // Group sorted items
  const groupedSortedData = useMemo(() => {
    const groups: Record<string, HonorarioRow[]> = {
      'ASSESSORIA': [],
      'CONTABIL': [],
      'NAO INFO': []
    };
    sortedData.forEach(row => {
      const g = row.grupo || 'NAO INFO';
      if (!groups[g]) {
        groups[g] = [];
      }
      groups[g].push(row);
    });
    return groups;
  }, [sortedData]);

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  // Reset page when filtering or sorting
  useEffect(() => {
    setGroupPages({
      'ASSESSORIA': 1,
      'CONTABIL': 1,
      'NAO INFO': 1
    });
  }, [searchTerm, selectedGrupo, sortField, sortAsc, pageSize]);

  // Calculate Metrics from sorted/filtered data
  const metrics = useMemo(() => {
    let totalAtual = 0;
    let totalIdeal = 0;
    let totalCusto = 0;
    let totalMargem = 0;

    filteredData.forEach(row => {
      totalAtual += row.honor_atual;
      totalIdeal += row.honor_ideal;
      totalCusto += row.custo_geral;
      totalMargem += row.margem;
    });

    const diffIdealAtual = totalIdeal - totalAtual;
    const avgMargem = filteredData.length > 0 ? (totalMargem / filteredData.length) : 0;

    return {
      totalAtual,
      totalIdeal,
      totalCusto,
      totalMargem,
      diffIdealAtual,
      avgMargem,
      count: filteredData.length
    };
  }, [filteredData]);

  const handleSort = (field: keyof HonorarioRow) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // CSV Export helper
  const handleExportCSV = () => {
    if (sortedData.length === 0) return;

    // columns headers matching the requested SELECT structure
    const headers = [
      'ID',
      'GRUPO',
      'CODIGO',
      'CLIENTE',
      'TAR',
      'DATA_INICIO',
      'TB',
      'CNT_TOTAL_HR',
      'CNT_TOTAL_VLR',
      'FSC_TOTAL_HR',
      'FSC_TOTAL_VALOR',
      'PSL_TOTAL_HR',
      'PSL_TOTAL_VALOR',
      'CUSTO_GERAL',
      'MARGEM',
      'HONOR_ATUAL',
      'HONOR_IDEAL'
    ];

    const csvRows = [headers.join(';')];

    sortedData.forEach(row => {
      const values = [
        row.id,
        `"${row.grupo}"`,
        `"${row.codigo || ''}"`,
        `"${row.cliente || ''}"`,
        `"${row.tar || ''}"`,
        `"${row.data_inicio || ''}"`,
        `"${row.tb || ''}"`,
        row.cnt_total_hr.toFixed(2),
        row.cnt_total_vlr.toFixed(2),
        row.fsc_total_hr.toFixed(2),
        row.fsc_total_valor.toFixed(2),
        row.psl_total_hr.toFixed(2),
        row.psl_total_valor.toFixed(2),
        row.custo_geral.toFixed(2),
        row.margem.toFixed(2),
        row.honor_atual.toFixed(2),
        row.honor_ideal.toFixed(2)
      ];
      csvRows.push(values.join(';'));
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `acompanhamento_honorarios_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-6 space-y-6" id="honorarios-view-root">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-brand-border/40 pb-5">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Coins className="text-brand-primary" size={26} />
            Acompanhamento de Honorários
          </h1>
          <p className="text-xs text-brand-text-muted mt-1">
            Análise consolidada de custos operacionais, margens e honorários ideais de assessoria e contabilidade.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="flex items-center gap-2 bg-brand-card hover:bg-brand-card-light text-brand-text px-3.5 py-2 rounded-lg border border-brand-border text-xs font-semibold cursor-pointer transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Atualizar
          </button>

          <button
            onClick={handleExportCSV}
            disabled={sortedData.length === 0}
            className="flex items-center gap-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 px-3.5 py-2 rounded-lg border border-emerald-500/30 text-xs font-semibold cursor-pointer transition-all active:scale-95 disabled:opacity-50"
          >
            <FileSpreadsheet size={14} />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="honorarios-metrics-grid">
        {/* Total Honorário Atual */}
        <div className="bg-brand-card border border-brand-border rounded-xl p-5 relative overflow-hidden group hover:border-brand-primary/30 transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] uppercase font-black tracking-wider text-brand-text-muted/80">Honorário Atual</p>
              <h3 className="text-2xl font-black text-white font-mono mt-2">{formatBRL(metrics.totalAtual)}</h3>
            </div>
            <div className="p-2 bg-brand-primary/10 rounded-lg text-brand-primary">
              <DollarSign size={18} />
            </div>
          </div>
          <p className="text-[10px] text-brand-text-muted/60 mt-3 font-mono">Consolidado filtrado ({metrics.count} registros)</p>
        </div>

        {/* Total Honorário Ideal */}
        <div className="bg-brand-card border border-brand-border rounded-xl p-5 relative overflow-hidden group hover:border-amber-500/30 transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] uppercase font-black tracking-wider text-brand-text-muted/80">Honorário Ideal</p>
              <h3 className="text-2xl font-black text-amber-500 font-mono mt-2">{formatBRL(metrics.totalIdeal)}</h3>
            </div>
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
              <TrendingUp size={18} />
            </div>
          </div>
          <p className="text-[10px] text-amber-400/80 mt-3 font-semibold flex items-center gap-1">
            Diferença: {formatBRL(metrics.diffIdealAtual)}
          </p>
        </div>

        {/* Custo Geral Total */}
        <div className="bg-brand-card border border-brand-border rounded-xl p-5 relative overflow-hidden group hover:border-red-500/30 transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] uppercase font-black tracking-wider text-brand-text-muted/80">Custo Geral Total</p>
              <h3 className="text-2xl font-black text-red-500/90 font-mono mt-2">{formatBRL(metrics.totalCusto)}</h3>
            </div>
            <div className="p-2 bg-red-500/10 rounded-lg text-red-400">
              <TrendingDown size={18} />
            </div>
          </div>
          <p className="text-[10px] text-brand-text-muted/60 mt-3 font-mono">Soma dos custos diretos e indiretos</p>
        </div>

        {/* Margem Total Conquistada */}
        <div className="bg-brand-card border border-brand-border rounded-xl p-5 relative overflow-hidden group hover:border-emerald-500/30 transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] uppercase font-black tracking-wider text-brand-text-muted/80">Margem Consolidada</p>
              <h3 className="text-2xl font-black text-emerald-400 font-mono mt-2">{formatBRL(metrics.totalMargem)}</h3>
            </div>
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
              <Coins size={18} />
            </div>
          </div>
          <p className="text-[10px] text-emerald-400/80 mt-3 font-semibold">
            Margem Média: {formatBRL(metrics.avgMargem)}
          </p>
        </div>
      </div>

      {/* Grid Controls Panel */}
      <div className="bg-brand-card border border-brand-border rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-md">
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
          {/* Search bar */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-muted/50" size={14} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por código, tarefa (TAR) ou tabela (TB)..."
              className="w-full bg-brand-bg text-brand-text placeholder-brand-text-muted/40 pl-9 pr-3 py-2 rounded-lg border border-brand-border focus:border-brand-primary outline-none text-xs transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-brand-primary font-bold hover:underline"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Group filter dropdown */}
          <div className="relative">
            <select
              value={selectedGrupo}
              onChange={(e) => setSelectedGrupo(e.target.value)}
              className="bg-brand-bg text-brand-text text-xs rounded-lg border border-brand-border px-3.5 py-2 pr-8 outline-none focus:border-brand-primary appearance-none cursor-pointer w-full md:w-44 font-medium"
            >
              <option value="ALL">Todos os Grupos</option>
              <option value="ASSESSORIA">ASSESSORIA</option>
              <option value="CONTABIL">CONTABIL</option>
              <option value="NAO INFO">NÃO INFORMADO</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-brand-text-muted/50 text-[10px]">▼</div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <span className="text-xs text-brand-text-muted">
            Mostrando <strong className="text-brand-primary font-black">{filteredData.length}</strong> de <strong className="text-white font-bold">{data.length}</strong> registros
          </span>

          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="bg-brand-bg text-brand-text text-[11px] rounded-lg border border-brand-border px-2 py-1 outline-none cursor-pointer"
          >
            <option value={10}>10 por pág.</option>
            <option value={15}>15 por pág.</option>
            <option value={25}>25 por pág.</option>
            <option value={50}>50 por pág.</option>
            <option value={100}>100 por pág.</option>
          </select>
        </div>
      </div>

      {/* Grid Table */}
      {isLoading ? (
        <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden shadow-lg py-20 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="animate-spin text-brand-primary" size={32} />
          <p className="text-sm text-brand-text-muted font-medium">Buscando dados na tabela acomp_honorarios...</p>
        </div>
      ) : error ? (
        <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden shadow-lg p-12 text-center max-w-lg mx-auto flex flex-col items-center gap-3">
          <AlertCircle className="text-brand-primary" size={40} />
          <h4 className="text-base font-bold text-white">Falha ao carregar dados</h4>
          <p className="text-xs text-brand-text-muted">{error}</p>
          <button
            onClick={fetchData}
            className="mt-2 bg-brand-primary hover:bg-brand-primary/80 text-white px-4 py-1.5 rounded text-xs font-semibold"
          >
            Tentar Novamente
          </button>
        </div>
      ) : sortedData.length === 0 ? (
        <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden shadow-lg p-20 text-center text-brand-text-muted italic text-xs">
          Nenhum registro de honorário encontrado com os filtros aplicados.
        </div>
      ) : (
        <div className="space-y-6">
          {(Object.entries(groupedSortedData) as [string, HonorarioRow[]][]).map(([groupName, groupRows]) => {
            if (groupRows.length === 0) return null; // hide empty groups

            const isExpanded = expandedGroups[groupName] !== false;
            const currentPage = groupPages[groupName] || 1;
            const totalPages = Math.max(1, Math.ceil(groupRows.length / pageSize));
            
            // Paginated rows for this group
            const start = (currentPage - 1) * pageSize;
            const paginatedGroupRows = groupRows.slice(start, start + pageSize);

            // Group level metrics for the summary
            const groupMetrics = groupRows.reduce((acc, r) => {
              acc.atual += r.honor_atual;
              acc.ideal += r.honor_ideal;
              acc.custo += r.custo_geral;
              acc.margem += r.margem;
              return acc;
            }, { atual: 0, ideal: 0, custo: 0, margem: 0 });

            const isAssessoria = groupName === 'ASSESSORIA';
            const isContabil = groupName === 'CONTABIL';

            return (
              <div key={groupName} className="bg-brand-card border border-brand-border rounded-xl overflow-hidden shadow-lg">
                {/* Collapsible Header Panel */}
                <div 
                  onClick={() => toggleGroup(groupName)}
                  className="bg-brand-bg/80 border-b border-brand-border/40 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none hover:bg-brand-card-bright/15 transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    {isExpanded ? (
                      <ChevronDown size={16} className="text-brand-primary shrink-0 animate-pulse" />
                    ) : (
                      <ChevronRight size={16} className="text-brand-text-muted shrink-0" />
                    )}
                    
                    <span className={`inline-block px-3 py-1 rounded-full font-black text-xs tracking-wider border ${
                      isAssessoria ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      isContabil ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                      'bg-gray-500/10 text-gray-400 border-gray-500/20'
                    }`}>
                      {groupName}
                    </span>

                    <span className="text-[11px] font-mono text-brand-text-muted font-bold">
                      ({groupRows.length} {groupRows.length === 1 ? 'cliente' : 'clientes'})
                    </span>
                  </div>

                  {/* Quick summary metrics shown in the header */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-brand-text-muted font-mono">
                    <div>
                      <span>Hon. Atual: </span>
                      <strong className="text-white font-bold">{formatBRL(groupMetrics.atual)}</strong>
                    </div>
                    <div className="hidden sm:block text-brand-border/40">•</div>
                    <div>
                      <span>Hon. Ideal: </span>
                      <strong className="text-amber-400 font-bold">{formatBRL(groupMetrics.ideal)}</strong>
                    </div>
                    <div className="hidden sm:block text-brand-border/40">•</div>
                    <div>
                      <span>Margem: </span>
                      <strong className={`font-bold ${groupMetrics.margem >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatBRL(groupMetrics.margem)}
                      </strong>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse table-auto">
                        <thead>
                          <tr className="bg-brand-bg/45 border-b border-brand-border/50 text-[10px] uppercase font-black tracking-wider text-brand-text-muted select-none">
                            <th className="py-3 px-4 cursor-pointer hover:text-white" onClick={() => handleSort('codigo')}>
                              <div className="flex items-center gap-1.5">
                                Código
                                {sortField === 'codigo' ? (sortAsc ? <ArrowUp size={10} /> : <ArrowDown size={10} />) : <ArrowUpDown size={10} />}
                              </div>
                            </th>
                            <th className="py-3 px-4 cursor-pointer hover:text-white" onClick={() => handleSort('cliente')}>
                              <div className="flex items-center gap-1.5">
                                Cliente
                                {sortField === 'cliente' ? (sortAsc ? <ArrowUp size={10} /> : <ArrowDown size={10} />) : <ArrowUpDown size={10} />}
                              </div>
                            </th>
                            <th className="py-3 px-4 cursor-pointer hover:text-white" onClick={() => handleSort('tar')}>
                              <div className="flex items-center gap-1.5">
                                TAR
                                {sortField === 'tar' ? (sortAsc ? <ArrowUp size={10} /> : <ArrowDown size={10} />) : <ArrowUpDown size={10} />}
                              </div>
                            </th>
                            <th className="py-3 px-4 text-center cursor-pointer hover:text-white" onClick={() => handleSort('data_inicio')}>
                              <div className="flex items-center justify-center gap-1.5">
                                Início
                                {sortField === 'data_inicio' ? (sortAsc ? <ArrowUp size={10} /> : <ArrowDown size={10} />) : <ArrowUpDown size={10} />}
                              </div>
                            </th>
                            <th className="py-3 px-4 text-center cursor-pointer hover:text-white" onClick={() => handleSort('tb')}>
                              <div className="flex items-center justify-center gap-1.5">
                                TB
                                {sortField === 'tb' ? (sortAsc ? <ArrowUp size={10} /> : <ArrowDown size={10} />) : <ArrowUpDown size={10} />}
                              </div>
                            </th>
                            <th className="py-3 px-4 text-right cursor-pointer hover:text-white" onClick={() => handleSort('honor_atual')}>
                              <div className="flex items-center justify-end gap-1.5">
                                Hon. Atual
                                {sortField === 'honor_atual' ? (sortAsc ? <ArrowUp size={10} /> : <ArrowDown size={10} />) : <ArrowUpDown size={10} />}
                              </div>
                            </th>
                            <th className="py-3 px-4 text-right cursor-pointer hover:text-white" onClick={() => handleSort('honor_ideal')}>
                              <div className="flex items-center justify-end gap-1.5">
                                Hon. Ideal
                                {sortField === 'honor_ideal' ? (sortAsc ? <ArrowUp size={10} /> : <ArrowDown size={10} />) : <ArrowUpDown size={10} />}
                              </div>
                            </th>
                            <th className="py-3 px-4 text-center">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-border/10">
                          {paginatedGroupRows.map((row) => (
                            <React.Fragment key={row.id}>
                              {/* Linha 01: Core client / billing info */}
                              <tr className="hover:bg-brand-card-bright/10 transition-colors text-xs text-white/95 border-t border-brand-border/5">
                                <td className="py-3 px-4 font-bold tracking-tight text-white/75 font-mono select-all">
                                  {row.codigo || '—'}
                                </td>
                                <td className="py-3 px-4 font-black text-white uppercase select-all">
                                  {row.cliente || '—'}
                                </td>
                                <td className="py-3 px-4 font-mono font-bold text-brand-primary">
                                  {row.tar || '—'}
                                </td>
                                <td className="py-3 px-4 text-center font-mono text-[11px] text-brand-text-muted/80">
                                  {row.data_inicio ? new Date(row.data_inicio).toLocaleDateString('pt-BR') : '—'}
                                </td>
                                <td className="py-3 px-4 text-center font-mono font-semibold text-brand-text-muted/95">
                                  {row.tb || '—'}
                                </td>
                                <td className="py-3 px-4 text-right font-mono font-extrabold text-white">
                                  {formatBRL(row.honor_atual)}
                                </td>
                                <td className="py-3 px-4 text-right font-mono font-extrabold text-amber-500">
                                  {formatBRL(row.honor_ideal)}
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <button
                                    onClick={() => setSelectedRow(row)}
                                    className="p-1.5 rounded-lg bg-brand-primary/10 hover:bg-brand-primary/20 border border-brand-primary/20 text-brand-primary hover:text-white transition-all cursor-pointer active:scale-90"
                                    title="Ver detalhamento completo dos cargos"
                                  >
                                    <Eye size={13} />
                                  </button>
                                </td>
                              </tr>

                              {/* Linha 02: Hours, costs & margin breakdown */}
                              <tr className="bg-brand-bg/20 hover:bg-brand-bg/30 text-[11px] text-brand-text-muted/80 border-b border-brand-border/10">
                                <td colSpan={8} className="py-2.5 px-4 border-l-2 border-brand-primary/30">
                                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4 font-mono">
                                    <div>
                                      <span className="block text-[9px] uppercase font-bold text-brand-text-muted/50 leading-tight">Contábil Horas</span>
                                      <span className="text-white font-semibold">{row.cnt_total_hr > 0 ? `${row.cnt_total_hr.toFixed(2)}h` : '—'}</span>
                                    </div>
                                    <div>
                                      <span className="block text-[9px] uppercase font-bold text-brand-text-muted/50 leading-tight">Contábil Valor</span>
                                      <span className="text-brand-text-muted/90">{row.cnt_total_vlr > 0 ? formatBRL(row.cnt_total_vlr) : '—'}</span>
                                    </div>
                                    <div>
                                      <span className="block text-[9px] uppercase font-bold text-brand-text-muted/50 leading-tight">Fiscal Horas</span>
                                      <span className="text-white font-semibold">{row.fsc_total_hr > 0 ? `${row.fsc_total_hr.toFixed(2)}h` : '—'}</span>
                                    </div>
                                    <div>
                                      <span className="block text-[9px] uppercase font-bold text-brand-text-muted/50 leading-tight">Fiscal Valor</span>
                                      <span className="text-brand-text-muted/90">{row.fsc_total_valor > 0 ? formatBRL(row.fsc_total_valor) : '—'}</span>
                                    </div>
                                    <div>
                                      <span className="block text-[9px] uppercase font-bold text-brand-text-muted/50 leading-tight">Pessoal Horas</span>
                                      <span className="text-white font-semibold">{row.psl_total_hr > 0 ? `${row.psl_total_hr.toFixed(2)}h` : '—'}</span>
                                    </div>
                                    <div>
                                      <span className="block text-[9px] uppercase font-bold text-brand-text-muted/50 leading-tight">Pessoal Valor</span>
                                      <span className="text-brand-text-muted/90">{row.psl_total_valor > 0 ? formatBRL(row.psl_total_valor) : '—'}</span>
                                    </div>
                                    <div>
                                      <span className="block text-[9px] uppercase font-bold text-brand-text-muted/50 leading-tight">Custo Geral</span>
                                      <span className="text-red-400 font-bold">{row.custo_geral > 0 ? formatBRL(row.custo_geral) : '—'}</span>
                                    </div>
                                    <div>
                                      <span className="block text-[9px] uppercase font-bold text-brand-text-muted/50 leading-tight">Margem</span>
                                      <span className={`font-bold ${row.margem >= 0 ? 'text-emerald-400' : 'text-red-500'}`}>{formatBRL(row.margem)}</span>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination for this group */}
                    {totalPages > 1 && (
                      <div className="bg-brand-bg/40 px-6 py-4 flex items-center justify-between border-t border-brand-border/40">
                        <div className="text-xs text-brand-text-muted">
                          Página <strong className="text-white font-bold">{currentPage}</strong> de <strong className="text-white font-bold">{totalPages}</strong>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setGroupPages(prev => ({ ...prev, [groupName]: Math.max(1, currentPage - 1) }))}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 rounded-lg bg-brand-card hover:bg-brand-card-light text-brand-text border border-brand-border text-xs font-semibold disabled:opacity-40 disabled:hover:bg-brand-card cursor-pointer transition-colors"
                          >
                            Anterior
                          </button>

                          {/* Page numbers around current */}
                          <div className="flex items-center gap-1 hidden sm:flex">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                              let pageNum = i + 1;
                              if (currentPage > 3 && totalPages > 5) {
                                if (currentPage + 2 > totalPages) {
                                  pageNum = totalPages - 4 + i;
                                } else {
                                  pageNum = currentPage - 2 + i;
                                }
                              }
                              return (
                                <button
                                  key={pageNum}
                                  onClick={() => setGroupPages(prev => ({ ...prev, [groupName]: pageNum }))}
                                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                                    currentPage === pageNum 
                                      ? 'bg-brand-primary text-white shadow-md' 
                                      : 'bg-brand-card hover:bg-brand-card-light text-brand-text-muted hover:text-white border border-brand-border'
                                  }`}
                                >
                                  {pageNum}
                                </button>
                              );
                            })}
                          </div>

                          <button
                            onClick={() => setGroupPages(prev => ({ ...prev, [groupName]: Math.min(totalPages, currentPage + 1) }))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1.5 rounded-lg bg-brand-card hover:bg-brand-card-light text-brand-text border border-brand-border text-xs font-semibold disabled:opacity-40 disabled:hover:bg-brand-card cursor-pointer transition-colors"
                          >
                            Próxima
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Row details dialog modal overlay */}
      {selectedRow && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-brand-card border border-brand-border rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl animate-fade-in">
            {/* Modal Header */}
            <div className="bg-brand-bg/80 border-b border-brand-border/50 px-6 py-4.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins className="text-brand-primary" size={20} />
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    Detalhamento dos Cargos & Custos
                  </h3>
                  <p className="text-[11px] text-brand-text-muted mt-0.5">
                    ID: {selectedRow.id} • Código: {selectedRow.codigo || '—'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRow(null)}
                className="p-1.5 rounded-lg hover:bg-brand-card-bright text-brand-text-muted hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Core metrics overview row */}
              <div className="grid grid-cols-3 gap-4 bg-brand-bg/50 p-4 rounded-lg border border-brand-border/50">
                <div>
                  <span className="text-[10px] uppercase font-bold text-brand-text-muted/80 block">Custo Geral</span>
                  <span className="font-mono text-base font-extrabold text-red-400 mt-1 block">
                    {formatBRL(selectedRow.custo_geral)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-brand-text-muted/80 block">Margem Realizada</span>
                  <span className="font-mono text-base font-extrabold text-emerald-400 mt-1 block">
                    {formatBRL(selectedRow.margem)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-brand-text-muted/80 block">Honorário Ideal</span>
                  <span className="font-mono text-base font-extrabold text-amber-500 mt-1 block">
                    {formatBRL(selectedRow.honor_ideal)}
                  </span>
                </div>
              </div>

              {/* Multi-department break-down grids */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-white uppercase tracking-wider border-b border-brand-border/40 pb-1.5">
                  Distribuição por Área & Cargo
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* CONTABIL (CNT) */}
                  <div className="bg-brand-bg/30 border border-brand-border/30 rounded-lg p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between border-b border-brand-border/20 pb-1">
                      <span className="text-[10px] uppercase font-black text-white/90">CONTABILIDADE</span>
                      <span className="text-[10px] font-mono font-bold text-brand-primary">{selectedRow.cnt_total_hr.toFixed(1)}h</span>
                    </div>
                    <div className="space-y-1.5 text-xs text-brand-text-muted font-mono">
                      <div className="flex justify-between">
                        <span>Líder:</span>
                        <strong className="text-white">{selectedRow.cnt_lider || 0}h</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Analista:</span>
                        <strong className="text-white">{selectedRow.cnt_analista || 0}h</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Demais:</span>
                        <strong className="text-white">{selectedRow.cnt_demais || 0}h</strong>
                      </div>
                      <div className="flex justify-between border-t border-brand-border/20 pt-1 text-emerald-400 font-bold">
                        <span>Soma Valor:</span>
                        <span>{formatBRL(selectedRow.cnt_total_vlr)}</span>
                      </div>
                    </div>
                  </div>

                  {/* FISCAL (FSC) */}
                  <div className="bg-brand-bg/30 border border-brand-border/30 rounded-lg p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between border-b border-brand-border/20 pb-1">
                      <span className="text-[10px] uppercase font-black text-white/90">FISCAL</span>
                      <span className="text-[10px] font-mono font-bold text-brand-primary">{selectedRow.fsc_total_hr.toFixed(1)}h</span>
                    </div>
                    <div className="space-y-1.5 text-xs text-brand-text-muted font-mono">
                      <div className="flex justify-between">
                        <span>Líder:</span>
                        <strong className="text-white">{selectedRow.fsc_lider || 0}h</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Analista:</span>
                        <strong className="text-white">{selectedRow.fsc_analista || 0}h</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Demais:</span>
                        <strong className="text-white">{selectedRow.fsc_demais || 0}h</strong>
                      </div>
                      <div className="flex justify-between border-t border-brand-border/20 pt-1 text-emerald-400 font-bold">
                        <span>Soma Valor:</span>
                        <span>{formatBRL(selectedRow.fsc_total_valor)}</span>
                      </div>
                    </div>
                  </div>

                  {/* PESSOAL (PSL) */}
                  <div className="bg-brand-bg/30 border border-brand-border/30 rounded-lg p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between border-b border-brand-border/20 pb-1">
                      <span className="text-[10px] uppercase font-black text-white/90">PESSOAL</span>
                      <span className="text-[10px] font-mono font-bold text-brand-primary">{selectedRow.psl_total_hr.toFixed(1)}h</span>
                    </div>
                    <div className="space-y-1.5 text-xs text-brand-text-muted font-mono">
                      <div className="flex justify-between">
                        <span>Líder:</span>
                        <strong className="text-white">{selectedRow.psl_lider || 0}h</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Analista:</span>
                        <strong className="text-white">{selectedRow.psl_analista || 0}h</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Demais:</span>
                        <strong className="text-white">{selectedRow.psl_demais || 0}h</strong>
                      </div>
                      <div className="flex justify-between border-t border-brand-border/20 pt-1 text-emerald-400 font-bold">
                        <span>Soma Valor:</span>
                        <span>{formatBRL(selectedRow.psl_total_valor)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Other structural values info */}
              <div className="flex justify-between items-center text-xs text-brand-text-muted pt-2 border-t border-brand-border/30">
                <div className="flex items-center gap-1.5">
                  <span>Tabela Base (TB): <strong className="text-white font-mono uppercase">{selectedRow.tb || 'N/A'}</strong></span>
                </div>
                <div>
                  <span>Folha Operacional (OP): <strong className="text-white font-mono">{formatBRL(selectedRow.folha_op || 0)}</strong></span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-brand-bg/80 border-t border-brand-border/50 px-6 py-4 flex justify-end">
              <button
                onClick={() => setSelectedRow(null)}
                className="bg-brand-primary hover:bg-brand-primary/90 text-white px-5 py-2 rounded-lg text-xs font-bold cursor-pointer transition-all active:scale-95"
              >
                Fechar Detalhes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
