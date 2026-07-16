/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Play,
  RotateCcw,
  Check,
  CheckCircle,
  Clock,
  Users,
  Cpu,
  Layers,
  Settings,
  Terminal,
  ChevronRight,
  Plus,
  Minus,
  Sparkles,
  Wifi,
  Database,
  ArrowRight
} from "lucide-react";

type PriorityType = "Alfa" | "Beta" | "Gama" | "Sigma";
type TabType = "briefing" | "estrategia" | "execucao";
type WorkflowStateType = "idle" | "running" | "completed";

interface Specialist {
  role: string;
  name: string;
  avatar: string;
}

const SPEC_POOL: Specialist[] = [
  { role: "Product Lead", name: "Ana Silva", avatar: "AS" },
  { role: "Solutions Architect", name: "Lucas Rocha", avatar: "LR" },
  { role: "Frontend Specialist", name: "Mariana Costa", avatar: "MC" },
  { role: "Backend Engineer", name: "Carlos Souza", avatar: "CS" },
  { role: "DevOps Architect", name: "Gabriel Lima", avatar: "GL" },
  { role: "AI Research Lead", name: "Beatriz M.", avatar: "BM" },
  { role: "QA Engineer", name: "Pedro Alves", avatar: "PA" },
  { role: "Security Analyst", name: "Julia Ferraz", avatar: "JF" }
];

