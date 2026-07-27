# Minha Vida — Gestão Pessoal

**Aplicativo de gestão da vida pessoal** — um app web modular para rastrear tarefas, eventos, estudos, treinos e hábitos em um único lugar. Tudo o que precisa ser gerenciado, em um só sistema.

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

### Etapa 1 — Fundação (módulos do usuário)

Execute no SQL Editor do Supabase:

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

alter table public.modules enable row level security;

create policy "Users can manage their own modules"
  on public.modules for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

### Etapa 2 — Módulo de Tarefas

Execute no SQL Editor do Supabase:

```sql
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  description text,
  status text not null default 'todo',
  priority text not null default 'medium',
  due_date date,
  due_time time,
  category text,
  is_recurring boolean not null default false,
  recurrence_type text,
  recurrence_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_status_check check (status in ('todo', 'in_progress', 'done', 'cancelled')),
  constraint tasks_priority_check check (priority in ('low', 'medium', 'high', 'urgent')),
  constraint tasks_recurrence_type_check check (recurrence_type in ('daily', 'weekly', 'monthly') or recurrence_type is null)
);
alter table public.tasks enable row level security;
create policy "Users manage own tasks" on public.tasks for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

### Etapa 4 — Módulo de Hábitos

Execute no SQL Editor do Supabase:

```sql
create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  frequency_type text not null default 'daily',
  frequency_config jsonb not null default '{}'::jsonb,
  color text not null default '#22c55e',
  created_at timestamptz not null default now(),
  constraint habits_frequency_type_check check (
    frequency_type in ('daily', 'specific_days', 'weekly_target')
  )
);
alter table public.habits enable row level security;
create policy "Users manage own habits" on public.habits for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.habit_checkins (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid references public.habits(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  completed boolean not null default true,
  unique(habit_id, date)
);
alter table public.habit_checkins enable row level security;
create policy "Users manage own habit_checkins" on public.habit_checkins for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

### Etapa 3 — Módulo de Eventos

Execute no SQL Editor do Supabase:

```sql
create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  description text,
  start_date date not null,
  start_time time,
  end_date date,
  end_time time,
  is_all_day boolean not null default false,
  color text not null default '#ec4899',
  location text,
  created_at timestamptz not null default now()
);
alter table public.events enable row level security;
create policy "Users manage own events" on public.events for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

### Etapa 5 — Módulo de Estudos

Execute no SQL Editor do Supabase:

```sql
-- Projetos de estudo
create table public.study_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  description text,
  emoji text not null default '📚',
  created_at timestamptz default now()
);
alter table public.study_projects enable row level security;
create policy "Users manage own study_projects" on public.study_projects for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Trilhas de aprendizagem dentro de um projeto
create table public.study_tracks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.study_projects(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  sort_order int not null default 0,
  created_at timestamptz default now()
);
alter table public.study_tracks enable row level security;
create policy "Users manage own study_tracks" on public.study_tracks for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Tópicos (subtópicos) dentro de uma trilha
create table public.study_topics (
  id uuid primary key default gen_random_uuid(),
  track_id uuid references public.study_tracks(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  status text not null default 'pending', -- pending | in_progress | done
  sort_order int not null default 0,
  created_at timestamptz default now()
);
alter table public.study_topics enable row level security;
create policy "Users manage own study_topics" on public.study_topics for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Recursos de cada tópico (vídeos YouTube + anotações)
create table public.topic_resources (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid references public.study_topics(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null,       -- 'youtube' | 'note'
  title text,
  url text,                 -- para type = 'youtube'
  content text,             -- para type = 'note'
  sort_order int not null default 0,
  created_at timestamptz default now()
);
alter table public.topic_resources enable row level security;
create policy "Users manage own topic_resources" on public.topic_resources for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Testes/quizzes de um projeto
create table public.study_tests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.study_projects(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  description text,
  created_at timestamptz default now()
);
alter table public.study_tests enable row level security;
create policy "Users manage own study_tests" on public.study_tests for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Questões de um teste (múltipla escolha)
create table public.test_questions (
  id uuid primary key default gen_random_uuid(),
  test_id uuid references public.study_tests(id) on delete cascade not null,
  question text not null,
  options jsonb not null default '[]',   -- array de strings
  correct_index int not null default 0,
  explanation text,
  sort_order int not null default 0
);
alter table public.test_questions enable row level security;
create policy "Users read own test_questions" on public.test_questions for all
  using (exists (
    select 1 from public.study_tests st
    where st.id = test_questions.test_id and st.user_id = auth.uid()
  ));

-- Tentativas de teste
create table public.test_attempts (
  id uuid primary key default gen_random_uuid(),
  test_id uuid references public.study_tests(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  score int not null,
  total int not null,
  answers jsonb not null default '[]',  -- array de índices escolhidos
  completed_at timestamptz default now()
);
alter table public.test_attempts enable row level security;
create policy "Users manage own test_attempts" on public.test_attempts for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

### Etapa 6 — Módulo de Treinos

Execute no SQL Editor do Supabase:

```sql
create table public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  color text not null default '#f97316',
  days_of_week integer[] not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.workout_plans enable row level security;
create policy "Users manage own workout_plans" on public.workout_plans for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references public.workout_plans(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  sets integer,
  reps text,
  weight_kg numeric,
  notes text,
  sort_order integer not null default 0
);
alter table public.exercises enable row level security;
create policy "Users manage own exercises" on public.exercises for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references public.workout_plans(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  notes text,
  completed boolean not null default true,
  duration_minutes integer,
  created_at timestamptz not null default now()
);
alter table public.workout_sessions enable row level security;
create policy "Users manage own workout_sessions" on public.workout_sessions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
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
| 2 — Tarefas | ✅ Concluída | CRUD + Kanban + recorrência + prioridades |
| 3 — Eventos | ✅ Concluída | Calendário mensal + CRUD + cores |
| 4 — Hábitos | ✅ Concluída | Criação, edição, frequência, check-ins e sequências |
| 5 — Estudos | ✅ Concluída | Matérias, trilhas, tópicos, recursos e testes |
| 6 — Treinos | ✅ Concluída | Planos + exercícios + sessões + histórico |
| 7 — Painel Módulos | ⏳ | Ativar/reordenar módulos |
| 8 — Polimento | ⏳ | Animações, modo claro, conquistas |

## User preferences

- Linguagem do app: português brasileiro
- Dark mode como padrão
- Construção em etapas incrementais — confirmar ao final de cada etapa antes de avançar
