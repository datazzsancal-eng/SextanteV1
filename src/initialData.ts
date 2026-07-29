import { SinaleiraConfig, Contract, UploadedFile, UserProfile, DefinedAction, GlobalSettings, Cliente, Departamento, Colaborador, Tarefa } from './types';

export const initialSinaleira: { dentro: SinaleiraConfig; atencao: SinaleiraConfig; critico: SinaleiraConfig } = {
  dentro: {
    min: 0,
    max: 10,
    name: 'Conforme',
    color: '#34d399' // Emerald 400
  },
  atencao: {
    min: 10,
    max: 30,
    name: 'Monitorar',
    color: '#fbbf24' // Amber 400
  },
  critico: {
    min: 30,
    max: 100,
    name: 'Desvio Crítico',
    color: '#f87171' // Red 400
  }
};

export const initialContracts: Contract[] = [
  {
    id: '1',
    name: 'Petrobras - Refinaria Sul',
    rentability: 12.5,
    monthlyImpact: -54200,
    deviation: 34.2,
    motive: 'Aumento insumos logísticos',
    action: 'Renegociação de Frete',
    responsible: 'Carlos Eduardo'
  },
  {
    id: '2',
    name: 'Gerdau - Usina SP',
    rentability: 8.4,
    monthlyImpact: -89000,
    deviation: 42.8,
    motive: 'Quebra de maquinário crítico',
    action: 'Acionar Seguro',
    responsible: 'Carlos Eduardo'
  },
  {
    id: '3',
    name: 'Vale S.A. - Manutenção',
    rentability: 21.8,
    monthlyImpact: -22150,
    deviation: 18.4,
    motive: 'Horas extras excedentes',
    action: 'Revisão de Escalas',
    responsible: 'Mariana Silva'
  },
  {
    id: '4',
    name: 'Ambev - Frota Centro',
    rentability: 15.6,
    monthlyImpact: -12000,
    deviation: 8.5,
    motive: 'Ajuste sazonal de combustíveis',
    action: 'Sem ação',
    responsible: 'Eduardo M.'
  },
  {
    id: '5',
    name: 'Suzano - Celulose',
    rentability: 19.3,
    monthlyImpact: -38500,
    deviation: 25.1,
    motive: 'Reajuste contratual anual',
    action: 'Reprecificação',
    responsible: 'Patrícia Lima'
  },
  {
    id: '6',
    name: 'Klabin - Papelão Integrado',
    rentability: 28.2,
    monthlyImpact: -3400,
    deviation: 4.8,
    motive: 'Eficiência de suprimentos',
    action: 'Sem ação',
    responsible: 'Mariana Silva'
  }
];

export const initialUploadedFiles: UploadedFile[] = [
  {
    id: 'f1',
    filename: 'horas_outubro_corrigido.csv',
    timestamp: 'Há 2 horas',
    lines: 1240,
    status: 'SUCESSO'
  },
  {
    id: 'f2',
    filename: 'lancamentos_gerdau.csv',
    timestamp: 'Ontem, 18:45',
    lines: 850,
    status: 'SUCESSO'
  },
  {
    id: 'f3',
    filename: 'horas_corrigido_final.csv',
    timestamp: '02 Nov 2023',
    lines: 0,
    status: 'FALHA'
  }
];

export const initialUsers: UserProfile[] = [];

export const initialMotives: string[] = [
  'Crescimento do cliente',
  'Erro operacional',
  'Retrabalho',
  'Implantação',
  'Mudança legislativa',
  'Falta de treinamento',
  'Processo inadequado',
  'Aumento insumos logísticos',
  'Quebra de maquinário crítico',
  'Horas extras excedentes'
];

export const initialActions: DefinedAction[] = [
  {
    id: 'a1',
    name: 'Sem ação',
    description: 'Nenhuma intervenção necessária',
    iconName: 'Slash'
  },
  {
    id: 'a2',
    name: 'Revisão interna',
    description: 'Auditoria dos processos internos',
    iconName: 'ClipboardCheck'
  },
  {
    id: 'a3',
    name: 'Treinamento',
    description: 'Capacitação técnica da equipe',
    iconName: 'GraduationCap'
  },
  {
    id: 'a4',
    name: 'Reunião com cliente',
    description: 'Alinhamento de expectativas e escopo',
    iconName: 'Users'
  },
  {
    id: 'a5',
    name: 'Reprecificação',
    description: 'Ajuste de honorários contratuais',
    iconName: 'DollarSign'
  },
  {
    id: 'a6',
    name: 'Encerramento do contrato',
    description: 'Distrato comercial definitivo',
    iconName: 'ShieldAlert'
  }
];

export const initialSettings: GlobalSettings = {
  companyName: 'Sancal Assessoria Contabil',
  cnpj: '12.345.678/0001-90',
  address: 'R. Andrade Neves, 55 - Guarani, Novo Hamburgo - RS',
  logoUrl: 'https://raw.githubusercontent.com/datazzsancal-eng/logos/refs/heads/main/sextante/logo_sextante_v.png',
  baseCurrency: 'BRL',
  decimalFormat: 'BR',
  realTimeConversion: true,
  notificationWeekly: true,
  notificationDeviation: true,
  notificationSuspicious: false,
  notificationPush: false,
  erpActive: true,
  bankFeedsActive: 'PENDING',
  storageUsedGb: 1.4,
  storageTotalGb: 2.0
};

