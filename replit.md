# TrackerHabitos

**Sistema operacional pessoal de produtividade** — um app web modular para rastrear tarefas, eventos, estudos, treinos e hábitos em um único lugar.

## Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS (dark mode by default) + Framer Motion
- **Icons**: Lucide React
- **Charts**: Recharts (Etapa 5+)
- **Backend/DB**: Supabase (Auth + Postgres + RLS)
- **Routing**: React Router v6

## Como rodar

```bash
npm run dev   # inicia em http://localhost:5000
```

O workflow "Start application" gerencia isso automaticamente no Replit.

## Variáveis de ambiente obrigatórias

Configure as seguintes secrets no Replit (Settings → Secrets):

| Variável | Descrição |
|---|---|
| `VITE_SUPABASE_URL` | URL do projeto Supabase (ex: `https://xyz.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Chave anon/pública do Supabase |

## Estrutura do projeto

```
src/
├── lib/
│   ├── supabase.ts       # cliente Supabase
│   └── utils.ts          # helpers (cn, formatDate)
├── types/
│   └── modules.ts        # tipos + DEFAULT_MODULES (contrato de módulos)
├── contexts/
│   ├── AuthContext.tsx   # sessão Supabase Auth
│   └── ModuleContext.tsx # módulos ativos do usuário
├── components/
│   ├── ui/               # Button, Card, LoadingScreen, SkeletonCard
│   └── layout/           # AppLayout, Sidebar, BottomNav
└── pages/
    ├── auth/             # LoginPage, SignupPage
    ├── DashboardPage.tsx
    ├── ModulesPage.tsx
    └── ComingSoonPage.tsx
```

## Banco de dados Supabase

Execute o SQL abaixo no SQL Editor do seu projeto Supabase para criar as tabelas necessárias para a Etapa 1:

```sql
-- Tabela de módulos do usuário
create table public.modules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  key text not null,
  name text not null,
  icon text not null,
  color text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  unique(user_id, key)
);

-- Row Level Security
alter table public.modules enable row level security;

create policy "Users can manage their own modules"
  on public.modules
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

## Arquitetura de módulos

O sistema é construído em torno de **módulos plugáveis**. Para adicionar um novo módulo:

1. Adicione um valor ao tipo `ModuleKey` em `src/types/modules.ts`
2. Adicione sua config a `DEFAULT_MODULES` (mesma chave + caminho + ícone + cor)
3. Crie a página do módulo em `src/pages/<key>/`
4. Registre a rota em `src/App.tsx`

O `ModuleContext` e a tabela `modules` não precisam de alterações.

## Roadmap de etapas

| Etapa | Status | Descrição |
|---|---|---|
| 1 — Fundação | ✅ Concluída | Auth, navegação, sistema de módulos, dashboard |
| 2 — Tarefas | 🔜 Próxima | CRUD + Kanban + recorrência |
| 3 — Eventos | ⏳ | Calendário + CRUD |
| 4 — Hábitos | ⏳ | Streaks + heatmap + conquistas |
| 5 — Estudos | ⏳ | Matérias + sessões + gráficos |
| 6 — Treinos | ⏳ | Treinos + logs + progressão |
| 7 — Painel Módulos | ⏳ | Ativar/reordenar módulos |
| 8 — Polimento | ⏳ | Animações, modo claro, conquistas |

## User preferences

- Linguagem do app: português brasileiro
- Dark mode como padrão
- Construção em etapas incrementais — confirmar ao final de cada etapa antes de avançar
