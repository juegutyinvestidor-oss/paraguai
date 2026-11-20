export type UserRole = 'Administrador' | 'Gestor' | 'Professor' | 'Estagiário' | 'Assistente' | 'Aluno';

export type Permission =
  // Screen views (Granular navigation accesses)
  | 'view:dashboard'
  | 'view:contrato'
  | 'view:alunos'
  | 'view:presenca'
  | 'view:profissionais'
  | 'view:modalidades'
  | 'view:avaliacoes'
  | 'view:performance'
  | 'view:analise-geral'
  | 'view:painel-estatistico'
  | 'view:estudo-comparativo'
  | 'view:questionario'
  | 'view:perfil'
  | 'view:settings'
  | 'view:plano_acao'
  
  // Granular Actions for Students (Alunos)
  | 'create:alunos'
  | 'edit:alunos'
  | 'delete:alunos'
  
  // Granular Actions for Contracts (Contratos)
  | 'create:contrato'
  | 'edit:contrato'
  | 'delete:contrato'
  
  // Granular Actions for Attendance (Frequência)
  | 'edit:presenca'
  
  // Granular Actions for Professionals (Profissionais)
  | 'create:profissionais'
  | 'edit:profissionais'
  | 'delete:profissionais'
  
  // Granular Actions for Modalities (Modalidades)
  | 'create:modalidades'
  | 'edit:modalidades'
  | 'delete:modalidades'
  
  // Granular Actions for Assessments (Avaliações)
  | 'create:avaliacoes'
  | 'edit:avaliacoes'
  | 'delete:avaliacoes'
  
  // Granular Actions for Plano de Ação (Planos de Ação)
  | 'create:plano_acao'
  | 'edit:plano_acao'
  | 'delete:plano_acao';

// Helper translations for friendly action logs
export const PERMISSION_LABELS: Record<Permission, string> = {
  'view:dashboard': 'Visualizar Painel de Indicadores (Dashboard de Performance & KPIs)',
  'view:contrato': 'Visualizar Gestão de Contratos (Alocação & Escalas por Região)',
  'view:alunos': 'Visualizar Listagem de Alunos & Filtro Vocacional',
  'view:presenca': 'Visualizar Controle de Presença & Diário de Classe',
  'view:profissionais': 'Visualizar Quadro de Profissionais (Com Seleção Múltipla Avançada para Gestores)',
  'view:modalidades': 'Visualizar Modalidades Esportivas & Quadras de Atividades',
  'view:avaliacoes': 'Visualizar Central de Avaliações & Laudos Técnicos',
  'view:performance': 'Visualizar Relatórios de Performance & Gráficos D3',
  'view:analise-geral': 'Visualizar Análise Geral de Desempenho Institucional',
  'view:painel-estatistico': 'Visualizar Painel Estatístico (estatísticas consolidadas da turma/filtro)',
  'view:estudo-comparativo': 'Visualizar Estudo Comparativo (recortes lado a lado com deltas por dimensão)',
  'view:questionario': 'Responder e Visualizar Questionários',
  'view:perfil': 'Acessar Perfil de Usuário (Painel de Cadastro & Segurança RBAC)',
  'view:settings': 'Configurações de Conectividade, Scripts e Sincronização com Auto-cura de Perfis',
  'view:plano_acao': 'Visualizar Central de Planos de Ação & Documentos PDF',
  
  'create:contrato': 'Cadastrar Novo Contrato no Sistema',
  'edit:contrato': 'Editar Dados e Vínculos de Contrato',
  'delete:contrato': 'Excluir Contrato e Desvincular Localidades',
  
  'create:alunos': 'Cadastrar Novo Aluno',
  'edit:alunos': 'Editar Cadastro de Aluno',
  'delete:alunos': 'Excluir Aluno do CRM',
  
  'edit:presenca': 'Lançar e Alterar Presenças',
  
  'create:profissionais': 'Cadastrar Profissional (Habilita Painéis de Seleção Múltipla Avançada para Gestores: Máx 2 Estados, 10 Regiões e 20 Localidades)',
  'edit:profissionais': 'Editar Dados do Profissional (Altera registros usando Seleção Única ou Painéis Multi-seleção)',
  'delete:profissionais': 'Remover Profissional do Sistema',
  
  'create:modalidades': 'Configurar Nova Modalidade',
  'edit:modalidades': 'Editar Modalidades Cadastradas',
  'delete:modalidades': 'Excluir Modalidade',
  
  'create:avaliacoes': 'Registrar Novas Avaliações Físicas/Vocacionais',
  'edit:avaliacoes': 'Editar Histórico de Diagnósticos',
  'delete:avaliacoes': 'Remover Registro de Avaliação',
  
  'create:plano_acao': 'Criar Pastas e Enviar PDFs no Plano de Ação',
  'edit:plano_acao': 'Gerenciar Conteúdo do Plano de Ação',
  'delete:plano_acao': 'Excluir Pastas e PDFs do Plano de Ação'
};

