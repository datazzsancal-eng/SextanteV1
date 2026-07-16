import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Coins,
  UploadCloud, 
  ClipboardList,
  Sliders, 
  Users, 
  Settings, 
  Activity, 
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';
import { UserProfile } from '../types';

interface SidebarProps {
  currentTab: string;
  onTabChange: (tabId: string) => void;
  currentUser: UserProfile;
  onChangeUser: () => void;
  isExecutiveView: boolean;
}

export default function Sidebar({
  currentTab,
  onTabChange,
  currentUser,
  onChangeUser,
  isExecutiveView
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isOperacaoExpanded, setIsOperacaoExpanded] = useState(() => {
    return currentTab === 'carga' || currentTab === 'cadastros';
  });
  const [isConfigExpanded, setIsConfigExpanded] = useState(() => {
    return currentTab === 'configuracoes' || currentTab === 'parametros';
  });

  useEffect(() => {
    if (currentTab === 'carga' || currentTab === 'cadastros') {
      setIsOperacaoExpanded(true);
    }
    if (currentTab === 'configuracoes' || currentTab === 'parametros') {
      setIsConfigExpanded(true);
    }
  }, [currentTab]);

  const menuItems1 = useMemo(() => {
    const items = [
      { id: 'novodash', label: 'Dash Executivo', icon: LayoutDashboard },
      { id: 'dashlideranca', label: 'Dash Lideres', icon: LayoutDashboard },
      { id: 'honorarios', label: 'Honorários', icon: Coins },
    ];
    if (!isExecutiveView) {
      return items.filter(item => item.id === 'dashlideranca');
    }
    return items;
  }, [isExecutiveView]);

  const menuItems2 = useMemo(() => {
    const items = [
      { id: 'usuarios', label: 'Usuários', icon: Users },
    ];
    if (!isExecutiveView) {
      return [];
    }
    return items;
  }, [isExecutiveView]);

  const handleOperacaoHeaderClick = () => {
    if (isCollapsed) {
      setIsCollapsed(false);
      setIsOperacaoExpanded(true);
    } else {
      setIsOperacaoExpanded(!isOperacaoExpanded);
    }
  };

  const handleConfigHeaderClick = () => {
    if (isCollapsed) {
      setIsCollapsed(false);
      setIsConfigExpanded(true);
    } else {
      setIsConfigExpanded(!isConfigExpanded);
    }
  };

  return (
    <aside 
      id="sextante-sidebar"
      className={`sticky top-0 h-screen bg-brand-bg border-r border-brand-border flex flex-col shrink-0 transition-all duration-300 ease-in-out relative ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Collapsible Trigger Button overlap in right border margin */}
      <button
        id="sidebar-collapse-toggle"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute right-0 top-8 w-6 h-6 rounded-full bg-brand-accent hover:bg-brand-primary text-white flex items-center justify-center cursor-pointer border border-brand-border shadow-lg transition-all hover:scale-110 active:scale-95 z-50 translate-x-1/2"
        title={isCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <div className={`overflow-y-auto flex-1 flex flex-col justify-between w-full h-full no-scrollbar ${
        isCollapsed ? 'p-4 items-center' : 'p-6'
      }`}>
        <div className="w-full flex flex-col">
        {/* Brand Header */}
        <div id="brand-header-container" className={`mb-10 select-none flex ${isCollapsed ? 'justify-center' : 'justify-start'}`}>
          {isCollapsed ? (
            <img 
              src="https://raw.githubusercontent.com/datazzsancal-eng/logos/refs/heads/main/sextante/logo_ico_sextante_v.png" 
              alt="Sextante Icon" 
              referrerPolicy="no-referrer"
              className="w-8 h-8 object-contain shrink-0"
            />
          ) : (
            <img 
              src="https://raw.githubusercontent.com/datazzsancal-eng/logos/refs/heads/main/sextante/sextante_v.png" 
              alt="Sextante Financial Controller" 
              referrerPolicy="no-referrer"
              className="h-8 max-w-full object-contain"
            />
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="space-y-1.5" id="sidebar-navigation">
          {menuItems1.map((item) => {
            const IconComponent = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => onTabChange(item.id)}
                title={isCollapsed ? item.label : undefined}
                className={`w-full flex items-center rounded-lg transition-all duration-200 group ${
                  isCollapsed 
                    ? 'justify-center p-3' 
                    : 'gap-3.5 px-4 py-3.5 text-left'
                } ${
                  isActive
                    ? 'bg-brand-card-bright text-brand-primary border-l-4 border-brand-accent font-medium shadow-md'
                    : 'text-brand-text-muted hover:bg-brand-card hover:text-brand-text'
                }`}
              >
                <IconComponent 
                  size={19} 
                  className={`transition-colors duration-200 shrink-0 ${
                    isActive ? 'text-brand-primary' : 'text-brand-text-muted/60 group-hover:text-brand-text-muted'
                  }`} 
                />
                {!isCollapsed && (
                  <>
                    <span className="text-sm font-medium tracking-wide">
                      {item.label}
                    </span>
                    {isActive && (
                      <ChevronRight size={14} className="ml-auto text-brand-primary/60" />
                    )}
                  </>
                )}
              </button>
            );
          })}

          {isExecutiveView && (
            <>
              {/* Collapsible Operação Group */}
              <div className="flex flex-col space-y-1 pt-1.5 border-t border-brand-border/10">
                <button
                  id="nav-operacao-parent"
                  onClick={handleOperacaoHeaderClick}
                  title={isCollapsed ? "Operação" : undefined}
                  className={`w-full flex items-center rounded-lg transition-all duration-200 group ${
                    isCollapsed 
                      ? 'justify-center p-3' 
                      : 'gap-3.5 px-4 py-3.5 text-left'
                  } ${
                    (currentTab === 'carga' || currentTab === 'cadastros')
                      ? 'bg-brand-card-bright/40 text-brand-primary'
                      : 'text-brand-text-muted hover:bg-brand-card hover:text-brand-text'
                  }`}
                >
                  <Activity 
                    size={19} 
                    className={`transition-colors duration-200 shrink-0 ${
                      (currentTab === 'carga' || currentTab === 'cadastros') ? 'text-brand-primary' : 'text-brand-text-muted/60 group-hover:text-brand-text-muted'
                    }`} 
                  />
                  {!isCollapsed && (
                    <>
                      <span className="text-sm font-medium tracking-wide flex-1">
                        Operação
                      </span>
                      {isOperacaoExpanded ? (
                        <ChevronDown size={14} className="text-brand-text-muted group-hover:text-brand-text shrink-0" />
                      ) : (
                        <ChevronRight size={14} className="text-brand-text-muted group-hover:text-brand-text shrink-0" />
                      )}
                    </>
                  )}
                </button>

                {/* Submenus if expanded and not collapsed */}
                {!isCollapsed && isOperacaoExpanded && (
                  <div className="ml-4 pl-3 border-l border-brand-border/40 flex flex-col space-y-1 mt-1">
                    {/* Carga de Dados */}
                    <button
                      id="nav-sub-carga"
                      onClick={() => onTabChange('carga')}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-md transition-all duration-200 text-left ${
                        currentTab === 'carga'
                          ? 'bg-brand-card text-brand-primary font-bold border-l-2 border-brand-accent shadow-sm'
                          : 'text-brand-text-muted/80 hover:bg-brand-card/50 hover:text-brand-text'
                      }`}
                    >
                      <UploadCloud size={14} className={currentTab === 'carga' ? 'text-brand-primary shrink-0' : 'text-brand-text-muted/60 shrink-0'} />
                      <span>Carga de Dados</span>
                    </button>

                    {/* Cadastros */}
                    <button
                      id="nav-sub-cadastros"
                      onClick={() => onTabChange('cadastros')}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-md transition-all duration-200 text-left ${
                        currentTab === 'cadastros'
                          ? 'bg-brand-card text-brand-primary font-bold border-l-2 border-brand-accent shadow-sm'
                          : 'text-brand-text-muted/80 hover:bg-brand-card/50 hover:text-brand-text'
                      }`}
                    >
                      <ClipboardList size={14} className={currentTab === 'cadastros' ? 'text-brand-primary shrink-0' : 'text-brand-text-muted/60 shrink-0'} />
                      <span>Cadastros</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Collapsible Configurações Group */}
              <div className="flex flex-col space-y-1 pt-1.5 border-t border-brand-border/10">
                <button
                  id="nav-configuracoes-parent"
                  onClick={handleConfigHeaderClick}
                  title={isCollapsed ? "Configurações" : undefined}
                  className={`w-full flex items-center rounded-lg transition-all duration-200 group ${
                    isCollapsed 
                      ? 'justify-center p-3' 
                      : 'gap-3.5 px-4 py-3.5 text-left'
                  } ${
                    (currentTab === 'configuracoes' || currentTab === 'parametros')
                      ? 'bg-brand-card-bright/40 text-brand-primary'
                      : 'text-brand-text-muted hover:bg-brand-card hover:text-brand-text'
                  }`}
                >
                  <Settings 
                    size={19} 
                    className={`transition-colors duration-200 shrink-0 ${
                      (currentTab === 'configuracoes' || currentTab === 'parametros') ? 'text-brand-primary' : 'text-brand-text-muted/60 group-hover:text-brand-text-muted'
                    }`} 
                  />
                  {!isCollapsed && (
                    <>
                      <span className="text-sm font-medium tracking-wide flex-1">
                        Configurações
                      </span>
                      {isConfigExpanded ? (
                        <ChevronDown size={14} className="text-brand-text-muted group-hover:text-brand-text shrink-0" />
                      ) : (
                        <ChevronRight size={14} className="text-brand-text-muted group-hover:text-brand-text shrink-0" />
                      )}
                    </>
                  )}
                </button>

                {/* Submenus if expanded and not collapsed */}
                {!isCollapsed && isConfigExpanded && (
                  <div className="ml-4 pl-3 border-l border-brand-border/40 flex flex-col space-y-1 mt-1">
                    {/* Gerais */}
                    <button
                      id="nav-sub-gerais"
                      onClick={() => onTabChange('configuracoes')}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-md transition-all duration-200 text-left ${
                        currentTab === 'configuracoes'
                          ? 'bg-brand-card text-brand-primary font-bold border-l-2 border-brand-accent shadow-sm'
                          : 'text-brand-text-muted/80 hover:bg-brand-card/50 hover:text-brand-text'
                      }`}
                    >
                      <Settings size={14} className={currentTab === 'configuracoes' ? 'text-brand-primary shrink-0' : 'text-brand-text-muted/60 shrink-0'} />
                      <span>Gerais</span>
                    </button>

                    {/* Parâmetros */}
                    <button
                      id="nav-sub-parametros"
                      onClick={() => onTabChange('parametros')}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-md transition-all duration-200 text-left ${
                        currentTab === 'parametros'
                          ? 'bg-brand-card text-brand-primary font-bold border-l-2 border-brand-accent shadow-sm'
                          : 'text-brand-text-muted/80 hover:bg-brand-card/50 hover:text-brand-text'
                      }`}
                    >
                      <Sliders size={14} className={currentTab === 'parametros' ? 'text-brand-primary shrink-0' : 'text-brand-text-muted/60 shrink-0'} />
                      <span>Parâmetros</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </nav>
      </div>

      {/* User Profile Footer */}
      <div 
        id="profile-footer-container"
        className="mt-auto pt-6 border-t border-brand-border/40 w-full flex justify-center"
      >
        <button
          onClick={onChangeUser}
          className={`w-full flex items-center rounded-lg hover:bg-brand-card transition-all duration-200 cursor-pointer text-left group ${
            isCollapsed ? 'justify-center p-1' : 'gap-3 p-2'
          }`}
          title="Clique para alternar perfil de usuário"
        >
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-full bg-brand-accent flex items-center justify-center text-white font-bold text-xs select-none shadow border border-brand-primary/20">
              {currentUser.avatar}
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-brand-bg" />
          </div>
          
          {!isCollapsed && (
            <>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-bold text-brand-text group-hover:text-brand-primary transition-colors truncate">
                  {currentUser.name}
                </h4>
                <p className="text-[11px] font-semibold text-brand-text-muted/65 uppercase tracking-wider truncate">
                  {currentUser.role === 'ADMINISTRATOR' ? 'Senior Controller' : currentUser.role === 'MANAGER' ? 'Manager Access' : 'Data Analyst'}
                </p>
              </div>
              <div className="text-[10px] bg-brand-card-light py-0.5 px-1.5 rounded text-brand-primary border border-brand-border/50 font-mono scale-90">
                Alt
              </div>
            </>
          )}
        </button>
      </div>
    </div>
  </aside>
  );
}
