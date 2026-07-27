export type TaskStatus = "todo" | "in_progress" | "done" | "cancelled";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type RecurrenceType = "daily" | "weekly" | "monthly";

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;   // ISO date: YYYY-MM-DD
  due_time: string | null;   // HH:MM
  category: string | null;
  is_recurring: boolean;
  recurrence_type: RecurrenceType | null;
  recurrence_config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; bg: string; border: string }> = {
  low:    { label: "Baixa",   color: "text-foreground/50",  bg: "bg-foreground/8",   border: "border-foreground/15" },
  medium: { label: "Média",   color: "text-studies",        bg: "bg-studies/10",     border: "border-studies/25" },
  high:   { label: "Alta",    color: "text-tasks",          bg: "bg-tasks/10",       border: "border-tasks/25" },
  urgent: { label: "Urgente", color: "text-red-400",        bg: "bg-red-500/10",     border: "border-red-500/25" },
};

export const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string }> = {
  todo:        { label: "A fazer",       color: "text-foreground/60" },
  in_progress: { label: "Em progresso",  color: "text-tasks" },
  done:        { label: "Concluída",     color: "text-green-400" },
  cancelled:   { label: "Cancelada",     color: "text-foreground/35" },
};
