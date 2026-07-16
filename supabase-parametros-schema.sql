-- DDL para criação da tabela de parâmetros do sistema no Supabase
-- Copie e cole este script SQL no Editor SQL (SQL Editor) do seu painel do Supabase.

CREATE TABLE IF NOT EXISTS parametros_sistema (
    id TEXT PRIMARY KEY DEFAULT 'config_global',
    sinaleira JSONB NOT NULL,
    motivos TEXT[] NOT NULL,
    acoes JSONB NOT NULL,
    qtde_horas_mes INTEGER NOT NULL DEFAULT 220,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Popula a tabela com os valores iniciais locais caso ainda não existam
INSERT INTO parametros_sistema (id, sinaleira, motivos, acoes, qtde_horas_mes)
VALUES (
    'config_global',
    '{"dentro":{"min":0,"max":10,"name":"Conforme","color":"#34d399"},"atencao":{"min":10,"max":30,"name":"Monitorar","color":"#fbbf24"},"critico":{"min":30,"max":100,"name":"Desvio Crítico","color":"#f87171"}}'::jsonb,
    ARRAY[
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
    ],
    '[{"id":"a1","name":"Sem ação","description":"Nenhuma intervenção necessária","iconName":"Slash"},{"id":"a2","name":"Revisão interna","description":"Auditoria dos processos internos","iconName":"ClipboardCheck"},{"id":"a3","name":"Treinamento","description":"Capacitação técnica da equipe","iconName":"GraduationCap"},{"id":"a4","name":"Reunião com cliente","description":"Alinhamento de expectativas e escopo","iconName":"Users"},{"id":"a5","name":"Reprecificação","description":"Ajuste de honorários contratuais","iconName":"DollarSign"},{"id":"a6","name":"Encerramento do contrato","description":"Distrato comercial definitivo","iconName":"ShieldAlert"}]'::jsonb,
    220
)
ON CONFLICT (id) DO NOTHING;
