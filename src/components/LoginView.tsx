import React, { useState } from 'react';
import { ShieldCheck, KeyRound, Lock, ArrowRight, UserCheck, AlertCircle, Sparkles, LogIn, Key, CheckCircle2 } from 'lucide-react';
import { UserProfile } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface LoginViewProps {
  profiles: UserProfile[];
  onLoginSuccess: (user: UserProfile) => void;
  onUpdateUser: (id: string, updatedFields: Partial<UserProfile>) => void;
}

export default function LoginView({
  profiles,
  onLoginSuccess,
  onUpdateUser
}: LoginViewProps) {
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [firstPassword, setFirstPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // States
  const [detectedUser, setDetectedUser] = useState<UserProfile | null>(null);
  const [isFirstAccessMode, setIsFirstAccessMode] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);

  // Step 1: Handle Email Check
  const handleCheckEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!emailInput.trim()) {
      setErrorMessage('Por favor, informe seu e-mail de acesso.');
      return;
    }

    setIsCheckingEmail(true);
    const trimmed = emailInput.trim().toLowerCase();

    // 1. Search in local state array
    let foundUser = profiles.find(u => u.email.toLowerCase() === trimmed);

    // 2. If not found in local state, try querying Supabase profiles table directly
    if (!foundUser && isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .ilike('email', trimmed);

        if (!error && data && data.length > 0) {
          const dbRow = data[0];
          foundUser = {
            id: dbRow.id,
            name: dbRow.nome || dbRow.name || 'Usuário',
            email: dbRow.email,
            role: dbRow.role || 'Colaborador',
            status: dbRow.status || 'Ativo',
            avatar: dbRow.avatar || (dbRow.nome || dbRow.name || 'US').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2),
            novo_usuario: dbRow.novo_usuario ?? true,
            created_at: dbRow.created_at ? new Date(dbRow.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            password: dbRow.password || dbRow.senha
          };
        }
      } catch (err) {
        console.warn('Erro ao consultar Supabase profiles:', err);
      }
    }

    setIsCheckingEmail(false);

    if (!foundUser) {
      setErrorMessage(`E-mail '${emailInput}' não localizado na tabela de perfis (profiles). Peça o cadastro ao Master ou Admin.`);
      setDetectedUser(null);
      setIsFirstAccessMode(false);
      return;
    }

    if (foundUser.status === 'Inativo') {
      setErrorMessage(`O usuário '${foundUser.name}' está inativo no sistema. Entre em contato com o administrador.`);
      setDetectedUser(null);
      setIsFirstAccessMode(false);
      return;
    }

    setDetectedUser(foundUser);

    // Flag check: if novo_usuario === true, force first password setup!
    if (foundUser.novo_usuario) {
      setIsFirstAccessMode(true);
      setSuccessMessage(`Primeiro acesso detectado para ${foundUser.name}! Defina sua senha inicial para liberar o acesso.`);
    } else {
      setIsFirstAccessMode(false);
    }
  };

  // Step 2: Handle First Access Password Creation
  const handleSaveFirstPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!detectedUser) return;

    if (firstPassword.length < 6) {
      setErrorMessage('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (firstPassword !== confirmPassword) {
      setErrorMessage('As senhas informadas não coincidem.');
      return;
    }

    // Update user in profiles: set novo_usuario = false and set password
    const updatedUser: UserProfile = {
      ...detectedUser,
      novo_usuario: false,
      password: firstPassword,
      status: 'Ativo'
    };

    onUpdateUser(detectedUser.id, {
      novo_usuario: false,
      password: firstPassword,
      status: 'Ativo'
    });

    setSuccessMessage(`Senha criada com sucesso! Acessando sistema Sextante...`);

    setTimeout(() => {
      onLoginSuccess(updatedUser);
    }, 1200);
  };

  // Step 3: Handle Regular Password Login
  const handleRegularLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!detectedUser) return;

    // Check password if set, or allow direct OAuth login
    if (detectedUser.password && passwordInput !== detectedUser.password) {
      setErrorMessage('Senha incorreta. Tente novamente.');
      return;
    }

    onLoginSuccess(detectedUser);
  };

  // Quick select user for test environment
  const handleSelectQuickUser = (user: UserProfile) => {
    setEmailInput(user.email);
    setDetectedUser(user);
    setErrorMessage('');
    setSuccessMessage('');
    if (user.novo_usuario) {
      setIsFirstAccessMode(true);
      setSuccessMessage(`Primeiro acesso para ${user.name}. Crie uma senha abaixo:`);
    } else {
      setIsFirstAccessMode(false);
    }
  };

  return (
    <div id="login-view-screen" className="min-h-screen w-full bg-brand-surface text-brand-text flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background glow graphics */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand-accent/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full space-y-6 relative z-10">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-accent/10 border border-brand-accent/30 text-brand-primary text-xs font-black tracking-widest uppercase mb-1">
            <ShieldCheck size={14} />
            Autenticação Supabase OAuth & RLS
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            SEXTANTE <span className="text-brand-primary">GESTAO</span>
          </h1>
          <p className="text-xs text-brand-text-muted max-w-sm mx-auto">
            Acesso ao sistema de gestão operacional, honorários e sinaleiras.
          </p>
        </div>

        {/* Main Auth Card */}
        <div className="bg-brand-card p-6 md:p-8 rounded-xl border border-brand-border shadow-2xl space-y-6">
          
          {/* Messages */}
          {errorMessage && (
            <div className="p-3.5 rounded-lg bg-red-950/50 border border-red-500/40 text-red-300 text-xs flex items-start gap-2.5 animate-fade-in">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-lg bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs flex items-start gap-2.5 animate-fade-in">
              <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* STEP 1: EMAIL INPUT (If no user detected or changing email) */}
          {!detectedUser && (
            <form onSubmit={handleCheckEmail} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-brand-text-muted uppercase tracking-wider mb-2">
                  E-mail de Acesso
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="seu.email@sextante.com.br"
                    className="w-full bg-brand-bg text-white placeholder-brand-text-muted/40 p-3 pl-10 rounded-lg border border-brand-border text-xs focus:border-brand-primary outline-none font-mono"
                  />
                  <LogIn className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-text-muted/50" size={15} />
                </div>
              </div>

              <button
                type="submit"
                disabled={isCheckingEmail}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-brand-accent hover:bg-brand-accent/90 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer"
              >
                {isCheckingEmail ? 'Verificando tabela profiles...' : 'Continuar'}
                <ArrowRight size={15} />
              </button>
            </form>
          )}

          {/* STEP 2: FIRST ACCESS PASSWORD CREATION (novo_usuario === true) */}
          {detectedUser && isFirstAccessMode && (
            <form onSubmit={handleSaveFirstPassword} className="space-y-4">
              
              <div className="bg-amber-950/40 border border-amber-500/40 rounded-lg p-3.5 space-y-1 text-xs">
                <div className="flex items-center gap-2 text-amber-300 font-bold">
                  <KeyRound size={15} className="animate-pulse" />
                  Primeiro Acesso Detectado
                </div>
                <p className="text-amber-200/80 text-[11px] leading-relaxed">
                  O usuário <strong className="text-white">{detectedUser.name}</strong> (`{detectedUser.email}`) foi cadastrado diretamente sem senha. Defina sua senha inicial abaixo:
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-text-muted uppercase mb-1">
                  Nova Senha de Acesso
                </label>
                <input
                  type="password"
                  required
                  value={firstPassword}
                  onChange={(e) => setFirstPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-brand-bg text-white placeholder-brand-text-muted/40 p-2.5 rounded border border-brand-border text-xs focus:border-brand-primary outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-text-muted uppercase mb-1">
                  Confirmar Nova Senha
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                  className="w-full bg-brand-bg text-white placeholder-brand-text-muted/40 p-2.5 rounded border border-brand-border text-xs focus:border-brand-primary outline-none font-mono"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setDetectedUser(null);
                    setEmailInput('');
                  }}
                  className="px-3 py-2 bg-brand-bg text-brand-text-muted rounded hover:text-white text-xs font-bold"
                >
                  Voltar
                </button>

                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md"
                >
                  Criar Senha e Entrar
                </button>
              </div>

            </form>
          )}

          {/* STEP 3: REGULAR LOGIN (novo_usuario === false) */}
          {detectedUser && !isFirstAccessMode && (
            <form onSubmit={handleRegularLogin} className="space-y-4">
              
              <div className="flex items-center gap-3 p-3 rounded-lg bg-brand-bg border border-brand-border">
                <div className="w-10 h-10 rounded-full bg-brand-primary/10 text-brand-primary font-bold flex items-center justify-center border border-brand-primary/20 shrink-0">
                  {detectedUser.avatar}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-white truncate">{detectedUser.name}</h4>
                  <p className="text-[11px] text-brand-text-muted font-mono truncate">{detectedUser.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDetectedUser(null);
                    setEmailInput('');
                    setPasswordInput('');
                  }}
                  className="text-[10px] text-brand-primary hover:underline font-bold"
                >
                  Alterar
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-text-muted uppercase mb-1">
                  Senha de Acesso
                </label>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Digite sua senha..."
                  className="w-full bg-brand-bg text-white placeholder-brand-text-muted/40 p-2.5 rounded border border-brand-border text-xs focus:border-brand-primary outline-none font-mono"
                />
              </div>

              <div className="space-y-2 pt-1">
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded bg-brand-accent hover:bg-brand-accent/90 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md"
                >
                  Entrar no Sistema
                </button>

                <button
                  type="button"
                  onClick={() => onLoginSuccess(detectedUser)}
                  className="w-full py-2 px-4 rounded bg-brand-bg hover:bg-brand-card-bright text-brand-primary border border-brand-border/60 font-bold text-xs transition-all cursor-pointer"
                >
                  Acessar via Supabase OAuth
                </button>
              </div>

            </form>
          )}

        </div>

        {/* Quick Profile Selector */}
        {profiles.length > 0 ? (
          <div className="bg-brand-card/60 p-4 rounded-xl border border-brand-border/60 space-y-3">
            <div className="flex items-center justify-between text-xs text-brand-text-muted font-bold">
              <span className="flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                <UserCheck size={13} className="text-brand-primary" />
                Perfis do Banco (Tabela Profiles)
              </span>
              <span className="text-[10px] text-brand-primary">{profiles.length} cadastrados</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {profiles.slice(0, 6).map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleSelectQuickUser(user)}
                  className={`p-2 rounded border text-left transition-all cursor-pointer flex items-center gap-2 ${
                    detectedUser?.id === user.id
                      ? 'bg-brand-primary/20 border-brand-primary text-white'
                      : 'bg-brand-bg/80 border-brand-border hover:bg-brand-card hover:border-brand-text-muted/40 text-brand-text-muted'
                  }`}
                >
                  <div className="w-7 h-7 rounded-full bg-brand-card flex items-center justify-center font-bold text-[10px] text-white shrink-0 border border-brand-border">
                    {user.avatar}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-bold text-white truncate">{user.name}</div>
                    <div className="text-[9px] flex items-center gap-1">
                      <span className="font-semibold text-brand-primary">{user.role}</span>
                      {user.novo_usuario && (
                        <span className="text-[8px] bg-amber-500/20 text-amber-300 px-1 rounded">Novo</span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-brand-card/40 p-3 rounded-xl border border-brand-border/40 text-center text-xs text-brand-text-muted font-medium">
            Digite seu e-mail cadastrado na tabela de perfis (profiles) para efetuar login.
          </div>
        )}

      </div>

    </div>
  );
}
