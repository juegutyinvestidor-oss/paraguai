'use client';

import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  CheckSquare, 
  Briefcase, 
  Activity, 
  LineChart, 
  Award,
  User, 
  Settings, 
  LogOut,
  X,
  Shield,
  FileText,
  ClipboardList,
  ChevronDown,
  ChevronRight,
  Flag,
  BarChart3,
  FolderOpen
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type UserProfile } from '../types/edukyne';
import { canAccessTab, normalizeRole, canAccessTabDynamic, type UserRole, type Permission } from '../lib/rbac';
import LanguageSwitcher from './LanguageSwitcher';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: UserProfile & { id?: string };
  onQuickCreate: () => void;
  isOpen?: boolean;
  onClose?: () => void;
  onLogout?: () => void;
  rolePermissions?: Record<UserRole, Permission[]>;
}

export default function Sidebar({ activeTab, setActiveTab, user, onQuickCreate: _onQuickCreate, isOpen = false, onClose, onLogout, rolePermissions }: SidebarProps) {
  const normalizedUserRole = normalizeRole(user.role || '');  const [isQuestionariosOpen, setIsQuestionariosOpen] = React.useState(false);
  const [isPerformanceOpen, setIsPerformanceOpen] = React.useState(false);
  const t = useTranslations('sidebar');

  type NavSubItem = {
    id: string;
    label: string;
    icon?: React.ComponentType<{ className?: string }>;
  };
  type NavItem = {
    id: string;
    label: string;
    icon?: React.ComponentType<{ className?: string }>;
    isParent?: boolean;
    isOpen?: boolean;
    setIsOpen?: (v: boolean) => void;
    subItems?: NavSubItem[];
  };

  const navItems: NavItem[] = [
    { id: 'dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { id: 'contrato', label: t('contratos'), icon: FileText },
    { id: 'alunos', label: t('alunos'), icon: Users },
    { id: 'presenca', label: t('presenca'), icon: CheckSquare },
    { id: 'profissionais', label: t('profissionais'), icon: Briefcase },
    { id: 'modalidades', label: t('modalidades'), icon: Activity },
    { id: 'avaliacoes', label: t('avaliacoes'), icon: Award },
    { id: 'plano-acao', label: t('planoAcao'), icon: FolderOpen },
    { 
      id: 'questionarios_menu', 
      label: t('questionarios'), 
      icon: ClipboardList,
      isParent: true,
      subItems: Array.from({length: 15}, (_, index) => ({
        id: `questionario-m${index + 1}`,
        label: t('modulo', {n: index + 1})
      }))
    },
    { 
      id: 'performance_menu', 
      label: t('performance'), 
      icon: LineChart,
      isParent: true,
      isOpen: isPerformanceOpen,
      setIsOpen: setIsPerformanceOpen,
      subItems: [
        { id: 'performance', label: t('desempenhoAluno'), icon: User },
        { id: 'analise-geral', label: t('analiseGeral'), icon: Flag },
        { id: 'painel-estatistico', label: t('painelEstatistico'), icon: LineChart }
      ]
    },
    { id: 'estudo-comparativo', label: t('estudoComparativo'), icon: BarChart3 },
    { id: 'perfil', label: t('perfil'), icon: User },
  ];

  return (
    <aside className={`bg-[#060e20] border-r border-[#3e484f]/40 h-dvh w-72 max-w-[85vw] fixed left-0 top-0 flex flex-col p-4 overflow-y-auto z-50 text-[#dae2fd] transition-transform duration-300 md:translate-x-0 md:max-w-none ${
      isOpen ? 'translate-x-0' : '-translate-x-full'
    }`}>
      {/* Branding Header */}
      <div className="mb-8 px-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#8ed5ff]">EDUKYNE</h1>
        </div>
        {onClose && (
          <button 
            onClick={onClose} 
            className="md:hidden p-2 hover:bg-[#131b2e] rounded-lg text-[#bdc8d1] hover:text-[#dae2fd]"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Main Navigation Links */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          if (item.isParent) {
            // Check if any sub-item or the parent ID itself is permitted
            const permissionId = item.id === 'questionarios_menu' ? 'questionario' : (item.id === 'performance_menu' ? 'performance' : item.id);
            
            const isPermitted = rolePermissions
              ? canAccessTabDynamic(rolePermissions, normalizedUserRole, permissionId)
              : canAccessTab(normalizedUserRole, permissionId);

            if (!isPermitted) {
              return null;
            }

            const IconComponent = item.icon!;
            const isAnySubActive = activeTab ? (
              item.id === 'questionarios_menu' ? activeTab.startsWith('questionario') :
              item.id === 'performance_menu' ? (activeTab === 'performance' || activeTab === 'analise-geral' || activeTab === 'painel-estatistico') :
              activeTab === item.id
            ) : false;

            return (
              <div key={item.id} className="space-y-1">
                <button
                  type="button"
                  onClick={() => item.setIsOpen ? item.setIsOpen(!item.isOpen) : (item.id === 'questionarios_menu' ? setIsQuestionariosOpen(!isQuestionariosOpen) : null)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isAnySubActive 
                      ? 'bg-[#1a2b4b]/80 text-[#8ed5ff] border-l-4 border-[#8ed5ff]' 
                      : 'text-[#bdc8d1] hover:text-[#dae2fd] hover:bg-[#1a2b4b]/50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <IconComponent className={`w-4 h-4 shrink-0 ${isAnySubActive ? 'text-[#8ed5ff]' : 'text-[#87929a]'}`} />
                    <span>{item.label}</span>
                  </div>
                  {(item.isOpen ?? (item.id === 'questionarios_menu' ? isQuestionariosOpen : false)) ? (
                    <ChevronDown className={`w-4 h-4 ${isAnySubActive ? 'text-[#8ed5ff]' : 'text-[#87929a]'} shrink-0`} />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-[#87929a] shrink-0" />
                  )}
                </button>

                {(item.isOpen ?? (item.id === 'questionarios_menu' ? isQuestionariosOpen : false)) && item.subItems && (
                  <div className="pl-6 space-y-1 border-l border-[#1e2e4b] ml-6 mt-1 flex flex-col">
                    {item.subItems.filter(sub => {
                      const isSubPermitted = rolePermissions
                        ? canAccessTabDynamic(rolePermissions, normalizedUserRole, sub.id)
                        : canAccessTab(normalizedUserRole, sub.id);
                        
                      if (!isSubPermitted) return false;

                      if (normalizedUserRole === 'Aluno' && item.id === 'performance_menu') {
                        return sub.id === 'analise-geral';
                      }
                      return true;
                    }).map((sub) => {
                      const isSubActive = activeTab === sub.id;
                      const SubIcon = sub.icon;
                      
                      return (
                        <button
                          type="button"
                          key={sub.id}
                          onClick={() => setActiveTab(sub.id)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 text-left ${
                            isSubActive
                              ? 'text-[#8ed5ff] bg-[#39485a]/40 font-semibold'
                              : 'text-[#87929a] hover:text-[#dae2fd] hover:bg-[#1a2b4b]/30'
                          }`}
                        >
                          {SubIcon ? (
                            <SubIcon className={`w-3 h-3 ${isSubActive ? 'text-[#8ed5ff]' : 'text-[#87929a]'}`} />
                          ) : (
                            <span className={`w-1.5 h-1.5 rounded-full ${isSubActive ? 'bg-[#8ed5ff]' : 'bg-[#3b4859]'}`} />
                          )}
                          <span>{sub.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          const IconComponent = item.icon!;
          const isActive = activeTab === item.id;
          const isPermitted = rolePermissions
            ? canAccessTabDynamic(rolePermissions, normalizedUserRole, item.id)
            : canAccessTab(normalizedUserRole, item.id);

          if (!isPermitted) {
            return null;
          }
          if (normalizedUserRole === 'Aluno' && item.id === 'estudo-comparativo') {
            return null;
          }

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-[#39485a] text-[#8ed5ff] shadow-md border-l-4 border-[#8ed5ff]' 
                  : 'text-[#bdc8d1] hover:text-[#dae2fd] hover:bg-[#1a2b4b]/50'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <IconComponent className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#8ed5ff]' : 'text-[#87929a]'}`} />
                <span>{item.label}</span>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Section Footer */}
      <div className="border-t border-[#3e484f]/40 pt-4 space-y-1">
        {(() => {
          const isSettingsPermitted = rolePermissions
            ? canAccessTabDynamic(rolePermissions, normalizedUserRole, 'settings')
            : canAccessTab(normalizedUserRole, 'settings');

          if (!isSettingsPermitted) {
            return null;
          }

          return (
            <button 
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center justify-between px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'settings' 
                  ? 'bg-[#39485a] text-[#8ed5ff]' 
                  : 'text-[#bdc8d1] hover:text-[#dae2fd] hover:bg-[#1a2b4b]/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Settings className="w-4 h-4 text-[#87929a]" />
                <span>{t('configuracoes')}</span>
              </div>
            </button>
          );
        })()}

        <button 
          onClick={() => {
            if (onLogout) {
              onLogout();
            } else {
              alert(t('sessaoEncerrada'));
            }
          }}
          className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium text-[#ffb4ab] hover:bg-[#93000a]/20 transition-colors"
        >
          <LogOut className="w-4 h-4 text-[#ffb4ab]" />
          <span>{t('sair')}</span>
        </button>

        <div className="mt-4 px-1">
          <LanguageSwitcher />
        </div>

        {/* Mini Profile Summary */}
        <div className="flex items-center gap-3 px-2 mt-4 pt-4 border-t border-[#3e484f]/25">
          <div className="w-10 h-10 rounded-full flex items-center justify-center border border-[#87929a]/40 bg-[#1e293b] text-[#8ed5ff] text-sm font-bold shrink-0">
            {user.name ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase() : '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-[#dae2fd] truncate">{user.name}</p>            <p className="text-[10px] text-[#bdc8d1]/80 truncate flex items-center gap-1">
              <Shield className="w-3 h-3 text-[#38bdf8]" />
              <span className="font-semibold text-[#8ed5ff]">{normalizedUserRole}</span>
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
