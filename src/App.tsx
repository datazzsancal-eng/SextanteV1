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
import AnalisesView from './components/AnalisesView';
import LoginView from './components/LoginView';

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

  // Active session logged user profile
  const [loggedUser, setLoggedUser] = useState<UserProfile | null>(() => {
    const cached = localStorage.getItem('sextante_logged_user_obj');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.warn('Erro ao restaurar usuario logado do cache:', e);
      }
    }
    return null;
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !!localStorage.getItem('sextante_logged_user_obj');
  });

  // Shared application states
  const [contracts, setContracts] = useState<Contract[]>(initialContracts);
  const [sinaleira, setSinaleira] = useState(initialSinaleira);
  const [motives, setMotives] = useState<string[]>(initialMotives);
  const [actions, setActions] = useState<DefinedAction[]>(initialActions);
  const [qtdeHorasMes, setQtdeHorasMes] = useState<number>(() => {
    const cached = localStorage.getItem('qtdeHorasMes');
    return cached ? parseInt(cached, 10) : 220;
  });

  // Users state consumed directly from profiles table / localStorage cache
  const [users, setUsers] = useState<UserProfile[]>(() => {
    const cached = localStorage.getItem('sextante_profiles_v2');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.warn('Erro ao carregar cache de perfis:', e);
      }
    }
    return initialUsers;
  });

  // Fetch profiles directly from Supabase profiles table on mount if configured
  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      const loadProfilesFromSupabase = async () => {
        try {
          const { data, error } = await supabase.from('profiles').select('*');
          if (!error && data && data.length > 0) {
            const loadedUsers: UserProfile[] = data.map((p: any) => ({
              id: p.id,
              name: p.nome || p.name || 'Usuário',
              email: p.email,
              role: p.role,
              status: p.status || 'Ativo',
              avatar: p.avatar || (p.nome || p.name || 'US').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2),
              novo_usuario: p.novo_usuario ?? true,
              created_at: p.created_at ? new Date(p.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
              password: p.password || p.senha
            }));
            setUsers(loadedUsers);
            localStorage.setItem('sextante_profiles_v2', JSON.stringify(loadedUsers));

            // Sync currently logged in user profile if exists in fetched profiles
            const cachedUserStr = localStorage.getItem('sextante_logged_user_obj');
            if (cachedUserStr) {
              const currentObj = JSON.parse(cachedUserStr);
              const freshObj = loadedUsers.find(u => u.id === currentObj.id || u.email.toLowerCase() === currentObj.email.toLowerCase());
              if (freshObj) {
                setLoggedUser(freshObj);
                localStorage.setItem('sextante_logged_user_obj', JSON.stringify(freshObj));
              }
            }
          }
        } catch (err) {
          console.warn('Erro de conexão ao carregar tabela profiles do Supabase:', err);
        }
      };
      loadProfilesFromSupabase();
    }
  }, []);

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>(initialUploadedFiles);
  const [settings, setSettings] = useState<GlobalSettings>(initialSettings);

  const [clientes, setClientes] = useState<Cliente[]>(initialClientes);
  const [departamentos, setDepartamentos] = useState<Departamento[]>(initialDepartamentos);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>(initialColaboradores);
  const [tarefas, setTarefas] = useState<Tarefa[]>(initialTarefas);

  // Active session profile index / selected user
  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    const cachedId = localStorage.getItem('sextante_logged_user_id');
    return cachedId || 'u1';
  });

  const currentUser: UserProfile = loggedUser || users.find(u => u.id === currentUserId) || users[0] || {
    id: 'guest',
    name: 'Usuário Ativo',
    email: '',
    role: 'Colaborador',
    status: 'Ativo',
    avatar: 'US',
    novo_usuario: false
  };

  const isLider = currentUser?.role
    ? currentUser.role.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes("lider")
    : false;

  const isColaborador = currentUser?.role
    ? currentUser.role.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes("colaborador")
    : false;

  // Auto-switch to leader dash if user is Lider on login/user switch
  useEffect(() => {
    if (isLider) {
      setCurrentTab('dashlideranca');
    }
  }, [isLider]);

  // Prevent collaborator from accessing analises
  useEffect(() => {
    if (isColaborador && currentTab === 'analises') {
      setCurrentTab('novodash');
    }
  }, [isColaborador, currentTab]);

  // Cycling function for active profile
  const handleCycleUser = useCallback(() => {
    if (users.length === 0) return;
    const currentIndex = users.findIndex(u => u.id === (loggedUser?.id || currentUserId));
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % users.length : 0;
    const nextUser = users[nextIndex];
    if (nextUser) {
      setLoggedUser(nextUser);
      setCurrentUserId(nextUser.id);
      localStorage.setItem('sextante_logged_user_obj', JSON.stringify(nextUser));
      localStorage.setItem('sextante_logged_user_id', nextUser.id);
    }
  }, [users, loggedUser, currentUserId]);

  // Logout handler routine
  const handleLogout = useCallback(() => {
    setIsAuthenticated(false);
    setLoggedUser(null);
    localStorage.removeItem('sextante_logged_user_obj');
    localStorage.removeItem('sextante_logged_user_id');
  }, []);

  // Login handler routine
  const handleLoginSuccess = useCallback((user: UserProfile) => {
    setLoggedUser(user);
    setCurrentUserId(user.id);
    setIsAuthenticated(true);
    localStorage.setItem('sextante_logged_user_obj', JSON.stringify(user));
    localStorage.setItem('sextante_logged_user_id', user.id);

    setUsers((prev) => {
      if (!prev.some(u => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase())) {
        const updated = [user, ...prev];
        localStorage.setItem('sextante_profiles_v2', JSON.stringify(updated));
        return updated;
      }
      return prev;
    });
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

  // Access directory hooks (Direct consumption of profiles table)
  const handleAddUser = useCallback(async (newUser: UserProfile) => {
    // Validate or generate UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let userUuid = uuidRegex.test(newUser.id)
      ? newUser.id
      : (typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
              const r = Math.random() * 16 | 0;
              return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
            }));

    const userWithUuid = { ...newUser, id: userUuid };

    setUsers((prev) => {
      const updated = [userWithUuid, ...prev.filter(u => u.email.toLowerCase() !== userWithUuid.email.toLowerCase())];
      localStorage.setItem('sextante_profiles_v2', JSON.stringify(updated));
      return updated;
    });

    if (isSupabaseConfigured && supabase) {
      try {
        let authUserId = userUuid;

        // 1. Attempt to create user in Supabase Auth (auth.users)
        const tempPassword = 'Sextante#123';
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: userWithUuid.email,
          password: tempPassword,
          options: {
            data: {
              nome: userWithUuid.name,
              role: userWithUuid.role,
              avatar: userWithUuid.avatar
            }
          }
        });

        if (!authError && authData?.user?.id) {
          authUserId = authData.user.id;
          userWithUuid.id = authUserId;
          userWithUuid.password = tempPassword;

          // Update local state with the assigned auth.users UUID
          setUsers((prev) => {
            const updated = prev.map(u => u.email.toLowerCase() === userWithUuid.email.toLowerCase() ? { ...u, id: authUserId, password: tempPassword } : u);
            localStorage.setItem('sextante_profiles_v2', JSON.stringify(updated));
            return updated;
          });
        } else if (authError) {
          console.warn('Registro no Supabase auth.users:', authError.message);
        }

        // 2. Persist in public.profiles table
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: authUserId,
          nome: userWithUuid.name,
          email: userWithUuid.email,
          role: userWithUuid.role,
          status: userWithUuid.status,
          novo_usuario: userWithUuid.novo_usuario ?? true,
          avatar: userWithUuid.avatar,
          created_at: userWithUuid.created_at
        }, { onConflict: 'email' });

        if (profileError) {
          console.error('Erro ao salvar em public.profiles:', profileError.message);
        } else {
          console.log('Usuário registrado com sucesso em public.profiles:', userWithUuid.email);
        }
      } catch (err) {
        console.error('Exceção ao persistir no Supabase:', err);
      }
    }
  }, []);

  const handleUpdateUser = useCallback(async (id: string, updatedFields: Partial<UserProfile>) => {
    setUsers((prev) => {
      const updated = prev.map((u) => (u.id === id ? { ...u, ...updatedFields } : u));
      localStorage.setItem('sextante_profiles_v2', JSON.stringify(updated));
      return updated;
    });

    if (isSupabaseConfigured && supabase) {
      const payload: any = {};
      if (updatedFields.name !== undefined) payload.nome = updatedFields.name;
      if (updatedFields.email !== undefined) payload.email = updatedFields.email;
      if (updatedFields.role !== undefined) payload.role = updatedFields.role;
      if (updatedFields.status !== undefined) payload.status = updatedFields.status;
      if (updatedFields.novo_usuario !== undefined) payload.novo_usuario = updatedFields.novo_usuario;

      const { error } = await supabase.from('profiles').update(payload).eq('id', id);
      if (error && updatedFields.email) {
        await supabase.from('profiles').update(payload).eq('email', updatedFields.email);
      }
    }
  }, []);

  const handleRemoveUser = useCallback(async (id: string) => {
    const targetUser = users.find(u => u.id === id);
    setUsers((prev) => {
      const updated = prev.filter((u) => u.id !== id);
      localStorage.setItem('sextante_profiles_v2', JSON.stringify(updated));
      return updated;
    });

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error && targetUser?.email) {
        await supabase.from('profiles').delete().eq('email', targetUser.email);
      }
    }
  }, [users]);

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

  // Database reset trigger zone action (preserves profiles table)
  const handleResetDatabase = useCallback(() => {
    setContracts(initialContracts);
    setSinaleira(initialSinaleira);
    setMotives(initialMotives);
    setActions(initialActions);
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
    if (isLider && tabId !== 'dashlideranca' && tabId !== 'analises') return;
    setCurrentTab(tabId);
  }, [isLider]);

  // If user is logged out, render Login View
  if (!isAuthenticated) {
    return (
      <LoginView
        profiles={users}
        onLoginSuccess={handleLoginSuccess}
        onUpdateUser={handleUpdateUser}
      />
    );
  }

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
        onLogout={handleLogout}
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
            <NovoDashView />
          )}

          {currentTab === 'dashlideranca' && (
            <DashLiderancaView />
          )}

          {!isColaborador && currentTab === 'analises' && (
            <AnalisesView />
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
              currentUser={currentUser}
              onAddUser={handleAddUser}
              onUpdateUser={handleUpdateUser}
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
