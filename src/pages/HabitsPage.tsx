import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Flame,
  Pencil,
  Plus,
  Target,
  Trash2,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Habit, HabitCheckin, HabitFrequency, HabitFrequencyConfig } from "@/types/habits";
import { cn } from "@/lib/utils";

const WEEKDAYS = [
  { value: 1, label: "Seg", short: "S" },
  { value: 2, label: "Ter", short: "T" },
  { value: 3, label: "Qua", short: "Q" },
  { value: 4, label: "Qui", short: "Q" },
  { value: 5, label: "Sex", short: "S" },
  { value: 6, label: "Sáb", short: "S" },
  { value: 0, label: "Dom", short: "D" },
];

const HABIT_COLORS = [
  { value: "#22c55e", label: "Verde" },
  { value: "#38bdf8", label: "Azul" },
  { value: "#a855f7", label: "Roxo" },
  { value: "#f97316", label: "Laranja" },
  { value: "#ec4899", label: "Rosa" },
  { value: "#eab308", label: "Amarelo" },
];

const DAY_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function startOfWeek(date: Date) {
  const next = new Date(date);
  const mondayOffset = (next.getDay() + 6) % 7;
  next.setDate(next.getDate() - mondayOffset);
  next.setHours(0, 0, 0, 0);
  return next;
}

function isScheduledOn(habit: Habit, date: Date) {
  if (habit.frequency_type === "daily" || habit.frequency_type === "weekly_target") {
    return true;
  }
  return (habit.frequency_config?.days ?? []).includes(date.getDay());
}

function getStreak(habit: Habit, checkins: Set<string>, today: Date) {
  let streak = 0;
  let cursor = new Date(today);
  for (let i = 0; i < 120; i += 1) {
    if (isScheduledOn(habit, cursor)) {
      if (!checkins.has(dateKey(cursor))) break;
      streak += 1;
    }
    cursor = addDays(cursor, -1);
  }
  return streak;
}

function frequencyLabel(habit: Habit) {
  if (habit.frequency_type === "daily") return "Todos os dias";
  if (habit.frequency_type === "weekly_target") {
    const target = habit.frequency_config?.target ?? 3;
    return `${target}x por semana`;
  }
  const selected = (habit.frequency_config?.days ?? [])
    .sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
    .map((day) => WEEKDAYS.find((item) => item.value === day)?.label)
    .filter(Boolean);
  return selected.length ? selected.join(" · ") : "Escolha os dias";
}

function getErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }
  return "Não foi possível concluir essa ação.";
}

interface HabitForm {
  name: string;
  description: string;
  frequencyType: HabitFrequency;
  days: number[];
  target: number;
  color: string;
}

const EMPTY_FORM: HabitForm = {
  name: "",
  description: "",
  frequencyType: "daily",
  days: [1, 2, 3, 4, 5],
  target: 3,
  color: "#22c55e",
};