export const PERMISSION_LABEL_KEYS: Record<Permission, string> = {
  'view:dashboard': 'permissoes.viewDashboard',
  'view:contrato': 'permissoes.viewContrato',
  'view:alunos': 'permissoes.viewAlunos',
  'view:presenca': 'permissoes.viewPresenca',
  'view:profissionais': 'permissoes.viewProfissionais',
  'view:modalidades': 'permissoes.viewModalidades',
  'view:avaliacoes': 'permissoes.viewAvaliacoes',
  'view:performance': 'permissoes.viewPerformance',
  'view:analise-geral': 'permissoes.viewAnaliseGeral',
  'view:painel-estatistico': 'permissoes.viewPainelEstatistico',
  'view:estudo-comparativo': 'permissoes.viewEstudoComparativo',
  'view:questionario': 'permissoes.viewQuestionario',
  'view:perfil': 'permissoes.viewPerfil',
  'view:settings': 'permissoes.viewSettings',
  'view:plano_acao': 'permissoes.viewPlanoAcao',
  'create:contrato': 'permissoes.createContrato',
  'edit:contrato': 'permissoes.editContrato',
  'delete:contrato': 'permissoes.deleteContrato',
  'create:alunos': 'permissoes.createAlunos',
  'edit:alunos': 'permissoes.editAlunos',
  'delete:alunos': 'permissoes.deleteAlunos',
  'edit:presenca': 'permissoes.editPresenca',
  'create:profissionais': 'permissoes.createProfissionais',
  'edit:profissionais': 'permissoes.editProfissionais',
  'delete:profissionais': 'permissoes.deleteProfissionais',
  'create:modalidades': 'permissoes.createModalidades',
  'edit:modalidades': 'permissoes.editModalidades',
  'delete:modalidades': 'permissoes.deleteModalidades',
  'create:avaliacoes': 'permissoes.createAvaliacoes',
  'edit:avaliacoes': 'permissoes.editAvaliacoes',
  'delete:avaliacoes': 'permissoes.deleteAvaliacoes',
  'create:plano_acao': 'permissoes.createPlanoAcao',
  'edit:plano_acao': 'permissoes.editPlanoAcao',
  'delete:plano_acao': 'permissoes.deletePlanoAcao'
};

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  Administrador: [
    'view:dashboard',
    'view:contrato',
    'view:alunos',
    'view:presenca',
    'view:profissionais',
    'view:modalidades',
    'view:avaliacoes',
    'view:performance',
    'view:analise-geral',
    'view:painel-estatistico',
    'view:estudo-comparativo',
    'view:questionario',
    'view:perfil',
    'view:settings',
    'view:plano_acao',
    
    'create:contrato',
    'edit:contrato',
    'delete:contrato',
    
    'create:alunos',
    'edit:alunos',
    'delete:alunos',
    
    'edit:presenca',
    
    'create:profissionais',
    'edit:profissionais',
    'delete:profissionais',
    
    'create:modalidades',
    'edit:modalidades',
    'delete:modalidades',
    
    'create:avaliacoes',
    'edit:avaliacoes',
    'delete:avaliacoes',
    
    'create:plano_acao',
    'edit:plano_acao',
    'delete:plano_acao'
  ],
  Gestor: [
    'view:dashboard',
    'view:contrato',
    'view:alunos',
    'view:presenca',
    'view:profissionais',
    'view:modalidades',
    'view:avaliacoes',
    'view:performance',
    'view:analise-geral',
    'view:painel-estatistico',
    'view:estudo-comparativo',
    'view:questionario',
    'view:perfil',
    'view:plano_acao',
    
    'create:contrato',
    'edit:contrato',
    
    'create:alunos',
    'edit:alunos',
    // Sem 'delete:alunos' (apenas Administrador pode excluir)
    
    'edit:presenca',
    
    'create:profissionais',
    'edit:profissionais',
    // Sem 'delete:profissionais'
    
    'create:modalidades',
    'edit:modalidades',
    // Sem 'delete:modalidades'
    
    'create:avaliacoes',
    'edit:avaliacoes',
    'delete:avaliacoes',
    
    'create:plano_acao',
    'edit:plano_acao',
    'delete:plano_acao'
  ],
  Professor: [
    'view:dashboard',
    'view:contrato',
    'view:alunos',
    'view:presenca',
    'view:modalidades',
    'view:avaliacoes',
    'view:performance',
    'view:analise-geral',
    'view:painel-estatistico',
    'view:estudo-comparativo',
    'view:questionario',
    'view:perfil',
    'view:plano_acao',
    
    'edit:presenca',
    
    'create:avaliacoes',
    'edit:avaliacoes',
    'delete:avaliacoes'
  ],
  Estagiário: [
    'view:dashboard',
    'view:contrato',
    'view:alunos',
    'view:presenca',
    'view:modalidades',
    'view:avaliacoes',
    'view:performance',
    'view:analise-geral',
    'view:painel-estatistico',
    'view:estudo-comparativo',
    'view:questionario',
    'view:perfil',
    'view:plano_acao',
    
    'edit:presenca',
    
    'create:avaliacoes',
    'edit:avaliacoes',
    'delete:avaliacoes'
  ],
  Assistente: [
    'view:dashboard',
    'view:contrato',
    'view:alunos',
    'view:presenca',
    'view:modalidades',
    'view:avaliacoes',
    'view:performance',
    'view:analise-geral',
    'view:painel-estatistico',
    'view:estudo-comparativo',
    'view:questionario',
    'view:perfil',
    'view:plano_acao',
    
    'edit:presenca',
    
    'create:avaliacoes',
    'edit:avaliacoes',
    'delete:avaliacoes'
  ],
  Aluno: [
    'view:dashboard',
    'view:presenca',
    'view:modalidades',
    'view:avaliacoes',
    'view:performance',
    'view:analise-geral',
    'view:questionario',
    'view:perfil',
    'view:plano_acao'
  ]
};