export default function App() {
  // Navigation
  const [currentTab, setCurrentTab] = useState<TabType>("briefing");

  // Project Details
  const [projectName, setProjectName] = useState("NOVO PROJETO");
  const [clientName, setClientName] = useState("Studio Arkhos");
  const [deadline, setDeadline] = useState("2024-10-24");
  const [priority, setPriority] = useState<PriorityType>("Alfa");
  const [repoBranch, setRepoBranch] = useState("/main/dev/branch-01");
  const [collaboratorCount, setCollaboratorCount] = useState(4);
  const [briefingText, setBriefingText] = useState(
    "Desenvolvimento de plataforma web de alto desempenho com design minimalista, renderização de tipografia em escala massiva e painel de controle operacional em tempo real."
  );

  // Workflow State
  const [workflowState, setWorkflowState] = useState<WorkflowStateType>("idle");
  const [progress, setProgress] = useState(32);
  const [activeSeconds, setActiveSeconds] = useState(0);

  // Checklists (Estratégia)
  const [checklists, setChecklists] = useState([
    { id: "briefing", text: "Briefing do cliente definido", checked: true },
    { id: "escopo", text: "Escopo técnico validado", checked: false },
    { id: "equipe", text: "Alocação de especialistas concluída", checked: false },
    { id: "chaves", text: "Chaves de acesso configuradas", checked: false },
  ]);

  // Terminal Logs
  const [logs, setLogs] = useState<string[]>([
    "[SISTEMA] Laboratório de Projetos iniciado.",
    "[REDE] Conexão com Nexus Hub estabelecida com sucesso."
  ]);

  // Simulated live metrics
  const [latency, setLatency] = useState(12);
  const [cpuUsage, setCpuUsage] = useState(14);
  const [memoryUsage, setMemoryUsage] = useState(38);

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Fluctuating Latency & System Metrics
  useEffect(() => {
    const interval = setInterval(() => {
      setLatency((prev) => {
        const delta = Math.random() > 0.5 ? 1 : -1;
        const next = prev + delta;
        return next < 8 ? 8 : next > 18 ? 18 : next;
      });

      if (workflowState === "running") {
        setCpuUsage(() => Math.floor(Math.random() * 30) + 60); // 60-90% during boot
        setMemoryUsage(() => Math.floor(Math.random() * 5) + 55);
      } else if (workflowState === "completed") {
        setCpuUsage(() => Math.floor(Math.random() * 8) + 12);  // 12-20% idle active
        setMemoryUsage(() => Math.floor(Math.random() * 3) + 48);
      } else {
        setCpuUsage(() => Math.floor(Math.random() * 4) + 8);   // 8-12% idle
        setMemoryUsage(() => Math.floor(Math.random() * 2) + 32);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [workflowState]);

  // Manage Active Stopwatch & Auto Log Generator when Running
  useEffect(() => {
    if (workflowState === "running") {
      let currentProgress = progress;
      const logTemplates = [
        "[BOOT] Inicializando contêiner Docker seguro...",
        "[CONFIG] Injetando variáveis de ambiente e segredos de API...",
        "[REPO] Clonando ramificação: /main/dev/branch-01...",
        `[EQUIPE] Vinculando ${collaboratorCount} especialistas à área de trabalho operacional...`,
        `[PRIORIDADE] Escalonando recursos de CPU para o nível de prioridade: ${priority}...`,
        "[PIPELINE] Compilando dependências do projeto e empacotando assets...",
        "[DB] Provisionando banco de dados de alto desempenho...",
        "[SUCCESS] Ambiente inicializado com sucesso e pronto para deploy!",
        "[NEXUS] Canal operacional ativo. Redirecionando para visualizador de execução..."
      ];

      let logIndex = 0;

      const runTimer = setInterval(() => {
        setActiveSeconds((prev) => prev + 1);

        // Advance progress up to 100
        if (currentProgress < 100) {
          const step = Math.floor(Math.random() * 15) + 5;
          currentProgress = Math.min(currentProgress + step, 100);
          setProgress(currentProgress);
        }

        // Add logs dynamically
        if (logIndex < logTemplates.length) {
          setLogs((prev) => [...prev, logTemplates[logIndex]]);
          logIndex++;
        }

        if (currentProgress === 100 && logIndex >= logTemplates.length) {
          setWorkflowState("completed");
          setLogs((prev) => [...prev, "[SISTEMA] STATUS OPERACIONAL: ATIVO E ESTÁVEL."]);
          clearInterval(runTimer);
        }
      }, 1000);

      return () => clearInterval(runTimer);
    }
  }, [workflowState, collaboratorCount, priority]);

  // Keep terminal scrolled to bottom
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  // Adjust progress based on checked checklist items in idle state
  const handleToggleCheck = (id: string) => {
    if (workflowState !== "idle") return; // Prevent checklist changes while running/completed

    const updated = checklists.map((item) => {
      if (item.id === id) {
        return { ...item, checked: !item.checked };
      }
      return item;
    });
    setChecklists(updated);

    // Dynamic progress calculation (base 10% + 22.5% per check)
    const checkedCount = updated.filter((i) => i.checked).length;
    const computedProgress = Math.floor(10 + checkedCount * 22.5);
    setProgress(computedProgress);

    // Logging changes
    const changedItem = updated.find((i) => i.id === id);
    if (changedItem) {
      setLogs((prev) => [
        ...prev,
        `[ESTRATÉGIA] Requisito '${changedItem.text}' marcado como ${changedItem.checked ? "CONCLUÍDO" : "PENDENTE"}.`
      ]);
    }
  };

  // Start / Stop workflow action
  const handleTriggerWorkflow = () => {
    if (workflowState === "idle") {
      setWorkflowState("running");
      setProgress(Math.max(progress, 32));
      setLogs((prev) => [
        ...prev,
        `[SISTEMA] Iniciando Workflow do projeto '${projectName}' para o cliente '${clientName}'...`
      ]);
      setCurrentTab("execucao");
    } else {
      // Reset
      setWorkflowState("idle");
      setProgress(32);
      setActiveSeconds(0);
      setChecklists([
        { id: "briefing", text: "Briefing do cliente definido", checked: true },
        { id: "escopo", text: "Escopo técnico validado", checked: false },
        { id: "equipe", text: "Alocação de especialistas concluída", checked: false },
        { id: "chaves", text: "Chaves de acesso configuradas", checked: false },
      ]);
      setLogs([
        "[SISTEMA] Workflow redefinido pelo operador.",
        "[SISTEMA] Laboratório operacional aguardando inicialização."
      ]);
      setCurrentTab("briefing");
    }
  };

  // Split massive name into words for spectacular multi-line display
  const renderMassiveTitle = () => {
    const uppercaseName = projectName.trim().toUpperCase() || "NOVO PROJETO";
    const words = uppercaseName.split(" ");
    if (words.length === 1) {
      return (
        <h1 id="massive-title" className="massive-text text-5xl sm:text-7xl md:text-[90px] lg:text-[120px] xl:text-[140px] tracking-tighter leading-none select-none break-all max-w-full">
          {words[0]}
        </h1>
      );
    }
    return (
      <h1 id="massive-title" className="massive-text text-5xl sm:text-7xl md:text-[90px] lg:text-[120px] xl:text-[140px] tracking-tighter leading-[0.8] select-none break-words max-w-full">
        {words[0]}
        <br />
        <span className="text-white/40">{words.slice(1).join(" ")}</span>
      </h1>
    );
  };

  // Get active specialists from the pool based on count
  const activeSpecialists = SPEC_POOL.slice(0, Math.min(collaboratorCount, SPEC_POOL.length));

  // Human-readable priority styles
  const getPriorityBadgeClass = (p: PriorityType) => {
    switch (p) {
      case "Alfa":
        return "text-[#FF4D00] border-[#FF4D00]/30 bg-[#FF4D00]/10";
      case "Beta":
        return "text-yellow-500 border-yellow-500/30 bg-yellow-500/10";
      case "Gama":
        return "text-cyan-400 border-cyan-400/30 bg-cyan-400/10";
      case "Sigma":
        return "text-purple-400 border-purple-400/30 bg-purple-400/10";
    }
  };

  // Format stopwatch seconds
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div id="app-root" className="h-screen w-full flex flex-col justify-between bg-[#0A0A0A] text-white font-sans overflow-hidden select-none">
      
      {/* HEADER BAR */}
      <header id="app-header" className="flex-none h-20 border-b border-white/10 flex items-center px-6 md:px-12 justify-between z-10 bg-[#0A0A0A]/95 backdrop-blur">
        <div id="brand-container" className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#FF4D00] flex items-center justify-center font-bold text-black tracking-tighter text-sm">
            N
          </div>
          <div className="text-sm font-bold tracking-widest uppercase font-mono">
            Nexus <span className="text-white/40">/</span> <span className="text-[#FF4D00]">Lab</span>
          </div>
        </div>

        {/* Dynamic Navigation Tabs */}
        <div id="navigation-tabs" className="flex gap-4 md:gap-8 text-[10px] md:text-xs uppercase tracking-widest font-mono">
          <button
            id="tab-btn-briefing"
            onClick={() => setCurrentTab("briefing")}
            className={`cursor-pointer transition-all duration-200 py-1 ${
              currentTab === "briefing"
                ? "text-white border-b-2 border-[#FF4D00] font-bold"
                : "text-white/50 hover:text-white"
            }`}
          >
            01 <span className="hidden sm:inline">/ Briefing</span>
          </button>
          <button
            id="tab-btn-estrategia"
            onClick={() => setCurrentTab("estrategia")}
            className={`cursor-pointer transition-all duration-200 py-1 ${
              currentTab === "estrategia"
                ? "text-white border-b-2 border-[#FF4D00] font-bold"
                : "text-white/50 hover:text-white"
            }`}
          >
            02 <span className="hidden sm:inline">/ Estratégia</span>
          </button>
          <button
            id="tab-btn-execucao"
            onClick={() => setCurrentTab("execucao")}
            className={`cursor-pointer transition-all duration-200 py-1 ${
              currentTab === "execucao"
                ? "text-white border-b-2 border-[#FF4D00] font-bold"
                : "text-white/50 hover:text-white"
            }`}
          >
            03 <span className="hidden sm:inline">/ Execução</span>
          </button>
        </div>

        {/* Live Status Indicator */}
        <div id="status-indicator" className="flex items-center gap-2 font-mono text-xs uppercase">
          {workflowState === "idle" && (
            <span className="text-yellow-500 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 animate-pulse"></span>
              Preparando
            </span>
          )}
          {workflowState === "running" && (
            <span className="text-[#FF4D00] flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF4D00] animate-ping"></span>
              Inicializando
            </span>
          )}
          {workflowState === "completed" && (
            <span className="text-emerald-500 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Ativo
            </span>
          )}
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main id="app-main" className="flex-1 relative flex flex-col md:flex-row items-stretch justify-between overflow-hidden">
        
        {/* Left Vertical Metadata Banner (Hidden on small screens) */}
        <div id="vertical-banner" className="hidden lg:flex items-center justify-center w-20 border-r border-white/10 relative">
          <div className="vertical-text uppercase text-white/20 text-[10px] tracking-[0.4em] font-mono whitespace-nowrap">
            Protocolo de Inicialização v.4.0 <span className="text-[#FF4D00] ml-4">●</span>
          </div>
        </div>

        {/* Primary Interactive Workspace Grid */}
        <div id="workspace-grid" className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden h-full">
          
          {/* LEFT PANEL: Interactive Configurations Form / Controls */}
          <div id="left-config-panel" className="col-span-1 lg:col-span-5 border-b lg:border-b-0 lg:border-r border-white/10 flex flex-col justify-between overflow-y-auto bg-[#0D0D0D]/50 p-6 md:p-8 lg:p-10 space-y-6">
            
            <AnimatePresence mode="wait">
              {currentTab === "briefing" && (
                <motion.div
                  key="briefing-tab"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="space-y-1">
                    <span className="text-[10px] tracking-[0.2em] font-mono text-[#FF4D00] uppercase block">Ajustes Iniciais</span>
                    <h2 className="text-xl font-bold tracking-tight">Briefing do Projeto</h2>
                    <p className="text-xs text-white/40">Defina as especificações básicas de inicialização.</p>
                  </div>

                  {/* Form inputs */}
                  <div className="space-y-4 font-mono text-xs">
                    
                    {/* Project Name */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/40 uppercase tracking-widest block">Nome do Projeto</label>
                      <input
                        id="input-project-name"
                        type="text"
                        value={projectName}
                        onChange={(e) => {
                          setProjectName(e.target.value);
                          setLogs((prev) => [...prev, `[USER] Nome do projeto alterado para: '${e.target.value}'`]);
                        }}
                        disabled={workflowState !== "idle"}
                        className="w-full bg-[#141414] border border-white/10 hover:border-white/20 focus:border-[#FF4D00] focus:outline-none py-2.5 px-3 text-sm text-white font-medium transition-colors"
                        placeholder="Insira o nome do projeto"
                      />
                    </div>

                    {/* Client Name */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] text-white/40 uppercase tracking-widest block">Cliente</label>
                        <input
                          id="input-client-name"
                          type="text"
                          value={clientName}
                          onChange={(e) => {
                            setClientName(e.target.value);
                            setLogs((prev) => [...prev, `[USER] Cliente alterado para: '${e.target.value}'`]);
                          }}
                          disabled={workflowState !== "idle"}
                          className="w-full bg-[#141414] border border-white/10 focus:border-[#FF4D00] focus:outline-none py-2.5 px-3 text-sm transition-colors"
                          placeholder="Nome do cliente"
                        />
                      </div>

                      {/* Deadline */}
                      <div className="space-y-1">
                        <label className="text-[10px] text-white/40 uppercase tracking-widest block">Prazo Operacional</label>
                        <input
                          id="input-deadline"
                          type="date"
                          value={deadline}
                          onChange={(e) => {
                            setDeadline(e.target.value);
                            setLogs((prev) => [...prev, `[USER] Prazo redefinido para: '${e.target.value}'`]);
                          }}
                          disabled={workflowState !== "idle"}
                          className="w-full bg-[#141414] border border-white/10 focus:border-[#FF4D00] focus:outline-none py-2 px-3 text-sm transition-colors text-white"
                        />
                      </div>
                    </div>

                    {/* Priority Level */}
                    <div className="space-y-2">
                      <label className="text-[10px] text-white/40 uppercase tracking-widest block">Nível de Prioridade</label>
                      <div className="grid grid-cols-4 gap-2">
                        {(["Alfa", "Beta", "Gama", "Sigma"] as PriorityType[]).map((p) => (
                          <button
                            id={`priority-btn-${p}`}
                            key={p}
                            type="button"
                            onClick={() => {
                              setPriority(p);
                              setLogs((prev) => [...prev, `[USER] Nível de prioridade configurado para: ${p}`]);
                            }}
                            disabled={workflowState !== "idle"}
                            className={`py-2 text-[10px] font-bold border transition-all duration-150 rounded uppercase ${
                              priority === p
                                ? "bg-white text-black border-white"
                                : "bg-transparent text-white/60 border-white/10 hover:border-white/30"
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Scope Briefing Text */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/40 uppercase tracking-widest block">Escopo Técnico / Notas</label>
                      <textarea
                        id="input-briefing-text"
                        value={briefingText}
                        onChange={(e) => setBriefingText(e.target.value)}
                        disabled={workflowState !== "idle"}
                        rows={3}
                        className="w-full bg-[#141414] border border-white/10 hover:border-white/20 focus:border-[#FF4D00] focus:outline-none p-3 text-xs leading-relaxed text-white/80 transition-colors resize-none"
                        placeholder="Descreva as especificações do escopo..."
                      />
                    </div>

                    {/* Repository Branch Input */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/40 uppercase tracking-widest block">Branch de Repositório</label>
                      <input
                        id="input-branch"
                        type="text"
                        value={repoBranch}
                        onChange={(e) => setRepoBranch(e.target.value)}
                        disabled={workflowState !== "idle"}
                        className="w-full bg-[#141414] border border-white/10 focus:border-[#FF4D00] focus:outline-none py-2 px-3 text-xs font-mono transition-colors"
                      />
                    </div>

                  </div>
                </motion.div>
              )}

              {currentTab === "estrategia" && (
                <motion.div
                  key="estrategia-tab"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="space-y-1">
                    <span className="text-[10px] tracking-[0.2em] font-mono text-[#FF4D00] uppercase block">Fase Pré-Operacional</span>
                    <h2 className="text-xl font-bold tracking-tight">Configurações e Pré-requisitos</h2>
                    <p className="text-xs text-white/40">Conclua os pré-requisitos técnicos para elevar o nível de prontidão da infraestrutura.</p>
                  </div>

                  {/* Checklist Section */}
                  <div className="space-y-4">
                    <div className="text-[10px] tracking-widest uppercase text-white/40 font-mono">Checklist de Prontidão</div>
                    <div className="space-y-2">
                      {checklists.map((item) => (
                        <div
                          id={`checklist-item-${item.id}`}
                          key={item.id}
                          onClick={() => handleToggleCheck(item.id)}
                          className={`flex items-center gap-3 p-3.5 border transition-all duration-150 cursor-pointer ${
                            item.checked
                              ? "bg-white/5 border-white/20 text-white"
                              : "bg-transparent border-white/10 text-white/40 hover:border-white/20 hover:text-white/60"
                          } ${workflowState !== "idle" ? "pointer-events-none opacity-80" : ""}`}
                        >
                          <div
                            className={`w-4 h-4 flex items-center justify-center border transition-all ${
                              item.checked ? "border-[#FF4D00] bg-[#FF4D00]" : "border-white/30"
                            }`}
                          >
                            {item.checked && <Check className="w-3 h-3 text-white stroke-[3px]" />}
                          </div>
                          <span className="text-xs font-mono tracking-tight">{item.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Operational specialists selection */}
                  <div className="space-y-3 font-mono">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] tracking-widest uppercase text-white/40">Especialistas Alocados</span>
                      <span className="text-xs text-white font-bold">{collaboratorCount.toString().padStart(2, "0")} / 08</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        id="collab-decrease-btn"
                        type="button"
                        onClick={() => {
                          if (collaboratorCount > 1) {
                            setCollaboratorCount(collaboratorCount - 1);
                            setLogs((prev) => [...prev, `[USER] Especialistas reduzidos para ${collaboratorCount - 1}`]);
                          }
                        }}
                        disabled={workflowState !== "idle" || collaboratorCount <= 1}
                        className="w-10 h-10 border border-white/10 hover:border-white/30 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center cursor-pointer text-white"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <div className="flex-1 text-center bg-[#141414] border border-white/10 py-2 text-sm font-bold">
                        {collaboratorCount} Profissionais
                      </div>
                      <button
                        id="collab-increase-btn"
                        type="button"
                        onClick={() => {
                          if (collaboratorCount < 8) {
                            setCollaboratorCount(collaboratorCount + 1);
                            setLogs((prev) => [...prev, `[USER] Especialistas aumentados para ${collaboratorCount + 1}`]);
                          }
                        }}
                        disabled={workflowState !== "idle" || collaboratorCount >= 8}
                        className="w-10 h-10 border border-white/10 hover:border-white/30 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center cursor-pointer text-white"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Render profiles pool */}
                    <div className="grid grid-cols-4 gap-2 pt-2">
                      {activeSpecialists.map((spec, idx) => (
                        <div
                          key={idx}
                          className="border border-white/10 p-2 text-center bg-[#0F0F0F] hover:border-white/20 transition-colors"
                        >
                          <div className="w-8 h-8 rounded-full bg-white/10 text-[10px] font-bold text-[#FF4D00] flex items-center justify-center mx-auto mb-1">
                            {spec.avatar}
                          </div>
                          <div className="text-[8px] uppercase tracking-tighter truncate text-white" title={spec.name}>
                            {spec.name.split(" ")[0]}
                          </div>
                          <div className="text-[7px] text-white/40 truncate">
                            {spec.role}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {currentTab === "execucao" && (
                <motion.div
                  key="execucao-tab"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6 flex-1 flex flex-col justify-between"
                >
                  <div className="space-y-5">
                    <div className="space-y-1">
                      <span className="text-[10px] tracking-[0.2em] font-mono text-[#FF4D00] uppercase block">Monitor do Workflow</span>
                      <h2 className="text-xl font-bold tracking-tight">Status Operacional</h2>
                      <p className="text-xs text-white/40">Visualização de logs de conteinerização em tempo real e telemetria de rede.</p>
                    </div>

                    {/* Telemetry Grid */}
                    <div className="grid grid-cols-3 gap-2 font-mono text-center">
                      <div className="border border-white/10 p-3 bg-[#111] flex flex-col justify-between h-20">
                        <span className="text-[8px] uppercase tracking-wider text-white/40">CPU Load</span>
                        <span className="text-lg font-bold tracking-tight text-[#FF4D00]">{cpuUsage}%</span>
                        <div className="w-full bg-white/5 h-1 rounded overflow-hidden mt-1">
                          <div className="bg-[#FF4D00] h-full" style={{ width: `${cpuUsage}%` }}></div>
                        </div>
                      </div>
                      <div className="border border-white/10 p-3 bg-[#111] flex flex-col justify-between h-20">
                        <span className="text-[8px] uppercase tracking-wider text-white/40">Memória</span>
                        <span className="text-lg font-bold tracking-tight text-white">{memoryUsage}%</span>
                        <div className="w-full bg-white/5 h-1 rounded overflow-hidden mt-1">
                          <div className="bg-white/40 h-full" style={{ width: `${memoryUsage}%` }}></div>
                        </div>
                      </div>
                      <div className="border border-white/10 p-3 bg-[#111] flex flex-col justify-between h-20">
                        <span className="text-[8px] uppercase tracking-wider text-white/40">Estável</span>
                        <span className="text-lg font-bold tracking-tight text-emerald-500">100%</span>
                        <div className="w-full bg-white/5 h-1 rounded overflow-hidden mt-1">
                          <div className="bg-emerald-500 h-full w-full"></div>
                        </div>
                      </div>
                    </div>

                    {/* Status Dashboard Detail */}
                    <div className="border border-white/10 p-4 space-y-3 bg-[#141414]/30 font-mono text-xs">
                      <div className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-white/40 uppercase text-[9px] tracking-wider">Cronômetro</span>
                        <span className="text-white font-medium flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-[#FF4D00]" />
                          {formatTime(activeSeconds)}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-white/40 uppercase text-[9px] tracking-wider">Branch Ativo</span>
                        <span className="text-white truncate max-w-[180px]">{repoBranch}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/40 uppercase text-[9px] tracking-wider">Alocação de Especialistas</span>
                        <span className="text-white">{collaboratorCount} Operadores Ativos</span>
                      </div>
                    </div>
                  </div>

                  {/* Manual trigger for quick testing inside execution tab */}
                  {workflowState === "completed" && (
                    <div className="p-4 border border-[#FF4D00]/20 bg-[#FF4D00]/5 text-xs font-mono space-y-2 rounded">
                      <div className="flex items-center gap-1.5 text-[#FF4D00] font-bold">
                        <CheckCircle className="w-4 h-4" />
                        INFRAESTRUTURA COMPILADA
                      </div>
                      <p className="text-white/60 leading-relaxed text-[11px]">
                        O ambiente de sandbox do projeto <span className="text-white font-semibold">"{projectName}"</span> foi provisionado e as branches de repositório foram mapeadas com sucesso.
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Quick Actions at bottom of the Panel */}
            <div id="panel-bottom-controls" className="pt-4 border-t border-white/10 font-mono flex items-center justify-between text-[11px] text-white/40">
              <div className="flex items-center gap-1">
                <Wifi className="w-3 h-3 text-[#FF4D00] animate-pulse" />
                <span>Serviço: Nexus Labs v4</span>
              </div>
              <div>
                <span>ID: {projectName.toUpperCase().replace(/\s+/g, "-") || "NEXUS"}-99</span>
              </div>
            </div>

          </div>

          {/* RIGHT PANEL: Spectacular Massive typography & Interactive Live Preview */}
          <div id="right-display-panel" className="col-span-1 lg:col-span-7 flex flex-col justify-between relative p-6 md:p-8 lg:p-12 overflow-hidden h-full">
            
            {/* Background ambient pattern */}
            <div className="absolute inset-0 bg-radial-[circle_at_center,rgba(255,77,0,0.03),transparent_70%] pointer-events-none"></div>

            {/* Top header on display area */}
            <div className="flex items-center justify-between z-10 font-mono text-[10px] tracking-widest text-white/50 uppercase">
              <div className="flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#FF4D00]"></span>
                <span>Preparando Ambiente</span>
              </div>
              <div>{clientName.toUpperCase()} // DESIGN HUB</div>
            </div>

            {/* Center Display: Gorgeous scale typography */}
            <div className="my-auto py-12 flex flex-col items-center justify-center text-center z-10 relative">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="space-y-4 max-w-full"
              >
                <div className="text-[10px] sm:text-xs uppercase tracking-[0.5em] mb-2 text-white/50 font-mono">
                  {currentTab === "briefing" && "Configurando Briefing"}
                  {currentTab === "estrategia" && "Avaliando Requisitos"}
                  {currentTab === "execucao" && workflowState === "running" && "Executando Protocolo"}
                  {currentTab === "execucao" && workflowState === "completed" && "Pipeline Concluída"}
                </div>
                
                {/* Dynamically renders the edited Project Name in massive Swiss display format */}
                <div className="overflow-visible select-none max-w-full">
                  {renderMassiveTitle()}
                </div>

                {/* Subtitle details */}
                <div className="mt-8 md:mt-12 flex flex-wrap justify-center gap-6 sm:gap-12 text-left font-mono">
                  <div>
                    <div className="text-[9px] uppercase text-white/40 mb-1">Cliente</div>
                    <div id="preview-client-name" className="text-sm md:text-base font-medium text-white">{clientName || "—"}</div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase text-white/40 mb-1">Deadline</div>
                    <div id="preview-deadline" className="text-sm md:text-base font-medium underline underline-offset-4 decoration-1 text-white">
                      {deadline ? new Date(deadline).toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" }) : "Indefinido"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase text-white/40 mb-1">Prioridade</div>
                    <div id="preview-priority" className="text-sm md:text-base font-medium flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getPriorityBadgeClass(priority)}`}>
                        {priority}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Circular Trigger Action Button - Styled identically to Design HTML */}
            <button
              id="workflow-trigger-btn"
              onClick={handleTriggerWorkflow}
              className={`absolute right-6 md:right-12 bottom-6 md:bottom-12 border p-6 rounded-full w-28 h-28 sm:w-32 sm:h-32 flex flex-col items-center justify-center text-[10px] uppercase tracking-tighter text-center leading-none cursor-pointer transition-all duration-300 select-none z-20 font-mono ${
                workflowState === "idle"
                  ? "border-white/20 hover:bg-white hover:text-black text-white"
                  : "border-[#FF4D00]/50 bg-[#FF4D00]/10 hover:bg-[#FF4D00] hover:text-black text-[#FF4D00]"
              }`}
            >
              {workflowState === "idle" && (
                <>
                  <Play className="w-4 h-4 mb-1.5 text-[#FF4D00]" />
                  Iniciar<br />Workflow
                </>
              )}
              {workflowState === "running" && (
                <div className="flex flex-col items-center">
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin mb-1.5"></div>
                  Injetando...
                </div>
              )}
              {workflowState === "completed" && (
                <>
                  <RotateCcw className="w-4 h-4 mb-1.5 text-black" />
                  Redefinir<br />Setup
                </>
              )}
            </button>

            {/* Terminal console on bottom area */}
            <div id="terminal-pane" className="border-t border-white/10 pt-4 font-mono text-[10px] text-white/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div className="flex items-center gap-1.5 max-w-full">
                <Terminal className="w-3.5 h-3.5 text-white/40 shrink-0" />
                <span className="truncate text-white/50">{logs[logs.length - 1]}</span>
              </div>
              <button
                id="view-logs-trigger"
                onClick={() => setCurrentTab("execucao")}
                className="text-[#FF4D00] hover:underline font-bold uppercase tracking-wider cursor-pointer whitespace-nowrap"
              >
                Ver Terminal Completo
              </button>
            </div>

          </div>

        </div>
      </main>

      {/* FOOTER METRICS GRID - 4 Columns */}
      <footer id="app-footer" className="flex-none h-auto md:h-28 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 font-mono bg-[#070707] z-10">
        
        {/* Column 1: Repo info */}
        <div className="border-b sm:border-b-0 border-r border-white/10 p-5 md:p-6 flex flex-col justify-between space-y-1">
          <span className="text-[8px] md:text-[9px] text-white/40 uppercase tracking-widest">Repositório</span>
          <span className="text-xs md:text-sm text-white font-mono font-medium truncate" title={repoBranch}>
            {repoBranch}
          </span>
        </div>

        {/* Column 2: Collaborators count */}
        <div className="border-b sm:border-b-0 border-r border-white/10 p-5 md:p-6 flex flex-col justify-between space-y-1">
          <span className="text-[8px] md:text-[9px] text-white/40 uppercase tracking-widest">Equipe Operacional</span>
          <div className="flex items-center justify-between">
            <span className="text-xs md:text-sm text-white font-medium">+{collaboratorCount.toString().padStart(2, "0")} Especialistas</span>
            <div className="flex gap-0.5">
              {Array.from({ length: Math.min(collaboratorCount, 4) }).map((_, i) => (
                <div key={i} className="w-2 h-2 rounded-full bg-[#FF4D00]"></div>
              ))}
            </div>
          </div>
        </div>

        {/* Column 3: Live fluctuating latency */}
        <div className="border-b md:border-b-0 border-r border-white/10 p-5 md:p-6 flex flex-col justify-between space-y-1">
          <span className="text-[8px] md:text-[9px] text-white/40 uppercase tracking-widest">Status de Rede</span>
          <div className="flex items-center justify-between">
            <span className="text-xs md:text-sm text-white font-medium">Latência: {latency}ms</span>
            <span className="text-emerald-500 font-bold text-[10px] tracking-wide animate-pulse">● EXCELENTE</span>
          </div>
        </div>

        {/* Column 4: Config progress bar */}
        <div className="p-5 md:p-6 flex flex-col justify-center space-y-2">
          <div className="flex justify-between items-center text-[8px] md:text-[9px]">
            <span className="text-white/40 uppercase tracking-widest">Status de Configuração</span>
            <span className="text-[#FF4D00] font-bold">{progress}%</span>
          </div>
          <div className="w-full h-1.5 bg-white/10 relative overflow-hidden rounded-sm">
            <motion.div
              initial={{ width: "32%" }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="absolute top-0 left-0 h-full bg-[#FF4D00]"
            ></motion.div>
          </div>
        </div>

      </footer>
    </div>
  );
}