export function HabitsPage() {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [checkins, setCheckins] = useState<HabitCheckin[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeDate, setActiveDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [form, setForm] = useState<HabitForm>(EMPTY_FORM);

  const todayKey = dateKey(new Date());
  const rangeStart = useMemo(() => dateKey(addDays(new Date(), -90)), []);
  const rangeEnd = useMemo(() => dateKey(addDays(new Date(), 14)), []);

  const fetchHabits = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [habitsResponse, checkinsResponse] = await Promise.all([
        supabase.from("habits").select("*").eq("user_id", user.id).order("created_at", { ascending: true }),
        supabase
          .from("habit_checkins")
          .select("*")
          .eq("user_id", user.id)
          .gte("date", rangeStart)
          .lte("date", rangeEnd)
          .order("date", { ascending: false }),
      ]);
      if (habitsResponse.error) throw habitsResponse.error;
      if (checkinsResponse.error) throw checkinsResponse.error;
      setHabits((habitsResponse.data ?? []) as Habit[]);
      setCheckins((checkinsResponse.data ?? []) as HabitCheckin[]);
    } catch (error) {
      console.error("Error loading habits:", error);
      toast.error(`Não foi possível carregar seus hábitos. ${getErrorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  }, [rangeEnd, rangeStart, user]);

  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  const checkinsByHabit = useMemo(() => {
    const result = new Map<string, Set<string>>();
    checkins.forEach((checkin) => {
      if (!checkin.completed) return;
      if (!result.has(checkin.habit_id)) result.set(checkin.habit_id, new Set());
      result.get(checkin.habit_id)?.add(checkin.date);
    });
    return result;
  }, [checkins]);

  const todayDone = habits.filter((habit) => checkinsByHabit.get(habit.id)?.has(todayKey)).length;
  const todayDue = habits.filter((habit) => isScheduledOn(habit, new Date())).length;
  const activeWeekStart = startOfWeek(activeDate);
  const activeWeekDays = Array.from({ length: 7 }, (_, index) => addDays(activeWeekStart, index));

  function openCreateModal() {
    setEditingHabit(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  }

  function openEditModal(habit: Habit) {
    setEditingHabit(habit);
    setForm({
      name: habit.name,
      description: habit.description ?? "",
      frequencyType: habit.frequency_type,
      days: habit.frequency_config?.days ?? [1, 2, 3, 4, 5],
      target: habit.frequency_config?.target ?? 3,
      color: habit.color || "#22c55e",
    });
    setShowModal(true);
  }

  async function handleSaveHabit() {
    if (!user || !form.name.trim()) return;
    if (form.frequencyType === "specific_days" && form.days.length === 0) {
      toast.error("Escolha ao menos um dia da semana.");
      return;
    }
    setSaving(true);
    const frequencyConfig: HabitFrequencyConfig =
      form.frequencyType === "specific_days"
        ? { days: form.days }
        : form.frequencyType === "weekly_target"
          ? { target: form.target }
          : {};
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      frequency_type: form.frequencyType,
      frequency_config: frequencyConfig,
      color: form.color,
    };

    try {
      if (editingHabit) {
        const { data, error } = await supabase
          .from("habits")
          .update(payload)
          .eq("id", editingHabit.id)
          .eq("user_id", user.id)
          .select()
          .single();
        if (error) throw error;
        setHabits((previous) => previous.map((habit) => habit.id === editingHabit.id ? data as Habit : habit));
        toast.success("Hábito atualizado.");
      } else {
        const { data, error } = await supabase
          .from("habits")
          .insert({ ...payload, user_id: user.id })
          .select()
          .single();
        if (error) throw error;
        setHabits((previous) => [...previous, data as Habit]);
        toast.success("Hábito criado.");
      }
      setShowModal(false);
    } catch (error) {
      console.error("Error saving habit:", error);
      toast.error(`Não foi possível salvar o hábito. ${getErrorMessage(error)}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteHabit(habit: Habit) {
    if (!user || !confirm(`Excluir o hábito "${habit.name}" e seu histórico?`)) return;
    setDeletingId(habit.id);
    try {
      const { error } = await supabase
        .from("habits")
        .delete()
        .eq("id", habit.id)
        .eq("user_id", user.id);
      if (error) throw error;
      setHabits((previous) => previous.filter((item) => item.id !== habit.id));
      setCheckins((previous) => previous.filter((item) => item.habit_id !== habit.id));
      toast.success("Hábito excluído.");
    } catch (error) {
      toast.error(`Não foi possível excluir o hábito. ${getErrorMessage(error)}`);
    } finally {
      setDeletingId(null);
    }
  }

  async function toggleCheckin(habit: Habit, date: Date) {
    if (!user) return;
    const key = dateKey(date);
    const existing = checkins.find((checkin) => checkin.habit_id === habit.id && checkin.date === key);
    try {
      if (existing) {
        const { error } = await supabase
          .from("habit_checkins")
          .delete()
          .eq("id", existing.id)
          .eq("user_id", user.id);
        if (error) throw error;
        setCheckins((previous) => previous.filter((checkin) => checkin.id !== existing.id));
      } else {
        const { data, error } = await supabase
          .from("habit_checkins")
          .insert({ habit_id: habit.id, user_id: user.id, date: key, completed: true })
          .select()
          .single();
        if (error) throw error;
        setCheckins((previous) => [...previous, data as HabitCheckin]);
      }
    } catch (error) {
      toast.error(`Não foi possível registrar o check-in. ${getErrorMessage(error)}`);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-4">
        <div className="h-28 rounded-3xl skeleton" />
        {[...Array(3)].map((_, index) => <div key={index} className="h-48 rounded-3xl skeleton" />)}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Flame className="w-5 h-5 text-habits" />
              <h1 className="text-2xl font-bold text-foreground">Hábitos</h1>
            </div>
            <p className="text-sm text-foreground/65">
              Pequenas ações repetidas constroem grandes mudanças.
            </p>
          </div>
          <Button onClick={openCreateModal}>
            <Plus className="w-4 h-4" /> Novo hábito
          </Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-7">
        {[
          { label: "Hábitos ativos", value: habits.length, icon: Target, color: "text-habits" },
          { label: "Feitos hoje", value: `${todayDone}/${todayDue}`, icon: CheckCircle2, color: "text-green-400" },
          { label: "Melhor sequência", value: `${Math.max(0, ...habits.filter((habit) => habit.frequency_type !== "weekly_target").map((habit) => getStreak(habit, checkinsByHabit.get(habit.id) ?? new Set(), new Date())))} dias`, icon: Flame, color: "text-orange-400" },
          { label: "Constância", value: habits.length ? `${Math.round((todayDone / Math.max(todayDue, 1)) * 100)}%` : "0%", icon: CalendarDays, color: "text-studies" },
        ].map((stat) => (
          <div key={stat.label} className="bg-surface-1 rounded-2xl border border-foreground/6 p-4">
            <stat.icon className={cn("w-4 h-4 mb-3", stat.color)} />
            <p className={cn("text-xl font-bold", stat.color)}>{stat.value}</p>
            <p className="text-xs text-foreground/60 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {habits.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-surface-1 border border-foreground/10 rounded-3xl text-center px-6 py-16"
        >
          <div className="w-16 h-16 rounded-2xl bg-habits/10 flex items-center justify-center mx-auto mb-4">
            <Flame className="w-8 h-8 text-habits" />
          </div>
          <h2 className="font-semibold text-foreground">Comece com um hábito simples</h2>
          <p className="text-sm text-foreground/60 mt-2 mb-6 max-w-sm mx-auto">
            Escolha uma ação que você quer repetir e acompanhe sua constância dia após dia.
          </p>
          <Button onClick={openCreateModal}><Plus className="w-4 h-4" /> Criar primeiro hábito</Button>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {habits.map((habit, index) => {
            const habitCheckins = checkinsByHabit.get(habit.id) ?? new Set<string>();
            const streak = getStreak(habit, habitCheckins, new Date());
            const weekCheckins = activeWeekDays.filter((day) => habitCheckins.has(dateKey(day))).length;
            const weekTarget = habit.frequency_type === "weekly_target" ? habit.frequency_config?.target ?? 3 : null;
            return (
              <motion.article
                key={habit.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="bg-surface-1 border border-foreground/10 rounded-2xl overflow-hidden flex"
              >
                {/* Color accent bar */}
                <div className="w-1 flex-shrink-0 rounded-l-2xl" style={{ backgroundColor: habit.color }} />

                <div className="flex-1 p-4 sm:p-5 min-w-0">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${habit.color}28`, color: habit.color }}
                      >
                        <Flame className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="font-semibold text-foreground truncate text-sm">{habit.name}</h2>
                        <p className="text-xs text-foreground/50 mt-0.5">{frequencyLabel(habit)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      {/* Streak / meta badge */}
                      {habit.frequency_type === "weekly_target" ? (
                        <span className="text-xs font-medium px-2 py-1 rounded-lg mr-1"
                          style={{ backgroundColor: `${habit.color}20`, color: habit.color }}>
                          {weekCheckins}/{weekTarget}×
                        </span>
                      ) : streak > 0 ? (
                        <span className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg mr-1 text-orange-400 bg-orange-500/10">
                          <Flame className="w-3 h-3" />{streak}
                        </span>
                      ) : null}
                      <button onClick={() => openEditModal(habit)}
                        className="p-1.5 rounded-lg text-foreground/40 hover:text-foreground hover:bg-foreground/8 transition-colors"
                        aria-label={`Editar ${habit.name}`}>
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeleteHabit(habit)} disabled={deletingId === habit.id}
                        className="p-1.5 rounded-lg text-foreground/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        aria-label={`Excluir ${habit.name}`}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Week tracker */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-foreground/35">
                        Semana
                      </p>
                      <div className="flex items-center gap-0.5">
                        <button onClick={() => setActiveDate(addDays(activeDate, -7))}
                          className="p-0.5 rounded-md hover:bg-foreground/8 text-foreground/40 transition-colors"
                          aria-label="Semana anterior">
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setActiveDate(new Date())}
                          className="text-[10px] text-foreground/45 hover:text-foreground px-1.5 transition-colors">
                          Hoje
                        </button>
                        <button onClick={() => setActiveDate(addDays(activeDate, 7))}
                          className="p-0.5 rounded-md hover:bg-foreground/8 text-foreground/40 transition-colors"
                          aria-label="Próxima semana">
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Compact day dots */}
                    <div className="grid grid-cols-7 gap-1">
                      {activeWeekDays.map((day) => {
                        const key = dateKey(day);
                        const completed = habitCheckins.has(key);
                        const scheduled = isScheduledOn(habit, day);
                        const isToday = key === todayKey;
                        return (
                          <button
                            key={key}
                            onClick={() => toggleCheckin(habit, day)}
                            className="flex flex-col items-center gap-1 group"
                            aria-label={`${completed ? "Desmarcar" : "Marcar"} ${DAY_FORMATTER.format(day)}`}
                          >
                            <span className={cn(
                              "text-[9px] font-medium uppercase transition-colors",
                              isToday ? "text-foreground/70" : "text-foreground/30"
                            )}>
                              {WEEKDAYS.find((w) => w.value === day.getDay())?.short}
                            </span>
                            <div
                              className={cn(
                                "w-6 h-6 rounded-full border flex items-center justify-center transition-all",
                                completed
                                  ? "border-transparent shadow-sm"
                                  : scheduled
                                  ? "border-foreground/15 bg-foreground/[0.03] group-hover:border-foreground/30"
                                  : "border-transparent opacity-20",
                                isToday && !completed && scheduled && "ring-1 ring-offset-1 ring-offset-surface-1",
                              )}
                              style={
                                completed
                                  ? { backgroundColor: habit.color }
                                  : undefined
                              }
                            >
                              {completed && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                            </div>
                            <span className={cn(
                              "text-[9px] tabular-nums transition-colors",
                              isToday ? "font-semibold text-foreground/60" : "text-foreground/25"
                            )}>
                              {day.getDate()}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-surface-2 border border-foreground/8 rounded-3xl p-5 sm:p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-bold text-foreground">{editingHabit ? "Editar hábito" : "Novo hábito"}</h2>
                  <p className="text-xs text-foreground/55 mt-1">Defina uma rotina que você consiga sustentar.</p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 rounded-xl text-foreground/50 hover:text-foreground hover:bg-foreground/5"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="habit-name" className="text-xs font-medium text-foreground/65 block mb-1.5">Nome do hábito *</label>
                  <input
                    id="habit-name"
                    autoFocus
                    value={form.name}
                    onChange={(event) => setForm((previous) => ({ ...previous, name: event.target.value }))}
                    placeholder="Ex: Ler 20 páginas"
                    maxLength={100}
                    className="w-full bg-surface-3 border border-foreground/8 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder-foreground/25 outline-none focus:border-habits/50"
                  />
                </div>
                <div>
                  <label htmlFor="habit-description" className="text-xs font-medium text-foreground/65 block mb-1.5">Descrição (opcional)</label>
                  <textarea
                    id="habit-description"
                    value={form.description}
                    onChange={(event) => setForm((previous) => ({ ...previous, description: event.target.value }))}
                    placeholder="Uma intenção ou lembrete para este hábito"
                    rows={2}
                    maxLength={240}
                    className="w-full bg-surface-3 border border-foreground/8 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder-foreground/25 outline-none focus:border-habits/50 resize-none"
                  />
                </div>

                <div>
                  <p className="text-xs font-medium text-foreground/65 mb-2">Frequência</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {([
                      ["daily", "Todos os dias"],
                      ["specific_days", "Dias específicos"],
                      ["weekly_target", "Meta semanal"],
                    ] as [HabitFrequency, string][]).map(([value, label]) => (
                      <button
                        key={value}
                        onClick={() => setForm((previous) => ({ ...previous, frequencyType: value }))}
                        className={cn(
                          "rounded-xl border px-3 py-2.5 text-xs font-medium transition-colors",
                          form.frequencyType === value ? "bg-habits/15 border-habits/50 text-habits" : "bg-foreground/[0.02] border-foreground/8 text-foreground/65 hover:text-foreground"
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {form.frequencyType === "specific_days" && (
                  <div>
                    <p className="text-xs text-foreground/60 mb-2">Em quais dias?</p>
                    <div className="flex gap-2">
                      {WEEKDAYS.map((day) => {
                        const selected = form.days.includes(day.value);
                        return (
                          <button
                            key={day.value}
                            onClick={() => setForm((previous) => ({
                              ...previous,
                              days: selected ? previous.days.filter((item) => item !== day.value) : [...previous.days, day.value],
                            }))}
                            className={cn(
                              "w-9 h-9 rounded-full border text-xs font-medium transition-colors",
                              selected ? "bg-habits text-white border-habits" : "border-foreground/10 text-foreground/60 hover:border-habits/50"
                            )}
                            aria-pressed={selected}
                          >
                            {day.short}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {form.frequencyType === "weekly_target" && (
                  <div>
                    <label htmlFor="habit-target" className="text-xs text-foreground/60 block mb-2">Quantas vezes por semana?</label>
                    <select
                      id="habit-target"
                      value={form.target}
                      onChange={(event) => setForm((previous) => ({ ...previous, target: Number(event.target.value) }))}
                      className="w-full bg-surface-3 border border-foreground/8 rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:border-habits/50"
                    >
                      {[1, 2, 3, 4, 5, 6, 7].map((value) => <option key={value} value={value}>{value} {value === 1 ? "vez" : "vezes"} por semana</option>)}
                    </select>
                  </div>
                )}

                <div>
                  <p className="text-xs font-medium text-foreground/65 mb-2">Cor do hábito</p>
                  <div className="flex gap-2">
                    {HABIT_COLORS.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => setForm((previous) => ({ ...previous, color: color.value }))}
                        className={cn("w-8 h-8 rounded-full transition-transform", form.color === color.value && "ring-2 ring-white ring-offset-2 ring-offset-surface-2 scale-110")}
                        style={{ backgroundColor: color.value }}
                        aria-label={color.label}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-7">
                <Button variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>Cancelar</Button>
                <Button className="flex-1" onClick={handleSaveHabit} loading={saving} disabled={!form.name.trim()}>
                  {editingHabit ? "Salvar alterações" : "Criar hábito"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}