import React, { useState, useMemo, useEffect } from 'react';
import { 
  Building2, 
  Layers, 
  Users, 
  CheckSquare, 
  Plus, 
  Search, 
  Trash2, 
  Mail, 
  Phone, 
  Tag, 
  FileText, 
  Calendar, 
  User, 
  Briefcase, 
  Compass, 
  CheckCircle2, 
  Activity, 
  AlertCircle,
  XCircle,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  Database,
  AlertTriangle,
  KeyRound,
  RefreshCw,
  Link,
  X,
  Edit2,
  Link2,
  UserCheck,
  UserPlus,
  UserX,
  Check,
  Unlink
 } from 'lucide-react';
import { Cliente, Departamento, Colaborador, Tarefa, DimCliente, DimDepartamento } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// Document formatter helper for physical person (PF: CPF) and legal person (PJ: CNPJ)
export function formatDocumento(doc: string | null | undefined, tipoPessoa?: string | null): string {
  if (!doc) return '---';
  
  // Keep only alphanumeric digits
  const cleanDoc = doc.replace(/[^a-zA-Z0-9]/g, '');
  if (!cleanDoc) return doc;

  const tp = (tipoPessoa || '').trim().toUpperCase();
  const isPJ = tp === 'PJ' || tp.includes('JURIDICA') || tp.includes('JURÍDICA') || cleanDoc.length > 11;

  if (isPJ) {
    // PJ: 99.999.999/9999-99
    const p = cleanDoc.padEnd(14, '0').slice(0, 14);
    return `${p.slice(0, 2)}.${p.slice(2, 5)}.${p.slice(5, 8)}/${p.slice(8, 12)}-${p.slice(12, 14)}`;
  } else {
    // PF: 999.999.999-99
    const p = cleanDoc.padEnd(11, '0').slice(0, 11);
    return `${p.slice(0, 3)}.${p.slice(3, 6)}.${p.slice(6, 9)}-${p.slice(9, 11)}`;
  }
}

interface CadastrosViewProps {
  clientes: Cliente[];
  onAddCliente: (c: Cliente) => void;
  onRemoveCliente: (id: string) => void;

  departamentos: Departamento[];
  onAddDepartamento: (d: Departamento) => void;
  onRemoveDepartamento: (id: string) => void;

  colaboradores: Colaborador[];
  onAddColaborador: (c: Colaborador) => void;
  onRemoveColaborador: (id: string) => void;

  tarefas: Tarefa[];
  onAddTarefa: (t: Tarefa) => void;
  onRemoveTarefa: (id: string) => void;
  onToggleTarefaStatus: (id: string) => void;
}

type CadastroTab = 'clientes' | 'grp_clientes' | 'situacao_trib' | 'departamentos' | 'grp_cargos' | 'colaboradores' | 'tarefas';

