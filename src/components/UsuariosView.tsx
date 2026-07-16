import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  MoreVertical, 
  Shield, 
  Users, 
  Fingerprint, 
  Clock, 
  Key, 
  CheckCircle, 
  UserPlus, 
  Trash2,
  Lock,
  Activity,
  Zap
} from 'lucide-react';
import { UserProfile } from '../types';

interface UsuariosViewProps {
  users: UserProfile[];
  onAddUser: (newUser: UserProfile) => void;
  onRemoveUser: (id: string) => void;
}

export default function UsuariosView({
  users,
  onAddUser,
  onRemoveUser
}: UsuariosViewProps) {
  // Tabs internally: 'lista' | 'perfis' | 'logs'
  const [activeSubTab, setActiveSubTab] = useState<'lista' | 'perfis' | 'logs'>('lista');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'Ativo' | 'Inativo'>('Todos');
  const [showAddModal, setShowAddModal] = useState(false);

  // New User state
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'ADMINISTRATOR' | 'MANAGER' | 'ANALYST'>('ANALYST');
  const [newUserStatus, setNewUserStatus] = useState<'Ativo' | 'Inativo'>('Ativo');

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            u.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = statusFilter === 'Todos' || u.status === statusFilter;
      return matchesSearch && matchesFilter;
    });
  }, [users, searchTerm, statusFilter]);

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
      avatar: initials || 'N'
    };

    onAddUser(newUser);

    // Reset fields
    setNewUserName('');
    setNewUserEmail('');
    setNewUserRole('ANALYST');
    setNewUserStatus('Ativo');
    setShowAddModal(false);
  };

  // Static mock audit logs
  const auditLogs = [
    { id: 1, user: 'Ricardo Mendonça', action: 'Alterações publicadas em parâmetros de Sinaleira', ip: '189.12.44.11', time: 'Há 5 minutos' },
    { id: 2, user: 'Alex Thompson', action: 'Exportação consolidadora de PDF executivo efetuada', ip: '191.22.84.150', time: 'Há 18 minutos' },
    { id: 3, user: 'Alice Silva', action: 'Upload concluído com sucesso: lancamentos_gerdau.csv', ip: '177.34.120.90', time: 'Há 1 hora' },
    { id: 4, user: 'admin_root', action: 'Cadastro de novo colaborador no diretório corporativo', ip: '127.0.0.1', time: 'Há 2 horas' },
    { id: 5, user: 'Bruno Pires', action: 'Tentativa de alteração de taxas base descartada - Permissão Negada', ip: '186.20.14.88', time: 'Ontem, 16:32' },
  ];

  return (
    <div id="usuarios-view-root" className="flex-1 p-8 overflow-y-auto max-w-7xl mx-auto w-full space-y-8">
      
      {/* Top Header Row matching screenshots */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-brand-border/40 pb-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white mb-1">
            Gestão de Usuários
          </h2>
          <p className="text-sm font-medium text-brand-text-muted">
            Controle de Acesso - Gerencie permissões, perfis de governança e logs operacionais de auditoria.
          </p>
        </div>

        {/* Novo Usuário action trigger */}
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded bg-brand-accent hover:bg-brand-accent/95 text-white text-xs font-bold uppercase tracking-wider transition-all scale-100 hover:scale-[1.02] active:scale-95 cursor-pointer"
        >
          <UserPlus size={15} />
          Novo Usuário
        </button>
      </header>

      {/* Main card housing the navigation tabs and directories */}
      <div className="bg-brand-card rounded-lg border border-brand-border shadow-lg">
        
        {/* Tab view selector header block */}
        <div className="border-b border-brand-border/45 px-6 pt-5 flex items-center justify-between">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveSubTab('lista')}
              className={`pb-4 text-xs font-bold tracking-wider uppercase transition-all duration-200 border-b-2 ${
                activeSubTab === 'lista'
                  ? 'border-brand-accent text-brand-primary'
                  : 'border-transparent text-brand-text-muted hover:text-white'
              }`}
            >
              Lista de Usuários
            </button>
            <button
              onClick={() => setActiveSubTab('perfis')}
              className={`pb-4 text-xs font-bold tracking-wider uppercase transition-all duration-200 border-b-2 ${
                activeSubTab === 'perfis'
                  ? 'border-brand-accent text-brand-primary'
                  : 'border-transparent text-brand-text-muted hover:text-white'
              }`}
            >
              Perfis de Acesso
            </button>
            <button
              onClick={() => setActiveSubTab('logs')}
              className={`pb-4 text-xs font-bold tracking-wider uppercase transition-all duration-200 border-b-2 ${
                activeSubTab === 'logs'
                  ? 'border-brand-accent text-brand-primary'
                  : 'border-transparent text-brand-text-muted hover:text-white'
              }`}
            >
              Logs de Auditoria
            </button>
          </div>

          <div className="text-[11px] text-brand-primary font-bold hidden sm:block bg-brand-bg px-2.5 py-1 rounded">
            Governança Ativa: RGPD / LGPD
          </div>
        </div>

        {/* Sub-tab Content Area */}
        <div className="p-6">
          
          {/* TAB 1: LISTA DIRETORIO CORPORATIVO */}
          {activeSubTab === 'lista' && (
            <div className="space-y-4">
              
              {/* Directory Filter bar */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-brand-bg/40 p-3 rounded border border-brand-border/50">
                <span className="text-xs font-bold text-white tracking-widest uppercase">
                  DIRETÓRIO CORPORATIVO
                </span>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Internal Input Searcher */}
                  <div className="relative w-full sm:w-56">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-brand-text-muted/40" size={13} />
                    <input
                      type="text"
                      placeholder="Pesquisar usuários..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-brand-card text-xs text-brand-text placeholder-brand-text-muted/40 pl-8 pr-3 py-1.5 rounded border border-brand-border outline-none focus:border-brand-primary"
                    />
                  </div>

                  {/* Dropdown status filtration */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-brand-text-muted uppercase font-bold">Filtrar por:</span>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as any)}
                      className="bg-brand-card text-brand-text border border-brand-border text-xs rounded py-1 px-2.5 focus:border-brand-primary outline-none"
                    >
                      <option value="Todos">Todos os Status</option>
                      <option value="Ativo">Somente Ativos</option>
                      <option value="Inativo">Somente Inativos</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Responsive Access Directory Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-brand-border text-[11px] font-bold text-brand-text-muted/70 tracking-wider uppercase">
                      <th className="py-3 px-3">USUÁRIO</th>
                      <th className="py-3 px-3">E-MAIL</th>
                      <th className="py-3 px-3">PERFIL (NÍVEL)</th>
                      <th className="py-3 px-3">STATUS</th>
                      <th className="py-3 px-3 text-right">AÇÕES</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border/40 font-sans text-xs">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-brand-text-muted/50 italic">
                          Nenhum colaborador encontrado com os filtros selecionados.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => (
                        <tr 
                          key={user.id} 
                          id={`user-row-${user.id}`}
                          className="hover:bg-brand-card-bright/20 transition-colors group"
                        >
                          {/* User Avatar Initial + Name */}
                          <td className="py-3.5 px-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-brand-primary/10 select-none text-brand-primary flex items-center justify-center font-bold border border-brand-primary/20 shrink-0">
                                {user.avatar}
                              </div>
                              <span className="font-extrabold text-white group-hover:text-brand-primary transition-colors">
                                {user.name}
                              </span>
                            </div>
                          </td>

                          {/* Email in Monospace */}
                          <td className="py-3.5 px-3 text-brand-text-muted/90 font-mono">
                            {user.email}
                          </td>

                          {/* Role badges matching colors in screenshots */}
                          <td className="py-3.5 px-3">
                            {user.role === 'ADMINISTRATOR' && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/15">
                                ADMINISTRATOR
                              </span>
                            )}
                            {user.role === 'MANAGER' && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/15">
                                MANAGER
                              </span>
                            )}
                            {user.role === 'ANALYST' && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-brand-bg text-brand-primary border border-brand-border">
                                ANALYST
                              </span>
                            )}
                          </td>

                          {/* Status Pip */}
                          <td className="py-3.5 px-3">
                            {user.status === 'Ativo' ? (
                              <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shrink-0" />
                                Ativo
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-brand-text-muted/55 font-bold">
                                <span className="w-2.5 h-2.5 rounded-full bg-brand-border inline-block shrink-0" />
                                Inativo
                              </span>
                            )}
                          </td>

                          {/* Action Items */}
                          <td className="py-3.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-2.5">
                              {/* Trash bin to delete users and show off functional responsiveness */}
                              <button
                                onClick={() => {
                                  if (confirm(`Deseja revogar permanentemente o acesso do usuário ${user.name}?`)) {
                                    onRemoveUser(user.id);
                                  }
                                }}
                                className="p-1 rounded hover:bg-brand-accent/15 text-brand-text-muted/40 hover:text-brand-accent transition-colors cursor-pointer"
                                title="Revogar acesso"
                              >
                                <Trash2 size={13} />
                              </button>
                              
                              <button className="p-1 rounded text-brand-text-muted/40 hover:text-white transition-colors cursor-pointer">
                                <Edit2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table pagination stats footer */}
              <div className="flex items-center justify-between pt-4 border-t border-brand-border/30 text-xs text-brand-text-muted">
                <span>
                  Mostrando <strong className="text-white">{filteredUsers.length}</strong> de <strong className="text-white">{users.length}</strong> usuários
                </span>

                <div className="flex items-center gap-2">
                  <button className="px-2.5 py-1 rounded bg-brand-bg hover:bg-brand-card-bright text-[11px] font-bold text-brand-text-muted cursor-pointer">
                    Anterior
                  </button>
                  <span className="px-3 py-1 rounded bg-brand-accent text-white font-bold text-xs select-none">
                    1
                  </span>
                  <button className="px-2.5 py-1 rounded bg-brand-bg hover:bg-brand-card-bright text-[11px] font-bold text-brand-text-muted cursor-pointer">
                    Próximo
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: PERFIS DE ACESSO */}
          {activeSubTab === 'perfis' && (
            <div className="space-y-6 animate-fade-in" id="perfis-tab-container">
              <div className="bg-brand-bg/50 p-4 rounded border border-brand-border text-xs text-brand-text-muted leading-relaxed">
                <h4 className="font-bold text-white text-sm mb-2 flex items-center gap-1.5">
                  <Shield size={14} className="text-brand-primary" />
                  Modelo de Governança RBAC (Role-Based Access Control)
                </h4>
                O sistema Sextante opera sob rígidos parâmetros de segregação de deveres, mitigando riscos de fraudes orçamentárias e vazamentos involuntários em conformidade com as diretivas executivas.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Profile Admin */}
                <div className="bg-brand-bg rounded-lg border border-brand-border p-5 space-y-3">
                  <span className="px-2.5 py-0.5 rounded text-[9px] font-black tracking-widest bg-red-500/10 text-red-400 border border-red-500/20 uppercase">
                    ADMINISTRATOR
                  </span>
                  <p className="text-xs text-brand-text-muted leading-relaxed">
                    Acesso total e irrestrito. Inclui as capacidades exclusivas de modificar limitadores fiscais da sinaleira, zerar bancos de dados e editar privilégios de outros colaboradores.
                  </p>
                  <ul className="text-[11px] text-white space-y-1 font-semibold list-disc list-inside">
                    <li>Modificar premissas e margens</li>
                    <li>Configurar auditoria geral</li>
                    <li>Excluir contratos ativos</li>
                  </ul>
                </div>

                {/* Profile Manager */}
                <div className="bg-brand-bg rounded-lg border border-brand-border p-5 space-y-3">
                  <span className="px-2.5 py-0.5 rounded text-[9px] font-black tracking-widest bg-amber-500/10 text-amber-300 border border-amber-500/20 uppercase">
                    MANAGER ACCESS
                  </span>
                  <p className="text-xs text-brand-text-muted leading-relaxed">
                    Mapeado para coordenadores seniores de projetos. Permite atualizar contratos, mudar ações mitigadoras imediatas e efetuar importação e carregamento de planilhas CSV.
                  </p>
                  <ul className="text-[11px] text-white space-y-1 font-semibold list-disc list-inside">
                    <li>Carregar transações e salários</li>
                    <li>Definir plano de contingência</li>
                    <li>Sugerir relatórios à diretoria</li>
                  </ul>
                </div>

                {/* Profile Analyst */}
                <div className="bg-brand-bg rounded-lg border border-brand-border p-5 space-y-3">
                  <span className="px-2.5 py-0.5 rounded text-[9px] font-black tracking-widest bg-brand-bg text-brand-primary border border-brand-border uppercase">
                    ANALYST ACCESS
                  </span>
                  <p className="text-xs text-brand-text-muted leading-relaxed">
                    Acesso de leitura para fiscalização. Habilita o profissional a investigar desvios no grid, realizar filtragens, pesquisar termos e exportar relatórios executivos em formato PDF.
                  </p>
                  <ul className="text-[11px] text-white space-y-1 font-semibold list-disc list-inside">
                    <li>Visão heurística de dados</li>
                    <li>Filtragem de riscos e desvios</li>
                    <li>Geração de PDFs locais</li>
                  </ul>
                </div>

              </div>
            </div>
          )}

          {/* TAB 3: LOGS DE AUDITORIA */}
          {activeSubTab === 'logs' && (
            <div className="space-y-4 animate-fade-in" id="logs-tab-container">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Historical Audit Logs</span>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 rounded">Monitoramento Criptografado Real-Time</span>
              </div>

              <div className="space-y-2.5">
                {auditLogs.map((log) => (
                  <div 
                    key={log.id} 
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-brand-bg/60 p-3 rounded border border-brand-border/60 hover:bg-brand-bg hover:border-brand-primary/20 transition-all text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded bg-brand-card-bright text-brand-primary border border-brand-border">
                        <Fingerprint size={14} />
                      </div>
                      <div>
                        <span className="font-extrabold text-white">{log.user}</span>
                        <span className="text-brand-text-muted ml-2">{log.action}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-[11px] font-mono text-brand-text-muted/60 self-start sm:self-center">
                      <span>IP: {log.ip}</span>
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {log.time}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Bottom section layout matches screenshot with three beautiful cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6" id="usuarios-security-cards">
        
        {/* Card 1: Account Security (Segurança da conta) */}
        <div className="bg-brand-card rounded-lg p-5 border border-brand-border flex items-center justify-between">
          <div className="space-y-3">
            <h4 className="text-xs uppercase font-bold tracking-wider text-brand-text-muted flex items-center gap-2">
              <Lock size={13} className="text-brand-primary" />
              Segurança da Conta
            </h4>
            
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-brand-text-muted">MFA Obrigatório:</span>
                <span className="font-extrabold text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] uppercase">
                  ATIVO
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-brand-text-muted">Expiração de Senha:</span>
                <span className="font-bold text-white">90 dias</span>
              </div>
            </div>
          </div>
          
          <Key size={36} className="text-brand-text-muted/10 shrink-0" />
        </div>

        {/* Card 2: Total Users Widget */}
        <div className="bg-brand-card rounded-lg p-5 border border-brand-border flex items-center justify-between">
          <div className="space-y-2">
            <h4 className="text-xs uppercase font-bold tracking-wider text-brand-text-muted">
              TOTAL DE USUÁRIOS
            </h4>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">{users.length}</span>
              <span className="text-[10px] font-bold text-emerald-400">
                +4 este mês
              </span>
            </div>
          </div>
          <Users size={36} className="text-brand-text-muted/10 shrink-0" />
        </div>

        {/* Card 3: Active Sessions Widget */}
        <div className="bg-brand-card rounded-lg p-5 border border-brand-border flex items-center justify-between">
          <div className="space-y-2">
            <h4 className="text-xs uppercase font-bold tracking-wider text-brand-text-muted">
              SESSÕES ATIVAS
            </h4>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">24</span>
              <span className="text-[10px] font-bold text-brand-text-muted flex items-center gap-1">
                <Zap size={11} className="text-brand-primary shrink-0 animate-bounce" />
                Tempo real
              </span>
            </div>
          </div>
          <Fingerprint size={36} className="text-brand-text-muted/10 shrink-0" />
        </div>

      </section>

      {/* Corporate Access Control Add User Dialog Form Backdrop */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in">
          <form 
            onSubmit={handleCreateUser}
            className="bg-brand-card p-6 rounded-lg max-w-md w-full border border-brand-border space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-brand-border/45 pb-3">
              <h3 className="font-extrabold text-white text-base">Cadastrar Novo Usuário</h3>
              <button 
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 text-brand-text-muted hover:text-white rounded"
              >
                <XCircle size={18} />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-brand-text-muted uppercase mb-1">Nome Completo</label>
              <input 
                type="text" 
                required
                value={newUserName}
                placeholder="Ex. Ricardo Mendonça"
                onChange={e => setNewUserName(e.target.value)}
                className="w-full bg-brand-bg text-brand-text placeholder-brand-text-muted/30 p-2.5 rounded border border-brand-border text-xs focus:border-brand-primary outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-brand-text-muted uppercase mb-1">Endereço de E-mail</label>
              <input 
                type="email" 
                required
                value={newUserEmail}
                placeholder="exemplo@sextante.com.br"
                onChange={e => setNewUserEmail(e.target.value)}
                className="w-full bg-brand-bg text-brand-text placeholder-brand-text-muted/30 p-2.5 rounded border border-brand-border text-xs focus:border-brand-primary outline-none font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-brand-text-muted uppercase mb-1">Cargo (Perfil)</label>
                <select
                  value={newUserRole}
                  onChange={e => setNewUserRole(e.target.value as any)}
                  className="w-full bg-brand-bg text-brand-text p-2 rounded border border-brand-border text-xs focus:border-brand-primary outline-none h-9"
                >
                  <option value="ANALYST">ANALYST</option>
                  <option value="MANAGER">MANAGER</option>
                  <option value="ADMINISTRATOR">ADMINISTRATOR</option>
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
                className="px-4 py-2 bg-brand-accent text-white rounded hover:bg-brand-accent/90 text-xs font-bold"
              >
                Autorizar Colaborador
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Enterprise System Branding Footer */}
      <footer className="text-center pt-4 text-[10px] text-brand-text-muted/40 font-mono tracking-widest">
        SEXTANTE INTELLIGENCE • ENTERPRISE FINANCIAL CONTROLLER • V2.4.0
      </footer>

    </div>
  );
}

// Simple Helper to close the modal
function XCircle({ size, className }: { size: number, className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6" />
      <path d="m9 9 6 6" />
    </svg>
  );
}
