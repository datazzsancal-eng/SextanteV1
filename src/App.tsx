import React, { useState, useCallback, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import DashboardView from './components/DashboardView';
import CargaDadosView from './components/CargaDadosView';
import ParametrosView from './components/ParametrosView';
import UsuariosView from './components/UsuariosView';
import ConfiguracoesView from './components/ConfiguracoesView';
import CadastrosView from './components/CadastrosView';
import HonorariosView from './components/HonorariosView';
import NovoDashView from './components/NovoDashView';
import DashLiderancaView from './components/DashLiderancaView';

import {
  initialSinaleira,
  initialContracts,
  initialUploadedFiles,
  initialUsers,
  initialMotives,
  initialActions,
  initialSettings,
  initialClientes,
  initialDepartamentos,
  initialColaboradores,
  initialTarefas
} from './initialData';

import { Contract, UploadedFile, UserProfile, DefinedAction, GlobalSettings, SinaleiraConfig, Cliente, Departamento, Colaborador, Tarefa } from './types';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('novodash');
  const [isExecutiveView, setIsExecutiveView] = useState<boolean>(true);

  // Auto-switch to operational dash if switching to leader view
  useEffect(() => {
    if (!isExecutiveView && currentTab !== 'dashlideranca') {
      setCurrentTab('dashlideranca');
    }
  }, [isExecutiveView, currentTab]);

  // Shared application states
  const [contracts, setContracts] = useState<Contract[]>(initialContracts);
  const [sinaleira, setSinaleira] = useState(initialSinaleira);
  const [motives, setMotives] = useState<string[]>(initialMotives);
  const [actions, setActions] = useState<DefinedAction[]>(initialActions);
  const [qtdeHorasMes, setQtdeHorasMes] = useState<number>(() => {
    const cached = localStorage.getItem('qtdeHorasMes');
    return cached ? parseInt(cached, 10) : 220;
  });
  const [users, setUsers] = useState<UserProfile[]>(initialUsers);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>(initialUploadedFiles);
  const [settings, setSettings] = useState<GlobalSettings>(initialSettings);

  const [clientes, setClientes] = useState<Cliente[]>(initialClientes);
  const [departamentos, setDepartamentos] = useState<Departamento[]>(initialDepartamentos);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>(initialColaboradores);
  const [tarefas, setTarefas] = useState<Tarefa[]>(initialTarefas);

  // Fetch parameters from Supabase if configured
  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      const loadParametros = async () => {
        try {
          const { data, error } = await supabase
            .from('parametros_sistema')
            .select('*')
            .eq('id', 'config_global')
            .single();

          if (error) {
            console.warn('Erro ao carregar parâmetros do Supabase:', error.message);
          } else if (data) {
            console.log('Parâmetros carregados com sucesso do Supabase:', data);
            if (data.sinaleira) setSinaleira(data.sinaleira);
            if (data.motivos) setMotives(data.motivos);
            if (data.acoes) setActions(data.acoes);
            if (data.qtde_horas_mes) {
              setQtdeHorasMes(data.qtde_horas_mes);
              localStorage.setItem('qtdeHorasMes', String(data.qtde_horas_mes));
            }
          }
        } catch (err) {
          console.warn('Erro de conexão com tabela parametros_sistema:', err);
        }
      };
      loadParametros();
    }
  }, []);

  // Profile pool for the interactive user switcher at the bottom left helper
  const profilePool: UserProfile[] = [
    { id: 'p1', name: 'Alex Thompson', email: 'alex.thompson@sextante.com.br', role: 'ADMINISTRATOR', status: 'Ativo', avatar: 'AT' },
    { id: 'p2', name: 'Admin User', email: 'admin.user@sextante.com.br', role: 'ADMINISTRATOR', status: 'Ativo', avatar: 'AU' },
    { id: 'p3', name: 'Alexandre M.', email: 'alexandre.m@sextante.com.br', role: 'ADMINISTRATOR', status: 'Ativo', avatar: 'AM' },
    { id: 'p4', name: 'Mariana Silva', email: 'mariana.silva@sextante.com.br', role: 'MANAGER', status: 'Ativo', avatar: 'MS' },
    { id: 'p5', name: 'Bruno Pires', email: 'bruno.p@sextante.com.br', role: 'ANALYST', status: 'Inativo', avatar: 'BP' }
  ];
  
  const [profileIndex, setProfileIndex] = useState(0);
  const currentUser = profilePool[profileIndex];

  // Cycling function for active profile
  const handleCycleUser = useCallback(() => {
    setProfileIndex((prev) => (prev + 1) % profilePool.length);
  }, []);

  // Contracts updates handlers
  const handleUpdateContract = useCallback((id: string, updatedFields: Partial<Contract>) => {
    setContracts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updatedFields } : c))
    );
  }, []);

  const handleAddContract = useCallback((newContract: Contract) => {
    setContracts((prev) => [newContract, ...prev]);
  }, []);

  // Files load handlers
  const handleAddFile = useCallback((newFile: UploadedFile) => {
    setUploadedFiles((prev) => [newFile, ...prev]);
    
    // Side effect simulator: if it's a success, let's create a simulated contract based on the uploaded file
    if (newFile.status === 'SUCESSO') {
      const generatedContract: Contract = {
        id: Math.random().toString(36).substr(2, 9),
        name: `${newFile.filename.replace('.csv', '')} - Importado`,
        rentability: parseFloat((10 + Math.random() * 15).toFixed(1)),
        monthlyImpact: -Math.floor(15000 + Math.random() * 45000),
        deviation: parseFloat((5 + Math.random() * 35).toFixed(1)),
        motive: motives[Math.floor(Math.random() * motives.length)] || 'Erro operacional',
        action: 'Revisão interna',
        responsible: currentUser.name
      };
      
      setContracts(prev => [generatedContract, ...prev]);
    }
  }, [motives, currentUser]);

  const handleClearLogs = useCallback(() => {
    setUploadedFiles([]);
  }, []);

  // Parameters configurations hooks
  const handleUpdateSinaleira = useCallback((updated: { dentro: SinaleiraConfig; atencao: SinaleiraConfig; critico: SinaleiraConfig }) => {
    setSinaleira(updated);
    if (isSupabaseConfigured && supabase) {
      supabase
        .from('parametros_sistema')
        .update({ sinaleira: updated })
        .eq('id', 'config_global')
        .then(({ error }) => {
          if (error) console.error('Erro ao atualizar sinaleira no Supabase:', error.message);
        });
    }
  }, []);

  const handleUpdateMotives = useCallback((newMotives: string[]) => {
    setMotives(newMotives);
    if (isSupabaseConfigured && supabase) {
      supabase
        .from('parametros_sistema')
        .update({ motivos: newMotives })
        .eq('id', 'config_global')
        .then(({ error }) => {
          if (error) console.error('Erro ao atualizar motivos no Supabase:', error.message);
        });
    }
  }, []);

  const handleUpdateActions = useCallback((newActions: DefinedAction[]) => {
    setActions(newActions);
    if (isSupabaseConfigured && supabase) {
      supabase
        .from('parametros_sistema')
        .update({ acoes: newActions })
        .eq('id', 'config_global')
        .then(({ error }) => {
          if (error) console.error('Erro ao atualizar ações no Supabase:', error.message);
        });
    }
  }, []);

  const handleUpdateQtdeHorasMes = useCallback((newValue: number) => {
    setQtdeHorasMes(newValue);
    localStorage.setItem('qtdeHorasMes', String(newValue));
    if (isSupabaseConfigured && supabase) {
      supabase
        .from('parametros_sistema')
        .update({ qtde_horas_mes: newValue })
        .eq('id', 'config_global')
        .then(({ error }) => {
          if (error) console.error('Erro ao atualizar qtde_horas_mes no Supabase:', error.message);
        });
    }
  }, []);

  const handleRestoreDefaults = useCallback(() => {
    setSinaleira(initialSinaleira);
    setMotives(initialMotives);
    setActions(initialActions);
    setQtdeHorasMes(220);
    localStorage.setItem('qtdeHorasMes', '220');
    
    if (isSupabaseConfigured && supabase) {
      supabase
        .from('parametros_sistema')
        .update({
          sinaleira: initialSinaleira,
          motivos: initialMotives,
          acoes: initialActions,
          qtde_horas_mes: 220
        })
        .eq('id', 'config_global')
        .then(({ error }) => {
          if (error) console.error('Erro ao restaurar defaults no Supabase:', error.message);
        });
    }
  }, []);

  // Access directory hooks
  const handleAddUser = useCallback((newUser: UserProfile) => {
    setUsers((prev) => [...prev, newUser]);
  }, []);

  const handleRemoveUser = useCallback((id: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
  }, []);

  // Cadastros Module handlers
  const handleAddCliente = useCallback((newC: Cliente) => {
    setClientes((prev) => [...prev, newC]);
  }, []);

  const handleRemoveCliente = useCallback((id: string) => {
    setClientes((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const handleAddDepartamento = useCallback((newD: Departamento) => {
    setDepartamentos((prev) => [...prev, newD]);
  }, []);

  const handleRemoveDepartamento = useCallback((id: string) => {
    setDepartamentos((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const handleAddColaborador = useCallback((newCol: Colaborador) => {
    setColaboradores((prev) => [...prev, newCol]);
  }, []);

  const handleRemoveColaborador = useCallback((id: string) => {
    setColaboradores((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const handleAddTarefa = useCallback((newT: Tarefa) => {
    setTarefas((prev) => [...prev, newT]);
  }, []);

  const handleRemoveTarefa = useCallback((id: string) => {
    setTarefas((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleToggleTarefaStatus = useCallback((id: string) => {
    setTarefas((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const nextStatus: Record<Tarefa['status'], Tarefa['status']> = {
            'Pendente': 'Em Andamento',
            'Em Andamento': 'Concluída',
            'Concluída': 'Pendente'
          };
          return { ...t, status: nextStatus[t.status] };
        }
        return t;
      })
    );
  }, []);

  // Database reset trigger zone action
  const handleResetDatabase = useCallback(() => {
    setContracts(initialContracts);
    setSinaleira(initialSinaleira);
    setMotives(initialMotives);
    setActions(initialActions);
    setUsers(initialUsers);
    setUploadedFiles(initialUploadedFiles);
    setSettings(initialSettings);
    setClientes(initialClientes);
    setDepartamentos(initialDepartamentos);
    setColaboradores(initialColaboradores);
    setTarefas(initialTarefas);
  }, []);

  // Settings update callback
  const handleUpdateSettings = useCallback((updated: GlobalSettings) => {
    setSettings(updated);
  }, []);

  const handleTabChange = useCallback((tabId: string) => {
    setCurrentTab(tabId);
  }, []);

  return (
    <div 
      className="flex min-h-screen bg-brand-surface text-brand-text antialiased" 
      id="sextante-application-container"
    >
      {/* 1. Left Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={handleTabChange}
        currentUser={currentUser}
        onChangeUser={handleCycleUser}
        isExecutiveView={isExecutiveView}
      />

      {/* 2. Main content viewport section with smooth scroll */}
      <main className="flex-1 flex flex-col bg-brand-bg/15 overflow-hidden">
        
        {/* Dynamic header watermark block strictly conforming to layout guidelines */}
        <div className="absolute right-6 top-4 z-40 text-[9px] text-brand-text-muted/30 select-none font-mono">
          {settings.companyName} • CNPJ: {settings.cnpj}
        </div>

        {/* Conditional tab view rendering */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          
          {currentTab === 'dashboard' && (
            <DashboardView
              contracts={contracts}
              onUpdateContract={handleUpdateContract}
              onAddContract={handleAddContract}
              sinaleira={sinaleira}
              motives={motives}
              actions={actions}
            />
          )}

          {currentTab === 'honorarios' && (
            <HonorariosView />
          )}

          {currentTab === 'novodash' && (
            <NovoDashView 
              isExecutiveView={isExecutiveView}
              toggleExecutiveView={() => setIsExecutiveView(!isExecutiveView)}
            />
          )}

          {currentTab === 'dashlideranca' && (
            <DashLiderancaView 
              isExecutiveView={isExecutiveView}
              toggleExecutiveView={() => setIsExecutiveView(!isExecutiveView)}
            />
          )}

          {currentTab === 'carga' && (
            <CargaDadosView
              files={uploadedFiles}
              onAddFile={handleAddFile}
              onClearLogs={handleClearLogs}
              currentUserEmail={currentUser.email}
              qtdeHorasMes={qtdeHorasMes}
            />
          )}

          {currentTab === 'parametros' && (
            <ParametrosView
              sinaleira={sinaleira}
              onUpdateSinaleira={handleUpdateSinaleira}
              motives={motives}
              onUpdateMotives={handleUpdateMotives}
              actions={actions}
              onUpdateActions={handleUpdateActions}
              onRestoreDefaults={handleRestoreDefaults}
              qtdeHorasMes={qtdeHorasMes}
              onUpdateQtdeHorasMes={handleUpdateQtdeHorasMes}
            />
          )}

          {currentTab === 'usuarios' && (
            <UsuariosView
              users={users}
              onAddUser={handleAddUser}
              onRemoveUser={handleRemoveUser}
            />
          )}

          {currentTab === 'cadastros' && (
            <CadastrosView
              clientes={clientes}
              onAddCliente={handleAddCliente}
              onRemoveCliente={handleRemoveCliente}
              departamentos={departamentos}
              onAddDepartamento={handleAddDepartamento}
              onRemoveDepartamento={handleRemoveDepartamento}
              colaboradores={colaboradores}
              onAddColaborador={handleAddColaborador}
              onRemoveColaborador={handleRemoveColaborador}
              tarefas={tarefas}
              onAddTarefa={handleAddTarefa}
              onRemoveTarefa={handleRemoveTarefa}
              onToggleTarefaStatus={handleToggleTarefaStatus}
            />
          )}

          {currentTab === 'configuracoes' && (
            <ConfiguracoesView
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              onResetDatabase={handleResetDatabase}
            />
          )}

        </div>
      </main>
    </div>
  );
}