// Maps our tab activeTab IDs to required viewing permission key
export const TAB_PERMISSION_MAP: Record<string, Permission> = {
  dashboard: 'view:dashboard',
  contrato: 'view:contrato',
  alunos: 'view:alunos',
  presenca: 'view:presenca',
  profissionais: 'view:profissionais',
  modalidades: 'view:modalidades',
  avaliacoes: 'view:avaliacoes',
  'plano-acao': 'view:plano_acao',
  performance: 'view:performance',
  'analise-geral': 'view:analise-geral',
  'painel-estatistico': 'view:painel-estatistico',
  'estudo-comparativo': 'view:estudo-comparativo',
  questionario: 'view:questionario',
  'questionario-m1': 'view:questionario',
  'questionario-m2': 'view:questionario',
  'questionario-m3': 'view:questionario',
  'questionario-m4': 'view:questionario',
  'questionario-m5': 'view:questionario',
  'questionario-m6': 'view:questionario',
  'questionario-m7': 'view:questionario',
  'questionario-m8': 'view:questionario',
  'questionario-m9': 'view:questionario',
  'questionario-m10': 'view:questionario',
  'questionario-m11': 'view:questionario',
  'questionario-m12': 'view:questionario',
  'questionario-m13': 'view:questionario',
  'questionario-m14': 'view:questionario',
  'questionario-m15': 'view:questionario',
  perfil: 'view:perfil',
  settings: 'view:settings'
};

/**
 * Checks if a specific role possesses a granular action permission (using mutable state map)
 */
export function hasPermissionDynamic(
  rolePermissionsMap: Record<UserRole, Permission[]>,
  role: string,
  permission: Permission
): boolean {
  const normRole = normalizeRole(role);
  const permissions = rolePermissionsMap[normRole] || [];
  return permissions.includes(permission);
}

/**
 * Checks if a role is permitted to access a main system view (using mutable state map)
 */
export function canAccessTabDynamic(
  rolePermissionsMap: Record<UserRole, Permission[]>,
  role: string,
  tabId: string
): boolean {
  const permission = TAB_PERMISSION_MAP[tabId];
  if (!permission) return true; // Se não mapeado, permite acesso livre por padrão
  return hasPermissionDynamic(rolePermissionsMap, role, permission);
}

/**
 * Checks if a specific role possesses a granular action permission (static fallback)
 */
export function hasPermission(role: string, permission: Permission): boolean {
  const normRole = (role || 'Administrador') as UserRole;
  const permissions = ROLE_PERMISSIONS[normRole] || ROLE_PERMISSIONS['Administrador'];
  return permissions.includes(permission);
}

/**
 * Checks if a role is permitted to access a main system view (static fallback)
 */
export function canAccessTab(role: string, tabId: string): boolean {
  const permission = TAB_PERMISSION_MAP[tabId];
  if (!permission) return true; // Se não mapeado, permite acesso livre por padrão
  return hasPermission(role, permission);
}

/**
 * Normalizes role text into a valid UserRole
 */
export function normalizeRole(role: string): UserRole {
  const clean = (role || '').trim().toLowerCase();
  if (clean.includes('administrador') || clean.includes('admin')) return 'Administrador';
  if (clean.includes('gestor') || clean.includes('gerente')) return 'Gestor';
  if (clean.includes('professor') || clean.includes('treinador') || clean.includes('instrutor')) return 'Professor';
  if (clean.includes('estagiário') || clean.includes('estagiario')) return 'Estagiário';
  if (clean.includes('assistente') || clean.includes('auxiliar')) return 'Assistente';
  if (clean.includes('aluno') || clean.includes('estudante')) return 'Aluno';
  
  // Fallback to gestor if not matched precisely (or administrador)
  return 'Gestor';
}
