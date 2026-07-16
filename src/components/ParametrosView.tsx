import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Slash, 
  ClipboardCheck, 
  GraduationCap, 
  Users, 
  DollarSign, 
  ShieldAlert, 
  CheckCircle,
  Activity,
  AlertCircle,
  HelpCircle,
  Code,
  Clock
} from 'lucide-react';
import { SinaleiraConfig, DefinedAction } from '../types';
import { isSupabaseConfigured } from '../lib/supabase';

interface ParametrosViewProps {
  sinaleira: { dentro: SinaleiraConfig; atencao: SinaleiraConfig; critico: SinaleiraConfig };
  onUpdateSinaleira: (updated: { dentro: SinaleiraConfig; atencao: SinaleiraConfig; critico: SinaleiraConfig }) => void;
  motives: string[];
  onUpdateMotives: (newMotives: string[]) => void;
  actions: DefinedAction[];
  onUpdateActions: (newActions: DefinedAction[]) => void;
  onRestoreDefaults: () => void;
  qtdeHorasMes: number;
  onUpdateQtdeHorasMes: (newValue: number) => void;
}

export default function ParametrosView({
  sinaleira,
  onUpdateSinaleira,
  motives,
  onUpdateMotives,
  actions,
  onUpdateActions,
  onRestoreDefaults,
  qtdeHorasMes,
  onUpdateQtdeHorasMes
}: ParametrosViewProps) {
  // Local state so modifications must be explicitly published via "Salvar Alterações" or "Publicar Alterações"
  const [localDentroMin, setLocalDentroMin] = useState(sinaleira.dentro.min);
  const [localDentroMax, setLocalDentroMax] = useState(sinaleira.dentro.max);
  const [localDentroName, setLocalDentroName] = useState(sinaleira.dentro.name);

  const [localAtencaoMin, setLocalAtencaoMin] = useState(sinaleira.atencao.min);
  const [localAtencaoMax, setLocalAtencaoMax] = useState(sinaleira.atencao.max);
  const [localAtencaoName, setLocalAtencaoName] = useState(sinaleira.atencao.name);

  const [localCriticoMin, setLocalCriticoMin] = useState(sinaleira.critico.min);
  const [localCriticoName, setLocalCriticoName] = useState(sinaleira.critico.name);

  const [localQtdeHorasMes, setLocalQtdeHorasMes] = useState(qtdeHorasMes);

  // Sync props to local states
  useEffect(() => {
    setLocalDentroMin(sinaleira.dentro.min);
    setLocalDentroMax(sinaleira.dentro.max);
    setLocalDentroName(sinaleira.dentro.name);
    setLocalAtencaoMin(sinaleira.atencao.min);
    setLocalAtencaoMax(sinaleira.atencao.max);
    setLocalAtencaoName(sinaleira.atencao.name);
    setLocalCriticoMin(sinaleira.critico.min);
    setLocalCriticoName(sinaleira.critico.name);
    setLocalMotives([...motives]);
    setLocalActions([...actions]);
    setLocalQtdeHorasMes(qtdeHorasMes);
  }, [sinaleira, motives, actions, qtdeHorasMes]);

  // Lists state
  const [localMotives, setLocalMotives] = useState<string[]>([...motives]);
  const [newMotiveText, setNewMotiveText] = useState('');
  const [showAddMotive, setShowAddMotive] = useState(false);

  const [localActions, setLocalActions] = useState<DefinedAction[]>([...actions]);
  const [newActionName, setNewActionName] = useState('');
  const [newActionDesc, setNewActionDesc] = useState('');
  const [showAddAction, setShowAddAction] = useState(false);

  const [isSuccessFlash, setIsSuccessFlash] = useState(false);
  const [flashMessage, setFlashMessage] = useState('');

  // Icon Mapper for Ações list
  const renderActionIcon = (iconName: string) => {
    switch (iconName) {
      case 'Slash':
        return <Slash size={16} className="text-brand-text-muted/70" />;
      case 'ClipboardCheck':
        return <ClipboardCheck size={16} className="text-sky-400" />;
      case 'GraduationCap':
        return <GraduationCap size={16} className="text-amber-400" />;
      case 'Users':
        return <Users size={16} className="text-pink-400" />;
      case 'DollarSign':
        return <DollarSign size={16} className="text-emerald-400" />;
      case 'ShieldAlert':
        return <ShieldAlert size={16} className="text-red-400" />;
      default:
        return <Activity size={16} className="text-brand-primary" />;
    }
  };

  const handleAddMotive = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMotiveText.trim()) return;
    if (localMotives.includes(newMotiveText.trim())) {
      alert('Motivo já existe na classificação empresarial!');
      return;
    }
    setLocalMotives([...localMotives, newMotiveText.trim()]);
    setNewMotiveText('');
    setShowAddMotive(false);
  };

  const handleRemoveMotive = (indexToRemove: number) => {
    setLocalMotives(localMotives.filter((_, idx) => idx !== indexToRemove));
  };

  const handleAddAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActionName.trim()) return;
    
    const newAct: DefinedAction = {
      id: Math.random().toString(36).substr(2, 9),
      name: newActionName.trim(),
      description: newActionDesc.trim() || 'Sem descrição cadastrada',
      iconName: 'Activity'
    };

    setLocalActions([...localActions, newAct]);
    setNewActionName('');
    setNewActionDesc('');
    setShowAddAction(false);
  };

  const handleRemoveAction = (idToRemove: string) => {
    setLocalActions(localActions.filter(act => act.id !== idToRemove));
  };

  const handleSaveChanges = () => {
    // Basic validation: ensure ranges are contiguous and logical
    if (localDentroMax !== localAtencaoMin) {
      alert('Aviso de Validação: O limite máximo "Dentro da Meta" deve coincidir com o limite mínimo "Atenção" para evitar lacunas de monitoramento!');
      return;
    }
    if (localAtencaoMax !== localCriticoMin) {
      alert('Aviso de Validação: O limite máximo "Atenção" deve coincidir com o limite mínimo "Crítico"!');
      return;
    }
    if (localDentroMin >= localDentroMax || localAtencaoMin >= localAtencaoMax) {
      alert('Valores de limites inválidos. Certifique-se de que o inicial seja menor que o limite final!');
      return;
    }

    // Propagate up to central state
    onUpdateSinaleira({
      dentro: { min: localDentroMin, max: localDentroMax, name: localDentroName, color: sinaleira.dentro.color },
      atencao: { min: localAtencaoMin, max: localAtencaoMax, name: localAtencaoName, color: sinaleira.atencao.color },
      critico: { min: localCriticoMin, max: 100, name: localCriticoName, color: sinaleira.critico.color }
    });

    onUpdateMotives(localMotives);
    onUpdateActions(localActions);
    onUpdateQtdeHorasMes(localQtdeHorasMes);

    setFlashMessage('Todas as regras de parametrização e classificação foram redistribuídas ao ERP!');
    setIsSuccessFlash(true);
    setTimeout(() => {
      setIsSuccessFlash(false);
    }, 2500);
  };

  const handleCancel = () => {
    // Reset local states from parent values
    setLocalDentroMin(sinaleira.dentro.min);
    setLocalDentroMax(sinaleira.dentro.max);
    setLocalDentroName(sinaleira.dentro.name);
    setLocalAtencaoMin(sinaleira.atencao.min);
    setLocalAtencaoMax(sinaleira.atencao.max);
    setLocalAtencaoName(sinaleira.atencao.name);
    setLocalCriticoMin(sinaleira.critico.min);
    setLocalCriticoName(sinaleira.critico.name);

    setLocalMotives([...motives]);
    setLocalActions([...actions]);
    setLocalQtdeHorasMes(qtdeHorasMes);

    setFlashMessage('Alterações locais descartadas. Carregado estado consolidado da nuvem.');
    setIsSuccessFlash(true);
    setTimeout(() => {
      setIsSuccessFlash(false);
    }, 2000);
  };

  return (
    <div id="parametros-view-root" className="flex-1 p-8 overflow-y-auto max-w-7xl mx-auto w-full space-y-8">
      
      {/* Top Header Row mimicking screenshot exactly */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-brand-border/40 pb-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white mb-1">
            Parâmetros
          </h2>
          <p className="text-sm font-medium text-brand-text-muted">
            Estabeleça premissas corporativas, limites de sinalização crítica e controle de classificações do motor financeiro.
          </p>
        </div>

        <button
          onClick={handleSaveChanges}
          id="top-save-parameters-button"
          className="flex items-center gap-2 px-5 py-2.5 rounded bg-brand-accent hover:bg-brand-accent/95 text-white text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer"
        >
          Salvar Alterações
        </button>
      </header>

      {/* Success Notification Flash Bar */}
      {isSuccessFlash && (
        <div className="bg-emerald-950 border border-emerald-500/30 text-emerald-300 p-4 rounded-lg flex items-center gap-3 animate-fade-in text-xs font-bold shadow-md">
          <CheckCircle size={18} className="text-emerald-400 shrink-0" />
          <span>{flashMessage}</span>
        </div>
      )}

      {/* Database Connection State */}
      <div className={`p-3.5 rounded-lg border text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
        isSupabaseConfigured
          ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
          : 'bg-amber-950/20 border-amber-500/30 text-amber-300'
      }`}>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isSupabaseConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          <span className="font-semibold">
            {isSupabaseConfigured 
              ? 'Conectado ao Supabase: Parâmetros síncronos lidos em tempo real da nuvem' 
              : 'Modo Offline: Armazenamento local ativo. Conecte o Supabase para sincronização.'}
          </span>
        </div>
        {isSupabaseConfigured && (
          <span className="text-[10px] bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/10 font-mono font-bold uppercase tracking-wider text-emerald-300">
            Tabela [parametros_sistema]
          </span>
        )}
      </div>

      {/* Box: Configuração da Sinaleira (Status limits) */}
      <section className="bg-brand-card rounded-lg border border-brand-border p-6 shadow-lg" id="sinaleira-config-module">
        <div className="pb-5 border-b border-brand-border/40 mb-6">
          <h3 className="text-lg font-bold text-white mb-1">Configuração da Sinaleira</h3>
          <p className="text-xs text-brand-text-muted">Defina os limites de variação (Desvio %) tolerados para cada flag status do painel.</p>
        </div>

        {/* The Three color bands rows */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Band 1 - DENTRO DA META (Green) */}
          <div className="bg-brand-bg rounded-lg p-5 border-l-4 border-emerald-500/80 border border-brand-border flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider">DENTRO DA META</span>
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-400 shadow shadow-emerald-400/50" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-brand-text-muted/80 mb-1">Intervalo (%)</label>
                <div className="flex items-center gap-2 bg-brand-card px-2 py-1.5 rounded border border-brand-border">
                  <input
                    type="number"
                    value={localDentroMin}
                    onChange={(e) => setLocalDentroMin(parseInt(e.target.value) || 0)}
                    className="w-full text-xs font-mono font-bold text-white bg-transparent outline-none"
                  />
                  <span className="text-[10px] text-brand-text-muted/40 font-mono">%</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-brand-text-muted/80 mb-1">Até (%)</label>
                <div className="flex items-center gap-2 bg-brand-card px-2 py-1.5 rounded border border-brand-border">
                  <input
                    type="number"
                    value={localDentroMax}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setLocalDentroMax(val);
                      // Auto adjust next boundary to stay coherent
                      setLocalAtencaoMin(val);
                    }}
                    className="w-full text-xs font-mono font-bold text-white bg-transparent outline-none"
                  />
                  <span className="text-[10px] text-brand-text-muted/40 font-mono">%</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-brand-text-muted/80 mb-1">Nome do Status</label>
              <input
                type="text"
                value={localDentroName}
                onChange={(e) => setLocalDentroName(e.target.value)}
                className="w-full bg-brand-card text-xs text-white font-bold p-2.5 rounded border border-brand-border focus:border-brand-primary outline-none"
              />
            </div>
          </div>

          {/* Band 2 - ATENÇÃO (Yellow) */}
          <div className="bg-brand-bg rounded-lg p-5 border-l-4 border-amber-500/80 border border-brand-border flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider">ATENÇÃO</span>
              <span className="w-3.5 h-3.5 rounded-full bg-amber-400 shadow shadow-amber-400/50" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-brand-text-muted/80 mb-1">Intervalo (%)</label>
                <div className="flex items-center gap-2 bg-brand-card px-2 py-1.5 rounded border border-brand-border">
                  <input
                    type="number"
                    value={localAtencaoMin}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setLocalAtencaoMin(val);
                      setLocalDentroMax(val);
                    }}
                    className="w-full text-xs font-mono font-bold text-white bg-transparent outline-none"
                  />
                  <span className="text-[10px] text-brand-text-muted/40 font-mono">%</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-brand-text-muted/80 mb-1">Até (%)</label>
                <div className="flex items-center gap-2 bg-brand-card px-2 py-1.5 rounded border border-brand-border">
                  <input
                    type="number"
                    value={localAtencaoMax}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setLocalAtencaoMax(val);
                      setLocalCriticoMin(val);
                    }}
                    className="w-full text-xs font-mono font-bold text-white bg-transparent outline-none"
                  />
                  <span className="text-[10px] text-brand-text-muted/40 font-mono">%</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-brand-text-muted/80 mb-1">Nome do Status</label>
              <input
                type="text"
                value={localAtencaoName}
                onChange={(e) => setLocalAtencaoName(e.target.value)}
                className="w-full bg-brand-card text-xs text-white font-bold p-2.5 rounded border border-brand-border focus:border-brand-primary outline-none"
              />
            </div>
          </div>

          {/* Band 3 - CRÍTICO (Red) */}
          <div className="bg-brand-bg rounded-lg p-5 border-l-4 border-brand-accent/80 border border-brand-border flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider">CRÍTICO</span>
              <span className="w-3.5 h-3.5 rounded-full bg-brand-primary shadow shadow-brand-primary/50" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-brand-text-muted/80 mb-1">Intervalo (%)</label>
                <div className="flex items-center gap-2 bg-brand-card px-2 py-1.5 rounded border border-brand-border">
                  <input
                    type="number"
                    value={localCriticoMin}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setLocalCriticoMin(val);
                      setLocalAtencaoMax(val);
                    }}
                    className="w-full text-xs font-mono font-bold text-white bg-transparent outline-none"
                  />
                  <span className="text-[10px] text-brand-text-muted/40 font-mono">%</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-brand-text-muted/50 mb-1">Mais</label>
                <div className="flex items-center gap-2 bg-brand-card/45 px-2 py-1.5 rounded border border-brand-border select-none text-brand-text-muted/20">
                  <span className="text-xs font-bold">sem limite</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-brand-text-muted/80 mb-1">Nome do Status</label>
              <input
                type="text"
                value={localCriticoName}
                onChange={(e) => setLocalCriticoName(e.target.value)}
                className="w-full bg-brand-card text-xs text-white font-bold p-2.5 rounded border border-brand-border focus:border-brand-primary outline-none"
              />
            </div>
          </div>

        </div>
      </section>

      {/* Box: Parâmetro de Cálculo (Qtde Horas Mês) */}
      <section className="bg-brand-card rounded-lg border border-brand-border p-6 shadow-lg animate-fade-in" id="calculo-config-module">
        <div className="pb-5 border-b border-brand-border/40 mb-6 font-sans">
          <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
            <Clock size={18} className="text-brand-primary animate-pulse" />
            Parâmetros de Cálculo
          </h3>
          <p className="text-xs text-brand-text-muted">Configure as constantes e diretrizes de horas utilizadas pelo motor de cálculo financeiro.</p>
        </div>

        <div className="max-w-md bg-brand-bg rounded-lg p-5 border-l-4 border-brand-primary border border-brand-border space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white uppercase tracking-wider">Qtde Horas Mês / Calc</span>
            <span className="text-[10px] bg-brand-card-light px-2 py-0.5 rounded text-brand-primary border border-brand-border/40 font-mono font-semibold">
              Premissa Geral
            </span>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-brand-text-muted/80 mb-2">Quantidade de Horas Mês de Cálculo</label>
            <div className="flex items-center gap-3 bg-brand-card px-3 py-2.5 rounded border border-brand-border focus-within:border-brand-primary transition-all">
              <input
                type="number"
                min="1"
                max="744"
                value={localQtdeHorasMes}
                onChange={(e) => setLocalQtdeHorasMes(Math.max(1, parseInt(e.target.value) || 0))}
                className="w-full text-xs font-mono font-bold text-white bg-transparent outline-none focus:ring-0"
              />
              <span className="text-xs text-brand-text-muted/60 font-medium shrink-0 font-mono">horas / mês</span>
            </div>
          </div>
          
          <p className="text-[10px] text-brand-text-muted/65 italic leading-relaxed">
            * Coeficiente numérico utilizado nos balanços corporativos de horas, rateios de faturamento e auditorias preventivas.
          </p>
        </div>
      </section>

      {/* Two columns side-by-side: Motivos de Desvio vs Ações Definidas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Card Row 1: Motivos de Desvio */}
        <section className="bg-brand-card rounded-lg border border-brand-border p-6 flex flex-col justify-between space-y-4" id="motivos-desvio-module">
          <div className="flex items-center justify-between pb-3 border-b border-brand-border/40">
            <div>
              <h3 className="text-base font-bold text-white">Motivos de Desvio</h3>
              <p className="text-[11px] text-brand-text-muted">Classificações organizadas para variações orçamentárias.</p>
            </div>
            
            <button
              onClick={() => setShowAddMotive(!showAddMotive)}
              className="p-1.5 rounded-full bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 hover:text-white transition-colors cursor-pointer"
              title="Adicionar novo motivo empresarial"
            >
              <Plus size={16} />
            </button>
          </div>

          {/* Add motive inline form */}
          {showAddMotive && (
            <form onSubmit={handleAddMotive} className="bg-brand-bg p-3 rounded-lg border border-sky-500/25 flex gap-2 animate-fade-in">
              <input
                type="text"
                required
                autoFocus
                placeholder="Qual o desvio? Ex. Reajuste de Frete"
                value={newMotiveText}
                onChange={e => setNewMotiveText(e.target.value)}
                className="bg-brand-card text-xs text-brand-text p-2 rounded border border-brand-border focus:border-brand-primary outline-none grow"
              />
              <button 
                type="submit"
                className="bg-sky-500 text-white text-xs px-3 rounded font-bold hover:bg-sky-600 transition-colors cursor-pointer"
              >
                Incluir
              </button>
            </form>
          )}

          {/* Reasons List */}
          <div className="space-y-2 h-[260px] overflow-y-auto pr-1">
            {localMotives.map((motive, idx) => (
              <div 
                key={idx}
                className="flex items-center justify-between bg-brand-bg/60 p-3 rounded border border-brand-border/45 hover:border-brand-primary/20 hover:bg-brand-bg transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-primary/50" />
                  <span className="text-xs text-white font-medium">{motive}</span>
                </div>

                <button
                  onClick={() => handleRemoveMotive(idx)}
                  className="p-1 font-bold text-brand-text-muted/40 hover:text-brand-accent transition-colors cursor-pointer"
                  title="remover motivo"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>

          <div className="text-[10px] text-brand-text-muted/40 italic">
            * Estas justificativas estarão disponíveis nos seletores globais corporativos.
          </div>
        </section>

        {/* Card Row 2: Ações Definidas */}
        <section className="bg-brand-card rounded-lg border border-brand-border p-6 flex flex-col justify-between space-y-4" id="acoes-definidas-module">
          <div className="flex items-center justify-between pb-3 border-b border-brand-border/40">
            <div>
              <h3 className="text-base font-bold text-white">Ações Definidas</h3>
              <p className="text-[11px] text-brand-text-muted">Fluxo de contraproposta e resposta a desvios detectados.</p>
            </div>
            
            <button
              onClick={() => setShowAddAction(!showAddAction)}
              className="p-1.5 rounded-full bg-brand-primary/10 text-brand-primary hover:bg-brand-accent hover:text-white transition-colors cursor-pointer"
              title="Adicionar nova ação"
            >
              <Plus size={16} />
            </button>
          </div>

          {/* Add action inline form */}
          {showAddAction && (
            <form onSubmit={handleAddAction} className="bg-brand-bg p-3 rounded-lg border border-brand-primary/25 space-y-2.5 animate-fade-in">
              <input
                type="text"
                required
                autoFocus
                placeholder="Nome da Ação (Ex. Renegociar taxa)"
                value={newActionName}
                onChange={e => setNewActionName(e.target.value)}
                className="w-full bg-brand-card text-xs text-brand-text p-2 rounded border border-brand-border focus:border-brand-primary outline-none"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Simples descrição operacional"
                  value={newActionDesc}
                  onChange={e => setNewActionDesc(e.target.value)}
                  className="bg-brand-card text-xs text-brand-text p-2 rounded border border-brand-border focus:border-brand-primary outline-none grow"
                />
                <button 
                  type="submit"
                  className="bg-brand-accent text-white text-xs px-3 rounded font-bold hover:bg-brand-accent/90 transition-colors"
                >
                  Adicionar
                </button>
              </div>
            </form>
          )}

          {/* Actions List with visual icons and inline deletions matching image */}
          <div className="space-y-2.5 h-[260px] overflow-y-auto pr-1">
            {localActions.map((act) => (
              <div 
                key={act.id}
                className="flex items-center justify-between bg-brand-bg/50 p-2.5 rounded border border-brand-border/60 hover:bg-brand-bg transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded bg-brand-card border border-brand-border-muted/50 mt-0.5 shrink-0">
                    {renderActionIcon(act.iconName)}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">{act.name}</h4>
                    <p className="text-[10px] text-brand-text-muted/75 mt-0.5">{act.description}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleRemoveAction(act.id)}
                  className="p-1 text-brand-text-muted/40 hover:text-brand-accent transition-colors shrink-0"
                  title="remover ação"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>

          <div className="text-[10px] text-brand-text-muted/40 italic">
            * Ações mapeadas são listadas como plano operacional imediato contra multas.
          </div>
        </section>

      </div>

      {/* Footer sticky-action bar */}
      <footer className="border-t border-brand-border/40 pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="text-[11px] text-brand-text-muted/50 font-mono italic">
          Última alteração: 24/05/2024 às 14:32 por admin_root
        </div>
        
        <div className="flex items-center gap-3 justify-end">
          <button
            onClick={onRestoreDefaults}
            className="px-4 py-2 rounded bg-brand-card text-xs font-bold text-brand-text-muted hover:text-white hover:bg-brand-card-light transition-all cursor-pointer"
          >
            Restaurar Padrão de Fábrica
          </button>
          
          <button
            onClick={handleCancel}
            className="px-4 py-2 rounded bg-brand-card text-xs font-bold text-white hover:bg-brand-card-bright transition-all cursor-pointer"
          >
            Cancelar
          </button>
          
          <button
            onClick={handleSaveChanges}
            className="px-4 py-2 rounded bg-brand-accent hover:bg-brand-accent/90 text-white text-xs font-extrabold uppercase tracking-wide transition-all cursor-pointer active:scale-95 shadow-md shadow-brand-accent/15"
          >
            Publicar Alterações
          </button>
        </div>
      </footer>

    </div>
  );
}