export const initialClientes: Cliente[] = [
  {
    id: 'c1',
    nome: 'Petrobras Distribuidora S.A.',
    cnpjCpf: '33.000.167/0001-01',
    email: 'contato@petrobras.com.br',
    telefone: '(11) 98221-4340',
    setor: 'Energia / Óleo e Gás',
    status: 'Ativo'
  },
  {
    id: 'c2',
    nome: 'Gerdau Metalurgia S.A.',
    cnpjCpf: '33.151.467/0002-15',
    email: 'suprimentos@gerdau.com.br',
    telefone: '(11) 3215-9988',
    setor: 'Siderurgia / Indústria',
    status: 'Ativo'
  },
  {
    id: 'c3',
    nome: 'Vale Metais Básicos',
    cnpjCpf: '11.022.333/0001-22',
    email: 'faturamento@vale.com',
    telefone: '(21) 2200-4400',
    setor: 'Mineração',
    status: 'Ativo'
  },
  {
    id: 'c4',
    nome: 'Klabin Logística Global',
    cnpjCpf: '54.120.300/0003-88',
    email: 'atendimento@klabin.com.br',
    telefone: '(11) 4004-9292',
    setor: 'Papel & Celulose',
    status: 'Inativo'
  }
];

export const initialDepartamentos: Departamento[] = [
  {
    id: 'd1',
    nome: 'Controladoria de Riscos',
    codigo: 'CTRL-RISC',
    gestor: 'Eduardo M. Albuquerque',
    centroCusto: 'CC-5001-RISK',
    status: 'Ativo'
  },
  {
    id: 'd2',
    nome: 'Operações e Suprimentos',
    codigo: 'OPER-SUPR',
    gestor: 'Mariana Silva',
    centroCusto: 'CC-3004-OPS',
    status: 'Ativo'
  },
  {
    id: 'd3',
    nome: 'Auditoria e Compliance',
    codigo: 'AUDI-COMP',
    gestor: 'Alex Thompson',
    centroCusto: 'CC-1010-AUD',
    status: 'Ativo'
  },
  {
    id: 'd4',
    nome: 'Recursos Humanos',
    codigo: 'RH-CORP',
    gestor: 'Patrícia Lima',
    centroCusto: 'CC-2201-PESS',
    status: 'Ativo'
  }
];

export const initialColaboradores: Colaborador[] = [
  {
    id: 'col1',
    nome: 'Carlos Eduardo Santos',
    email: 'carlos.eduardo@sextante.com.br',
    cargo: 'Analista de Riscos Sênior',
    departamentoId: 'd1',
    telefone: '(11) 97112-4011',
    dataAdmissao: '2022-04-15',
    status: 'Ativo'
  },
  {
    id: 'col2',
    nome: 'Mariana Silva',
    email: 'mariana.silva@sextante.com.br',
    cargo: 'Gestora Operacional',
    departamentoId: 'd2',
    telefone: '(11) 98122-3040',
    dataAdmissao: '2021-08-01',
    status: 'Ativo'
  },
  {
    id: 'col3',
    nome: 'Patrícia Lima',
    email: 'patricia.lima@sextante.com.br',
    cargo: 'Coordenadora de Atração',
    departamentoId: 'd4',
    telefone: '(11) 99344-2200',
    dataAdmissao: '2020-03-10',
    status: 'Ativo'
  },
  {
    id: 'col4',
    nome: 'Eduardo M.',
    email: 'eduardo.m@sextante.com.br',
    cargo: 'Diretor de Controladoria',
    departamentoId: 'd1',
    telefone: '(11) 91122-9988',
    dataAdmissao: '2019-01-20',
    status: 'Ativo'
  },
  {
    id: 'col5',
    nome: 'Gabriel Mendes',
    email: 'gabriel.mendes@sextante.com.br',
    cargo: 'Analista de Compliance Pleno',
    departamentoId: 'd3',
    telefone: '(21) 98888-2121',
    dataAdmissao: '2023-01-15',
    status: 'Inativo'
  }
];

export const initialTarefas: Tarefa[] = [
  {
    id: 't1',
    titulo: 'Revisão das Notas Sinaleiras',
    descricao: 'Executar levantamento de percentuais de faturamento sobre os desvios de combustível e reajustar sinaleira.',
    colaboradorId: 'col1',
    prazo: '2026-06-30',
    prioridade: 'Alta',
    status: 'Em Andamento'
  },
  {
    id: 't2',
    titulo: 'Auditoria de Lançamentos de Gerdau',
    descricao: 'Confrontar arquivos lidos em CSV com diário consolidado para conferência de salários de maquinário.',
    colaboradorId: 'col2',
    prazo: '2026-06-25',
    prioridade: 'Alta',
    status: 'Pendente'
  },
  {
    id: 't3',
    titulo: 'Reciclagem de Governança Interna',
    descricao: 'Elaborar apresentação e workshop de conformidade LGPD / RGPD aplicados às novas tabelas de premissas.',
    colaboradorId: 'col3',
    prazo: '2026-07-05',
    prioridade: 'Média',
    status: 'Em Andamento'
  },
  {
    id: 't4',
    titulo: 'Consolidação de Relatório Semanal',
    descricao: 'Consolidar e despachar as métricas de riscos das refinarias Petrobras via e-mail corporativo automátizado.',
    colaboradorId: 'col4',
    prazo: '2026-06-15',
    prioridade: 'Baixa',
    status: 'Concluída'
  }
];

