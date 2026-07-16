# SciFi Admin Dashboard - Design System

Este documento descreve o sistema de design para o dashboard temático Sci-Fi/Cyberpunk.

## 1. Paleta de Cores (Dark Theme)

| Token | Hex | Uso |
| :--- | :--- | :--- |
| **Primary Red** | `#D32F2F` | Ações principais, gráficos, bordas ativas, alertas críticos. |
| **Primary Hover** | `#B71C1C` | Hover de botões e elementos interativos. |
| **Background Dark** | `#0A0A0A` | Fundo geral da página (quase preto). |
| **Surface Card** | `#1A1A1A` | Fundo de cartões e painéis. |
| **Surface Header** | `#111111` | Fundo do topbar e sidebar. |
| **Text Primary** | `#FFFFFF` | Títulos e texto principal. |
| **Text Secondary** | `#B0B0B0` | Labels, datas, subtítulos. |
| **Border Glow** | `#FF0000` (20% alpha) | Bordas sutis e glows neon. |

## 2. Tipografia

- **Font Family:** `Inter` ou `Roboto` (sem serifa moderna).
- **Headlines:** 24px - 18px (Bold/White).
- **Body:** 14px - 12px (Light Grey).
- **Table Text:** 13px (Regular).

## 3. Componentes

### Sidebar (Navegação)
- Largura fixa (aprox. 250px).
- Fundo escuro (`#111`).
- Ícones vermelhos ou brancos à esquerda.
- Item ativo: Cor vermelha ou fundo mais claro.

### Cards (Dashboard)
- Fundo: `#1A1A1A` ou `#1E1E1E`.
- Borda: 1px solida `#333` ou `#D32F2F` (quando selecionado).
- Shadow: Nenhuma (flat) ou leve glow vermelho.

### Gráfico (Chart)
- Linhas vermelhas (`#D32F2F`).
- Pontos (dots) brancos ou vermelhos.
- Gridlines: Cinza escuro (`#444`).

### Tabela (Data Table)
- Linhas alternadas (zebra) ou linhas com borda sutil.
- Colunas: Position, Experience, Department, Status, Action.
- Status Badges: "Open" (Verde), "Close" (Vermelho), "Pending" (Amarelo).

### Botões (Action)
- **Primary:** Fundo Vermelho (`#D32F2F`), Texto Branco.
- **Ghost/Outlined:** Borda Vermelha, Texto Vermelho, Fundo Transparente.
- **Action Buttons (Table):** Ícones pequenos (editar, deletar, visualizar).

### Inputs & Search
- Fundo: `#222` ou transparente.
- Borda: `#444`.
- Placeholder: Cinza claro.
- Ícone de lupa à direita.

---

## 4. Ícones
Utilizar ícones "Line" ou "Filled" (FontAwesome ou Material Icons).
Cor: Vermelho (`#D32F2F`) para destaque e Branco (`#FFF`) para neutros.