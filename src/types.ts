export interface SinaleiraConfig {
  min: number;
  max: number;
  name: string;
  color: string;
}

export interface Contract {
  id: string;
  name: string;
  rentability: number; // e.g. 12.5 (representing 12.5%)
  monthlyImpact: number; // e.g. -54200 (representing - R$ 54.200)
  deviation: number; // e.g. 34.2 (representing 34.2%)
  motive: string;
  action: string;
  responsible: string;
}

export interface UploadedFile {
  id: string;
  filename: string;
  timestamp: string;
  lines: number;
  status: 'SUCESSO' | 'FALHA';
}

export type UserRole = 'Master' | 'Admin' | 'Gestor' | 'Lider' | 'Colaborador';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'Ativo' | 'Inativo';
  avatar: string;
  novo_usuario?: boolean;
  created_at?: string;
  password?: string;
}

export interface DefinedAction {
  id: string;
  name: string;
  description: string;
  iconName: string;
}

export interface GlobalSettings {
  companyName: string;
  cnpj: string;
  address: string;
  logoUrl: string | null;
  baseCurrency: string;
  decimalFormat: 'BR' | 'US'; // BR is 1.234,56, US is 1,234.56
  realTimeConversion: boolean;
  notificationWeekly: boolean;
  notificationDeviation: boolean;
  notificationSuspicious: boolean;
  notificationPush: boolean;
  erpActive: boolean;
  bankFeedsActive: 'ACTIVE' | 'PENDING' | 'DISCONNECTED';
  storageUsedGb: number;
  storageTotalGb: number;
}

export interface Cliente {
  id: string;
  codigo?: string;
  documento?: string | null;
  nome: string | null;
  tipo_pessoa?: string | null;
  ativo?: boolean | null;
  grupo_id?: string | null;
  sit_trib_id?: string | null;
  detalhes?: string | null;
  cli_nome?: string | null;
  dim_grupo_cliente?: { nome: string } | null;
  dim_situacao_trib?: { resumido?: string | null; situacao?: string | null } | null;
  cnpjCpf: string; // for fallback local array mapping backwards compatibility
  
  // mock data legacy fields
  email?: string;
  telefone?: string;
  setor?: string;
  status?: string;
}

export interface Departamento {
  id: string;
  nome: string;
  codigo?: string;
  gestor: string;
  centroCusto: string;
  status: 'Ativo' | 'Inativo';
}

export interface Colaborador {
  id: string;
  nome: string;
  email: string;
  cargo: string;
  departamentoId: string;
  telefone: string;
  dataAdmissao: string;
  status: 'Ativo' | 'Inativo';
}

export interface Tarefa {
  id: string;
  titulo: string;
  descricao: string;
  colaboradorId: string;
  prazo: string;
  prioridade: 'Baixa' | 'Média' | 'Alta';
  status: 'Pendente' | 'Em Andamento' | 'Concluída';
}

export interface DimCliente {
  id: string;
  codigo?: string;
  documento?: string | null;
  nome: string | null;
  tipo_pessoa?: string | null;
  ativo?: boolean | null;
  grupo_id?: string | null;
  sit_trib_id?: string | null;
  detalhes?: string | null;
  cli_nome?: string | null;
  dim_grupo_cliente?: { nome: string } | null;
  dim_situacao_trib?: { resumido?: string | null; situacao?: string | null } | null;
}

export interface DimSituacaoTrib {
  id: string;
  created_at?: string;
  resumido?: string | null;
  situacao?: string | null;
  ativo?: string | null;
  grupo?: string | null;
}

export interface DimTarefa {
  id: string;
  nome: string;
}

export interface DimDepartamento {
  id: string;
  nome: string;
  ativo_sn: boolean | null;
}