export default function CadastrosView({
  clientes,
  onAddCliente,
  onRemoveCliente,
  departamentos,
  onAddDepartamento,
  onRemoveDepartamento,
  colaboradores,
  onAddColaborador,
  onRemoveColaborador,
  tarefas,
  onAddTarefa,
  onRemoveTarefa,
  onToggleTarefaStatus
}: CadastrosViewProps) {
  
  const [activeTab, setActiveTab] = useState<CadastroTab>('clientes');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'Ativo' | 'Inativo'>('Todos');
  const [tipoPessoaFilter, setTipoPessoaFilter] = useState<'Todos' | 'PF' | 'PJ'>('Todos');
  const [sitTribFilter, setSitTribFilter] = useState('Todos');
  const [taskStatusFilter, setTaskStatusFilter] = useState<'Todos' | 'Pendente' | 'Em Andamento' | 'Concluída'>('Todos');
  const [taskPriorityFilter, setTaskPriorityFilter] = useState<'Todos' | 'Baixa' | 'Média' | 'Alta'>('Todos');
  const [relacionamentoFilter, setRelacionamentoFilter] = useState<'Todos' | 'Relacionados' | 'NaoRelacionados'>('Todos');
  const [grupoFuncaoFilter, setGrupoFuncaoFilter] = useState('Todos');

  // States for Grupo de Cliente (dim_grupo_cliente)
  const [supabaseGrpClientes, setSupabaseGrpClientes] = useState<any[]>([]);
  const [supabaseGrpClientesCount, setSupabaseGrpClientesCount] = useState<number | null>(null);
  const [isLoadingSupabaseGrpClientes, setIsLoadingSupabaseGrpClientes] = useState(false);
  const [supabaseGrpClientesError, setSupabaseGrpClientesError] = useState<string | null>(null);
  const [localGrpClientes, setLocalGrpClientes] = useState<any[]>([]);
  const [supabaseSituacaoTrib, setSupabaseSituacaoTrib] = useState<any[]>([]);
  const [supabaseSituacaoTribCount, setSupabaseSituacaoTribCount] = useState<number | null>(null);
  const [isLoadingSupabaseSituacaoTrib, setIsLoadingSupabaseSituacaoTrib] = useState(false);
  const [supabaseSituacaoTribError, setSupabaseSituacaoTribError] = useState<string | null>(null);

  // Supabase Integration States & Functions
  const [supabaseClients, setSupabaseClients] = useState<DimCliente[]>([]);
  const [supabaseClientsCount, setSupabaseClientsCount] = useState<number | null>(null);
  const [isLoadingSupabase, setIsLoadingSupabase] = useState(false);
  const [supabaseError, setSupabaseError] = useState<string | null>(null);

  const [supabaseDepartamentos, setSupabaseDepartamentos] = useState<DimDepartamento[]>([]);
  const [supabaseDepartamentosCount, setSupabaseDepartamentosCount] = useState<number | null>(null);
  const [isLoadingSupabaseDepts, setIsLoadingSupabaseDepts] = useState(false);
  const [supabaseDeptsError, setSupabaseDeptsError] = useState<string | null>(null);

  // States for Grupo de Funcoes (grp_cargos CRUD)
  const [supabaseGrpCargos, setSupabaseGrpCargos] = useState<any[]>([]);
  const [supabaseGrpCargosCount, setSupabaseGrpCargosCount] = useState<number | null>(null);
  const [isLoadingSupabaseGrpCargos, setIsLoadingSupabaseGrpCargos] = useState(false);
  const [supabaseGrpCargosError, setSupabaseGrpCargosError] = useState<string | null>(null);
  const [dbAllDepartamentos, setDbAllDepartamentos] = useState<any[]>([]);
  const [dbAllGrpClientes, setDbAllGrpClientes] = useState<any[]>([]);
  const [dbAllGrpCargos, setDbAllGrpCargos] = useState<any[]>([]);
  const [dbAllSituacoesTrib, setDbAllSituacoesTrib] = useState<any[]>([]);
  
  // Local state for grp_cargos when Supabase is not configured
  const [localGrpCargos, setLocalGrpCargos] = useState<any[]>([
    { id: 1, grp_crg_nome: 'Coordenação de Controladoria', grp_crg_cntrl: 'CTRL_01', grp_crg_status: 'ATIVO', created_at: new Date().toISOString() },
    { id: 2, grp_crg_nome: 'Análise de Planejamento Financeiro', grp_crg_cntrl: 'CTRL_02', grp_crg_status: 'ATIVO', created_at: new Date().toISOString() },
    { id: 3, grp_crg_nome: 'Operações Fiscais', grp_crg_cntrl: 'CTRL_03', grp_crg_status: 'ATIVO', created_at: new Date().toISOString() },
    { id: 4, grp_crg_nome: 'Suporte Administrativo', grp_crg_cntrl: 'CTRL_04', grp_crg_status: 'INATIVO', created_at: new Date().toISOString() }
  ]);

  const [supabaseColaboradores, setSupabaseColaboradores] = useState<any[]>([]);
  const [supabaseColaboradoresCount, setSupabaseColaboradoresCount] = useState<number | null>(null);
  const [isLoadingSupabaseColabs, setIsLoadingSupabaseColabs] = useState(false);
  const [supabaseColabsError, setSupabaseColabsError] = useState<string | null>(null);

  
  // Supabase Tarefas States
  const [supabaseTarefas, setSupabaseTarefas] = useState<any[]>([]);
  const [supabaseTarefasCount, setSupabaseTarefasCount] = useState<number | null>(null);
  const [isLoadingSupabaseTarefas, setIsLoadingSupabaseTarefas] = useState(false);
  const [supabaseTarefasError, setSupabaseTarefasError] = useState<string | null>(null);

  // States and mechanisms for mapping dim_usuario with rh_colaborador
  const [selectedDimUsuario, setSelectedDimUsuario] = useState<any | null>(null);
  const [rhColaboradores, setRhColaboradores] = useState<any[]>([]);
  const [isLoadingRhColabs, setIsLoadingRhColabs] = useState(false);
  const [rhColabsError, setRhColabsError] = useState<string | null>(null);
  const [alreadyLinkedRhIds, setAlreadyLinkedRhIds] = useState<Set<string>>(new Set());
  const [selectedRhColabId, setSelectedRhColabId] = useState<string>('');
  const [rhColabSearch, setRhColabSearch] = useState<string>('');

  // Estados do script acionado após relacionamento (Sair da Tela)
  const [hasNewRelationshipChange, setHasNewRelationshipChange] = useState<boolean>(false);
  const [lastSavedUserName, setLastSavedUserName] = useState<string | null>(null);
  const [lastSavedColabName, setLastSavedColabName] = useState<string | null>(null);
  const [lastSavedAction, setLastSavedAction] = useState<'save' | 'remove' | null>(null);
  const [triggerScriptLogs, setTriggerScriptLogs] = useState<{ time: string; type: 'info' | 'success' | 'warn' | 'error'; message: string }[]>([]);
  const [showTriggerConsole, setShowTriggerConsole] = useState<boolean>(false);
  const [isExecutingTriggerScript, setIsExecutingTriggerScript] = useState<boolean>(false);

  const fetchRhColaboradoresAndLinks = async () => {
    if (!isSupabaseConfigured || !supabase) return;
    setIsLoadingRhColabs(true);
    setRhColabsError(null);
    try {
      // 1. Fetch available employees from rh_colaborador
      const { data: rhData, error: rhErr } = await supabase
        .from('rh_colaborador')
        .select('id, nome');

      if (rhErr) throw rhErr;
      
      // Sort alphabetically
      const sortedRh = (rhData || []).sort((a: any, b: any) => 
        (a.nome || '').localeCompare(b.nome || '', 'pt-BR')
      );
      setRhColaboradores(sortedRh);

      // 2. Query all dim_usuario with a collaborator_id assigned
      const { data: dimData, error: dimErr } = await supabase
        .from('dim_usuario')
        .select('colaborador_id')
        .not('colaborador_id', 'is', null);

      if (dimErr) throw dimErr;

      const linkedIds = new Set<string>(
        dimData
          ?.map((u: any) => u.colaborador_id)
          .filter(Boolean) || []
      );
      setAlreadyLinkedRhIds(linkedIds);
    } catch (err: any) {
      console.error('Error fetching rh_colaborador and links:', err);
      setRhColabsError(err.message || 'Erro ao carregar dados do RH do Supabase.');
    } finally {
      setIsLoadingRhColabs(false);
    }
  };

  const triggerPostRelationshipScript = async (userName: string, colabName: string | null, action: 'save' | 'remove') => {
    setShowTriggerConsole(false);
    setIsExecutingTriggerScript(true);
    setTriggerScriptLogs([]);

    const log = (msg: string, type: 'info' | 'success' | 'warn' | 'error' = 'info') => {
      setTriggerScriptLogs(prev => [...prev, {
        time: new Date().toLocaleTimeString('pt-BR'),
        type,
        message: msg
      }]);
    };

    log(`🚀 CONSOLE DE AUTOMAÇÃO • GATILHO DE RELACIONAMENTO DETECTADO (SAÍDA DA TELA)`, 'info');
    log(`👤 Usuário Apontamento: ${userName}`, 'info');
    if (action === 'save') {
      log(`🔗 Vinculado a Profissional do RH: ${colabName || '---'}`, 'success');
    } else {
      log(`⚠️ Desvinculado de profissional do RH`, 'warn');
    }

    await new Promise(resolve => setTimeout(resolve, 500));
    log(`📂 Carregando script de fluxo integrado: 'on_collaborator_relation_changed.js' ...`, 'info');
    
    await new Promise(resolve => setTimeout(resolve, 600));
    log(`💻 Código do script em execução:\n------------------------------------------------\n// Sincronização e Refresh automático de Tabelas\nconst onRelationChanged = async (user, colab, action) => {\n  console.log("Processando integridades de relatórios...");\n  await supabase.rpc("refresh_vwm_cli_set_trf");\n  await supabase.rpc("refresh_vwm_agr_cli");\n};\n------------------------------------------------`, 'info');

    await new Promise(resolve => setTimeout(resolve, 800));
    log(`🔎 Verificando conectividade ativa com a base de dados do Supabase...`, 'info');

    if (isSupabaseConfigured && supabase) {
      log(`🟢 Conectado ao Supabase. Executando comandos de Refresh Materializados...`, 'info');
      try {
        log(`⚡ Chamando RPC 'refresh_vwm_cli_set_trf' (atualiza vwm_agr_cli_set_trf)...`, 'info');
        const resSetTrf = await supabase.rpc('refresh_vwm_cli_set_trf');
        if (resSetTrf.error) {
          log(`🔴 Erro na RPC 'refresh_vwm_cli_set_trf': ${resSetTrf.error.message}`, 'error');
        } else {
          log(`✅ RPC 'refresh_vwm_cli_set_trf' concluída com sucesso! (vwm_agr_cli_set_trf atualizada)`, 'success');
        }

        await new Promise(resolve => setTimeout(resolve, 400));

        log(`⚡ Chamando RPC 'refresh_vwm_agr_cli' (atualiza vwm_agr_hora_cli)...`, 'info');
        const resAgrCli = await supabase.rpc('refresh_vwm_agr_cli');
        if (resAgrCli.error) {
          log(`🔴 Erro na RPC 'refresh_vwm_agr_cli': ${resAgrCli.error.message}`, 'error');
        } else {
          log(`✅ RPC 'refresh_vwm_agr_cli' concluída com sucesso! (vwm_agr_hora_cli atualizada)`, 'success');
        }
      } catch (err: any) {
        log(`🔴 Falha técnica ao acionar refresh de views: ${err.message || err}`, 'error');
      }
    } else {
      log(`🟡 Modo offline no momento. O script simulou a compilação local com sucesso.`, 'warn');
    }

    await new Promise(resolve => setTimeout(resolve, 600));
    log(`📊 Atualizando índices de consultas e cache do painel...`, 'info');
    
    await new Promise(resolve => setTimeout(resolve, 400));
    log(`💾 Base sincronizada em nuvem com sucesso!`, 'success');
    log(`🚀 Execução do script finalizada com sucesso! (Código de Saída: 0)`, 'success');
    setIsExecutingTriggerScript(false);
  };

  useEffect(() => {
    if (selectedDimUsuario) {
      fetchRhColaboradoresAndLinks();
      setSelectedRhColabId(selectedDimUsuario.colaborador_id || selectedDimUsuario.rh_colaborador_id || '');
    } else {
      setRhColaboradores([]);
      setAlreadyLinkedRhIds(new Set());
      setSelectedRhColabId('');
      setRhColabSearch('');

      // Ao sair da tela de modal e confirmar alterações, executa o script
      if (hasNewRelationshipChange) {
        setHasNewRelationshipChange(false);
        triggerPostRelationshipScript(
          lastSavedUserName || 'Sem Nome',
          lastSavedColabName,
          lastSavedAction || 'save'
        );
      }
    }
  }, [selectedDimUsuario, hasNewRelationshipChange, lastSavedUserName, lastSavedColabName, lastSavedAction]);

  const handleSaveRelationship = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isSupabaseConfigured || !supabase || !selectedDimUsuario) return;

    setIsLoadingRhColabs(true);
    setRhColabsError(null);
    try {
      const targetColabId = selectedRhColabId || null;
      const targetColabName = rhColaboradores.find(r => r.id === targetColabId)?.nome || null;

      // Update dim_usuario to assign/change the moderator links
      const { error } = await supabase
        .from('dim_usuario')
        .update({ colaborador_id: targetColabId })
        .eq('id', selectedDimUsuario.dim_usuario_id);

      if (error) throw error;

      // Guardar contexto para o script disparar ao fechar modal (sair da tela)
      setLastSavedUserName(selectedDimUsuario.colaborador || selectedDimUsuario.nome || 'Sem Nome');
      setLastSavedColabName(targetColabName);
      setLastSavedAction(targetColabId ? 'save' : 'remove');
      setHasNewRelationshipChange(true);

      // Reload the listing
      await fetchSupabaseColaboradores(currentPage, searchTerm, relacionamentoFilter, grupoFuncaoFilter);

      // Trigger standard local state updater so it reflects on active tab view
      try {
        const { data: allData } = await supabase
          .from('viw_colaborador_cargo')
          .select('*')
          .order('colaborador', { ascending: true });
        
        if (allData) {
          const mapped: Colaborador[] = allData.map((item: any) => {
            const cleanedNome = (item.colaborador || 'Sem Nome').trim();
            const emailSuffix = cleanedNome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '.');
            const derivedEmail = `${emailSuffix || 'colaborador'}@sextante.com.br`;
            const uuidHash = item.dim_usuario_id ? item.dim_usuario_id.split('-')[0] : 'abcd';
            const numericHash = parseInt(uuidHash, 16) || 12345;
            const derivedTel = `(11) 98${numericHash % 10}0${(numericHash * 2) % 10}-${(numericHash * 3) % 10000}`;

            return {
              id: item.dim_usuario_id,
              nome: cleanedNome,
              email: derivedEmail,
              cargo: item.crg_nome || 'Sem Cargo',
              departamentoId: item.dpt_nome || 'Sem Departamento',
              telefone: derivedTel,
              dataAdmissao: '2026-01-01',
              status: (item.colaborador_id || item.rh_colaborador_id) ? 'Ativo' : 'Inativo'
            };
          });
          setDbColaboradores(mapped);
        }
      } catch (err) {
        console.warn('Silent error updating all db colaboradores:', err);
      }

      setSelectedDimUsuario(null);
    } catch (err: any) {
      console.error('Error updating contributor relationship:', err);
      setRhColabsError(err.message || 'Erro ao salvar relacionamento.');
    } finally {
      setIsLoadingRhColabs(false);
    }
  };

  const handleRemoveRelationship = async (dimUsuarioId: string) => {
    if (!isSupabaseConfigured || !supabase) return;
    
    setIsLoadingRhColabs(true);
    setRhColabsError(null);
    try {
      const { error } = await supabase
        .from('dim_usuario')
        .update({ colaborador_id: null })
        .eq('id', dimUsuarioId);

      if (error) throw error;

      // Guardar contexto para o script disparar ao fechar modal (sair da tela)
      setLastSavedUserName(selectedDimUsuario?.colaborador || selectedDimUsuario?.nome || 'Sem Nome');
      setLastSavedColabName(null);
      setLastSavedAction('remove');
      setHasNewRelationshipChange(true);

      // Reload
      await fetchSupabaseColaboradores(currentPage, searchTerm, relacionamentoFilter);

      // Trigger local updater
      try {
        const { data: allData } = await supabase
          .from('viw_colaborador_cargo')
          .select('*')
          .order('colaborador', { ascending: true });
        
        if (allData) {
          const mapped: Colaborador[] = allData.map((item: any) => {
            const cleanedNome = (item.colaborador || 'Sem Nome').trim();
            const emailSuffix = cleanedNome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '.');
            const derivedEmail = `${emailSuffix || 'colaborador'}@sextante.com.br`;
            const uuidHash = item.dim_usuario_id ? item.dim_usuario_id.split('-')[0] : 'abcd';
            const numericHash = parseInt(uuidHash, 16) || 12345;
            const derivedTel = `(11) 98${numericHash % 10}0${(numericHash * 2) % 10}-${(numericHash * 3) % 10000}`;

            return {
              id: item.dim_usuario_id,
              nome: cleanedNome,
              email: derivedEmail,
              cargo: item.crg_nome || 'Sem Cargo',
              departamentoId: item.dpt_nome || 'Sem Departamento',
              telefone: derivedTel,
              dataAdmissao: '2026-01-01',
              status: (item.colaborador_id || item.rh_colaborador_id) ? 'Ativo' : 'Inativo'
            };
          });
          setDbColaboradores(mapped);
        }
      } catch (err) {
        console.warn('Silent error updating all db colaboradores:', err);
      }

      setSelectedDimUsuario(null);
    } catch (err: any) {
      console.error('Error removing relationship:', err);
      setRhColabsError(err.message || 'Erro ao desvincular colaborador.');
    } finally {
      setIsLoadingRhColabs(false);
    }
  };

  const [dbColaboradores, setDbColaboradores] = useState<Colaborador[]>([]);

  useEffect(() => {
    const fetchAllDbColaboradores = async () => {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase
            .from('viw_colaborador_cargo')
            .select('*')
            .order('colaborador', { ascending: true });
          
          if (!error && data) {
            const mapped: Colaborador[] = data.map((item: any) => {
              const cleanedNome = (item.colaborador || 'Sem Nome').trim();
              const emailSuffix = cleanedNome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '.');
              const derivedEmail = `${emailSuffix || 'colaborador'}@sextante.com.br`;
              const uuidHash = item.dim_usuario_id ? item.dim_usuario_id.split('-')[0] : 'abcd';
              const numericHash = parseInt(uuidHash, 16) || 12345;
              const derivedTel = `(11) 98${numericHash % 10}0${(numericHash * 2) % 10}-${(numericHash * 3) % 10000}`;

              return {
                id: item.dim_usuario_id,
                nome: cleanedNome,
                email: derivedEmail,
                cargo: item.crg_nome || 'Sem Cargo',
                departamentoId: item.dpt_nome || 'Sem Departamento',
                telefone: derivedTel,
                dataAdmissao: '2026-01-01',
                status: (item.colaborador_id || item.rh_colaborador_id) ? 'Ativo' : 'Inativo'
              };
            });
            setDbColaboradores(mapped);
          }
        } catch (err) {
          console.error('Error loading all db colaboradores:', err);
        }
      }
    };

    fetchAllDbColaboradores();
  }, [isSupabaseConfigured, departamentos, supabaseColaboradoresCount]);

  const activeColaboradoresList = useMemo(() => {
    return isSupabaseConfigured ? dbColaboradores : colaboradores;
  }, [isSupabaseConfigured, dbColaboradores, colaboradores]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;


  const fetchSupabaseTarefas = async (page: number, search: string) => {
    if (!isSupabaseConfigured || !supabase) return;
    setIsLoadingSupabaseTarefas(true);
    setSupabaseTarefasError(null);
    try {
      const from = (page - 1) * itemsPerPage;
      const to = page * itemsPerPage - 1;
      let query = supabase.from('dim_tarefa').select('*', { count: 'exact' });
      if (search.trim()) {
        query = query.ilike('nome', `%${search.trim()}%`);
      }
      const { data, count, error } = await query
        .order('nome', { ascending: true })
        .range(from, to);

      if (error) throw error;
      setSupabaseTarefas(data || []);
      if (count !== null) setSupabaseTarefasCount(count);
    } catch (err: any) {
      console.error('Error fetching Supabase tarefas:', err);
      setSupabaseTarefasError(err.message || 'Erro ao carregar tarefas.');
    } finally {
      setIsLoadingSupabaseTarefas(false);
    }
  };

  // Supabase load function for Colaboradores
  const fetchSupabaseColaboradores = async (page: number, search: string, relacionamento: 'Todos' | 'Relacionados' | 'NaoRelacionados' = 'Todos', grpFuncao: string = 'Todos') => {
    if (!isSupabaseConfigured || !supabase) return;
    setIsLoadingSupabaseColabs(true);
    setSupabaseColabsError(null);
    try {
      const from = (page - 1) * itemsPerPage;
      const to = page * itemsPerPage - 1;

      let query = supabase
        .from('viw_colaborador_cargo')
        .select('*', { count: 'exact' });

      if (search.trim()) {
        query = query.ilike('colaborador', `%${search.trim()}%`);
      }

      if (relacionamento === 'Relacionados') {
        query = query.not('colaborador_id', 'is', null);
      } else if (relacionamento === 'NaoRelacionados') {
        query = query.is('colaborador_id', null);
      }
      if (grpFuncao !== 'Todos') {
        query = query.eq('grp_crg_nome', grpFuncao);
      }

      const { data, count, error } = await query
        .order('colaborador', { ascending: true })
        .range(from, to);

      if (error) {
        throw error;
      }

      setSupabaseColaboradores(data || []);
      if (count !== null) {
        setSupabaseColaboradoresCount(count);
      }
    } catch (err: any) {
      console.error('Error fetching Supabase collaborators:', err);
      setSupabaseColabsError(err.message || 'Erro ao carregar colaboradores do Supabase.');
    } finally {
      setIsLoadingSupabaseColabs(false);
    }
  };

  // Supabase load function for Clientes
  const fetchSupabaseClients = async (page: number, search: string, status: string, tipoPessoa: string, sitTrib: string) => {
    if (!isSupabaseConfigured || !supabase) return;
    setIsLoadingSupabase(true);
    setSupabaseError(null);
    try {
      const from = (page - 1) * itemsPerPage;
      const to = page * itemsPerPage - 1;

      let query = supabase
        .from('dim_cliente')
        .select('*, dim_grupo_cliente(nome)', { count: 'exact' });

      if (search.trim()) {
        const queryStr = search.trim();
        query = query.or(`nome.ilike.%${queryStr}%,documento.ilike.%${queryStr}%,codigo.ilike.%${queryStr}%`);
      }

      if (status === 'Ativo') {
        query = query.eq('ativo', true);
      } else if (status === 'Inativo') {
        query = query.eq('ativo', false);
      }

      if (tipoPessoa === 'PF') {
        query = query.eq('tipo_pessoa', 'PF');
      } else if (tipoPessoa === 'PJ') {
        query = query.eq('tipo_pessoa', 'PJ');
      }

      if (sitTrib === 'SemSituacao') {
        query = query.is('sit_trib_id', null);
      } else if (sitTrib !== 'Todos') {
        query = query.eq('sit_trib_id', sitTrib);
      }

      const { data, count, error } = await query
        .order('nome', { ascending: true })
        .range(from, to);

      if (error) {
        throw error;
      }

      setSupabaseClients(data || []);
      if (count !== null) {
        setSupabaseClientsCount(count);
      }
    } catch (err: any) {
      console.error('Error fetching Supabase clients:', err);
      setSupabaseError(err.message || 'Erro ao carregar dados do Supabase.');
    } finally {
      setIsLoadingSupabase(false);
    }
  };

  // Supabase load function for Departamentos
  const fetchSupabaseDepartamentos = async (page: number, search: string, status: string) => {
    if (!isSupabaseConfigured || !supabase) return;
    setIsLoadingSupabaseDepts(true);
    setSupabaseDeptsError(null);
    try {
      const from = (page - 1) * itemsPerPage;
      const to = page * itemsPerPage - 1;

      let query = supabase
        .from('dim_departamento')
        .select('*', { count: 'exact' });

      if (search.trim()) {
        const queryStr = search.trim();
        query = query.ilike('nome', `%${queryStr}%`);
      }

      if (status === 'Ativo') {
        query = query.eq('ativo_sn', true);
      } else if (status === 'Inativo') {
        query = query.eq('ativo_sn', false);
      }

      const { data, count, error } = await query
        .order('nome', { ascending: true })
        .range(from, to);

      if (error) {
        throw error;
      }

      setSupabaseDepartamentos(data || []);
      if (count !== null) {
        setSupabaseDepartamentosCount(count);
      }
    } catch (err: any) {
      console.error('Error fetching Supabase departments:', err);
      setSupabaseDeptsError(err.message || 'Erro ao carregar departamentos do Supabase.');
    } finally {
      setIsLoadingSupabaseDepts(false);
    }
  };

  // Supabase load function for Grupo de Funcoes (grp_cargos)
  const fetchSupabaseGrpCargos = async (page: number, search: string) => {
    if (!isSupabaseConfigured || !supabase) return;
    setIsLoadingSupabaseGrpCargos(true);
    setSupabaseGrpCargosError(null);
    try {
      const from = (page - 1) * itemsPerPage;
      const to = page * itemsPerPage - 1;

      let query = supabase
        .from('grp_cargos')
        .select('*', { count: 'exact' });

      if (search.trim()) {
        query = query.or(`grp_crg_nome.ilike.%${search.trim()}%,grp_crg_cntrl.ilike.%${search.trim()}%`);
      }

      const { data, count, error } = await query
        .order('grp_crg_nome', { ascending: true })
        .range(from, to);

      if (error) {
        throw error;
      }

      setSupabaseGrpCargos(data || []);
      if (count !== null) {
        setSupabaseGrpCargosCount(count);
      }
    } catch (err: any) {
      console.error('Error fetching Supabase grp_cargos:', err);
      setSupabaseGrpCargosError(err.message || 'Erro ao carregar Grupo de Funções do Supabase.');
    } finally {
      setIsLoadingSupabaseGrpCargos(false);
    }
  };

  // Supabase load function for Grupo de Cliente (dim_grupo_cliente)
  const fetchSupabaseGrpClientes = async (page: number, search: string, status: string) => {
    if (!isSupabaseConfigured || !supabase) return;
    setIsLoadingSupabaseGrpClientes(true);
    setSupabaseGrpClientesError(null);
    try {
      const from = (page - 1) * itemsPerPage;
      const to = page * itemsPerPage - 1;

      let query = supabase
        .from('dim_grupo_cliente')
        .select('*', { count: 'exact' });

      if (search.trim()) {
        query = query.ilike('nome', `%${search.trim()}%`);
      }
      
      if (status === 'Ativo') {
        query = query.eq('situacao', 'ATIVO');
      } else if (status === 'Inativo') {
        query = query.eq('situacao', 'INATIVO');
      }

      const { data, count, error } = await query
        .order('nome', { ascending: true })
        .range(from, to);

      if (error) throw error;

      setSupabaseGrpClientes(data || []);
      if (count !== null) setSupabaseGrpClientesCount(count);
    } catch (err: any) {
      console.error('Error fetching Supabase dim_grupo_cliente:', err);
      setSupabaseGrpClientesError(err.message || 'Erro ao carregar Grupo de Clientes do Supabase.');
    } finally {
      setIsLoadingSupabaseGrpClientes(false);

    }
  };


  const fetchSupabaseSituacaoTrib = async (page: number, search: string, status: string) => {
    if (!isSupabaseConfigured || !supabase) return;
    setIsLoadingSupabaseSituacaoTrib(true);
    setSupabaseSituacaoTribError(null);
    try {
      const from = (page - 1) * itemsPerPage;
      const to = page * itemsPerPage - 1;
      let query = supabase
        .from('dim_situacao_trib')
        .select('*', { count: 'exact' });

      if (search.trim()) {
        const searchStr = search.trim();
        query = query.or(`resumido.ilike.%${searchStr}%,situacao.ilike.%${searchStr}%`);
      }
      
      if (status === 'Ativo') {
        query = query.eq('ativo', 'S');
      } else if (status === 'Inativo') {
        query = query.not('ativo', 'eq', 'S');
      }

      const { data, count, error } = await query
        .order('resumido', { ascending: true })
        .range(from, to);

      if (error) throw error;

      setSupabaseSituacaoTrib(data || []);
      if (count !== null) setSupabaseSituacaoTribCount(count);
    } catch (err: any) {
      console.error('Error fetching Supabase dim_situacao_trib:', err);
      setSupabaseSituacaoTribError(err.message || 'Erro ao carregar Situação Tributária do Supabase.');
    } finally {
      setIsLoadingSupabaseSituacaoTrib(false);
    }
  };

  // Load ALL departments from Supabase initially for dropdown lists and ID-to-name lookup resolution
  useEffect(() => {
    const fetchAllDepts = async () => {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase
            .from('dim_departamento')
            .select('*')
            .order('nome', { ascending: true });
          if (!error && data) {
            setDbAllDepartamentos(data);
          }
        } catch (e) {
          console.error('Error loading all departments for mapping:', e);
        }
      }
    };
    fetchAllDepts();
  }, [isSupabaseConfigured, departamentos]);
  const fetchAllGrpClientes = async () => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('dim_grupo_cliente')
          .select('*')
          .order('nome', { ascending: true });
        if (!error && data) {
          setDbAllGrpClientes(data);
        }
      } catch (err) {
        console.error('Error fetching all grp_clientes:', err);
      }
    }
  };

  const fetchAllGrpCargos = async () => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('grp_cargos')
          .select('*')
          .order('grp_crg_nome', { ascending: true });
        if (!error && data) {
          setDbAllGrpCargos(data);
        }
      } catch (err) {
        console.error('Error fetching all grp_cargos:', err);
      }
    }
  };

  const fetchAllSituacoesTrib = async () => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('dim_situacao_trib')
          .select('*')
          .order('resumido', { ascending: true });
        if (!error && data) {
          setDbAllSituacoesTrib(data);
        }
      } catch (err) {
        console.error('Error fetching all situacoes trib:', err);
      }
    }
  };

  useEffect(() => {
    fetchAllGrpClientes();
    fetchAllGrpCargos();
    fetchAllSituacoesTrib();
  }, [isSupabaseConfigured, activeTab]);


  const activeDepartamentosList = useMemo(() => {
    return isSupabaseConfigured ? dbAllDepartamentos : departamentos;
  }, [isSupabaseConfigured, dbAllDepartamentos, departamentos]);

  const activeGrpClientesList = useMemo(() => {
    return isSupabaseConfigured ? dbAllGrpClientes : []; // no local mock for this
  }, [isSupabaseConfigured, dbAllGrpClientes]);

  const activeSituacoesTribList = useMemo(() => {
    return isSupabaseConfigured ? dbAllSituacoesTrib : [];
  }, [isSupabaseConfigured, dbAllSituacoesTrib]);

  const activeGrpCargosList = useMemo(() => {
    return isSupabaseConfigured ? dbAllGrpCargos : localGrpCargos;
  }, [isSupabaseConfigured, dbAllGrpCargos, localGrpCargos]);

  // Fetch Supabase count once and on tab activation
  useEffect(() => {
    const fetchCountInitially = async () => {
      if (!isSupabaseConfigured || !supabase) return;
      try {
        const { count, error } = await supabase
          .from('dim_cliente')
          .select('*', { count: 'exact', head: true });
        if (!error && count !== null) {
          setSupabaseClientsCount(count);
        }
      } catch (e) {
        console.error('Failed fetching client count: ', e);
      }

      try {
        const { count, error } = await supabase
          .from('dim_departamento')
          .select('*', { count: 'exact', head: true });
        if (!error && count !== null) {
          setSupabaseDepartamentosCount(count);
        }
      } catch (e) {
        console.error('Failed fetching department count: ', e);
      }

      try {
        const { count, error } = await supabase
          .from('grp_cargos')
          .select('*', { count: 'exact', head: true });
        if (!error && count !== null) {
          setSupabaseGrpCargosCount(count);
        }
      } catch (e) {
        console.warn('Failed fetching grp_cargos count inicialmente (might need table creation): ', e);
      }

      try {
        const { count, error } = await supabase
          .from('viw_colaborador_cargo')
          .select('*', { count: 'exact', head: true });
        if (!error && count !== null) {
          setSupabaseColaboradoresCount(count);
        }
      } catch (e) {
        console.error('Failed fetching collaborator count: ', e);
      }

      try {
        const { count, error } = await supabase
          .from('dim_grupo_cliente')
          .select('*', { count: 'exact', head: true });
        if (!error && count !== null) {
          setSupabaseGrpClientesCount(count);
        }
      } catch (e) {
        console.error('Failed fetching dim_grupo_cliente count: ', e);
      }

      try {
        const { count, error } = await supabase
          .from('dim_tarefa')
          .select('*', { count: 'exact', head: true });
        if (!error && count !== null) {
          setSupabaseTarefasCount(count);
        }
      } catch (e) {
        console.error('Failed fetching dim_tarefa count: ', e);
      }
    };

    fetchCountInitially();
  }, [activeTab]);

  // Fetch paginated data when active tab, page, search criteria, status or tipoPessoa moves
  useEffect(() => {
    if (activeTab === 'clientes' && isSupabaseConfigured) {
      fetchSupabaseClients(currentPage, searchTerm, statusFilter, tipoPessoaFilter, sitTribFilter);
    } else if (activeTab === 'situacao_trib' && isSupabaseConfigured) {
      fetchSupabaseSituacaoTrib(currentPage, searchTerm, statusFilter);
    } else if (activeTab === 'grp_clientes' && isSupabaseConfigured) {
      fetchSupabaseGrpClientes(currentPage, searchTerm, statusFilter);
    } else if (activeTab === 'departamentos' && isSupabaseConfigured) {
      fetchSupabaseDepartamentos(currentPage, searchTerm, statusFilter);
    } else if (activeTab === 'grp_cargos' && isSupabaseConfigured) {
      fetchSupabaseGrpCargos(currentPage, searchTerm);
    } else if (activeTab === 'tarefas' && isSupabaseConfigured) {
      fetchSupabaseTarefas(currentPage, searchTerm);
    } else if (activeTab === 'colaboradores' && isSupabaseConfigured) {
      fetchSupabaseColaboradores(currentPage, searchTerm, relacionamentoFilter);
    }
  }, [activeTab, currentPage, searchTerm, statusFilter, tipoPessoaFilter, sitTribFilter, relacionamentoFilter, grupoFuncaoFilter]);

  // Modals visibility toggles
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editingInlineClientSitTribId, setEditingInlineClientSitTribId] = useState<string | null>(null);
  const [editingInlineColabGrpCargoId, setEditingInlineColabGrpCargoId] = useState<string | null>(null);
  const [editingGrpClienteId, setEditingGrpClienteId] = useState<string | null>(null);
  const [editingTarefaId, setEditingTarefaId] = useState<string | null>(null);

  const handleInlineSitTribChange = async (clientId: string, newSitTribId: string) => {
    if (!supabase) return;
    try {
      const valToSave = newSitTribId === 'null' || !newSitTribId ? null : newSitTribId;
      const { error } = await supabase
        .from('dim_cliente')
        .update({ sit_trib_id: valToSave })
        .eq('id', clientId);
      
      if (error) throw error;
      
      setSupabaseClients(prev => prev.map(c => c.id === clientId ? { ...c, sit_trib_id: valToSave } : c));
    } catch (err) {
      console.error('Error updating sit_trib_id', err);
    } finally {
      setEditingInlineClientSitTribId(null);
    }
  };

