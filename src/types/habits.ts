export type HabitFrequency = "daily" | "specific_days" | "weekly_target";

export interface HabitFrequencyConfig {
  days?: number[];
  target?: number;
}

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  frequency_type: HabitFrequency;
  frequency_config: HabitFrequencyConfig | null;
  color: string;
  created_at: string;
}

export interface HabitCheckin {
  id: string;
  habit_id: string;
  user_id: string;
  date: string;
  completed: boolean;
}