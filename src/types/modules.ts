/**
 * Module system types.
 *
 * A "module" is a pluggable feature unit (Tasks, Events, Study, Workouts, Habits…).
 * Every module follows this contract so adding a new module is a repeatable process:
 *   1. Add a ModuleKey value below
 *   2. Add its config to DEFAULT_MODULES
 *   3. Create its page component under src/pages/<key>/
 *   4. Register the route in App.tsx
 */

export type ModuleKey =
  | "tasks"
  | "events"
  | "studies"
  | "workouts"
  | "habits";

export interface ModuleConfig {
  /** Unique string key — matches the DB `key` column */
  key: ModuleKey;
  /** Display name shown in the UI */
  name: string;
  /** Lucide icon name (string) stored in DB; resolved to component at runtime */
  icon: string;
  /** Tailwind CSS colour token (e.g. "tasks", "habits") */
  color: string;
  /** Navigation path */
  path: string;
  /** Short description shown on the dashboard card */
  description: string;
}

export interface UserModule extends ModuleConfig {
  id: string;
  user_id: string;
  is_active: boolean;
  sort_order: number;
}

/** Default module definitions — seeded for new users */
export const DEFAULT_MODULES: ModuleConfig[] = [
  {
    key: "tasks",
    name: "Tarefas",
    icon: "CheckSquare",
    color: "tasks",
    path: "/tarefas",
    description: "Gerencie suas tarefas e projetos do dia a dia.",
  },
  {
    key: "events",
    name: "Eventos",
    icon: "Calendar",
    color: "events",
    path: "/eventos",
    description: "Agenda e compromissos em calendário visual.",
  },
  {
    key: "studies",
    name: "Estudos",
    icon: "BookOpen",
    color: "studies",
    path: "/estudos",
    description: "Matérias, conteúdos e sessões de estudo.",
  },
  {
    key: "workouts",
    name: "Treinos",
    icon: "Dumbbell",
    color: "workouts",
    path: "/treinos",
    description: "Planos de treino e evolução de carga.",
  },
  {
    key: "habits",
    name: "Hábitos",
    icon: "Flame",
    color: "habits",
    path: "/habitos",
    description: "Hábitos recorrentes com streaks e conquistas.",
  },
];
