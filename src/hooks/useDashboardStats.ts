import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Task } from "@/types/tasks";
import { Habit, HabitCheckin } from "@/types/habits";

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isScheduledToday(habit: Habit) {
  const day = new Date().getDay();
  if (habit.frequency_type === "daily" || habit.frequency_type === "weekly_target") return true;
  return (habit.frequency_config?.days ?? []).includes(day);
}

export interface DashboardStats {
  // Tasks
  tasksDueToday: number;
  tasksDoneTodayCount: number;
  tasksOverdue: number;
  todayTaskList: Task[];

  // Habits
  habitsDueToday: number;
  habitsDoneToday: number;
  bestStreak: number;
  todayHabits: Habit[];
  habitCheckinsToday: Set<string>;

  // Studies
  studyProjectsCount: number;

  loading: boolean;
}

const DEFAULT_STATS: DashboardStats = {
  tasksDueToday: 0,
  tasksDoneTodayCount: 0,
  tasksOverdue: 0,
  todayTaskList: [],
  habitsDueToday: 0,
  habitsDoneToday: 0,
  bestStreak: 0,
  todayHabits: [],
  habitCheckinsToday: new Set(),
  studyProjectsCount: 0,
  loading: true,
};

function calcStreak(habit: Habit, checkins: Set<string>, today: Date): number {
  function dateKey(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  let streak = 0;
  const cursor = new Date(today);
  for (let i = 0; i < 120; i++) {
    const scheduled =
      habit.frequency_type === "daily" || habit.frequency_type === "weekly_target"
        ? true
        : (habit.frequency_config?.days ?? []).includes(cursor.getDay());
    if (scheduled) {
      if (!checkins.has(dateKey(cursor))) break;
      streak++;
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function useDashboardStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>(DEFAULT_STATS);

  const fetch = useCallback(async () => {
    if (!user) return;
    setStats((s) => ({ ...s, loading: true }));
    const today = todayKey();

    try {
      const [tasksRes, habitsRes, checkinsRes, studiesRes] = await Promise.all([
        supabase
          .from("tasks")
          .select("*")
          .eq("user_id", user.id)
          .neq("status", "cancelled")
          .order("priority", { ascending: true }),

        supabase
          .from("habits")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true }),

        supabase
          .from("habit_checkins")
          .select("*")
          .eq("user_id", user.id)
          .eq("date", today)
          .eq("completed", true),

        supabase
          .from("study_projects")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
      ]);

      const tasks = (tasksRes.data ?? []) as Task[];
      const habits = (habitsRes.data ?? []) as Habit[];
      const checkins = (checkinsRes.data ?? []) as HabitCheckin[];
      const studyCount = studiesRes.count ?? 0;

      // Tasks stats
      const tasksDueToday = tasks.filter(
        (t) => t.due_date === today && t.status !== "done"
      ).length;
      const tasksDoneTodayCount = tasks.filter(
        (t) => t.due_date === today && t.status === "done"
      ).length;
      const tasksOverdue = tasks.filter(
        (t) => t.due_date && t.due_date < today && t.status !== "done"
      ).length;
      const todayTaskList = tasks
        .filter((t) => t.due_date === today && t.status !== "done")
        .slice(0, 5);

      // Habits stats
      const checkinSet = new Set(checkins.map((c) => c.habit_id));
      const checkinDateSet = new Set(checkins.map((c) => c.date));
      void checkinDateSet;
      const todayHabits = habits.filter(isScheduledToday);
      const habitsDueToday = todayHabits.length;
      const habitsDoneToday = todayHabits.filter((h) => checkinSet.has(h.id)).length;

      // Best streak (simplified — only uses today's checkins)
      const allCheckinsMap = new Map<string, Set<string>>();
      checkins.forEach((c) => {
        if (!allCheckinsMap.has(c.habit_id)) allCheckinsMap.set(c.habit_id, new Set());
        allCheckinsMap.get(c.habit_id)!.add(c.date);
      });
      const bestStreak = Math.max(
        0,
        ...habits
          .filter((h) => h.frequency_type !== "weekly_target")
          .map((h) => calcStreak(h, allCheckinsMap.get(h.id) ?? new Set(), new Date()))
      );

      setStats({
        tasksDueToday,
        tasksDoneTodayCount,
        tasksOverdue,
        todayTaskList,
        habitsDueToday,
        habitsDoneToday,
        bestStreak,
        todayHabits: todayHabits.slice(0, 4),
        habitCheckinsToday: checkinSet,
        studyProjectsCount: studyCount,
        loading: false,
      });
    } catch {
      setStats((s) => ({ ...s, loading: false }));
    }
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  return { stats, refetch: fetch };
}