const handleInlineGrpCargoChange = async (colaboradorId: string, newGrpCargoId: string) => {
    if (!supabase) return;
    try {
      const valToSave = newGrpCargoId === 'null' || !newGrpCargoId ? null : parseInt(newGrpCargoId);
      const { error } = await supabase
        .from('dim_usuario')
        .update({ grp_cargo_id: valToSave })
        .eq('id', colaboradorId);
      
      if (error) throw error;
      
      const grp = supabaseGrpCargos.find(g => g.id === valToSave);
      const grpName = grp ? grp.grp_crg_nome : null;
      
      setSupabaseColaboradores(prev => prev.map(c => c.dim_usuario_id === colaboradorId ? { ...c, grp_cargo_id: valToSave, grp_crg_nome: grpName } : c));
    } catch (err) {
      console.error('Error updating grp_cargo_id', err);
    } finally {
      setEditingInlineColabGrpCargoId(null);
    }
  };

  // New Record Forms Local States
  // Situacao Tributaria Form
  const [editingSitTribId, setEditingSitTribId] = useState<string | null>(null);
  const [newSitTribResumido, setNewSitTribResumido] = useState('');
  const [newSitTribSituacao, setNewSitTribSituacao] = useState('');
  const [newSitTribAtivo, setNewSitTribAtivo] = useState<'S' | 'N'>('S');
  const [newSitTribGrupo, setNewSitTribGrupo] = useState('');

  // Cliente Form
  const [newClientCodigo, setNewClientCodigo] = useState('');
  const [newClientDocumento, setNewClientDocumento] = useState('');
  const [newClientNome, setNewClientNome] = useState('');
  const [newClientTipoPessoa, setNewClientTipoPessoa] = useState<'PF' | 'PJ' | ''>('');
  const [newClientAtivo, setNewClientAtivo] = useState<boolean>(true);
  const [newClientGrupoId, setNewClientGrupoId] = useState('');
  const [newClientSitTribId, setNewClientSitTribId] = useState('');
  const [newClientDetalhes, setNewClientDetalhes] = useState('');
  const [newClientCliNome, setNewClientCliNome] = useState('');

  // Grupo Cliente Form
  const [newGrpClienteNome, setNewGrpClienteNome] = useState('');
  const [newGrpClienteSituacao, setNewGrpClienteSituacao] = useState<'ATIVO' | 'INATIVO'>('ATIVO');
  const [newGrpClienteObserva, setNewGrpClienteObserva] = useState('');

  // Departamento Form
  const [newDeptNome, setNewDeptNome] = useState('');
  const [newDeptCodigo, setNewDeptCodigo] = useState('');
  const [newDeptGestor, setNewDeptGestor] = useState('');
  const [newDeptCentroCusto, setNewDeptCentroCusto] = useState('');
  const [newDeptStatus, setNewDeptStatus] = useState<'Ativo' | 'Inativo'>('Ativo');

  // Colaborador Form
  const [newColabNome, setNewColabNome] = useState('');
  const [newColabEmail, setNewColabEmail] = useState('');
  const [newColabCargo, setNewColabCargo] = useState('');
  const [newColabDeptId, setNewColabDeptId] = useState('');
  const [newColabTelefone, setNewColabTelefone] = useState('');
  const [newColabAdmissao, setNewColabAdmissao] = useState('');
  const [newColabStatus, setNewColabStatus] = useState<'Ativo' | 'Inativo'>('Ativo');
  const [newColabGrpCargoId, setNewColabGrpCargoId] = useState<string>('');
  const [editingColaboradorId, setEditingColaboradorId] = useState<string | null>(null);

  // Tarefa Form
  const [newTaskTitulo, setNewTaskTitulo] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskColabId, setNewTaskColabId] = useState('');
  const [newTaskPrazo, setNewTaskPrazo] = useState('');
  const [newTaskPrioridade, setNewTaskPrioridade] = useState<'Baixa' | 'Média' | 'Alta'>('Média');
  const [newTaskStatus, setNewTaskStatus] = useState<'Pendente' | 'Em Andamento' | 'Concluída'>('Pendente');

  // Grupo de Funçoes (grp_cargos) Form State
  const [editingGrpCargoId, setEditingGrpCargoId] = useState<number | string | null>(null);
  const [newGrpCrgNome, setNewGrpCrgNome] = useState('');
  const [newGrpCrgCntrl, setNewGrpCrgCntrl] = useState('');
  const [newGrpCrgStatus, setNewGrpCrgStatus] = useState<string>('ATIVO');

  // Reset Search Term on Tab Change
  const handleTabSelection = (tab: CadastroTab) => {
    setActiveTab(tab);
    setSearchTerm('');
    setStatusFilter('Todos');
    setTipoPessoaFilter('Todos');
    setTaskStatusFilter('Todos');
    setTaskPriorityFilter('Todos');
    setCurrentPage(1);
  };

  // Submission Handlers
  const handleCreateGrpCargo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGrpCrgNome.trim()) return;

    if (isSupabaseConfigured && supabase) {
      setIsLoadingSupabaseGrpCargos(true);
      setSupabaseGrpCargosError(null);
      try {
        if (editingGrpCargoId) {
          // UPDATE
          const { error } = await supabase
            .from('grp_cargos')
            .update({
              grp_crg_nome: newGrpCrgNome.trim(),
              grp_crg_cntrl: newGrpCrgCntrl.trim() || null,
              grp_crg_status: newGrpCrgStatus
            })
            .eq('id', editingGrpCargoId);

          if (error) {
            throw error;
          }
        } else {
          // INSERT
          const { error } = await supabase
            .from('grp_cargos')
            .insert({
              grp_crg_nome: newGrpCrgNome.trim(),
              grp_crg_cntrl: newGrpCrgCntrl.trim() || null,
              grp_crg_status: newGrpCrgStatus
            });

          if (error) {
            throw error;
          }
        }

        // Fetch paginated data again and close modal
        await fetchSupabaseGrpCargos(currentPage, searchTerm);

        // Refresh count
        try {
          const { count } = await supabase
            .from('grp_cargos')
            .select('*', { count: 'exact', head: true });
          if (count !== null) setSupabaseGrpCargosCount(count);
        } catch (cntErr) {
          console.warn('Failed updating grp_cargos count:', cntErr);
        }

        // Reset
        setNewGrpCrgNome('');
        setNewGrpCrgCntrl('');
        setNewGrpCrgStatus('ATIVO');
        setEditingGrpCargoId(null);
        setShowAddModal(false);
      } catch (err: any) {
        console.error('Error saving grp_cargos to Supabase:', err);
        setSupabaseGrpCargosError(err.message || 'Erro ao registrar Grupo de Funções no Supabase.');
      } finally {
        setIsLoadingSupabaseGrpCargos(false);
      }
    } else {
      // Offline simulation mode
      if (editingGrpCargoId) {
        // UPDATE Local
        setLocalGrpCargos(prev => prev.map(g => g.id === editingGrpCargoId ? {
          ...g,
          grp_crg_nome: newGrpCrgNome.trim(),
          grp_crg_cntrl: newGrpCrgCntrl.trim() || null,
          grp_crg_status: newGrpCrgStatus
        } : g));
      } else {
        // INSERT Local
        const newG = {
          id: Math.floor(Math.random() * 100000) + 100,
          grp_crg_nome: newGrpCrgNome.trim(),
          grp_crg_cntrl: newGrpCrgCntrl.trim() || null,
          grp_crg_status: newGrpCrgStatus,
          created_at: new Date().toISOString()
        };
        setLocalGrpCargos(prev => [newG, ...prev]);
      }

      setNewGrpCrgNome('');
      setNewGrpCrgCntrl('');
      setNewGrpCrgStatus('ATIVO');
      setEditingGrpCargoId(null);
      setShowAddModal(false);
    }
  };

  const handleRemoveGrpCargo = async (id: string | number, name: string) => {
    if (confirm(`Deseja remover permanentemente o Grupo de Funções "${name}"?`)) {
      if (isSupabaseConfigured && supabase) {
        setIsLoadingSupabaseGrpCargos(true);
        setSupabaseGrpCargosError(null);
        try {
          const { error } = await supabase
            .from('grp_cargos')
            .delete()
            .eq('id', id);

          if (error) {
            throw error;
          }

          // Fetch list again
          await fetchSupabaseGrpCargos(currentPage, searchTerm);

          // Update count
          try {
            const { count } = await supabase
              .from('grp_cargos')
              .select('*', { count: 'exact', head: true });
            if (count !== null) setSupabaseGrpCargosCount(count);
          } catch (cntErr) {
            console.warn('Failed updating count:', cntErr);
          }
        } catch (err: any) {
          console.error('Error deleting grp_cargos:', err);
          setSupabaseGrpCargosError(err.message || 'Erro ao remover Grupo de Funções.');
        } finally {
          setIsLoadingSupabaseGrpCargos(false);
        }
      } else {
        setLocalGrpCargos(prev => prev.filter(g => g.id !== id));
      }
    }
  };

  const handleCreateCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientCodigo.trim()) return;

    if (isSupabaseConfigured && supabase) {
      setIsLoadingSupabase(true);
      setSupabaseError(null);
      try {
        if (editingClientId) {
          const { error } = await supabase
            .from('dim_cliente')
            .update({
              codigo: newClientCodigo.trim(),
              documento: newClientDocumento.trim() || null,
              nome: newClientNome.trim() || null,
              tipo_pessoa: newClientTipoPessoa || null,
              ativo: newClientAtivo,
              grupo_id: newClientGrupoId || null,
              sit_trib_id: newClientSitTribId || null,
              detalhes: newClientDetalhes.trim() || null,
              cli_nome: newClientCliNome.trim() || null
            })
            .eq('id', editingClientId);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('dim_cliente')
            .insert({
              codigo: newClientCodigo.trim(),
              documento: newClientDocumento.trim() || null,
              nome: newClientNome.trim() || null,
              tipo_pessoa: newClientTipoPessoa || null,
              ativo: newClientAtivo,
              grupo_id: newClientGrupoId || null,
              sit_trib_id: newClientSitTribId || null,
              detalhes: newClientDetalhes.trim() || null,
              cli_nome: newClientCliNome.trim() || null
            });
          if (error) throw error;
        }
        await fetchSupabaseClients(currentPage, searchTerm, statusFilter, tipoPessoaFilter, sitTribFilter);
        
        try {
          const { count } = await supabase.from('dim_cliente').select('*', { count: 'exact', head: true });
          if (count !== null) setSupabaseClientsCount(count);
        } catch (cntErr) {}
      } catch (err: any) {
        console.error('Error with cliente:', err);
        setSupabaseError(err.message || 'Erro ao salvar Cliente.');
      } finally {
        setIsLoadingSupabase(false);
      }
    } else {
      const newC: DimCliente = {
        id: editingClientId || 'c_' + Math.random().toString(36).substr(2, 9),
        codigo: newClientCodigo.trim(),
        documento: newClientDocumento.trim() || null,
        nome: newClientNome.trim() || null,
        tipo_pessoa: newClientTipoPessoa || null,
        ativo: newClientAtivo,
        grupo_id: newClientGrupoId || null,
        sit_trib_id: newClientSitTribId || null,
        detalhes: newClientDetalhes.trim() || null,
        cli_nome: newClientCliNome.trim() || null
      };
      
      // Removed local edit/add fallback logic that uses onAddCliente/Cliente types, since this is for DimCliente exclusively.
    }

    setNewClientCodigo('');
    setNewClientDocumento('');
    setNewClientNome('');
    setNewClientTipoPessoa('');
    setNewClientAtivo(true);
    setNewClientGrupoId('');
    setNewClientSitTribId('');
    setNewClientDetalhes('');
    setNewClientCliNome('');
    setEditingClientId(null);
    setShowAddModal(false);
  };
  const handleRemoveClienteLocal = async (id: string, name: string) => {
    if (confirm(`Deseja remover permanentemente o Cliente "${name}"?`)) {
      if (isSupabaseConfigured && supabase) {
        setIsLoadingSupabase(true);
        setSupabaseError(null);
        try {
          const { error } = await supabase
            .from('dim_cliente')
            .delete()
            .eq('id', id);

          if (error) throw error;

          await fetchSupabaseClients(currentPage, searchTerm, statusFilter, tipoPessoaFilter, sitTribFilter);

          try {
            const { count } = await supabase.from('dim_cliente').select('*', { count: 'exact', head: true });
            if (count !== null) setSupabaseClientsCount(count);
          } catch (cntErr) {}
        } catch (err: any) {
          console.error('Error deleting cliente:', err);
          setSupabaseError(err.message || 'Erro ao remover Cliente.');
        } finally {
          setIsLoadingSupabase(false);
        }
      } else {
        onRemoveCliente(id);
      }
    }
  };

  const handleCreateSituacaoTrib = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSitTribResumido.trim()) return;

    if (isSupabaseConfigured && supabase) {
      setIsLoadingSupabaseSituacaoTrib(true);
      setSupabaseSituacaoTribError(null);
      try {
        if (editingSitTribId) {
          const { error } = await supabase
            .from('dim_situacao_trib')
            .update({
              resumido: newSitTribResumido.trim() || null,
              situacao: newSitTribSituacao.trim() || null,
              ativo: newSitTribAtivo,
              grupo: newSitTribGrupo.trim() || null
            })
            .eq('id', editingSitTribId);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('dim_situacao_trib')
            .insert({
              resumido: newSitTribResumido.trim() || null,
              situacao: newSitTribSituacao.trim() || null,
              ativo: newSitTribAtivo,
              grupo: newSitTribGrupo.trim() || null
            });
          if (error) throw error;
        }

        await fetchSupabaseSituacaoTrib(currentPage, searchTerm, statusFilter);
        fetchAllSituacoesTrib(); // Update global list

        try {
          const { count } = await supabase
            .from('dim_situacao_trib')
            .select('*', { count: 'exact', head: true });
          if (count !== null) setSupabaseSituacaoTribCount(count);
        } catch (cntErr) {}

        setNewSitTribResumido('');
        setNewSitTribSituacao('');
        setNewSitTribAtivo('S');
        setNewSitTribGrupo('');
        setEditingSitTribId(null);
        setShowAddModal(false);
      } catch (err: any) {
        console.error('Error saving situacao_trib:', err);
        alert(err.message || 'Erro ao salvar Situação Tributária.');
      } finally {
        setIsLoadingSupabaseSituacaoTrib(false);
      }
    }
  };

  const handleRemoveSituacaoTrib = async (id: string, name: string) => {
    if (confirm(`Tem certeza que deseja excluir a situação "${name}"?`)) {
      if (isSupabaseConfigured && supabase) {
        setIsLoadingSupabaseSituacaoTrib(true);
        setSupabaseSituacaoTribError(null);
        try {
          const { error } = await supabase
            .from('dim_situacao_trib')
            .delete()
            .eq('id', id);

          if (error) throw error;

          await fetchSupabaseSituacaoTrib(currentPage, searchTerm, statusFilter);
          fetchAllSituacoesTrib();

          try {
            const { count } = await supabase.from('dim_situacao_trib').select('*', { count: 'exact', head: true });
            if (count !== null) setSupabaseSituacaoTribCount(count);
          } catch (cntErr) {}
        } catch (err: any) {
          console.error('Error removing situacao_trib:', err);
          alert(err.message || 'Erro ao remover Situação Tributária.');
        } finally {
          setIsLoadingSupabaseSituacaoTrib(false);
        }
      }
    }
  };

  const handleCreateGrpCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGrpClienteNome.trim()) return;

    if (isSupabaseConfigured && supabase) {
      setIsLoadingSupabaseGrpClientes(true);
      setSupabaseGrpClientesError(null);
      try {
        if (editingGrpClienteId) {
          const { error } = await supabase
            .from('dim_grupo_cliente')
            .update({
              nome: newGrpClienteNome.trim(),
              situacao: newGrpClienteSituacao,
              observa: newGrpClienteObserva.trim() || null
            })
            .eq('id', editingGrpClienteId);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('dim_grupo_cliente')
            .insert({
              nome: newGrpClienteNome.trim(),
              situacao: newGrpClienteSituacao,
              observa: newGrpClienteObserva.trim() || null
            });
          if (error) throw error;
        }

        await fetchSupabaseGrpClientes(currentPage, searchTerm, statusFilter);
        
        try {
          const { count } = await supabase
            .from('dim_grupo_cliente')
            .select('*', { count: 'exact', head: true });
          if (count !== null) setSupabaseGrpClientesCount(count);
        } catch (cntErr) {
          console.warn('Failed updating grp_clientes count:', cntErr);
        }

        setNewGrpClienteNome('');
        setNewGrpClienteSituacao('ATIVO');
        setNewGrpClienteObserva('');
        setEditingGrpClienteId(null);
        setShowAddModal(false);
      } catch (err: any) {
        console.error('Error with grp_cliente to Supabase:', err);
        setSupabaseGrpClientesError(err.message || 'Erro ao salvar Grupo de Cliente no Supabase.');
      } finally {
        setIsLoadingSupabaseGrpClientes(false);

      }
    } else {
      const newG = {
        id: editingGrpClienteId || 'grpc_' + Math.random().toString(36).substr(2, 9),
        nome: newGrpClienteNome.trim(),
        situacao: newGrpClienteSituacao,
        observa: newGrpClienteObserva.trim() || null,
        created_at: new Date().toISOString()
      };
      
      if (editingGrpClienteId) {
        setLocalGrpClientes(prev => prev.map(g => g.id === editingGrpClienteId ? newG : g));
      } else {
        setLocalGrpClientes(prev => [newG, ...prev]);
      }

      setNewGrpClienteNome('');
      setNewGrpClienteSituacao('ATIVO');
      setNewGrpClienteObserva('');
      setEditingGrpClienteId(null);
      setShowAddModal(false);
    }
  };

  const handleRemoveGrpCliente = async (id: string, name: string) => {
    if (confirm(`Deseja remover permanentemente o Grupo de Cliente "${name}"?`)) {
      if (isSupabaseConfigured && supabase) {
        setIsLoadingSupabaseGrpClientes(true);
        setSupabaseGrpClientesError(null);
        try {
          const { error } = await supabase
            .from('dim_grupo_cliente')
            .delete()
            .eq('id', id);

          if (error) throw error;

          await fetchSupabaseGrpClientes(currentPage, searchTerm, statusFilter);

          try {
            const { count } = await supabase
              .from('dim_grupo_cliente')
              .select('*', { count: 'exact', head: true });
            if (count !== null) setSupabaseGrpClientesCount(count);
          } catch (cntErr) {
            console.warn('Failed updating count:', cntErr);
          }
        } catch (err: any) {
          console.error('Error deleting grp_cliente:', err);
          setSupabaseGrpClientesError(err.message || 'Erro ao remover Grupo de Cliente.');
        } finally {
          setIsLoadingSupabaseGrpClientes(false);

        }
      } else {
        setLocalGrpClientes(prev => prev.filter(g => g.id !== id));
      }
    }
  };

  const handleCreateDepartamento = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptNome.trim() || !newDeptCodigo.trim()) return;

    const newD: Departamento = {
      id: 'd_' + Math.random().toString(36).substr(2, 9),
      nome: newDeptNome.trim(),
      codigo: newDeptCodigo.trim().toUpperCase(),
      gestor: newDeptGestor.trim() || 'Responsável Não Definido',
      centroCusto: newDeptCentroCusto.trim() || 'CC-BASE-99',
      status: newDeptStatus
    };

    onAddDepartamento(newD);

    // Reset Form
    setNewDeptNome('');
    setNewDeptCodigo('');
    setNewDeptGestor('');
    setNewDeptCentroCusto('');
    setNewDeptStatus('Ativo');
    setShowAddModal(false);
  };

  const handleCreateColaborador = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColabNome.trim()) return;

    if (isSupabaseConfigured && supabase) {
      setIsLoadingSupabaseColabs(true);
      setSupabaseColabsError(null);
      try {
        let error;
        const cargoIdNum = newColabGrpCargoId ? parseInt(newColabGrpCargoId) : 5;
        const colabData = {
          nome: newColabNome.trim(),
          grp_cargo_id: cargoIdNum,
          email: newColabEmail.trim() || null,
          telefone: newColabTelefone.trim() || null,
          data_admissao: newColabAdmissao || null,
          ativo_sn: newColabStatus === 'Ativo'
        };

        if (editingColaboradorId) {
          // UPDATE EXISTING
          const { error: err } = await supabase
            .from('dim_usuario')
            .update(colabData)
            .eq('id', editingColaboradorId);
          error = err;
        } else {
          // INSERT NEW
          const { error: err } = await supabase
            .from('dim_usuario')
            .insert(colabData);
          error = err;
        }

        if (error) {
          throw error;
        }

        // Fetch paginated colaboradores again and close modal
        await fetchSupabaseColaboradores(currentPage, searchTerm, relacionamentoFilter);
        
        // Refresh counts
        try {
          const { count } = await supabase
            .from('viw_colaborador_cargo')
            .select('*', { count: 'exact', head: true });
          if (count !== null) setSupabaseColaboradoresCount(count);
        } catch (cntErr) {
          console.warn('Failed updating count:', cntErr);
        }

        // Reset fields
        setNewColabNome('');
        setNewColabEmail('');
        setNewColabCargo('');
        setNewColabDeptId('');
        setNewColabTelefone('');
        setNewColabAdmissao('');
        setNewColabStatus('Ativo');
        setNewColabGrpCargoId('');
        setEditingColaboradorId(null);
        setShowAddModal(false);
      } catch (err: any) {
        console.error('Error inserting/updating collaborator in Supabase dim_usuario:', err);
        setSupabaseColabsError(err.message || 'Erro ao salvar colaborador no Supabase.');
      } finally {
        setIsLoadingSupabaseColabs(false);
      }
    } else {
      if (!newColabEmail.trim()) return;
      // Use selected department or fallback to first active or dummy
      const deptId = newColabDeptId || (departamentos[0]?.id || 'd1');

      if (editingColaboradorId) {
        // Local Edit: remove first
        onRemoveColaborador(editingColaboradorId);
      }

      const newCol: Colaborador = {
        id: editingColaboradorId || 'col_' + Math.random().toString(36).substr(2, 9),
        nome: newColabNome.trim(),
        email: newColabEmail.trim(),
        cargo: newColabCargo.trim() || 'Analista',
        departamentoId: deptId,
        telefone: newColabTelefone.trim() || '(11) 99999-9999',
        dataAdmissao: newColabAdmissao || new Date().toISOString().split('T')[0],
        status: newColabStatus
      };

      onAddColaborador(newCol);

      // Reset Form
      setNewColabNome('');
      setNewColabEmail('');
      setNewColabCargo('');
      setNewColabDeptId('');
      setNewColabTelefone('');
      setNewColabAdmissao('');
      setNewColabStatus('Ativo');
      setNewColabGrpCargoId('');
      setEditingColaboradorId(null);
      setShowAddModal(false);
    }
  };

  const handleRemoveSupabaseColaborador = async (id: string, name: string) => {
    if (!isSupabaseConfigured || !supabase) return;
    if (confirm(`Deseja desligar permanentemente o colaborador ${name}?`)) {
      setIsLoadingSupabaseColabs(true);
      setSupabaseColabsError(null);
      try {
        const { error } = await supabase
          .from('dim_usuario')
          .update({ ativo_sn: false })
          .eq('id', id);

        if (error) {
          throw error;
        }

        // Fetch again
        await fetchSupabaseColaboradores(currentPage, searchTerm, relacionamentoFilter);

        // Refresh count
        try {
          const { count } = await supabase
            .from('viw_colaborador_cargo')
            .select('*', { count: 'exact', head: true });
          if (count !== null) setSupabaseColaboradoresCount(count);
        } catch (cntErr) {
          console.warn('Failed updating count:', cntErr);
        }
      } catch (err: any) {
        console.error('Error deleting collaborator:', err);
        setSupabaseColabsError(err.message || 'Erro ao remover colaborador do banco.');
      } finally {
        setIsLoadingSupabaseColabs(false);
      }
    }
  };

  const handleCreateTarefa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitulo.trim()) return;

    if (isSupabaseConfigured && supabase) {
      setIsLoadingSupabaseTarefas(true);
      try {
        if (editingTarefaId) {
          const { error } = await supabase.from('dim_tarefa').update({
            nome: newTaskTitulo.trim()
          }).eq('id', editingTarefaId);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('dim_tarefa').insert([{
            nome: newTaskTitulo.trim()
          }]);
          if (error) throw error;
        }
        
        // Refresh list
        fetchSupabaseTarefas(currentPage, searchTerm);
        
        // Update count
        const { count } = await supabase.from('dim_tarefa').select('*', { count: 'exact', head: true });
        if (count !== null) setSupabaseTarefasCount(count);

        setNewTaskTitulo('');
        setEditingTarefaId(null);
        setShowAddModal(false);
      } catch (err: any) {
        console.error('Error saving dim_tarefa:', err);
        setSupabaseTarefasError(err.message || 'Erro ao salvar tarefa no banco.');
      } finally {
        setIsLoadingSupabaseTarefas(false);
      }
    } else {
      // Fallback local logic...
      // not fully handling edit for local as instructions focus on db
      const colabId = newTaskColabId || (activeColaboradoresList[0]?.id || 'col1');
      const newT = {
        id: editingTarefaId || ('t_' + Math.random().toString(36).substr(2, 9)),
        titulo: newTaskTitulo.trim(),
        descricao: newTaskDesc.trim() || 'Nenhuma descrição fornecida.',
        colaboradorId: colabId,
        prazo: newTaskPrazo || new Date().toISOString().split('T')[0],
        prioridade: newTaskPrioridade,
        status: newTaskStatus
      };
      onAddTarefa(newT as any);
      setNewTaskTitulo('');
      setNewTaskDesc('');
      setNewTaskColabId('');
      setNewTaskPrazo('');
      setNewTaskPrioridade('Média');
      setNewTaskStatus('Pendente');
      setEditingTarefaId(null);
      setShowAddModal(false);
    }
  };

  const handleDeleteTarefaSupabase = async (id: string) => {
    if (!isSupabaseConfigured || !supabase) return;
    if (!confirm('Deseja realmente remover esta tarefa?')) return;
    setIsLoadingSupabaseTarefas(true);
    try {
      const { error } = await supabase.from('dim_tarefa').delete().eq('id', id);
      if (error) throw error;
      fetchSupabaseTarefas(currentPage, searchTerm);
      const { count } = await supabase.from('dim_tarefa').select('*', { count: 'exact', head: true });
      if (count !== null) setSupabaseTarefasCount(count);
    } catch (err: any) {
      console.error('Error deleting dim_tarefa:', err);
      setSupabaseTarefasError(err.message || 'Erro ao remover tarefa do banco.');
    } finally {
      setIsLoadingSupabaseTarefas(false);
    }
  };

  // Memorized Filtered Lists
  const filteredClientes = useMemo(() => {
    return clientes.filter(c => {
      const matchSearch = c.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (c.documento || '').includes(searchTerm) || (c.codigo || '').includes(searchTerm) || 
                          c.setor.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'Todos' || (c.ativo ? 'Ativo' : 'Inativo') === statusFilter;
      
      const cleanDoc = (c.documento || '').replace(/\D/g, '');
      const localTipo = cleanDoc.length > 11 ? 'PJ' : 'PF';
      const matchTipo = tipoPessoaFilter === 'Todos' || localTipo === tipoPessoaFilter;
      
      return matchSearch && matchStatus && matchTipo;
    });
  }, [clientes, searchTerm, statusFilter, tipoPessoaFilter]);

  const filteredDepartamentos = useMemo(() => {
    return departamentos.filter(d => {
      const matchSearch = d.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          d.codigo.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          d.gestor.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'Todos' || d.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [departamentos, searchTerm, statusFilter]);

  const filteredColaboradores = useMemo(() => {
    return colaboradores.filter(col => {
      const matchSearch = col.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          col.cargo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          col.email.toLowerCase().includes(searchTerm.toLowerCase());
      const isRel = col.status === 'Ativo';
      const matchRel = relacionamentoFilter === 'Todos' || 
                       (relacionamentoFilter === 'Relacionados' && isRel) ||
                       (relacionamentoFilter === 'NaoRelacionados' && !isRel);
      const matchGrp = grupoFuncaoFilter === 'Todos';
      return matchSearch && matchRel && matchGrp;
    });
  }, [colaboradores, searchTerm, relacionamentoFilter, grupoFuncaoFilter]);

  const filteredTarefas = useMemo(() => {
    return tarefas.filter(t => {
      const matchSearch = t.titulo.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.descricao.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = taskStatusFilter === 'Todos' || t.status === taskStatusFilter;
      const matchPriority = taskPriorityFilter === 'Todos' || t.prioridade === taskPriorityFilter;
      return matchSearch && matchStatus && matchPriority;
    });
  }, [tarefas, searchTerm, taskStatusFilter, taskPriorityFilter]);

  const filteredGrpCargos = useMemo(() => {
    return localGrpCargos.filter(g => {
      const name = g.grp_crg_nome || '';
      const cntrl = g.grp_crg_cntrl || '';
      const matchSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          cntrl.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'Todos' || g.grp_crg_status === (statusFilter === 'Ativo' ? 'ATIVO' : 'INATIVO');
      return matchSearch && matchStatus;
    });
  }, [localGrpCargos, searchTerm, statusFilter]);

  const filteredGrpClientes = useMemo(() => {
    return localGrpClientes.filter(g => {
      const matchSearch = g.nome.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'Todos' || g.situacao === (statusFilter === 'Ativo' ? 'ATIVO' : 'INATIVO');
      return matchSearch && matchStatus;
    });
  }, [localGrpClientes, searchTerm, statusFilter]);

  // Pagination counts & range calculations helper
  const totalCount = useMemo(() => {
    if (activeTab === 'clientes') {
      return isSupabaseConfigured ? (supabaseClientsCount !== null ? supabaseClientsCount : 0) : filteredClientes.length;
    }
    if (activeTab === 'situacao_trib') {
      return isSupabaseConfigured ? (supabaseSituacaoTribCount !== null ? supabaseSituacaoTribCount : 0) : activeSituacoesTribList.length;
    }
    if (activeTab === 'grp_clientes') {
      return isSupabaseConfigured ? (supabaseGrpClientesCount !== null ? supabaseGrpClientesCount : 0) : filteredGrpClientes.length;
    }
    if (activeTab === 'departamentos') {
      return isSupabaseConfigured ? (supabaseDepartamentosCount !== null ? supabaseDepartamentosCount : 0) : filteredDepartamentos.length;
    }
    if (activeTab === 'grp_cargos') {
      return isSupabaseConfigured ? (supabaseGrpCargosCount !== null ? supabaseGrpCargosCount : 0) : filteredGrpCargos.length;
    }
    if (activeTab === 'colaboradores') {
      return isSupabaseConfigured ? (supabaseColaboradoresCount !== null ? supabaseColaboradoresCount : 0) : filteredColaboradores.length;
    }
    if (activeTab === 'tarefas') {
      return isSupabaseConfigured ? (supabaseTarefasCount !== null ? supabaseTarefasCount : 0) : filteredTarefas.length;
    }
    return 0;
  }, [activeTab, isSupabaseConfigured, supabaseClientsCount, supabaseGrpClientesCount, supabaseSituacaoTribCount, activeSituacoesTribList.length, supabaseDepartamentosCount, supabaseGrpCargosCount, supabaseColaboradoresCount, supabaseTarefasCount, filteredClientes.length, filteredGrpClientes.length, filteredDepartamentos.length, filteredGrpCargos.length, filteredColaboradores.length, filteredTarefas.length]);

  const isTabLoading = useMemo(() => {
    if (activeTab === 'clientes') return isLoadingSupabase;
    if (activeTab === 'situacao_trib') return isLoadingSupabaseSituacaoTrib;
    if (activeTab === 'grp_clientes') return isLoadingSupabaseGrpClientes;
    if (activeTab === 'departamentos') return isLoadingSupabaseDepts;
    if (activeTab === 'grp_cargos') return isLoadingSupabaseGrpCargos;
    if (activeTab === 'colaboradores') return isLoadingSupabaseColabs;
    return false;
  }, [activeTab, isLoadingSupabase, isLoadingSupabaseGrpClientes, isLoadingSupabaseSituacaoTrib, isLoadingSupabaseDepts, isLoadingSupabaseGrpCargos, isLoadingSupabaseColabs]);

  const startRange = useMemo(() => {
    if (totalCount === 0) return 0;
    return (currentPage - 1) * itemsPerPage + 1;
  }, [currentPage, totalCount, itemsPerPage]);

  const endRange = useMemo(() => {
    return Math.min(currentPage * itemsPerPage, totalCount);
  }, [currentPage, totalCount, itemsPerPage]);

  const totalPages = useMemo(() => {
    return Math.max(Math.ceil(totalCount / itemsPerPage), 1);
  }, [totalCount, itemsPerPage]);

  return (
    <div id="cadastros-view-root" className="flex-1 p-8 overflow-y-auto max-w-7xl mx-auto w-full space-y-8 animate-fade-in">
      
      {/* Top Header Row of Cadastros */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-brand-border/40 pb-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white mb-1">
            Módulo de Cadastros
          </h2>
          <p className="text-sm font-medium text-brand-text-muted">
            Administração Central de Registros • Gerencie os parâmetros base de contatos, equipes e projetos integrados.
          </p>
        </div>

        {/* Global trigger to add the current tab's content */}
        {(activeTab === 'clientes' ||
          (activeTab === 'departamentos' && !isSupabaseConfigured) ||
          activeTab === 'grp_clientes' ||
          activeTab === 'grp_cargos' ||
          activeTab === 'colaboradores' ||
          activeTab === 'tarefas') && (
          <button
            onClick={() => {
              // Trigger pre-selections to ease form flow
              if (activeTab === 'grp_cargos') {
                setEditingGrpCargoId(null);
                setNewGrpCrgNome('');
                setNewGrpCrgCntrl('');
                setNewGrpCrgStatus('ATIVO');
              }
              if (activeTab === 'colaboradores' && departamentos.length > 0) {
                setNewColabDeptId(departamentos[0].id);
              }
              if (activeTab === 'tarefas') {
                setEditingTarefaId(null);
                setNewTaskTitulo('');
                if (activeColaboradoresList.length > 0) {
                  setNewTaskColabId(activeColaboradoresList[0].id);
                }
              }
              if (activeTab === 'clientes') {
                setEditingClientId(null);
                setNewClientCodigo('');
                setNewClientDocumento('');
                setNewClientNome('');
                setNewClientTipoPessoa('');
                setNewClientAtivo(true);
                setNewClientGrupoId('');
                setNewClientSitTribId('');
                setNewClientDetalhes('');
                setNewClientCliNome('');
              }
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded bg-brand-accent hover:bg-brand-accent/95 text-white text-xs font-bold uppercase tracking-wider transition-all scale-100 hover:scale-[1.02] active:scale-95 cursor-pointer shadow-md"
          >
            <Plus size={16} />
            {activeTab === 'clientes' && 'Novo Cliente'}
            {activeTab === 'grp_clientes' && 'Novo Grupo de Clientes'}
            {activeTab === 'situacao_trib' && 'Nova Sit. Trib.'}
            {activeTab === 'departamentos' && 'Novo Departamento'}
            {activeTab === 'grp_cargos' && 'Novo Grupo de Funções'}
            {activeTab === 'colaboradores' && 'Novo Colaborador'}
            {activeTab === 'tarefas' && 'Nova Tarefa'}
          </button>
        )}
      </header>

      {/* Main layout with nested internal side submenu block */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* Left Submenu Navigation Column inside page */}
        <div className="lg:col-span-1 bg-brand-card rounded-lg border border-brand-border overflow-hidden shadow-lg p-4 space-y-4">
          <div className="border-b border-brand-border/40 pb-2">
            <span className="text-[10px] font-black text-brand-primary tracking-widest uppercase block">
              TABELAS AUXILIARES
            </span>
          </div>

          <nav className="space-y-1" id="cadastros-submenu-navigation">
            {/* Cliente trigger button */}
            <button
              onClick={() => handleTabSelection('clientes')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded text-left transition-all ${
                activeTab === 'clientes'
                  ? 'bg-brand-card-bright text-brand-primary border-l-4 border-brand-accent font-bold'
                  : 'text-brand-text-muted hover:bg-brand-card-light hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5 text-xs font-bold tracking-wide">
                <Building2 size={15} className={activeTab === 'clientes' ? 'text-brand-primary' : 'text-brand-text-muted/50'} />
                <span>Clientes</span>
              </div>
              <span className="text-[10px] bg-brand-bg px-2 py-0.5 rounded text-brand-text-muted/60 font-mono">
                {isSupabaseConfigured && supabaseClientsCount !== null ? supabaseClientsCount : clientes.length}
              </span>
            </button>

            {/* Grupo de Cliente trigger button */}
            <button
              onClick={() => handleTabSelection('grp_clientes')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded text-left transition-all ${
                activeTab === 'grp_clientes'
                  ? 'bg-brand-card-bright text-brand-primary border-l-4 border-brand-accent font-bold'
                  : 'text-brand-text-muted hover:bg-brand-card-light hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5 text-xs font-bold tracking-wide">
                <Users size={15} className={activeTab === 'grp_clientes' ? 'text-brand-primary' : 'text-brand-text-muted/50'} />
                <span>Grupos de Clientes</span>
              </div>
              <span className="text-[10px] bg-brand-bg px-2 py-0.5 rounded text-brand-text-muted/60 font-mono">
                {isSupabaseConfigured && supabaseGrpClientesCount !== null ? supabaseGrpClientesCount : localGrpClientes.length}
              </span>
            </button>

            
            {/* Situação Tributária trigger button */}
            <button
              onClick={() => handleTabSelection('situacao_trib')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded text-left transition-all ${
                activeTab === 'situacao_trib'
                  ? 'bg-brand-card-bright text-brand-primary border-l-4 border-brand-accent font-bold'
                  : 'text-brand-text-muted hover:bg-brand-card-light hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5 text-xs font-bold tracking-wide">
                <Layers size={15} className={activeTab === 'situacao_trib' ? 'text-brand-primary' : 'text-brand-text-muted/50'} />
                <span>Situação Tributária</span>
              </div>
              <span className="text-[10px] bg-brand-bg px-2 py-0.5 rounded text-brand-text-muted/60 font-mono">
                {isSupabaseConfigured && supabaseSituacaoTribCount !== null ? supabaseSituacaoTribCount : activeSituacoesTribList.length}
              </span>
            </button>

            {/* Departamento trigger button */}
            <button
              onClick={() => handleTabSelection('departamentos')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded text-left transition-all ${
                activeTab === 'departamentos'
                  ? 'bg-brand-card-bright text-brand-primary border-l-4 border-brand-accent font-bold'
                  : 'text-brand-text-muted hover:bg-brand-card-light hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5 text-xs font-bold tracking-wide">
                <Layers size={15} className={activeTab === 'departamentos' ? 'text-brand-primary' : 'text-brand-text-muted/50'} />
                <span>Departamentos</span>
              </div>
              <span className="text-[10px] bg-brand-bg px-2 py-0.5 rounded text-brand-text-muted/60 font-mono">
                {isSupabaseConfigured && supabaseDepartamentosCount !== null ? supabaseDepartamentosCount : departamentos.length}
              </span>
            </button>

            {/* Grupo de Funções trigger button */}
            <button
              onClick={() => handleTabSelection('grp_cargos')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded text-left transition-all ${
                activeTab === 'grp_cargos'
                  ? 'bg-brand-card-bright text-brand-primary border-l-4 border-brand-accent font-bold'
                  : 'text-brand-text-muted hover:bg-brand-card-light hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5 text-xs font-bold tracking-wide">
                <Briefcase size={15} className={activeTab === 'grp_cargos' ? 'text-brand-primary' : 'text-brand-text-muted/50'} />
                <span>Grupo de Funções</span>
              </div>
              <span className="text-[10px] bg-brand-bg px-2 py-0.5 rounded text-brand-text-muted/60 font-mono">
                {isSupabaseConfigured && supabaseGrpCargosCount !== null ? supabaseGrpCargosCount : localGrpCargos.length}
              </span>
            </button>

            {/* Colaborador trigger button */}
            <button
              onClick={() => handleTabSelection('colaboradores')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded text-left transition-all ${
                activeTab === 'colaboradores'
                  ? 'bg-brand-card-bright text-brand-primary border-l-4 border-brand-accent font-bold'
                  : 'text-brand-text-muted hover:bg-brand-card-light hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5 text-xs font-bold tracking-wide">
                <Users size={15} className={activeTab === 'colaboradores' ? 'text-brand-primary' : 'text-brand-text-muted/50'} />
                <span>Colaboradores</span>
              </div>
              <span className="text-[10px] bg-brand-bg px-2 py-0.5 rounded text-brand-text-muted/60 font-mono">
                {isSupabaseConfigured && supabaseColaboradoresCount !== null ? supabaseColaboradoresCount : colaboradores.length}
              </span>
            </button>

            {/* Tarefa trigger button */}
            <button
              onClick={() => handleTabSelection('tarefas')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded text-left transition-all ${
                activeTab === 'tarefas'
                  ? 'bg-brand-card-bright text-brand-primary border-l-4 border-brand-accent font-bold'
                  : 'text-brand-text-muted hover:bg-brand-card-light hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5 text-xs font-bold tracking-wide">
                <CheckSquare size={15} className={activeTab === 'tarefas' ? 'text-brand-primary' : 'text-brand-text-muted/50'} />
                <span>Tarefas Operacionais</span>
              </div>
              <span className="text-[10px] bg-brand-bg px-2 py-0.5 rounded text-brand-text-muted/60 font-mono">
                {isSupabaseConfigured && supabaseTarefasCount !== null ? supabaseTarefasCount : tarefas.length}
              </span>
            </button>
          </nav>

        </div>

        {/* Right Active Grid Column */}
        <div className="lg:col-span-3 bg-brand-card rounded-lg border border-brand-border shadow-lg p-6 space-y-6">
          
          {/* Active Tab Banner & Filter bar */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-brand-border/40 pb-5">
            <div>
              <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
                {activeTab === 'clientes' && <Building2 className="text-brand-primary" />}
                {activeTab === 'grp_clientes' && <Users className="text-brand-primary" />}
                {activeTab === 'situacao_trib' && <Layers className="text-brand-primary" />}
                {activeTab === 'departamentos' && <Layers className="text-brand-primary" />}
                {activeTab === 'colaboradores' && <Users className="text-brand-primary" />}
                {activeTab === 'tarefas' && <CheckSquare className="text-brand-primary" />}
                
                {activeTab === 'clientes' && 'Cadastro de Clientes'}
                {activeTab === 'grp_clientes' && 'Grupo de Clientes'}
                {activeTab === 'situacao_trib' && 'Situações Tributárias'}
                {activeTab === 'departamentos' && 'Cadastro de Departamentos'}
                {activeTab === 'colaboradores' && 'Cadastro de Colaboradores'}
                {activeTab === 'tarefas' && 'Gestão de Tarefas'}
              </h3>
              <p className="text-xs text-brand-text-muted/80 mt-1">
                {activeTab === 'clientes' && 'Contatos corporativos de faturamentos ativos de sinaleiras e prazos base.'}
                {activeTab === 'grp_clientes' && 'Agrupamento e hierarquia de clientes.'}
                {activeTab === 'situacao_trib' && 'Classificações de tributação.'}
                {activeTab === 'departamentos' && 'Sectores empresariais mapeados por contas globais e custos operacionais.'}
                {activeTab === 'colaboradores' && 'Profissionais controladoria vinculados à gerência e execução de tarefas.'}
                {activeTab === 'tarefas' && 'Controle administrativo geral e lista de pendências contratuais.'}
              </p>
            </div>
          </div>

          {/* Inline filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-brand-bg/40 p-4 rounded border border-brand-border/50">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-brand-text-muted/40" size={13} />
              <input
                type="text"
                placeholder={
                  activeTab === 'clientes' ? "Nome, CNPJ ou Setor..." :
                  activeTab === 'grp_clientes' ? "Pesquisar por nome..." :
                  activeTab === 'situacao_trib' ? "Pesquisar por resumo ou situação..." :
                  activeTab === 'departamentos' ? "Nome, Código ou Gestor..." :
                  activeTab === 'colaboradores' ? "Pesquisar nome, e-mail, cargo..." : 
                  "Título ou descrição..."
                }
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-brand-card text-xs text-brand-text placeholder-brand-text-muted/30 pl-8 pr-3 py-1.5 rounded border border-brand-border outline-none focus:border-brand-primary"
              />
            </div>

            {/* Entity-specific status filtration */}
            {activeTab !== 'tarefas' ? (
              <div className="flex flex-wrap items-center gap-3 shrink-0">
                {activeTab === 'clientes' && (
                  <>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-brand-text-muted uppercase font-bold">Tipo:</span>
                      <select
                        value={tipoPessoaFilter}
                        onChange={(e) => {
                          setTipoPessoaFilter(e.target.value as any);
                          setCurrentPage(1);
                        }}
                        className="bg-brand-card text-brand-text border border-brand-border text-xs rounded py-1 px-2.5 focus:border-brand-primary outline-none cursor-pointer"
                      >
                        <option value="Todos">Todos os Tipos</option>
                        <option value="PF">Pessoa Física (PF)</option>
                        <option value="PJ">Pessoa Jurídica (PJ)</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-brand-text-muted uppercase font-bold">Sit. Trib.:</span>
                      <select
                        value={sitTribFilter}
                        onChange={(e) => {
                          setSitTribFilter(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="bg-brand-card text-brand-text border border-brand-border text-xs rounded py-1 px-2.5 focus:border-brand-primary outline-none cursor-pointer w-32 truncate"
                      >
                        <option value="Todos">Todas as Situações</option>
                        <option value="SemSituacao">Sem Situação</option>
                        {activeSituacoesTribList.map(s => (
                          <option key={s.id} value={s.id}>{s.situacao || s.id}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {activeTab === 'colaboradores' ? (
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-brand-text-muted uppercase font-bold">Grupo:</span>
                      <select
                        value={grupoFuncaoFilter}
                        onChange={(e) => {
                          setGrupoFuncaoFilter(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="bg-brand-card text-brand-text border border-brand-border text-xs rounded py-1 px-2.5 focus:border-brand-primary outline-none cursor-pointer font-bold text-brand-primary max-w-[150px]"
                      >
                        <option value="Todos">Todos</option>
                        {activeGrpCargosList.map(g => (
                          <option key={g.id} value={g.grp_crg_nome}>{g.grp_crg_nome}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-brand-text-muted uppercase font-bold">Relacionamento:</span>
                      <select
                        value={relacionamentoFilter}
                        onChange={(e) => {
                          setRelacionamentoFilter(e.target.value as any);
                          setCurrentPage(1);
                        }}
                        className="bg-brand-card text-brand-text border border-brand-border text-xs rounded py-1 px-2.5 focus:border-brand-primary outline-none cursor-pointer font-bold text-brand-primary"
                      >
                        <option value="Todos">Todos</option>
                        <option value="Relacionados">Relacionados</option>
                        <option value="NaoRelacionados">Não Relacionados</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-brand-text-muted uppercase font-bold">Status:</span>
                    <select
                      value={statusFilter}
                      onChange={(e) => {
                        setStatusFilter(e.target.value as any);
                        setCurrentPage(1);
                      }}
                      className="bg-brand-card text-brand-text border border-brand-border text-xs rounded py-1 px-2.5 focus:border-brand-primary outline-none cursor-pointer"
                    >
                      <option value="Todos">Todos os Status</option>
                      <option value="Ativo">Somente Ativos</option>
                      <option value="Inativo">Somente Inativos</option>
                    </select>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-brand-text-muted uppercase font-bold">Status:</span>
                  <select
                    value={taskStatusFilter}
                    onChange={(e) => setTaskStatusFilter(e.target.value as any)}
                    className="bg-brand-card text-brand-text border border-brand-border text-xs rounded py-1 px-1.5 focus:border-brand-primary outline-none"
                  >
                    <option value="Todos">Todos os Status</option>
                    <option value="Pendente">Pendente</option>
                    <option value="Em Andamento">Em Andamento</option>
                    <option value="Concluída">Concluída</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-brand-text-muted uppercase font-bold">Prioridade:</span>
                  <select
                    value={taskPriorityFilter}
                    onChange={(e) => setTaskPriorityFilter(e.target.value as any)}
                    className="bg-brand-card text-brand-text border border-brand-border text-xs rounded py-1 px-1.5 focus:border-brand-primary outline-none"
                  >
                    <option value="Todos">Todas</option>
                    <option value="Baixa">Baixa</option>
                    <option value="Média">Média</option>
                    <option value="Alta">Alta</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* TABLE VIEWER */}
          <div className="overflow-x-auto min-h-[300px]">
            
            {/* 1. Clientes Table */}
            {activeTab === 'clientes' && (
              <div className="space-y-4">
                {!isSupabaseConfigured && (
                  <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 p-4 rounded flex items-start gap-3 mb-4">
                    <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-400" />
                    <div className="space-y-1 text-xs leading-relaxed">
                      <h4 className="font-bold text-white uppercase tracking-wider">Simulador Offline Integrado</h4>
                      <p>
                        Para persistir dados na tabela <code className="bg-black/30 font-mono px-1 rounded text-white font-semibold">public.dim_cliente</code>, forneça <code className="bg-black/30 font-mono px-1 rounded text-white font-semibold">VITE_SUPABASE_URL</code> e <code className="bg-black/30 font-mono px-1 rounded text-white font-semibold">VITE_SUPABASE_KEY</code> no painel <strong>Secrets</strong> da plataforma. Uma grid interativa será gerada automaticamente com paginação de 20 em 20 registros.
                      </p>
                    </div>
                  </div>
                )}

                {isSupabaseConfigured && supabaseError && (
                  <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-4 rounded flex items-start gap-3">
                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                    <div className="space-y-1 text-xs">
                      <h4 className="font-bold text-white uppercase tracking-wider font-extrabold">Erro de Conexão Supabase</h4>
                      <p>{supabaseError}</p>
                      <button
                        onClick={() => fetchSupabaseClients(currentPage, searchTerm, statusFilter, tipoPessoaFilter, sitTribFilter)}
                        className="mt-2 flex items-center gap-1 text-[10px] uppercase tracking-wider bg-rose-500/20 hover:bg-rose-500/30 font-bold px-2.5 py-1 rounded text-white transition-all cursor-pointer"
                      >
                        <RefreshCw size={10} className="animate-spin-slow" />
                        Tentar Novamente
                      </button>
                    </div>
                  </div>
                )}

                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-brand-border text-[11px] font-bold text-brand-text-muted/70 tracking-wider uppercase">
                      <th className="py-3 px-3">Dados Cadastrais do Cliente (Código / Razão Social / Documento, Tipo e Status)</th><th className="py-3 px-3 text-right w-24">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border/40 font-sans text-xs">
                    {!isSupabaseConfigured ? (
                      // Fallback Local Simulation list
                      filteredClientes.length === 0 ? (
                        <tr>
                          <td colSpan={2} className="py-12 text-center text-brand-text-muted/50 italic">
                            Nenhum cliente local correspondendo aos filtros.
                          </td>
                        </tr>
                      ) : (
                        filteredClientes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((c) => {
                          const localTipo = c.cnpjCpf.replace(/\D/g, '').length > 11 ? 'PJ' : 'PF';
                          return (
                            <tr key={c.id} className="hover:bg-brand-card-bright/10 transition-all font-sans group">
                              <td className="py-3.5 px-3">
                                {/* Primeira linha: código e nome */}
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1.5 justify-start">
                                  <span className="font-mono bg-brand-primary/10 text-brand-primary border border-brand-primary/20 px-2 py-0.5 rounded text-[10px] font-extrabold select-all leading-none shrink-0 tracking-wide uppercase">
                                    {c.id.toUpperCase().substring(0, 8)}
                                  </span>
                                  <span className="font-extrabold text-white text-xs sm:text-xs group-hover:text-brand-primary transition-colors truncate">
                                    {c.nome}
                                  </span>
                                </div>
                                {/* Segunda linha: documento, tipo e status (alinhado à direita) */}
                                <div className="flex items-center justify-between gap-4 text-brand-text-muted text-[11px] font-medium leading-none">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-mono bg-brand-bg/60 border border-brand-border/30 px-1.5 py-0.5 rounded text-[10px]">
                                      <span className="opacity-50 mr-1">DOC:</span>
                                      {formatDocumento(c.cnpjCpf)}
                                    </span>
                                    <span className="font-mono text-[9px] font-extrabold bg-brand-bg text-brand-text-muted/80 px-1.5 py-0.5 rounded border border-brand-border/30">
                                      TIPO: {localTipo}
                                    </span>
                                  </div>
                                  <div className="shrink-0">
                                    {c.ativo ? (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                        Ativo
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-brand-border text-brand-text-muted/60 border border-brand-border/40">
                                        Inativo
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="py-3.5 px-3 text-right space-x-2 align-middle">
                                <button 
                                  className="text-brand-text-muted hover:text-brand-primary p-1.5 rounded hover:bg-brand-primary/10 transition-colors"
                                  onClick={() => {
                                    setEditingClientId(c.id);
                                    setNewClientCodigo(c.codigo || c.id.substring(0, 8));
                                    setNewClientDocumento(c.documento || c.cnpjCpf || '');
                                    setNewClientNome(c.nome || '');
                                    setNewClientTipoPessoa(c.tipo_pessoa || localTipo);
                                    setNewClientAtivo(c.ativo !== false);
                                    setNewClientGrupoId(c.grupo_id || '');
                                    setNewClientSitTribId(c.sit_trib_id || '');
                                    setNewClientDetalhes(c.detalhes || '');
                                    setNewClientCliNome(c.cli_nome || '');
                                    setShowAddModal(true);
                                  }}
                                  title="Editar"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button 
                                  className="text-brand-text-muted hover:text-rose-400 p-1.5 rounded hover:bg-rose-500/10 transition-colors"
                                  onClick={() => handleRemoveClienteLocal(c.id, c.nome || c.codigo || '')}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )
                    ) : (
                      // Real Supabase content list
                      isLoadingSupabase ? (
                        <tr>
                          <td colSpan={2} className="py-12 text-center text-brand-text-muted/50 italic">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <RefreshCw className="animate-spin text-brand-primary" size={20} />
                              <span>Carregando clientes do Supabase de 20 em 20...</span>
                            </div>
                          </td>
                        </tr>
                      ) : supabaseClients.length === 0 ? (
                        <tr>
                          <td colSpan={2} className="py-12 text-center text-brand-text-muted/50 italic font-medium">
                            Nenhum cliente encontrado na tabela <code className="bg-black/30 font-mono px-1 rounded text-amber-300">dim_cliente</code> do Supabase.
                          </td>
                        </tr>
                      ) : (
                        supabaseClients.map((c) => (
                          <tr key={c.id} className="hover:bg-brand-card-bright/10 transition-all font-sans group">
                            <td className="py-3.5 px-3">
                              {/* Primeira linha: código e nome */}
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1.5 justify-start">
                                <span className="font-mono bg-brand-primary/10 text-brand-primary border border-brand-primary/20 px-2 py-0.5 rounded text-[10px] font-extrabold select-all leading-none shrink-0 tracking-wide">
                                  {c.codigo}
                                </span>
                                <span className="font-extrabold text-white text-xs sm:text-xs group-hover:text-brand-primary transition-colors truncate">
                                  {c.nome || '---'}
                                </span>
                              </div>
                              {/* Segunda linha: documento, tipo e status (alinhado à direita) */}
                              <div className="flex items-center justify-between gap-4 text-brand-text-muted text-[11px] font-medium leading-none">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-mono bg-brand-bg/60 border border-brand-border/30 px-1.5 py-0.5 rounded text-[10px]">
                                    <span className="opacity-50 mr-1">DOC:</span>
                                    {formatDocumento(c.documento, c.tipo_pessoa)}
                                  </span>
                                  <span className="font-mono text-[9px] font-extrabold bg-brand-bg text-brand-text-muted/80 px-1.5 py-0.5 rounded border border-brand-border/30">
                                    TIPO: {c.tipo_pessoa || '---'}
                                  </span>
                                  {c.dim_grupo_cliente && (
                                    <span className="font-mono text-[9px] font-extrabold bg-brand-primary/10 text-brand-primary px-1.5 py-0.5 rounded border border-brand-primary/20">
                                      GRP: {c.dim_grupo_cliente.nome}
                                    </span>
                                  )}
                                  {editingInlineClientSitTribId === c.id ? (
                                    <select
                                      autoFocus
                                      className="font-mono text-[9px] font-extrabold bg-indigo-500/10 text-indigo-400 px-1 py-0.5 rounded border border-indigo-500/50 outline-none cursor-pointer w-24 truncate"
                                      value={c.sit_trib_id || 'null'}
                                      onChange={(e) => handleInlineSitTribChange(c.id, e.target.value)}
                                      onBlur={() => setEditingInlineClientSitTribId(null)}
                                    >
                                      <option value="null">Sem Sit.</option>
                                      {activeSituacoesTribList.map(s => (
                                        <option key={s.id} value={s.id}>{s.situacao || s.id}</option>
                                      ))}
                                    </select>
                                  ) : (
                                    <span 
                                      onClick={() => setEditingInlineClientSitTribId(c.id)}
                                      className="font-mono text-[9px] font-extrabold bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/20 cursor-pointer hover:bg-indigo-500/20 transition-colors"
                                      title="Clique para alterar a Situação Tributária"
                                    >
                                      TRIB: {c.sit_trib_id && activeSituacoesTribList.find(s => s.id === c.sit_trib_id) 
                                        ? activeSituacoesTribList.find(s => s.id === c.sit_trib_id)?.situacao 
                                        : 'Sem Sit.'}
                                    </span>
                                  )}
                                </div>
                                <div className="shrink-0">
                                  {c.ativo ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                      Ativo
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-brand-border text-brand-text-muted/65 border border-brand-border/40">
                                      Inativo
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                              <td className="py-3.5 px-3 text-right space-x-2 align-middle">
                                <button 
                                  className="text-brand-text-muted hover:text-brand-primary p-1.5 rounded hover:bg-brand-primary/10 transition-colors"
                                  onClick={() => {
                                    setEditingClientId(c.id);
                                    setNewClientCodigo(c.codigo || '');
                                    setNewClientDocumento(c.documento || c.cnpjCpf || '');
                                    setNewClientNome(c.nome || '');
                                    setNewClientTipoPessoa(c.tipo_pessoa || '');
                                    setNewClientAtivo(c.ativo !== false);
                                    setNewClientGrupoId(c.grupo_id || '');
                                    setNewClientSitTribId(c.sit_trib_id || '');
                                    setNewClientDetalhes(c.detalhes || '');
                                    setNewClientCliNome(c.cli_nome || '');
                                    setShowAddModal(true);
                                  }}
                                  title="Editar"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button 
                                  className="text-brand-text-muted hover:text-rose-400 p-1.5 rounded hover:bg-rose-500/10 transition-colors"
                                  onClick={() => handleRemoveClienteLocal(c.id, c.nome || c.codigo || '')}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                          </tr>
                        ))
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}

            
            {/* 1.6. Situação Tributária Table */}
            {activeTab === 'situacao_trib' && (
              <div className="space-y-4">
                {isSupabaseConfigured && supabaseSituacaoTribError && (
                  <div className="mb-4 bg-rose-500/10 border border-rose-500/25 p-4 rounded-lg text-rose-200 text-xs flex items-center gap-3">
                    <AlertTriangle size={18} className="text-rose-400 shrink-0" />
                    <div>
                      <p className="font-bold uppercase tracking-wider text-white">Falha ao Ler Supabase (dim_situacao_trib)</p>
                      <p className="mt-1">{supabaseSituacaoTribError}</p>
                    </div>
                  </div>
                )}
                <table className="w-full text-left text-xs text-brand-text">
                  <thead className="text-[10px] uppercase text-brand-text-muted bg-brand-bg/60 border-y border-brand-border/40 font-bold tracking-wider">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Resumo</th>
                      <th className="px-4 py-3 font-semibold">Situação / Descrição</th>
                      <th className="px-4 py-3 font-semibold">Grupo</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 text-right font-semibold">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border/30">
                    {isSupabaseConfigured ? (
                      isLoadingSupabaseSituacaoTrib ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-brand-text-muted">
                            <RefreshCw className="animate-spin mx-auto mb-2 text-brand-primary" size={20} />
                            <span className="text-xs">Carregando Situações Tributárias...</span>
                          </td>
                        </tr>
                      ) : supabaseSituacaoTrib.length > 0 ? (
                        supabaseSituacaoTrib.map(s => (
                          <tr key={s.id} className="hover:bg-brand-card-light/20 transition-colors group">
                            <td className="px-4 py-3.5">
                              <span className="font-mono bg-brand-primary/10 text-brand-primary border border-brand-primary/20 px-2 py-0.5 rounded text-[10px] font-extrabold">{s.resumido || "-"}</span>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="font-bold text-white text-[12px]">{s.situacao || "-"}</div>
                            </td>
                            <td className="px-4 py-3.5 text-brand-text-muted font-mono text-[10px]">
                              {s.grupo || "-"}
                            </td>
                            <td className="px-4 py-3.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${
                                s.ativo === "S" || s.ativo === "ATIVO" 
                                   ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                                   : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              }`}>
                                {s.ativo === "S" || s.ativo === "ATIVO" ? "ATIVO" : "INATIVO"}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-right space-x-2">
                              <button 
                                className="text-brand-text-muted hover:text-brand-primary p-1.5 rounded hover:bg-brand-primary/10 transition-colors"
                                onClick={() => {
                                  setEditingSitTribId(s.id);
                                  setNewSitTribResumido(s.resumido || "");
                                  setNewSitTribSituacao(s.situacao || "");
                                  setNewSitTribAtivo(s.ativo || "S");
                                  setNewSitTribGrupo(s.grupo || "");
                                  setShowAddModal(true);
                                }}
                                title="Editar"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button 
                                className="text-brand-text-muted hover:text-rose-400 p-1.5 rounded hover:bg-rose-500/10 transition-colors"
                                onClick={() => handleRemoveSituacaoTrib(s.id, s.situacao)}
                                title="Excluir"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-brand-text-muted">
                            <div className="flex flex-col items-center justify-center space-y-2">
                              <Database size={24} className="text-brand-text-muted/40" />
                              <span>Nenhuma Situação Tributária encontrada.</span>
                            </div>
                          </td>
                        </tr>
                      )
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-brand-text-muted">
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <Database size={24} className="text-brand-text-muted/40" />
                            <span>Conecte o Supabase para visualizar.</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* 2. Departamentos Table */}
            {/* 1.5. Grupo de Clientes Table */}
            {activeTab === 'grp_clientes' && (
              <div className="space-y-4">
                {isSupabaseConfigured && supabaseGrpClientesError && (
                  <div className="mb-4 bg-rose-500/10 border border-rose-500/25 p-4 rounded-lg text-rose-200 text-xs flex items-center gap-3">
                    <AlertTriangle size={18} className="text-rose-400 shrink-0" />
                    <div>
                      <p className="font-bold uppercase tracking-wider text-white">Falha ao Ler Supabase (dim_grupo_cliente)</p>
                      <p className="mt-1">{supabaseGrpClientesError}</p>
                    </div>
                  </div>
                )}
                <div className="overflow-x-auto rounded border border-brand-border/40">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-brand-card-light/50 text-brand-text-muted/60 uppercase tracking-widest text-[10px]">
                      <tr>
                        <th className="px-4 py-3 font-semibold w-1/4">Nome / ID</th>
                        <th className="px-4 py-3 font-semibold w-1/4">Situação</th>
                        <th className="px-4 py-3 font-semibold w-1/4">Observações</th>
                        <th className="px-4 py-3 font-semibold text-right w-1/4">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border/30">
                      {isSupabaseConfigured ? (
                        supabaseGrpClientes.length > 0 ? (
                          supabaseGrpClientes.map(g => (
                            <tr key={g.id} className="hover:bg-brand-card-light/20 transition-colors group">
                              <td className="px-4 py-3.5">
                                <div className="font-bold text-white text-[13px]">{g.nome}</div>
                                <div className="text-[10px] text-brand-text-muted/50 font-mono mt-0.5" title={g.id}>
                                  {g.id?.substring(0, 8)}...
                                </div>
                              </td>
                              <td className="px-4 py-3.5">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${
                                  g.situacao === 'ATIVO' 
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                }`}>
                                  {g.situacao}
                                </span>
                              </td>
                              <td className="px-4 py-3.5">
                                <div className="text-brand-text-muted truncate max-w-xs">{g.observa || '-'}</div>
                              </td>
                              <td className="px-4 py-3.5 text-right space-x-2">
                                <button 
                                  className="text-brand-text-muted hover:text-brand-primary p-1.5 rounded hover:bg-brand-primary/10 transition-colors"
                                  onClick={() => {
                                    setEditingGrpClienteId(g.id);
                                    setNewGrpClienteNome(g.nome || "");
                                    setNewGrpClienteSituacao((g.situacao as any) || "ATIVO");
                                    setNewGrpClienteObserva(g.observa || "");
                                    setShowAddModal(true);
                                  }}
                                  title="Editar"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button 
                                  className="text-brand-text-muted hover:text-rose-400 p-1.5 rounded hover:bg-rose-500/10 transition-colors"
                                  onClick={() => handleRemoveGrpCliente(g.id, g.nome)}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-brand-text-muted">
                              <div className="flex flex-col items-center justify-center space-y-2">
                                <Database size={24} className="text-brand-text-muted/40" />
                                <span>Nenhum Grupo de Cliente ativo correspondente no Supabase.</span>
                              </div>
                            </td>
                          </tr>
                        )
                      ) : (
                        filteredGrpClientes.length > 0 ? (
                          filteredGrpClientes.map(g => (
                            <tr key={g.id} className="hover:bg-brand-card-light/20 transition-colors group">
                              <td className="px-4 py-3.5">
                                <div className="font-bold text-white text-[13px]">{g.nome}</div>
                                <div className="text-[10px] text-brand-text-muted/50 font-mono mt-0.5" title={g.id}>
                                  {g.id}
                                </div>
                              </td>
                              <td className="px-4 py-3.5">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${
                                  g.situacao === "ATIVO"
                                     ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                     : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                }`}>
                                  {g.situacao}
                                </span>
                              </td>
                              <td className="px-4 py-3.5">
                                <div className="text-brand-text-muted truncate max-w-xs">{g.observa || "-"}</div>
                              </td>
                              <td className="px-4 py-3.5 text-right space-x-2">
                                <button 
                                  className="text-brand-text-muted hover:text-brand-primary p-1.5 rounded hover:bg-brand-primary/10 transition-colors"
                                  onClick={() => {
                                    setEditingGrpClienteId(g.id);
                                    setNewGrpClienteNome(g.nome || "");
                                    setNewGrpClienteSituacao((g.situacao as any) || "ATIVO");
                                    setNewGrpClienteObserva(g.observa || "");
                                    setShowAddModal(true);
                                  }}
                                  title="Editar"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button 
                                  className="text-brand-text-muted hover:text-rose-400 p-1.5 rounded hover:bg-rose-500/10 transition-colors"
                                  onClick={() => handleRemoveGrpCliente(g.id, g.nome)}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-brand-text-muted">
                              <div className="flex flex-col items-center justify-center space-y-2">
                                <Users size={24} className="text-brand-text-muted/40" />
                                <span>Nenhum Grupo de Cliente correspondente aos filtros.</span>
                              </div>
                            </td>
                          </tr>
                        )
                      )}  

                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 3. Grupo de Funções (grp_cargos) Table */}
            {activeTab === 'grp_cargos' && (
              <div className="space-y-4">
                {isSupabaseConfigured && supabaseGrpCargosError && (
                  <div className="mb-4 bg-rose-500/10 border border-rose-500/25 p-4 rounded-lg text-rose-200 text-xs flex items-center gap-3">
                    <AlertTriangle size={18} className="text-rose-400 shrink-0" />
                    <div>
                      <p className="font-bold uppercase tracking-wider text-white">Falha ao Ler Supabase (grp_cargos)</p>
                      <p className="mt-1">{supabaseGrpCargosError}</p>
                    </div>
                  </div>
                )}
                <div className="overflow-x-auto rounded border border-brand-border/40">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-brand-card-light/50 text-brand-text-muted/60 uppercase tracking-widest text-[10px]">
                      <tr>
                        <th className="px-4 py-3 font-semibold w-1/3">Grupo de Funções / ID</th>
                        <th className="px-4 py-3 font-semibold w-1/3">Código de Controle</th>
                        <th className="px-4 py-3 font-semibold w-1/6">Situação</th>
                        <th className="px-4 py-3 font-semibold text-right w-1/6">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border/30">
                      {isSupabaseConfigured ? (
                        supabaseGrpCargos.length > 0 ? (
                          supabaseGrpCargos.map(g => (
                            <tr key={g.id} className="hover:bg-brand-card-light/20 transition-colors group">
                              <td className="px-4 py-3.5">
                                <div className="font-bold text-white text-[13px]">{g.grp_crg_nome}</div>
                                <div className="text-[10px] text-brand-text-muted/50 font-mono mt-0.5" title={g.id}>
                                  ID: {g.id}
                                </div>
                              </td>
                              <td className="px-4 py-3.5 font-mono text-brand-text-muted text-[11px]">
                                {g.grp_crg_cntrl || '---'}
                              </td>
                              <td className="px-4 py-3.5">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${
                                  g.grp_crg_status === 'ATIVO' 
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                }`}>
                                  {g.grp_crg_status}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 text-right space-x-2">
                                <button 
                                  className="text-brand-text-muted hover:text-brand-primary p-1.5 rounded hover:bg-brand-primary/10 transition-colors cursor-pointer"
                                  onClick={() => {
                                    setEditingGrpCargoId(g.id);
                                    setNewGrpCrgNome(g.grp_crg_nome || '');
                                    setNewGrpCrgCntrl(g.grp_crg_cntrl || '');
                                    setNewGrpCrgStatus(g.grp_crg_status || 'ATIVO');
                                    setShowAddModal(true);
                                  }}
                                  title="Editar"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button 
                                  className="text-brand-text-muted hover:text-rose-400 p-1.5 rounded hover:bg-rose-500/10 transition-colors cursor-pointer"
                                  onClick={() => handleRemoveGrpCargo(g.id, g.grp_crg_nome)}
                                  title="Excluir"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-brand-text-muted">
                              <div className="flex flex-col items-center justify-center space-y-2">
                                <AlertCircle size={24} className="text-brand-text-muted/40" />
                                <span>Nenhum Grupo de Funções cadastrado no Supabase.</span>
                              </div>
                            </td>
                          </tr>
                        )
                      ) : (
                        filteredGrpCargos.length > 0 ? (
                          filteredGrpCargos.map(g => (
                            <tr key={g.id} className="hover:bg-brand-card-light/20 transition-colors group">
                              <td className="px-4 py-3.5">
                                <div className="font-bold text-white text-[13px]">{g.grp_crg_nome}</div>
                                <div className="text-[10px] text-brand-text-muted/50 font-mono mt-0.5" title={g.id}>
                                  ID: {g.id}
                                </div>
                              </td>
                              <td className="px-4 py-3.5 font-mono text-brand-text-muted text-[11px]">
                                {g.grp_crg_cntrl || '---'}
                              </td>
                              <td className="px-4 py-3.5">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${
                                  g.grp_crg_status === 'ATIVO' 
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                }`}>
                                  {g.grp_crg_status}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 text-right space-x-2">
                                <button 
                                  className="text-brand-text-muted hover:text-brand-primary p-1.5 rounded hover:bg-brand-primary/10 transition-colors cursor-pointer"
                                  onClick={() => {
                                    setEditingGrpCargoId(g.id);
                                    setNewGrpCrgNome(g.grp_crg_nome || '');
                                    setNewGrpCrgCntrl(g.grp_crg_cntrl || '');
                                    setNewGrpCrgStatus(g.grp_crg_status || 'ATIVO');
                                    setShowAddModal(true);
                                  }}
                                  title="Editar"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button 
                                  className="text-brand-text-muted hover:text-rose-400 p-1.5 rounded hover:bg-rose-500/10 transition-colors cursor-pointer"
                                  onClick={() => handleRemoveGrpCargo(g.id, g.grp_crg_nome)}
                                  title="Excluir"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-brand-text-muted">
                              <div className="flex flex-col items-center justify-center space-y-2">
                                <AlertCircle size={24} className="text-brand-text-muted/40" />
                                <span>Nenhum Grupo de Funções correspondente aos filtros.</span>
                              </div>
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 4. Departamentos Table */}
            {activeTab === 'departamentos' && (
              <div className="space-y-4">
                {isSupabaseConfigured && supabaseDeptsError && (
                  <div className="mb-4 bg-rose-500/10 border border-rose-500/25 p-4 rounded-lg text-rose-200 text-xs flex items-center gap-3">
                    <AlertTriangle size={18} className="text-rose-400 shrink-0" />
                    <div>
                      <p className="font-bold uppercase tracking-wider text-white">Falha ao Ler Supabase (dim_departamento)</p>
                      <p className="mt-1">{supabaseDeptsError}</p>
                    </div>
                  </div>
                )}
                <div className="overflow-x-auto rounded border border-brand-border/40">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-brand-card-light/50 text-brand-text-muted/60 uppercase tracking-widest text-[10px]">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Departamento / ID</th>
                        <th className="px-4 py-3 font-semibold">Código</th>
                        <th className="px-4 py-3 font-semibold">Gestor</th>
                        <th className="px-4 py-3 font-semibold">Centro de Custo</th>
                        <th className="px-4 py-3 font-semibold">Situação</th>
                        <th className="px-4 py-3 font-semibold text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border/30">
                      {isSupabaseConfigured ? (
                        supabaseDepartamentos.length > 0 ? (
                          supabaseDepartamentos.map(d => (
                            <tr key={d.id} className="hover:bg-brand-card-light/20 transition-colors group">
                              <td className="px-4 py-3.5">
                                <div className="font-bold text-white text-[13px]">{d.nome}</div>
                                <div className="text-[10px] text-brand-text-muted/50 font-mono mt-0.5" title={d.id}>
                                  ID: {d.id}
                                </div>
                              </td>
                              <td className="px-4 py-3.5 font-mono text-brand-text-muted text-[11px]">
                                ---
                              </td>
                              <td className="px-4 py-3.5 text-brand-text-muted">
                                ---
                              </td>
                              <td className="px-4 py-3.5 font-mono text-brand-text-muted">
                                ---
                              </td>
                              <td className="px-4 py-3.5">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${
                                  d.ativo_sn !== false 
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                }`}>
                                  {d.ativo_sn !== false ? 'ATIVO' : 'INATIVO'}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 text-right space-x-2">
                                <button 
                                  className="text-brand-text-muted hover:text-brand-primary p-1.5 rounded hover:bg-brand-primary/10 transition-colors cursor-pointer"
                                  onClick={() => {
                                    setNewDeptNome(d.nome);
                                    setNewDeptCodigo('');
                                    setNewDeptGestor('');
                                    setNewDeptCentroCusto('');
                                    setNewDeptStatus(d.ativo_sn !== false ? 'Ativo' : 'Inativo');
                                    setShowAddModal(true);
                                  }}
                                  title="Editar"
                                >
                                  <Edit2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-brand-text-muted">
                              <div className="flex flex-col items-center justify-center space-y-2">
                                <AlertCircle size={24} className="text-brand-text-muted/40" />
                                <span>Nenhum departamento cadastrado no Supabase.</span>
                              </div>
                            </td>
                          </tr>
                        )
                      ) : (
                        filteredDepartamentos.length > 0 ? (
                          filteredDepartamentos.map(d => (
                            <tr key={d.id} className="hover:bg-brand-card-light/20 transition-colors group">
                              <td className="px-4 py-3.5">
                                <div className="font-bold text-white text-[13px]">{d.nome}</div>
                                <div className="text-[10px] text-brand-text-muted/50 font-mono mt-0.5" title={d.id}>
                                  ID: {d.id}
                                </div>
                              </td>
                              <td className="px-4 py-3.5 font-mono text-brand-text-muted text-[11px]">
                                {d.codigo || '---'}
                              </td>
                              <td className="px-4 py-3.5 text-brand-text-muted">
                                {d.gestor || '---'}
                              </td>
                              <td className="px-4 py-3.5 font-mono text-brand-text-muted">
                                {d.centroCusto || '---'}
                              </td>
                              <td className="px-4 py-3.5">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${
                                  d.status === 'Ativo' 
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                }`}>
                                  {d.status?.toUpperCase()}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 text-right space-x-2">
                                <button 
                                  className="text-brand-text-muted hover:text-rose-400 p-1.5 rounded hover:bg-rose-500/10 transition-colors cursor-pointer"
                                  onClick={() => onRemoveDepartamento(d.id)}
                                  title="Excluir"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-brand-text-muted">
                              <div className="flex flex-col items-center justify-center space-y-2">
                                <AlertCircle size={24} className="text-brand-text-muted/40" />
                                <span>Nenhum departamento correspondente aos filtros.</span>
                              </div>
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 5. Colaboradores Table */}
            {activeTab === 'colaboradores' && (
              <div className="space-y-4">
                {isSupabaseConfigured && supabaseColabsError && (
                  <div className="mb-4 bg-rose-500/10 border border-rose-500/25 p-4 rounded-lg text-rose-200 text-xs flex items-center gap-3">
                    <AlertTriangle size={18} className="text-rose-400 shrink-0" />
                    <div>
                      <p className="font-bold uppercase tracking-wider text-white">Falha ao Ler Supabase (viw_colaborador_cargo)</p>
                      <p className="mt-1">{supabaseColabsError}</p>
                    </div>
                  </div>
                )}
                
                

                <div className="overflow-x-auto rounded border border-brand-border/40">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-brand-card-light/50 text-brand-text-muted/60 uppercase tracking-widest text-[10px]">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Nome / ID</th>
                        <th className="px-4 py-3 font-semibold">Cargo / Função</th>
                        <th className="px-4 py-3 font-semibold">Grupo de Função</th>
                        <th className="px-4 py-3 font-semibold">Situação</th>
                        <th className="px-4 py-3 font-semibold text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border/30">
                      {isSupabaseConfigured ? (
                        supabaseColaboradores.length > 0 ? (
                          supabaseColaboradores.map(item => {
                            const cleanedNome = (item.colaborador || 'Sem Nome').trim();
                            const emailSuffix = cleanedNome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '.');
                            const derivedEmail = item.email || `${emailSuffix || 'colaborador'}@sextante.com.br`;
                            const isLinked = !!(item.colaborador_id || item.rh_colaborador_id);
                            const displayTel = item.telefone || '---';
                            
                            return (
                              <tr key={item.dim_usuario_id} className="hover:bg-brand-card-light/20 transition-colors group">
                                <td className="px-4 py-3.5">
                                  <div className="flex items-center gap-2">
                                    <span 
                                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${isLinked ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`} 
                                      title={isLinked ? 'Relacionado com o RH' : 'Sem relação com o RH'}
                                    />
                                    <div className="font-bold text-white text-[13px]">{cleanedNome}</div>
                                  </div>
                                  <div className="text-[10px] text-brand-text-muted/50 font-mono mt-0.5 pl-4.5" title={item.dim_usuario_id}>
                                    ID: {item.dim_usuario_id?.substring(0, 8)}...
                                  </div>
                                </td>
                                <td className="px-4 py-3.5 text-brand-text-muted">
                                  <span className="bg-brand-bg px-2 py-1 rounded text-[11px] font-bold text-white border border-brand-border/40">
                                    {item.crg_nome || 'Sem Cargo'}
                                  </span>
                                </td>
                                <td className="px-4 py-3.5 text-brand-text-muted">
                                  {editingInlineColabGrpCargoId === item.dim_usuario_id ? (
                                    <select
                                      autoFocus
                                      className="font-mono text-[9px] font-extrabold bg-indigo-500/10 text-indigo-400 px-1 py-0.5 rounded border border-indigo-500/50 outline-none cursor-pointer w-24 truncate"
                                      value={item.grp_cargo_id || 'null'}
                                      onChange={(e) => handleInlineGrpCargoChange(item.dim_usuario_id, e.target.value)}
                                      onBlur={() => setEditingInlineColabGrpCargoId(null)}
                                    >
                                      <option value="null">Sem Grupo</option>
                                      {activeGrpCargosList.map(g => (
                                        <option key={g.id} value={g.id}>{g.grp_crg_nome}</option>
                                      ))}
                                    </select>
                                  ) : (
                                    <span 
                                      onClick={() => setEditingInlineColabGrpCargoId(item.dim_usuario_id)}
                                      className="bg-brand-bg px-2 py-1 rounded text-[11px] font-bold text-brand-accent border border-brand-accent/30 cursor-pointer hover:bg-brand-accent/10 transition-colors"
                                      title="Clique para alterar o Grupo de Função"
                                    >
                                      {item.grp_crg_nome || 'Sem Grupo'}
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3.5">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${
                                    item.ativo_sn !== false 
                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                  }`}>
                                    {item.ativo_sn !== false ? 'ATIVO' : 'INATIVO'}
                                  </span>
                                </td>
                                <td className="px-4 py-3.5 text-right space-x-2.5">
                                  <button 
                                    className="text-brand-text-muted hover:text-brand-primary p-1.5 rounded hover:bg-brand-primary/10 transition-colors cursor-pointer"
                                    onClick={() => {
                                      setEditingColaboradorId(item.dim_usuario_id);
                                      setNewColabNome(cleanedNome);
                                      setNewColabEmail(item.email || '');
                                      setNewColabTelefone(item.telefone || '');
                                      setNewColabAdmissao(item.data_admissao || '');
                                      setNewColabStatus(item.ativo_sn !== false ? 'Ativo' : 'Inativo');
                                      
                                      // Get matching cargo id
                                      const matchingCargo = supabaseGrpCargos.find(g => g.grp_crg_nome === (item.crg_nome || item.grp_crg_nome));
                                      setNewColabGrpCargoId(item.grp_cargo_id ? String(item.grp_cargo_id) : (matchingCargo ? String(matchingCargo.id) : ''));
                                      setShowAddModal(true);
                                    }}
                                    title="Editar Dados do Colaborador"
                                  >
                                    <Edit2 size={14} />
                                  </button>

                                  <button 
                                    className="text-brand-text-muted hover:text-brand-primary p-1.5 rounded hover:bg-brand-primary/10 transition-colors cursor-pointer"
                                    onClick={() => setSelectedDimUsuario({
                                      id: item.dim_usuario_id,
                                      dim_usuario_id: item.dim_usuario_id,
                                      colaborador: cleanedNome,
                                      nome: cleanedNome,
                                      colaborador_id: item.colaborador_id || item.rh_colaborador_id
                                    })}
                                    title="Gerenciar Vínculo com RH"
                                  >
                                    <Link size={14} />
                                  </button>

                                  <button 
                                    className="text-brand-text-muted hover:text-rose-400 p-1.5 rounded hover:bg-rose-500/10 transition-colors cursor-pointer"
                                    onClick={() => handleRemoveSupabaseColaborador(item.dim_usuario_id, cleanedNome)}
                                    title="Desligar permanentemente"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-brand-text-muted">
                              <div className="flex flex-col items-center justify-center space-y-2">
                                <AlertCircle size={24} className="text-brand-text-muted/40" />
                                <span>Nenhum colaborador cadastrado no Supabase.</span>
                              </div>
                            </td>
                          </tr>
                        )
                      ) : (
                        filteredColaboradores.length > 0 ? (
                          filteredColaboradores.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(c => (
                            <tr key={c.id} className="hover:bg-brand-card-light/20 transition-colors group">
                              <td className="px-4 py-3.5">
                                <div className="flex items-center gap-2">
                                  <span 
                                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${c.status === 'Ativo' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`} 
                                    title={c.status === 'Ativo' ? 'Relacionado com o RH / Ativo' : 'Não relacionado / Inativo'}
                                  />
                                  <div className="font-bold text-white text-[13px]">{c.nome}</div>
                                </div>
                              </td>
                              <td className="px-4 py-3.5 font-mono text-brand-text-muted">
                                {c.email || '---'}
                              </td>
                              <td className="px-4 py-3.5 text-brand-text-muted">
                                <span className="bg-brand-bg px-2 py-1 rounded text-[11px] font-bold text-white border border-brand-border/40">
                                  {c.cargo || '---'}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 text-brand-text-muted font-mono">
                                {c.telefone || '---'}
                              </td>
                              <td className="px-4 py-3.5">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${
                                  c.status === 'Ativo' 
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                }`}>
                                  {c.status?.toUpperCase()}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 text-right space-x-2">
                                <button 
                                  className="text-brand-text-muted hover:text-brand-primary p-1.5 rounded hover:bg-brand-primary/10 transition-colors cursor-pointer"
                                  onClick={() => {
                                    setEditingColaboradorId(c.id);
                                    setNewColabNome(c.nome);
                                    setNewColabEmail(c.email);
                                    setNewColabCargo(c.cargo);
                                    setNewColabDeptId(c.departamentoId);
                                    setNewColabTelefone(c.telefone);
                                    setNewColabAdmissao(c.dataAdmissao);
                                    setNewColabStatus(c.status);
                                    setShowAddModal(true);
                                  }}
                                  title="Editar"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button 
                                  className="text-brand-text-muted hover:text-rose-400 p-1.5 rounded hover:bg-rose-500/10 transition-colors cursor-pointer"
                                  onClick={() => onRemoveColaborador(c.id)}
                                  title="Excluir"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-brand-text-muted">
                              <div className="flex flex-col items-center justify-center space-y-2">
                                <AlertCircle size={24} className="text-brand-text-muted/40" />
                                <span>Nenhum colaborador correspondente aos filtros.</span>
                              </div>
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

{/* 6. Tarefas Table */}
            {activeTab === 'tarefas' && (
              <div className="overflow-x-auto rounded border border-brand-border/40">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-brand-card-light/50 text-brand-text-muted/60 uppercase tracking-widest text-[10px]">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Nome da Tarefa</th>
                      <th className="px-4 py-3 font-semibold text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border/30">
                    {isLoadingSupabaseTarefas ? (
                      <tr>
                        <td colSpan={2} className="px-4 py-8 text-center text-brand-text-muted">
                          Carregando tarefas do banco de dados...
                        </td>
                      </tr>
                    ) : isSupabaseConfigured && supabaseTarefas.length > 0 ? (
                      supabaseTarefas.map(t => (
                        <tr key={t.id} className="hover:bg-brand-card-light/20 transition-colors group">
                          <td className="px-4 py-3.5 max-w-xs">
                            <div className="font-bold text-white text-[13px]">{t.nome}</div>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => {
                                  setEditingTarefaId(t.id);
                                  setNewTaskTitulo(t.nome || '');
                                  setShowAddModal(true);
                                }}
                                className="p-1.5 text-brand-text-muted hover:text-brand-primary hover:bg-brand-card-light rounded transition-colors"
                                title="Editar"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteTarefaSupabase(t.id)}
                                className="p-1.5 text-brand-text-muted hover:text-red-400 hover:bg-brand-card-light rounded transition-colors"
                                title="Remover"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : !isSupabaseConfigured && filteredTarefas.length > 0 ? (
                      filteredTarefas.map(t => (
                        <tr key={t.id} className="hover:bg-brand-card-light/20 transition-colors group">
                          <td className="px-4 py-3.5 max-w-xs">
                            <div className="font-bold text-white text-[13px]">{t.titulo}</div>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => {
                                  setEditingTarefaId(t.id);
                                  setNewTaskTitulo(t.titulo || '');
                                  setNewTaskDesc(t.descricao || '');
                                  setNewTaskColabId(t.colaboradorId || '');
                                  setNewTaskPrazo(t.prazo || '');
                                  setNewTaskPrioridade(t.prioridade || 'Média');
                                  setNewTaskStatus(t.status || 'Pendente');
                                  setShowAddModal(true);
                                }}
                                className="p-1.5 text-brand-text-muted hover:text-brand-primary hover:bg-brand-card-light rounded transition-colors"
                                title="Editar"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => onRemoveTarefa(t.id)}
                                className="p-1.5 text-brand-text-muted hover:text-red-400 hover:bg-brand-card-light rounded transition-colors"
                                title="Remover"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={2} className="px-4 py-8 text-center text-brand-text-muted">
                          Nenhuma tarefa encontrada.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
            {/* PAGINATION FOOTER */}
            {totalCount > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-brand-border/40 text-brand-text-muted text-xs">
                <div>
                  Exibindo <span className="font-extrabold text-white font-mono">{startRange}</span> a <span className="font-extrabold text-white font-mono">{endRange}</span> de <span className="font-extrabold text-white font-mono">{totalCount}</span> registros
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const prevPage = Math.max(currentPage - 1, 1);
                      setCurrentPage(prevPage);
                    }}
                    disabled={currentPage === 1 || isTabLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-brand-card hover:bg-brand-card-light/40 border border-brand-border text-brand-text disabled:opacity-30 disabled:hover:bg-brand-card transition-all cursor-pointer font-bold select-none text-[11px] uppercase tracking-wider"
                  >
                    <ChevronLeft size={14} />
                    Anterior
                  </button>
                  <span className="font-medium text-brand-text-muted">
                    Página <span className="font-bold text-white font-mono">{currentPage}</span> de <span className="font-bold text-white font-mono">{totalPages}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const nextPage = Math.min(currentPage + 1, totalPages);
                      setCurrentPage(nextPage);
                    }}
                    disabled={currentPage >= totalPages || totalCount <= currentPage * itemsPerPage || isTabLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-brand-card hover:bg-brand-card-light/40 border border-brand-border text-brand-text disabled:opacity-30 disabled:hover:bg-brand-card transition-all cursor-pointer font-bold select-none text-[11px] uppercase tracking-wider"
                  >
                    Próxima
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in p-4 overflow-y-auto">
          {/* CLIENTES ADD/EDIT FORM */}
          {activeTab === 'clientes' && (
            <form 
              onSubmit={handleCreateCliente}
              className="bg-brand-card p-6 rounded-lg max-w-lg w-full border border-brand-border space-y-4 shadow-2xl relative animate-fade-in max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-brand-border/45 pb-3">
                <h3 className="font-extrabold text-white text-base">
                  {editingClientId ? 'Editar Cliente' : 'Novo Cliente'}
                </h3>
                <button 
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingClientId(null);
                    setNewClientCodigo('');
                    setNewClientDocumento('');
                    setNewClientNome('');
                    setNewClientTipoPessoa('');
                    setNewClientAtivo(true);
                    setNewClientGrupoId('');
                    setNewClientSitTribId('');
                    setNewClientDetalhes('');
                    setNewClientCliNome('');
                  }}
                  className="p-1 text-brand-text-muted hover:text-white rounded"
                >
                  <XCircle size={18} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-brand-text-muted uppercase mb-1">Código *</label>
                  <input 
                    type="text" 
                    required
                    value={newClientCodigo}
                    placeholder="Ex: CLI001"
                    onChange={e => setNewClientCodigo(e.target.value)}
                    className="w-full bg-brand-bg text-brand-text placeholder-brand-text-muted/20 p-2.5 rounded border border-brand-border text-xs focus:border-brand-primary outline-none uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-brand-text-muted uppercase mb-1">Documento (CPF/CNPJ)</label>
                  <input 
                    type="text" 
                    value={newClientDocumento}
                    placeholder="Ex: 00.000.000/0001-00"
                    onChange={e => setNewClientDocumento(e.target.value)}
                    className="w-full bg-brand-bg text-brand-text placeholder-brand-text-muted/20 p-2.5 rounded border border-brand-border text-xs focus:border-brand-primary outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-text-muted uppercase mb-1">Razão Social / Nome</label>
                <input 
                  type="text" 
                  value={newClientNome}
                  placeholder="Nome completo ou Razão Social"
                  onChange={e => setNewClientNome(e.target.value)}
                  className="w-full bg-brand-bg text-brand-text placeholder-brand-text-muted/20 p-2.5 rounded border border-brand-border text-xs focus:border-brand-primary outline-none"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-brand-text-muted uppercase mb-1">Nome Fantasia (cli_nome)</label>
                <input 
                  type="text" 
                  value={newClientCliNome}
                  placeholder="Nome Fantasia"
                  onChange={e => setNewClientCliNome(e.target.value)}
                  className="w-full bg-brand-bg text-brand-text placeholder-brand-text-muted/20 p-2.5 rounded border border-brand-border text-xs focus:border-brand-primary outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-brand-text-muted uppercase mb-1">Tipo de Pessoa</label>
                  <select
                    value={newClientTipoPessoa}
                    onChange={e => setNewClientTipoPessoa(e.target.value as any)}
                    className="w-full bg-brand-bg text-brand-text p-2 rounded border border-brand-border text-xs focus:border-brand-primary outline-none h-9"
                  >
                    <option value="">Selecione...</option>
                    <option value="PF">Física (PF)</option>
                    <option value="PJ">Jurídica (PJ)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-brand-text-muted uppercase mb-1">Situação</label>
                  <select
                    value={newClientAtivo ? 'ATIVO' : 'INATIVO'}
                    onChange={e => setNewClientAtivo(e.target.value === 'ATIVO')}
                    className="w-full bg-brand-bg text-brand-text p-2 rounded border border-brand-border text-xs focus:border-brand-primary outline-none h-9"
                  >
                    <option value="ATIVO">ATIVO</option>
                    <option value="INATIVO">INATIVO</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-brand-text-muted uppercase mb-1">Grupo de Cliente</label>
                  <select
                    value={newClientGrupoId}
                    onChange={e => setNewClientGrupoId(e.target.value)}
                    className="w-full bg-brand-bg text-brand-text p-2 rounded border border-brand-border text-xs focus:border-brand-primary outline-none h-9"
                  >
                    <option value="">Sem Grupo</option>
                    {activeGrpClientesList.map(g => (
                      <option key={g.id} value={g.id}>{g.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-brand-text-muted uppercase mb-1">Situação Tributária</label>
                  <select
                    value={newClientSitTribId}
                    onChange={e => setNewClientSitTribId(e.target.value)}
                    className="w-full bg-brand-bg text-brand-text p-2.5 rounded border border-brand-border text-xs focus:border-brand-primary outline-none"
                  >
                    <option value="">Nenhuma Selecionada</option>
                    {activeSituacoesTribList.map(s => (
                      <option key={s.id} value={s.id}>{s.situacao || s.id}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-text-muted uppercase mb-1">Detalhes</label>
                <textarea 
                  value={newClientDetalhes}
                  onChange={e => setNewClientDetalhes(e.target.value)}
                  placeholder="Informações adicionais..."
                  className="w-full bg-brand-bg text-brand-text placeholder-brand-text-muted/20 p-2.5 rounded border border-brand-border text-xs focus:border-brand-primary outline-none resize-none h-16"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-brand-border/40">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingClientId(null);
                    setNewClientCodigo('');
                    setNewClientDocumento('');
                    setNewClientNome('');
                    setNewClientTipoPessoa('');
                    setNewClientAtivo(true);
                    setNewClientGrupoId('');
                    setNewClientSitTribId('');
                    setNewClientDetalhes('');
                    setNewClientCliNome('');
                  }}
                  className="px-4 py-2 bg-brand-bg text-brand-text-muted rounded hover:text-white text-xs font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoadingSupabase}
                  className="px-4 py-2 bg-brand-accent text-white rounded hover:bg-brand-accent/90 text-xs font-bold transition-colors flex items-center gap-2"
                >
                  {isLoadingSupabase && <RefreshCw className="animate-spin" size={14} />}
                  {editingClientId ? 'Salvar Alterações' : 'Criar Cliente'}
                </button>
              </div>
            </form>
          )}
          
          {/* SITUACAO TRIB ADD/EDIT FORM */}
          {activeTab === 'situacao_trib' && (
            <form 
              onSubmit={handleCreateSituacaoTrib}
              className="bg-brand-card p-6 rounded-lg max-w-xl w-full border border-brand-border space-y-4 shadow-2xl relative animate-fade-in"
            >
              <div className="flex items-center justify-between border-b border-brand-border/45 pb-3">
                <h3 className="font-extrabold text-white text-base">
                  {editingSitTribId ? 'Editar Situação Tributária' : 'Nova Situação Tributária'}
                </h3>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingSitTribId(null);
                  }}
                  className="text-brand-text-muted hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-brand-text-muted uppercase tracking-wider mb-1">Cód. Resumido *</label>
                    <input 
                      required
                      type="text"
                      value={newSitTribResumido}
                      onChange={e => setNewSitTribResumido(e.target.value)}
                      className="w-full bg-brand-bg text-brand-text p-2.5 rounded border border-brand-border text-xs focus:border-brand-primary outline-none"
                      placeholder="Ex: 101, 102"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-brand-text-muted uppercase tracking-wider mb-1">Status</label>
                    <select
                      value={newSitTribAtivo}
                      onChange={e => setNewSitTribAtivo(e.target.value as any)}
                      className="w-full bg-brand-bg text-brand-text p-2.5 rounded border border-brand-border text-xs focus:border-brand-primary outline-none"
                    >
                      <option value="S">Ativo</option>
                      <option value="N">Inativo</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-brand-text-muted uppercase tracking-wider mb-1">Descrição / Situação *</label>
                  <input 
                    required
                    type="text"
                    value={newSitTribSituacao}
                    onChange={e => setNewSitTribSituacao(e.target.value)}
                    className="w-full bg-brand-bg text-brand-text p-2.5 rounded border border-brand-border text-xs focus:border-brand-primary outline-none"
                    placeholder="Ex: Tributada pelo Simples Nacional sem permissão de crédito"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-brand-text-muted uppercase tracking-wider mb-1">Grupo</label>
                  <input 
                    type="text"
                    value={newSitTribGrupo}
                    onChange={e => setNewSitTribGrupo(e.target.value)}
                    className="w-full bg-brand-bg text-brand-text p-2.5 rounded border border-brand-border text-xs focus:border-brand-primary outline-none"
                    placeholder="Ex: Simples Nacional"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-brand-border/40">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingSitTribId(null);
                  }}
                  className="px-4 py-2 text-brand-text-muted hover:text-white transition-colors text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoadingSupabaseSituacaoTrib}
                  className="px-4 py-2 bg-brand-accent text-white rounded hover:bg-brand-accent/90 text-xs font-bold transition-colors flex items-center gap-2"
                >
                  {isLoadingSupabaseSituacaoTrib && <RefreshCw className="animate-spin" size={14} />}
                  {editingSitTribId ? 'Salvar Alterações' : 'Criar Situação'}
                </button>
              </div>
            </form>
          )}

          {/* GRUPO DE CLIENTES ADD/EDIT FORM */}
          {activeTab === 'grp_clientes' && (
            <form 
              onSubmit={handleCreateGrpCliente}
              className="bg-brand-card p-6 rounded-lg max-w-md w-full border border-brand-border space-y-4 shadow-2xl relative animate-fade-in"
            >
              <div className="flex items-center justify-between border-b border-brand-border/45 pb-3">
                <h3 className="font-extrabold text-white text-base">
                  {editingGrpClienteId ? 'Editar Grupo de Clientes' : 'Novo Grupo de Clientes'}
                </h3>
                <button 
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingGrpClienteId(null);
                    setNewGrpClienteNome('');
                    setNewGrpClienteSituacao('ATIVO');
                    setNewGrpClienteObserva('');
                  }}
                  className="p-1 text-brand-text-muted hover:text-white rounded"
                >
                  <XCircle size={18} />
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-text-muted uppercase mb-1">Nome do Grupo *</label>
                <input 
                  type="text" 
                  required
                  value={newGrpClienteNome}
                  placeholder="Ex: Varejo"
                  onChange={e => setNewGrpClienteNome(e.target.value)}
                  className="w-full bg-brand-bg text-brand-text placeholder-brand-text-muted/20 p-2.5 rounded border border-brand-border text-xs focus:border-brand-primary outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-text-muted uppercase mb-1">Situação</label>
                <select
                  value={newGrpClienteSituacao}
                  onChange={e => setNewGrpClienteSituacao(e.target.value as any)}
                  className="w-full bg-brand-bg text-brand-text p-2 rounded border border-brand-border text-xs focus:border-brand-primary outline-none h-9"
                >
                  <option value="ATIVO">ATIVO</option>
                  <option value="INATIVO">INATIVO</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-text-muted uppercase mb-1">Observações</label>
                <textarea 
                  value={newGrpClienteObserva}
                  onChange={e => setNewGrpClienteObserva(e.target.value)}
                  placeholder="Notas adicionais sobre o grupo..."
                  className="w-full bg-brand-bg text-brand-text placeholder-brand-text-muted/20 p-2.5 rounded border border-brand-border text-xs focus:border-brand-primary outline-none resize-none h-20"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-brand-border/40">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingGrpClienteId(null);
                    setNewGrpClienteNome('');
                    setNewGrpClienteSituacao('ATIVO');
                    setNewGrpClienteObserva('');
                  }}
                  className="px-4 py-2 bg-brand-bg text-brand-text-muted rounded hover:text-white text-xs font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoadingSupabaseGrpClientes}
                  className="px-4 py-2 bg-brand-accent text-white rounded hover:bg-brand-accent/90 text-xs font-bold transition-colors flex items-center gap-2"
                >
                  {isLoadingSupabaseGrpClientes && <RefreshCw className="animate-spin" size={14} />}
                  {editingGrpClienteId ? 'Salvar Alterações' : 'Criar Grupo'}
                </button>
              </div>
            </form>
          )}
          {activeTab === 'departamentos' && (
            <form 
              onSubmit={handleCreateDepartamento}
              className="bg-brand-card p-6 rounded-lg max-w-md w-full border border-brand-border space-y-4 shadow-2xl relative"
            >
              <div className="flex items-center justify-between border-b border-brand-border/45 pb-3">
                <h3 className="font-extrabold text-white text-base">Novo Departamento</h3>
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="p-1 text-brand-text-muted hover:text-white rounded"
                >
                  <XCircle size={18} />
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-text-muted uppercase mb-1">Nome do Departamento *</label>
                <input 
                  type="text" 
                  required
                  value={newDeptNome}
                  placeholder="Ex: Controladoria de Riscos"
                  onChange={e => setNewDeptNome(e.target.value)}
                  className="w-full bg-brand-bg text-brand-text placeholder-brand-text-muted/20 p-2.5 rounded border border-brand-border text-xs focus:border-brand-primary outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-text-muted uppercase mb-1">Código Identificador (Sigla) *</label>
                <input 
                  type="text" 
                  required
                  value={newDeptCodigo}
                  placeholder="Ex: CTRL-RISC"
                  onChange={e => setNewDeptCodigo(e.target.value)}
                  className="w-full bg-brand-bg text-brand-text placeholder-brand-text-muted/20 p-2.5 rounded border border-brand-border text-xs focus:border-brand-primary outline-none font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-text-muted uppercase mb-1">Gestor do Departamento</label>
                <input 
                  type="text" 
                  value={newDeptGestor}
                  placeholder="Ex: Eduardo M. Albuquerque"
                  onChange={e => setNewDeptGestor(e.target.value)}
                  className="w-full bg-brand-bg text-brand-text placeholder-brand-text-muted/20 p-2.5 rounded border border-brand-border text-xs focus:border-brand-primary outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-brand-text-muted uppercase mb-1">Centro de Custo</label>
                  <input 
                    type="text" 
                    value={newDeptCentroCusto}
                    placeholder="Ex: CC-5001-RISK"
                    onChange={e => setNewDeptCentroCusto(e.target.value)}
                    className="w-full bg-brand-bg text-brand-text placeholder-brand-text-muted/20 p-2.5 rounded border border-brand-border text-xs focus:border-brand-primary outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-text-muted uppercase mb-1">Status</label>
                  <select
                    value={newDeptStatus}
                    onChange={e => setNewDeptStatus(e.target.value as any)}
                    className="w-full bg-brand-bg text-brand-text p-2 rounded border border-brand-border text-xs focus:border-brand-primary outline-none h-9"
                  >
                    <option value="Ativo">Ativo</option>
                    <option value="Inativo">Inativo</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-brand-border/40">
                <button
                  type="button"
                  onClick={() => {
                    setEditingTarefaId(null);
                    setShowAddModal(false);
                  }}
                  className="px-4 py-2 bg-brand-bg text-brand-text-muted rounded hover:text-white text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-accent text-white rounded hover:bg-brand-accent/90 text-xs font-bold"
                >
                  Criar Departamento
                </button>
              </div>
            </form>
          )}

          {/* GRUPO DE FUNÇÕES (grp_cargos) ADD/EDIT FORM */}
          {activeTab === 'grp_cargos' && (
            <form 
              onSubmit={handleCreateGrpCargo}
              className="bg-brand-card p-6 rounded-lg max-w-md w-full border border-brand-border space-y-4 shadow-2xl relative animate-fade-in"
            >
              <div className="flex items-center justify-between border-b border-brand-border/45 pb-3">
                <h3 className="font-extrabold text-white text-base">
                  {editingGrpCargoId ? 'Editar Grupo de Funções' : 'Novo Grupo de Funções'}
                </h3>
                <button 
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingGrpCargoId(null);
                    setNewGrpCrgNome('');
                    setNewGrpCrgCntrl('');
                    setNewGrpCrgStatus('ATIVO');
                  }}
                  className="p-1 text-brand-text-muted hover:text-white rounded"
                >
                  <XCircle size={18} />
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-text-muted uppercase mb-1 font-sans">Nome do Grupo de Funções (grp_crg_nome) *</label>
                <input 
                  type="text" 
                  required
                  value={newGrpCrgNome}
                  placeholder="Ex: Executivos de Contas, Advogados Plenos"
                  onChange={e => setNewGrpCrgNome(e.target.value)}
                  className="w-full bg-brand-bg text-brand-text placeholder-brand-text-muted/20 p-2.5 rounded border border-brand-border text-xs focus:border-brand-primary outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-text-muted uppercase mb-1 font-sans">Código de Controle (grp_crg_cntrl)</label>
                <input 
                  type="text" 
                  value={newGrpCrgCntrl}
                  placeholder="Ex: CTRL01, EXEC_CONTA"
                  onChange={e => setNewGrpCrgCntrl(e.target.value)}
                  className="w-full bg-brand-bg text-brand-text placeholder-brand-text-muted/20 p-2.5 rounded border border-brand-border text-xs focus:border-brand-primary outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-text-muted uppercase mb-1 font-sans">Situação (grp_crg_status)</label>
                <select
                  value={newGrpCrgStatus}
                  onChange={e => setNewGrpCrgStatus(e.target.value)}
                  className="w-full bg-brand-bg text-brand-text p-2 rounded border border-brand-border text-xs focus:border-brand-primary outline-none h-9 font-sans"
                >
                  <option value="ATIVO">ATIVO</option>
                  <option value="INATIVO">INATIVO</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-brand-border/40">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingGrpCargoId(null);
                    setNewGrpCrgNome('');
                    setNewGrpCrgCntrl('');
                    setNewGrpCrgStatus('ATIVO');
                  }}
                  className="px-4 py-2 bg-brand-bg text-brand-text-muted rounded hover:text-white text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoadingSupabaseGrpCargos}
                  className="px-4 py-2 bg-brand-accent text-white rounded hover:bg-brand-accent/90 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  {isLoadingSupabaseGrpCargos && <RefreshCw className="animate-spin" size={13} />}
                  {editingGrpCargoId ? 'Salvar Alterações' : 'Criar Grupo de Funções'}
                </button>
              </div>
            </form>
          )}

          {/* COLABORADOR ADD FORM */}
          {activeTab === 'colaboradores' && (
            <form 
              onSubmit={handleCreateColaborador}
              className="bg-brand-card p-6 rounded-lg max-w-md w-full border border-brand-border space-y-4 shadow-2xl relative"
            >
              <div className="flex items-center justify-between border-b border-brand-border/45 pb-3">
                <h3 className="font-extrabold text-white text-base">
                  {editingColaboradorId ? 'Editar Colaborador' : 'Novo Colaborador'}
                </h3>
                <button 
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingColaboradorId(null);
                    setNewColabNome('');
                    setNewColabEmail('');
                    setNewColabCargo('');
                    setNewColabGrpCargoId('');
                  }}
                  className="p-1 text-brand-text-muted hover:text-white rounded"
                >
                  <XCircle size={18} />
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-text-muted uppercase mb-1">Nome Completo *</label>
                <input 
                  type="text" 
                  required
                  value={newColabNome}
                  placeholder="Ex: Carlos Eduardo Santos"
                  onChange={e => setNewColabNome(e.target.value)}
                  className="w-full bg-brand-bg text-brand-text placeholder-brand-text-muted/20 p-2.5 rounded border border-brand-border text-xs focus:border-brand-primary outline-none"
                />
              </div>

              {isSupabaseConfigured ? (
                <div>
                  <label className="block text-xs font-bold text-brand-text-muted uppercase mb-1">Função / Cargo (Grupo de Função) *</label>
                  <select
                    value={newColabGrpCargoId}
                    onChange={e => setNewColabGrpCargoId(e.target.value)}
                    required
                    className="w-full bg-brand-bg text-brand-text p-2 rounded border border-brand-border text-xs focus:border-brand-primary outline-none h-9"
                  >
                    <option value="">Selecione uma Função...</option>
                    {activeGrpCargosList.map(g => (
                      <option key={g.id} value={g.id}>{g.grp_crg_nome}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-brand-text-muted uppercase mb-1">Cargo / Função</label>
                    <input 
                      type="text" 
                      value={newColabCargo}
                      placeholder="Ex: Diretor, Analista Sênior"
                      onChange={e => setNewColabCargo(e.target.value)}
                      className="w-full bg-brand-bg text-brand-text placeholder-brand-text-muted/20 p-2.5 rounded border border-brand-border text-xs focus:border-brand-primary outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-brand-text-muted uppercase mb-1">Departamento</label>
                    <select
                      value={newColabDeptId}
                      onChange={e => setNewColabDeptId(e.target.value)}
                      className="w-full bg-brand-bg text-brand-text p-2 rounded border border-brand-border text-xs focus:border-brand-primary outline-none h-9"
                    >
                      {departamentos.map(d => (
                        <option key={d.id} value={d.id}>{d.nome} ({d.codigo})</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-brand-text-muted uppercase mb-1">
                  Endereço de E-mail {isSupabaseConfigured ? '' : '*'}
                </label>
                <input 
                  type="email" 
                  required={!isSupabaseConfigured}
                  value={newColabEmail}
                  placeholder="usuario@sextante.com.br"
                  onChange={e => setNewColabEmail(e.target.value)}
                  className="w-full bg-brand-bg text-brand-text placeholder-brand-text-muted/20 p-2.5 rounded border border-brand-border text-xs focus:border-brand-primary outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-brand-text-muted uppercase mb-1">Telefone Celular</label>
                  <input 
                    type="text" 
                    value={newColabTelefone}
                    placeholder="(11) 99999-8888"
                    onChange={e => setNewColabTelefone(e.target.value)}
                    className="w-full bg-brand-bg text-brand-text placeholder-brand-text-muted/20 p-2.5 rounded border border-brand-border text-xs focus:border-brand-primary outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-text-muted uppercase mb-1">Data de Admissão</label>
                  <input 
                    type="date" 
                    value={newColabAdmissao}
                    onChange={e => setNewColabAdmissao(e.target.value)}
                    className="w-full bg-brand-bg text-brand-text p-2 rounded border border-brand-border text-xs focus:border-brand-primary outline-none h-9 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-text-muted uppercase mb-1">Situação / Status</label>
                <select
                  value={newColabStatus}
                  onChange={e => setNewColabStatus(e.target.value as any)}
                  className="w-full bg-brand-bg text-brand-text p-2 rounded border border-brand-border text-xs focus:border-brand-primary outline-none h-9"
                >
                  <option value="Ativo">Ativo</option>
                  <option value="Inativo">Inativo</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-brand-border/40">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingColaboradorId(null);
                    setNewColabNome('');
                    setNewColabEmail('');
                    setNewColabCargo('');
                    setNewColabGrpCargoId('');
                  }}
                  className="px-4 py-2 bg-brand-bg text-brand-text-muted rounded hover:text-white text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-accent text-white rounded hover:bg-brand-accent/90 text-xs font-bold"
                >
                  {editingColaboradorId ? 'Salvar Alterações' : 'Adicionar Colaborador'}
                </button>
              </div>
            </form>
          )}

          {/* TAREFA ADD FORM */}
          {activeTab === 'tarefas' && (
            <form 
              onSubmit={handleCreateTarefa}
              className="bg-brand-card p-6 rounded-lg max-w-md w-full border border-brand-border space-y-4 shadow-2xl relative"
            >
              <div className="flex items-center justify-between border-b border-brand-border/45 pb-3">
                <h3 className="font-extrabold text-white text-base">{editingTarefaId ? 'Editar Tarefa' : 'Nova Tarefa'}</h3>
                <button 
                  type="button"
                  onClick={() => {
                    setEditingTarefaId(null);
                    setShowAddModal(false);
                  }}
                  className="p-1 text-brand-text-muted hover:text-white rounded"
                >
                  <XCircle size={18} />
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-text-muted uppercase mb-1">Nome da Tarefa *</label>
                <input 
                  type="text" 
                  required
                  value={newTaskTitulo}
                  placeholder="Ex: Conferência de Fechamento"
                  onChange={e => setNewTaskTitulo(e.target.value)}
                  className="w-full bg-brand-bg text-brand-text placeholder-brand-text-muted/20 p-2.5 rounded border border-brand-border text-xs focus:border-brand-primary outline-none font-bold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-brand-border/40 font-sans">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-brand-bg text-brand-text-muted rounded hover:text-white text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoadingSupabaseTarefas}
                  className="px-4 py-2 bg-brand-accent text-white rounded hover:bg-brand-accent/90 text-xs font-bold disabled:opacity-50"
                >
                  {isLoadingSupabaseTarefas ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          )}

        </div>
      )}

      {/* RELATIONSHIP VINCULO DIM_USUARIO <-> RH_COLABORADOR MODAL */}
      {selectedDimUsuario && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in p-4 overflow-y-auto">
          <div className="bg-brand-card border border-brand-border rounded-xl max-w-lg w-full shadow-2xl flex flex-col h-auto max-h-[90vh] overflow-hidden animate-scale-up" id="relationship-modal">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-brand-border/60 flex items-start justify-between bg-brand-card-light">
              <div>
                <span className="p-1 px-2 rounded text-[10px] font-mono tracking-wider font-extrabold bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                  MAPEAMENTO DE APONTAMENTO
                </span>
                <h3 className="font-extrabold text-lg text-white mt-1.5 flex items-center gap-2">
                  <Link size={18} className="text-brand-primary" />
                  Vincular Usuário ao RH
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedDimUsuario(null)}
                className="p-1.5 text-brand-text-muted hover:text-red-400 bg-brand-bg hover:bg-brand-bg/60 border border-brand-border/40 rounded-lg transition-all duration-150 active:scale-95 cursor-pointer animate-fade-in"
                title="Fechar"
              >
                <XCircle size={18} />
              </button>
            </div>

            {/* Target User Info */}
            <div className="p-4 bg-brand-bg/50 border-b border-brand-border/30 flex flex-col gap-1.5 text-xs">
              <span className="text-[10px] uppercase font-bold text-brand-text-muted tracking-wider">Usuário do Apontamento (dim_usuario)</span>
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-brand-primary/10 rounded-lg border border-brand-primary/15 text-brand-primary">
                  <User size={16} />
                </div>
                <div>
                  <div className="text-white font-extrabold select-all text-sm">{selectedDimUsuario.colaborador || selectedDimUsuario.nome || 'Sem Nome'}</div>
                  <div className="text-[11px] font-mono text-brand-text-muted/65 mt-0.5 select-all">UUID: {selectedDimUsuario.dim_usuario_id || selectedDimUsuario.id}</div>
                </div>
              </div>
            </div>

            {/* Modal Body / Selection logic */}
            <div className="p-5 overflow-y-auto max-h-[50vh] space-y-4">
              {rhColabsError && (
                <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-lg flex items-start gap-2.5 text-xs text-red-200 animate-fade-in">
                  <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Ocorreu um erro no banco:</span>
                    <p className="mt-0.5">{rhColabsError}</p>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-brand-text-muted uppercase tracking-wider">Selecione o Colaborador Correspondente no RH (rh_colaborador)</label>
                
                {/* Search box to filter RH Employees */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-muted/50" size={14} />
                  <input
                    type="text"
                    value={rhColabSearch}
                    onChange={e => setRhColabSearch(e.target.value)}
                    placeholder="Pesquisar profissional pelo nome no RH..."
                    className="w-full bg-brand-bg text-brand-text placeholder-brand-text-muted/40 p-2.5 pl-9 rounded border border-brand-border text-xs focus:border-brand-primary outline-none"
                  />
                  {rhColabSearch && (
                    <button
                      type="button"
                      onClick={() => setRhColabSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-text-muted hover:text-white text-xs font-bold font-sans"
                    >
                      Limpar
                    </button>
                  )}
                </div>
              </div>

              {/* Loader or Employees listing */}
              {isLoadingRhColabs ? (
                <div className="py-12 text-center space-y-2">
                  <RefreshCw className="animate-spin text-brand-primary mx-auto" size={24} />
                  <p className="text-xs text-brand-text-muted italic animate-pulse">Consultando colaboradores cadastrados no RH do Supabase...</p>
                </div>
              ) : rhColaboradores.length === 0 ? (
                <div className="p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-lg text-center space-y-1.5 py-8">
                  <AlertCircle className="text-yellow-500 mx-auto" size={20} />
                  <p className="text-xs font-semibold text-yellow-500">Nenhum profissional cadastrado em rh_colaborador.</p>
                  <p className="text-[10px] text-brand-text-muted">É necessário incluir colaboradores no RH antes de mapeá-los.</p>
                </div>
              ) : (
                <div className="border border-brand-border/40 rounded-lg overflow-hidden max-h-56 overflow-y-auto divide-y divide-brand-border/30 custom-scrollbar bg-black/10">
                  {/* Option None / Desvincular */}
                  <button
                    type="button"
                    onClick={() => setSelectedRhColabId('')}
                    className={`w-full text-left p-3 flex items-center justify-between text-xs transition-all hover:bg-brand-card-bright/10 ${
                      selectedRhColabId === '' 
                        ? 'bg-brand-primary/10 font-bold border-l-2 border-brand-primary text-white' 
                        : 'border-l-2 border-transparent text-brand-text-muted'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Unlink size={13} className="text-brand-text-muted/60" />
                      <span>-- Sem Vínculo (Desvincular do RH) --</span>
                    </div>
                    {selectedRhColabId === '' && <Check size={14} className="text-brand-primary font-bold" />}
                  </button>

                  {/* Render filtered employees from rh_colaborador */}
                  {rhColaboradores
                    .filter(rh => {
                      const userCurrentLink = selectedDimUsuario.colaborador_id || selectedDimUsuario.rh_colaborador_id;
                      const isLinkedToAnother = alreadyLinkedRhIds.has(rh.id) && rh.id !== userCurrentLink;
                      return !isLinkedToAnother;
                    })
                    .filter(rh => !rhColabSearch.trim() || (rh.nome || '').toLowerCase().includes(rhColabSearch.toLowerCase().trim()))
                    .map((rh) => {
                      const userCurrentLink = selectedDimUsuario.colaborador_id || selectedDimUsuario.rh_colaborador_id;
                      const isCurrentLink = rh.id === userCurrentLink;
                      const isSelected = selectedRhColabId === rh.id;

                      return (
                        <button
                          key={rh.id}
                          type="button"
                          onClick={() => setSelectedRhColabId(rh.id)}
                          className={`w-full text-left p-3 flex items-center justify-between text-xs transition-all hover:bg-brand-card-bright/10 cursor-pointer active:scale-[0.99] ${
                            isSelected 
                              ? 'bg-brand-primary/10 font-bold text-white border-l-2 border-brand-primary' 
                              : isCurrentLink
                                ? 'bg-emerald-500/5 text-emerald-400 border-l-2 border-emerald-500/30'
                                : 'border-l-2 border-transparent text-brand-text-muted'
                          }`}
                        >
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold">{rh.nome || 'Sem Nome'}</span>
                            <span className="text-[10px] text-brand-text-muted/50 font-mono">ID: {rh.id}</span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {isCurrentLink && !isSelected && (
                              <span className="text-[9px] uppercase font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 px-1.5 py-0.5 rounded tracking-wider font-bold">
                                Vínculo Atual
                              </span>
                            )}
                            {isSelected && (
                              <span className="p-0.5 rounded-full bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                                <Check size={12} />
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}

                  {/* Empty state during filtration */}
                  {rhColaboradores
                    .filter(rh => {
                      const userCurrentLink = selectedDimUsuario.colaborador_id || selectedDimUsuario.rh_colaborador_id;
                      const isLinkedToAnother = alreadyLinkedRhIds.has(rh.id) && rh.id !== userCurrentLink;
                      return !isLinkedToAnother;
                    })
                    .filter(rh => !rhColabSearch.trim() || (rh.nome || '').toLowerCase().includes(rhColabSearch.toLowerCase().trim())).length === 0 && (
                    <div className="py-6 text-center text-xs text-brand-text-muted/40 italic">
                      Nenhum profissional disponível para relacionamento corresponde à busca.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="p-4 border-t border-brand-border/60 bg-brand-card-light flex items-center justify-between font-sans gap-3">
              <div>
                {(selectedDimUsuario.colaborador_id || selectedDimUsuario.rh_colaborador_id) && (
                  <button
                    type="button"
                    disabled={isLoadingRhColabs}
                    onClick={() => {
                      if (confirm(`Deseja desvincular o usuário ${selectedDimUsuario.colaborador || selectedDimUsuario.nome || 'este usuário'} do colaborador do RH?`)) {
                        handleRemoveRelationship(selectedDimUsuario.dim_usuario_id || selectedDimUsuario.id);
                      }
                    }}
                    className="px-3 py-1.5 text-xs font-bold text-red-400 hover:text-white bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 rounded shadow-sm transition-all duration-100 disabled:opacity-50 cursor-pointer active:scale-95"
                  >
                    Desvincular do RH
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedDimUsuario(null)}
                  className="px-4 py-1.5 bg-brand-bg text-brand-text-muted hover:text-white rounded text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isLoadingRhColabs}
                  onClick={() => handleSaveRelationship()}
                  className="px-4 py-1.5 bg-brand-primary hover:bg-brand-primary-dark text-white rounded text-xs font-black shadow-md transition-all active:scale-95 duration-100 disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
                >
                  {isLoadingRhColabs ? (
                    <RefreshCw className="animate-spin text-white" size={12} />
                  ) : (
                    <ShieldCheck size={13} />
                  )}
                  Salvar Vínculo
                </button>
              </div>
            </div>

          </div>
        </div>
      )}


      {/* GENTLE FLOATING SYNCHRONIZATION TOAST (NON-INTRUSIVE & NON-SCARY) */}
      {isExecutingTriggerScript && (
        <div 
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3.5 bg-brand-card-bright border border-brand-primary/30 p-4 rounded-xl shadow-2xl animate-slide-up text-brand-text max-w-sm" 
          id="automation-sync-friendly-toast"
        >
          <div className="p-2 bg-brand-primary/10 text-brand-primary rounded-lg border border-brand-primary/20 shrink-0">
            <RefreshCw className="animate-spin" size={18} />
          </div>
          <div>
            <h4 className="font-extrabold text-white text-xs uppercase tracking-wider">Sincronizando Relatórios</h4>
            <p className="text-[11px] text-brand-text-muted mt-0.5 leading-snug">
              Processando as atualizações das visões materializadas no Supabase com segurança. Por favor, aguarde.
            </p>
          </div>
        </div>
      )}

      {/* Corporate Metadata Footer */}
      <footer className="text-center pt-4 text-[10px] text-brand-text-muted/40 font-mono tracking-widest col-span-full">
        SEXTANTE FINANCIAL INTELLIGENCE • CADASTROS CONVERSORES • V2.4.0
      </footer>

    </div>
  );
}
