export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  start_date: string;   // YYYY-MM-DD
  start_time: string | null; // HH:MM
  end_date: string | null;
  end_time: string | null;
  is_all_day: boolean;
  color: string;
  location: string | null;
  created_at: string;
}

export const EVENT_COLORS = [
  { value: "#ec4899", label: "Rosa" },
  { value: "#3b82f6", label: "Azul" },
  { value: "#22c55e", label: "Verde" },
  { value: "#f97316", label: "Laranja" },
  { value: "#a855f7", label: "Roxo" },
  { value: "#eab308", label: "Amarelo" },
  { value: "#ef4444", label: "Vermelho" },
  { value: "#06b6d4", label: "Ciano" },
];
