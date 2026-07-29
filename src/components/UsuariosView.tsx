import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Edit2, 
  Shield, 
  Users, 
  Fingerprint, 
  Clock, 
  Key, 
  UserPlus, 
  Trash2,
  Lock,
  Zap,
  Copy,
  Check,
  AlertTriangle,
  UserCheck,
  KeyRound,
  Database,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Info
} from 'lucide-react';
import { UserProfile, UserRole } from '../types';

interface UsuariosViewProps {
  users: UserProfile[];
  currentUser: UserProfile;
  onAddUser: (newUser: UserProfile) => void;
  onUpdateUser: (id: string, updatedFields: Partial<UserProfile>) => void;
  onRemoveUser: (id: string) => void;
}

export default function UsuariosView({
  users,
  currentUser,
  onAddUser,
  onUpdateUser,
  onRemoveUser
}: UsuariosViewProps) {
  // Check permission: only Master and Admin can manage users
  const canManageUsers = currentUser.role === 'Master' || currentUser.role === 'Admin';

  // Sub-tabs: 'lista' | 'perfis'
  const [activeSubTab, setActiveSubTab] = useState<'lista' | 'perfis'>('lista');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'Ativo' | 'Inativo' | 'Novos'>('Todos');
  const [roleFilter, setRoleFilter] = useState<'Todos' | UserRole>('Todos');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<UserProfile | null>(null);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  // New User Form State
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('Colaborador');
  const [newUserStatus, setNewUserStatus] = useState<'Ativo' | 'Inativo'>('Ativo');

  // Password Setup Form State (Simulador de Primeiro Acesso)
  const [firstPassword, setFirstPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            u.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = 
        statusFilter === 'Todos' ? true :
        statusFilter === 'Novos' ? u.novo_usuario === true :
        u.status === statusFilter;
      const matchesRole = roleFilter === 'Todos' || u.role === roleFilter;
      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [users, searchTerm, statusFilter, roleFilter]);

  // Handler for creating a new user (WITHOUT password)
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;

    // Grab initials for avatar
    const initials = newUserName
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    const newUser: UserProfile = {
      id: Math.random().toString(36).substr(2, 9),
      name: newUserName.trim(),
      email: newUserEmail.trim(),
      role: newUserRole,
      status: newUserStatus,
      avatar: initials || 'US',
      novo_usuario: true, // FLAG DE USUÁRIO NOVO (sem senha inicial)
      created_at: new Date().toISOString().split('T')[0]
    };

    onAddUser(newUser);

    // Reset form
    setNewUserName('');
    setNewUserEmail('');
    setNewUserRole('Colaborador');
    setNewUserStatus('Ativo');
    setShowAddModal(false);
  };

  // Handler for setting password on first login
  const handleSaveFirstPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!selectedUserForPassword) return;

    if (firstPassword.length < 6) {
      setPasswordError('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }

    if (firstPassword !== confirmPassword) {
      setPasswordError('As senhas informadas não coincidem.');
      return;
    }

    // Update user: set novo_usuario = false, set password
    onUpdateUser(selectedUserForPassword.id, {
      novo_usuario: false,
      password: firstPassword,
      status: 'Ativo'
    });

    setPasswordSuccess(`Senha criada com sucesso para ${selectedUserForPassword.name}! O acesso inicial foi ativado.`);
    
    setTimeout(() => {
      setSelectedUserForPassword(null);
      setFirstPassword('');
      setConfirmPassword('');
      setPasswordSuccess('');
    }, 2000);
  };

  // Handler for updating edited user profile
  const handleSaveEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    onUpdateUser(editingUser.id, {
      name: editingUser.name,
      email: editingUser.email,
      role: editingUser.role,
      status: editingUser.status,
      novo_usuario: editingUser.novo_usuario
    });

    setEditingUser(null);
  };

  return (
    <div id="usuarios-view-root" className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full space-y-8">
      
      {/* Top Header Row */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-brand-border/40 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-3xl font-extrabold tracking-tight text-white">
              Gestão de Acesso & Usuários
            </h2>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-black tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
              Supabase OAuth
            </span>
          </div>
          <p className="text-sm font-medium text-brand-text-muted">
            Controle de Perfis (Master, Admin, Gestor, Lider, Colaborador) e fluxo de primeiro acesso sem senha prévia.
          </p>
        </div>

        {/* Action Button: Novo Usuário */}
        {canManageUsers && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded bg-brand-accent hover:bg-brand-accent/95 text-white text-xs font-bold uppercase tracking-wider transition-all scale-100 hover:scale-[1.02] active:scale-95 cursor-pointer shadow-md"
          >
            <UserPlus size={16} />
            Cadastrar Novo Usuário
          </button>
        )}
      </header>

      {/* Restricted Access Banner if user is NOT Master or Admin */}
      {!canManageUsers && (
        <div className="bg-amber-950/30 border border-amber-500/30 rounded-lg p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0 mt-0.5">
              <ShieldAlert size={22} />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-amber-300">
                Acesso Restrito: Somente Master e Admin podem realizar a Gestão de Usuários
              </h4>
              <p className="text-xs text-brand-text-muted leading-relaxed">
                Você está conectado como <strong className="text-white">{currentUser.name}</strong> com perfil <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 font-bold text-[10px] uppercase">{currentUser.role}</span>. Suas permissões permitem apenas visualização da matriz de acessos.
              </p>
            </div>
          </div>
          <div className="text-xs text-brand-text-muted bg-brand-card px-3 py-2 rounded border border-brand-border shrink-0">
            Dica: Alterne para um perfil <strong className="text-brand-primary">Master</strong> ou <strong className="text-brand-primary">Admin</strong> no menu inferior para testar permissões totais.
          </div>
        </div>
      )}

      {/* Main card housing sub-tabs */}
      <div className="bg-brand-card rounded-lg border border-brand-border shadow-lg">
        
        {/* Navigation Sub-Tabs */}
        <div className="border-b border-brand-border/45 px-6 pt-5 flex items-center justify-between overflow-x-auto no-scrollbar">
          <div className="flex gap-6 shrink-0">
            <button
              onClick={() => setActiveSubTab('lista')}
              className={`pb-4 text-xs font-bold tracking-wider uppercase transition-all duration-200 border-b-2 flex items-center gap-2 ${
                activeSubTab === 'lista'
                  ? 'border-brand-accent text-brand-primary'
                  : 'border-transparent text-brand-text-muted hover:text-white'
              }`}
            >
              <Users size={14} />
              Usuários Cadastrados ({users.length})
            </button>

            <button
              onClick={() => setActiveSubTab('perfis')}
              className={`pb-4 text-xs font-bold tracking-wider uppercase transition-all duration-200 border-b-2 flex items-center gap-2 ${
                activeSubTab === 'perfis'
                  ? 'border-brand-accent text-brand-primary'
                  : 'border-transparent text-brand-text-muted hover:text-white'
              }`}
            >
              <Shield size={14} />
              Níveis de Acesso (5 Papéis)
            </button>
          </div>

          <div className="text-[11px] text-brand-primary font-bold hidden lg:flex items-center gap-1.5 bg-brand-bg px-3 py-1 rounded border border-brand-border">
            <ShieldCheck size={13} />
            RLS & OAuth Supabase Ativos
          </div>
        </div>

        {/* Sub-tab Content Viewports */}
        <div className="p-6">
          
          {/* TAB 1: LISTA DE USUÁRIOS */}
          {activeSubTab === 'lista' && (
            <div className="space-y-5">
              
              {/* Filter bar */}
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-brand-bg/60 p-4 rounded-lg border border-brand-border/60">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white tracking-widest uppercase flex items-center gap-1.5">
                    <UserCheck size={15} className="text-brand-primary" />
                    Diretório de Acessos
                  </span>
                  <span className="text-[10px] bg-brand-card-bright px-2 py-0.5 rounded text-brand-text-muted font-mono">
                    {filteredUsers.length} registros
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Search input */}
                  <div className="relative w-full sm:w-60">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-muted/50" size={14} />
                    <input
                      type="text"
                      placeholder="Pesquisar por nome ou e-mail..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-brand-card text-xs text-brand-text placeholder-brand-text-muted/40 pl-9 pr-3 py-2 rounded border border-brand-border outline-none focus:border-brand-primary"
                    />
                  </div>

                  {/* Filter by Status */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-brand-text-muted uppercase font-bold">Status:</span>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as any)}
                      className="bg-brand-card text-brand-text border border-brand-border text-xs rounded py-1.5 px-2.5 focus:border-brand-primary outline-none"
                    >
                      <option value="Todos">Todos os Status</option>
                      <option value="Ativo">Ativos</option>
                      <option value="Inativo">Inativos</option>
                      <option value="Novos">Novos (Pendente Senha)</option>
                    </select>
                  </div>

                  {/* Filter by Role */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-brand-text-muted uppercase font-bold">Nível:</span>
                    <select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value as any)}
                      className="bg-brand-card text-brand-text border border-brand-border text-xs rounded py-1.5 px-2.5 focus:border-brand-primary outline-none"
                    >
                      <option value="Todos">Todos os Níveis</option>
                      <option value="Master">Master</option>
                      <option value="Admin">Admin</option>
                      <option value="Gestor">Gestor</option>
                      <option value="Lider">Lider</option>
                      <option value="Colaborador">Colaborador</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Users Directory Table */}
              <div className="overflow-x-auto rounded-lg border border-brand-border/60">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-brand-bg/80 border-b border-brand-border text-[11px] font-bold text-brand-text-muted/70 tracking-wider uppercase">
                      <th className="py-3.5 px-4">Usuário</th>
                      <th className="py-3.5 px-4">E-mail de Acesso</th>
                      <th className="py-3.5 px-4">Nível de Permissão</th>
                      <th className="py-3.5 px-4">Status / Primeiro Acesso</th>
                      <th className="py-3.5 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border/40 font-sans text-xs">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-brand-text-muted/50 italic">
                          Nenhum usuário encontrado com os filtros aplicados.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => (
                        <tr 
                          key={u.id} 
                          id={`user-row-${u.id}`}
                          className="hover:bg-brand-card-bright/20 transition-colors group"
                        >
                          {/* Avatar & Name */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-brand-primary/10 select-none text-brand-primary flex items-center justify-center font-bold border border-brand-primary/20 shrink-0">
                                {u.avatar}
                              </div>
                              <div>
                                <span className="font-extrabold text-white group-hover:text-brand-primary transition-colors block">
                                  {u.name}
                                </span>
                                <span className="text-[10px] text-brand-text-muted/60 font-mono">
                                  Cadastrado em {u.created_at || '2026-01-10'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Email */}
                          <td className="py-3.5 px-4 text-brand-text-muted/90 font-mono">
                            {u.email}
                          </td>

                          {/* Role Badge */}
                          <td className="py-3.5 px-4">
                            {u.role === 'Master' && (
                              <span className="px-2.5 py-1 rounded text-[10px] font-black bg-purple-500/10 text-purple-300 border border-purple-500/20 uppercase tracking-wide">
                                👑 MASTER
                              </span>
                            )}
                            {u.role === 'Admin' && (
                              <span className="px-2.5 py-1 rounded text-[10px] font-black bg-red-500/10 text-red-400 border border-red-500/20 uppercase tracking-wide">
                                🛡️ ADMIN
                              </span>
                            )}
                            {u.role === 'Gestor' && (
                              <span className="px-2.5 py-1 rounded text-[10px] font-black bg-amber-500/10 text-amber-300 border border-amber-500/20 uppercase tracking-wide">
                                📊 GESTOR
                              </span>
                            )}
                            {u.role === 'Lider' && (
                              <span className="px-2.5 py-1 rounded text-[10px] font-black bg-blue-500/10 text-blue-300 border border-blue-500/20 uppercase tracking-wide">
                                🎯 LIDER
                              </span>
                            )}
                            {u.role === 'Colaborador' && (
                              <span className="px-2.5 py-1 rounded text-[10px] font-black bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 uppercase tracking-wide">
                                👤 COLABORADOR
                              </span>
                            )}
                          </td>

                          {/* Status & Flag Usuario Novo */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col gap-1 items-start">
                              {u.novo_usuario ? (
                                <span className="inline-flex items-center gap-1.5 text-amber-300 font-bold bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 rounded text-[10px]">
                                  <KeyRound size={11} className="animate-pulse" />
                                  USUÁRIO NOVO (Pendente Senha)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-emerald-400 text-[11px] font-bold">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                                  {u.status === 'Ativo' ? 'Ativo (Senha Definida)' : 'Inativo'}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Action Buttons */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* If user is new, show button to create password / simulate first access */}
                              {u.novo_usuario && (
                                <button
                                  onClick={() => {
                                    setSelectedUserForPassword(u);
                                    setFirstPassword('');
                                    setConfirmPassword('');
                                    setPasswordError('');
                                    setPasswordSuccess('');
                                  }}
                                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] font-bold border border-amber-500/30 transition-all cursor-pointer"
                                  title="Simular Primeiro Acesso e criar senha inicial"
                                >
                                  <Key size={12} />
                                  Criar Senha
                                </button>
                              )}

                              {canManageUsers && (
                                <>
                                  {/* Toggle Active / Inactive status */}
                                  <button
                                    onClick={() => {
                                      const nextStatus = u.status === 'Ativo' ? 'Inativo' : 'Ativo';
                                      onUpdateUser(u.id, { status: nextStatus });
                                    }}
                                    className={`px-2 py-1 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                                      u.status === 'Ativo'
                                        ? 'bg-brand-bg text-brand-text-muted hover:text-white border border-brand-border'
                                        : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                    }`}
                                    title="Alternar Status de Acesso"
                                  >
                                    {u.status === 'Ativo' ? 'Inativar' : 'Ativar'}
                                  </button>

                                  {/* Edit Role Modal Trigger */}
                                  <button
                                    onClick={() => setEditingUser(u)}
                                    className="p-1.5 rounded hover:bg-brand-card-bright text-brand-text-muted hover:text-white transition-colors cursor-pointer"
                                    title="Editar Perfil"
                                  >
                                    <Edit2 size={13} />
                                  </button>

                                  {/* Delete User */}
                                  <button
                                    onClick={() => {
                                      if (confirm(`Deseja revogar permanentemente o acesso de ${u.name}?`)) {
                                        onRemoveUser(u.id);
                                      }
                                    }}
                                    className="p-1.5 rounded hover:bg-red-500/20 text-brand-text-muted/50 hover:text-red-400 transition-colors cursor-pointer"
                                    title="Excluir Usuário"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer */}
              <div className="flex items-center justify-between pt-2 text-xs text-brand-text-muted">
                <span>
                  Exibindo <strong className="text-white">{filteredUsers.length}</strong> de <strong className="text-white">{users.length}</strong> usuários cadastrados
                </span>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-brand-text-muted/60">
                    Regra: Apenas Master e Admin têm permissão de alteração
                  </span>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: PERFIS DE ACESSO (5 NÍVEIS DE USUÁRIO) */}
          {activeSubTab === 'perfis' && (
            <div className="space-y-6">
              
              <div className="bg-brand-bg/60 p-4 rounded-lg border border-brand-border text-xs text-brand-text-muted leading-relaxed">
                <h4 className="font-bold text-white text-sm mb-1.5 flex items-center gap-2">
                  <ShieldCheck size={16} className="text-brand-primary" />
                  Hierarquia de Níveis de Usuários e Permissões de Governança
                </h4>
                O sistema Sextante possui 5 níveis de usuários. Somente os perfis <strong>Master</strong> e <strong>Admin</strong> possuem autorização para criar, editar, inativar usuários e gerenciar o modelo de segurança.
              </div>

              {/* Grid of the 5 roles */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                
                {/* 1. MASTER */}
                <div className="bg-brand-bg rounded-lg border border-purple-500/30 p-5 space-y-3 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-black tracking-widest bg-purple-500/15 text-purple-300 border border-purple-500/30 uppercase">
                      👑 MASTER
                    </span>
                    <span className="text-[10px] font-bold text-purple-300">Gestão Total</span>
                  </div>
                  <h5 className="font-bold text-white text-sm">Super Administrador do Sistema</h5>
                  <p className="text-xs text-brand-text-muted leading-relaxed">
                    Possui acesso total e irrestrito a todas as tabelas, configurações globais, exclusão de dados, alteração de RLS no Supabase e cadastro de admins.
                  </p>
                  <ul className="text-[11px] text-purple-200 space-y-1 font-medium list-disc list-inside">
                    <li>Gestão de usuários (Master/Admin/Gestor/Lider/Colaborador)</li>
                    <li>Acesso a parâmetros fiscais e sinaleiras</li>
                    <li>Execução e alteração de scripts DDL</li>
                  </ul>
                </div>

                {/* 2. ADMIN */}
                <div className="bg-brand-bg rounded-lg border border-red-500/30 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-black tracking-widest bg-red-500/15 text-red-400 border border-red-500/30 uppercase">
                      🛡️ ADMIN
                    </span>
                    <span className="text-[10px] font-bold text-red-400">Gestão de Usuários</span>
                  </div>
                  <h5 className="font-bold text-white text-sm">Administrador Operacional</h5>
                  <p className="text-xs text-brand-text-muted leading-relaxed">
                    Autorizado a cadastrar novos usuários (sem senha), inativar contas, resetar senhas iniciais e gerenciar atribuição de papéis até o nível Admin.
                  </p>
                  <ul className="text-[11px] text-red-200 space-y-1 font-medium list-disc list-inside">
                    <li>Cadastramento e inativação de usuários</li>
                    <li>Acesso total a dashboards executivos e operacionais</li>
                    <li>Aprovação de parâmetros e cargas de dados</li>
                  </ul>
                </div>

                {/* 3. GESTOR */}
                <div className="bg-brand-bg rounded-lg border border-amber-500/30 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-black tracking-widest bg-amber-500/15 text-amber-300 border border-amber-500/30 uppercase">
                      📊 GESTOR
                    </span>
                    <span className="text-[10px] font-bold text-amber-300">Coordenação</span>
                  </div>
                  <h5 className="font-bold text-white text-sm">Gestor de Operações</h5>
                  <p className="text-xs text-brand-text-muted leading-relaxed">
                    Acesso a dashboards de desempenho, envio de arquivos de carga de dados e gestão de cadastros operacionais. Não possui gestão de usuários.
                  </p>
                  <ul className="text-[11px] text-amber-200 space-y-1 font-medium list-disc list-inside">
                    <li>Envio e processamento de planilhas de horas</li>
                    <li>Gestão de clientes, departamentos e tarefas</li>
                    <li>Geração de relatórios de honorários</li>
                  </ul>
                </div>

                {/* 4. LIDER */}
                <div className="bg-brand-bg rounded-lg border border-blue-500/30 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-black tracking-widest bg-blue-500/15 text-blue-300 border border-blue-500/30 uppercase">
                      🎯 LIDER
                    </span>
                    <span className="text-[10px] font-bold text-blue-300">Liderança de Equipe</span>
                  </div>
                  <h5 className="font-bold text-white text-sm">Líder Operacional / Supervisor</h5>
                  <p className="text-xs text-brand-text-muted leading-relaxed">
                    Visualiza o Dashboard de Líderes com indicadores de equipe, produtividade de colaboradores e status das tarefas do seu setor.
                  </p>
                  <ul className="text-[11px] text-blue-200 space-y-1 font-medium list-disc list-inside">
                    <li>Visão do Dashboard Operacional de Líderes</li>
                    <li>Acompanhamento de metas de colaboradores</li>
                    <li>Atualização de status de tarefas da equipe</li>
                  </ul>
                </div>

                {/* 5. COLABORADOR */}
                <div className="bg-brand-bg rounded-lg border border-emerald-500/30 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-black tracking-widest bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 uppercase">
                      👤 COLABORADOR
                    </span>
                    <span className="text-[10px] font-bold text-emerald-300">Execução</span>
                  </div>
                  <h5 className="font-bold text-white text-sm">Colaborador Final</h5>
                  <p className="text-xs text-brand-text-muted leading-relaxed">
                    Perfil de acesso individual. Registra suas próprias tarefas e visualiza relatórios restritos às suas atividades.
                  </p>
                  <ul className="text-[11px] text-emerald-200 space-y-1 font-medium list-disc list-inside">
                    <li>Visualização de demandas e prazos pessoais</li>
                    <li>Atualização de progresso das próprias tarefas</li>
                    <li>Acesso autenticado via OAuth Supabase</li>
                  </ul>
                </div>

              </div>
            </div>
          )}

        </div>

      </div>

      {/* Security Widgets Footer */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Widget 1 */}
        <div className="bg-brand-card rounded-lg p-5 border border-brand-border flex items-center justify-between">
          <div className="space-y-2">
            <h4 className="text-xs uppercase font-bold tracking-wider text-brand-text-muted flex items-center gap-1.5">
              <Lock size={13} className="text-brand-primary" />
              Política de Primeiro Acesso
            </h4>
            <p className="text-xs text-white font-medium">
              Sem senhas pré-atribuídas. Força criação de senha no 1º login por e-mail.
            </p>
          </div>
          <KeyRound size={32} className="text-brand-text-muted/10 shrink-0" />
        </div>

        {/* Widget 2 */}
        <div className="bg-brand-card rounded-lg p-5 border border-brand-border flex items-center justify-between">
          <div className="space-y-2">
            <h4 className="text-xs uppercase font-bold tracking-wider text-brand-text-muted">
              TOTAL DE USUÁRIOS
            </h4>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">{users.length}</span>
              <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                {users.filter(u => u.novo_usuario).length} novos
              </span>
            </div>
          </div>
          <Users size={32} className="text-brand-text-muted/10 shrink-0" />
        </div>

        {/* Widget 3 */}
        <div className="bg-brand-card rounded-lg p-5 border border-brand-border flex items-center justify-between">
          <div className="space-y-2">
            <h4 className="text-xs uppercase font-bold tracking-wider text-brand-text-muted">
              SESSÃO E SUPABASE AUTH
            </h4>
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-ping" />
                Supabase OAuth Ativo
              </span>
            </div>
          </div>
          <Zap size={32} className="text-brand-text-muted/10 shrink-0" />
        </div>

      </section>

      {/* MODAL 1: Cadastrar Novo Usuário (SEM SENHA) */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <form 
            onSubmit={handleCreateUser}
            className="bg-brand-card p-6 rounded-lg max-w-md w-full border border-brand-border space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-brand-border/45 pb-3">
              <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                <UserPlus size={18} className="text-brand-accent" />
                Cadastrar Novo Usuário
              </h3>
              <button 
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-brand-text-muted hover:text-white font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Informative Security Callout */}
            <div className="bg-amber-950/40 border border-amber-500/30 rounded p-3 text-xs text-amber-200/90 leading-relaxed space-y-1">
              <p className="font-bold text-amber-300 flex items-center gap-1.5">
                <KeyRound size={13} />
                Regra de Acesso e Segurança:
              </p>
              <p>
                Não é associada uma senha ao cadastrar o usuário. Ele receberá a flag <strong>'Novo Usuário'</strong> (`novo_usuario = true`). Ao informar seu e-mail na tela de login, o processo o forçará a criar e confirmar sua senha inicial.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-brand-text-muted uppercase mb-1">Nome Completo</label>
              <input 
                type="text" 
                required
                value={newUserName}
                placeholder="Ex. Fernando Souza"
                onChange={e => setNewUserName(e.target.value)}
                className="w-full bg-brand-bg text-brand-text placeholder-brand-text-muted/30 p-2.5 rounded border border-brand-border text-xs focus:border-brand-primary outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-brand-text-muted uppercase mb-1">Endereço de E-mail de Acesso</label>
              <input 
                type="email" 
                required
                value={newUserEmail}
                placeholder="fernando.souza@sextante.com.br"
                onChange={e => setNewUserEmail(e.target.value)}
                className="w-full bg-brand-bg text-brand-text placeholder-brand-text-muted/30 p-2.5 rounded border border-brand-border text-xs focus:border-brand-primary outline-none font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-brand-text-muted uppercase mb-1">Nível / Perfil</label>
                <select
                  value={newUserRole}
                  onChange={e => setNewUserRole(e.target.value as UserRole)}
                  className="w-full bg-brand-bg text-brand-text p-2 rounded border border-brand-border text-xs focus:border-brand-primary outline-none h-9"
                >
                  <option value="Colaborador">Colaborador</option>
                  <option value="Lider">Lider</option>
                  <option value="Gestor">Gestor</option>
                  <option value="Admin">Admin</option>
                  <option value="Master">Master</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-text-muted uppercase mb-1">Status Inicial</label>
                <select
                  value={newUserStatus}
                  onChange={e => setNewUserStatus(e.target.value as any)}
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
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-brand-bg text-brand-text-muted rounded hover:text-white text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-brand-accent hover:bg-brand-accent/90 text-white rounded text-xs font-bold"
              >
                Cadastrar Usuário
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 2: Primeiro Acesso / Criar Senha para Usuário Novo */}
      {selectedUserForPassword && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <form 
            onSubmit={handleSaveFirstPassword}
            className="bg-brand-card p-6 rounded-lg max-w-md w-full border border-brand-border space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-brand-border/45 pb-3">
              <div>
                <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                  <KeyRound size={18} className="text-amber-400" />
                  Primeiro Acesso: Criar Senha
                </h3>
                <p className="text-xs text-brand-text-muted">
                  Definição obrigatoria de senha inicial para ativacao.
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedUserForPassword(null)}
                className="text-brand-text-muted hover:text-white font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="bg-brand-bg/80 p-3 rounded border border-brand-border space-y-1 text-xs">
              <div><strong className="text-brand-text-muted">Usuário:</strong> <span className="text-white font-bold">{selectedUserForPassword.name}</span></div>
              <div><strong className="text-brand-text-muted">E-mail:</strong> <span className="text-brand-primary font-mono">{selectedUserForPassword.email}</span></div>
            </div>

            {passwordError && (
              <div className="bg-red-950/40 border border-red-500/30 text-red-300 text-xs p-2.5 rounded font-medium flex items-center gap-2">
                <AlertTriangle size={14} className="shrink-0" />
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs p-2.5 rounded font-medium flex items-center gap-2">
                <Check size={14} className="shrink-0" />
                {passwordSuccess}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-brand-text-muted uppercase mb-1">Nova Senha</label>
              <input 
                type="password" 
                required
                value={firstPassword}
                placeholder="Sua senha secreta (mínimo 6 caracteres)"
                onChange={e => setFirstPassword(e.target.value)}
                className="w-full bg-brand-bg text-brand-text placeholder-brand-text-muted/30 p-2.5 rounded border border-brand-border text-xs focus:border-brand-primary outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-brand-text-muted uppercase mb-1">Confirmar Nova Senha</label>
              <input 
                type="password" 
                required
                value={confirmPassword}
                placeholder="Repita a mesma senha"
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full bg-brand-bg text-brand-text placeholder-brand-text-muted/30 p-2.5 rounded border border-brand-border text-xs focus:border-brand-primary outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-brand-border/40">
              <button
                type="button"
                onClick={() => setSelectedUserForPassword(null)}
                className="px-4 py-2 bg-brand-bg text-brand-text-muted rounded hover:text-white text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-extrabold rounded text-xs"
              >
                Confirmar Senha e Ativar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: Editar Perfil de Usuário */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <form 
            onSubmit={handleSaveEditUser}
            className="bg-brand-card p-6 rounded-lg max-w-md w-full border border-brand-border space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-brand-border/45 pb-3">
              <h3 className="font-extrabold text-white text-base">Editar Perfil de Usuário</h3>
              <button 
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-brand-text-muted hover:text-white font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-brand-text-muted uppercase mb-1">Nome Completo</label>
              <input 
                type="text" 
                required
                value={editingUser.name}
                onChange={e => setEditingUser({ ...editingUser, name: e.target.value })}
                className="w-full bg-brand-bg text-brand-text p-2.5 rounded border border-brand-border text-xs focus:border-brand-primary outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-brand-text-muted uppercase mb-1">Endereço de E-mail</label>
              <input 
                type="email" 
                required
                value={editingUser.email}
                onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
                className="w-full bg-brand-bg text-brand-text p-2.5 rounded border border-brand-border text-xs focus:border-brand-primary outline-none font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-brand-text-muted uppercase mb-1">Nível / Perfil</label>
                <select
                  value={editingUser.role}
                  onChange={e => setEditingUser({ ...editingUser, role: e.target.value as UserRole })}
                  className="w-full bg-brand-bg text-brand-text p-2 rounded border border-brand-border text-xs focus:border-brand-primary outline-none h-9"
                >
                  <option value="Master">Master</option>
                  <option value="Admin">Admin</option>
                  <option value="Gestor">Gestor</option>
                  <option value="Lider">Lider</option>
                  <option value="Colaborador">Colaborador</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-text-muted uppercase mb-1">Status</label>
                <select
                  value={editingUser.status}
                  onChange={e => setEditingUser({ ...editingUser, status: e.target.value as any })}
                  className="w-full bg-brand-bg text-brand-text p-2 rounded border border-brand-border text-xs focus:border-brand-primary outline-none h-9"
                >
                  <option value="Ativo">Ativo</option>
                  <option value="Inativo">Inativo</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input 
                type="checkbox"
                id="checkbox-novo-user"
                checked={!!editingUser.novo_usuario}
                onChange={e => setEditingUser({ ...editingUser, novo_usuario: e.target.checked })}
                className="rounded border-brand-border"
              />
              <label htmlFor="checkbox-novo-user" className="text-xs text-brand-text-muted cursor-pointer">
                Marcar como <strong className="text-white">Usuário Novo</strong> (Forçar redefinição de senha no próximo acesso)
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-brand-border/40">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 bg-brand-bg text-brand-text-muted rounded hover:text-white text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white rounded text-xs font-bold"
              >
                Salvar Alterações
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Footer */}
      <footer className="text-center pt-4 text-[10px] text-brand-text-muted/40 font-mono tracking-widest uppercase">
        SEXTANTE GOVERNANCE • SUPABASE OAUTH INTEGRATION • V2.5.0
      </footer>

    </div>
  );
}
