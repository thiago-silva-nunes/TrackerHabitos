export interface WorkoutPlan {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string;
  days_of_week: number[]; // 0=dom, 1=seg, ..., 6=sab
  created_at: string;
}

export interface Exercise {
  id: string;
  plan_id: string;
  user_id: string;
  name: string;
  sets: number | null;
  reps: string | null;
  weight_kg: number | null;
  notes: string | null;
  sort_order: number;
}

export interface WorkoutSession {
  id: string;
  plan_id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  notes: string | null;
  completed: boolean;
  duration_minutes: number | null;
  created_at: string;
}

export const WORKOUT_COLORS = [
  { value: "#f97316", label: "Laranja" },
  { value: "#ef4444", label: "Vermelho" },
  { value: "#3b82f6", label: "Azul" },
  { value: "#22c55e", label: "Verde" },
  { value: "#a855f7", label: "Roxo" },
  { value: "#ec4899", label: "Rosa" },
  { value: "#eab308", label: "Amarelo" },
];

export const WEEKDAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
