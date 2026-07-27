import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dumbbell,
  Plus,
  X,
  Pencil,
  Trash2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Flame,
  BarChart2,
  CalendarCheck,
  Clock,
  GripVertical,
} from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { WorkoutPlan, Exercise, WorkoutSession, WORKOUT_COLORS, WEEKDAYS_SHORT } from "@/types/workouts";

/* ── helpers ─────────────────────────────────────────────────── */
function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function thisWeekStart() {
  const d = new Date();
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error)
    return String((error as { message: unknown }).message);
  return "Não foi possível concluir essa ação.";
}

/* ── forms ───────────────────────────────────────────────────── */
interface PlanForm {
  name: string;
  description: string;
  color: string;
  days_of_week: number[];
}
const EMPTY_PLAN: PlanForm = { name: "", description: "", color: "#f97316", days_of_week: [] };

interface ExerciseForm {
  name: string;
  sets: string;
  reps: string;
  weight_kg: string;
  notes: string;
}
const EMPTY_EXERCISE: ExerciseForm = { name: "", sets: "", reps: "", weight_kg: "", notes: "" };

interface SessionForm {
  date: string;
  duration_minutes: string;
  notes: string;
}

/* ══════════════════════════════════════════════════════════════ */
export function WorkoutsPage() {
  const { user } = useAuth();
  const today = todayStr();

  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);

  // UI state
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"plans" | "history">("plans");

  // Modals
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<WorkoutPlan | null>(null);
  const [planForm, setPlanForm] = useState<PlanForm>(EMPTY_PLAN);
  const [savingPlan, setSavingPlan] = useState(false);

  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [exerciseForm, setExerciseForm] = useState<ExerciseForm>(EMPTY_EXERCISE);
  const [exercisePlanId, setExercisePlanId] = useState<string>("");
  const [savingExercise, setSavingExercise] = useState(false);

  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessionPlanId, setSessionPlanId] = useState<string>("");
  const [sessionForm, setSessionForm] = useState<SessionForm>({ date: today, duration_minutes: "", notes: "" });
  const [savingSession, setSavingSession] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  /* ── fetch ── */
  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const weekStart = thisWeekStart();
      const [plansRes, exercisesRes, sessionsRes] = await Promise.all([
        supabase.from("workout_plans").select("*").eq("user_id", user.id).order("created_at"),
        supabase.from("exercises").select("*").eq("user_id", user.id).order("sort_order"),
        supabase.from("workout_sessions").select("*").eq("user_id", user.id)
          .order("date", { ascending: false }).limit(60),
      ]);
      if (plansRes.error) throw plansRes.error;
      if (exercisesRes.error) throw exercisesRes.error;
      if (sessionsRes.error) throw sessionsRes.error;
      setPlans((plansRes.data ?? []) as WorkoutPlan[]);
      setExercises((exercisesRes.data ?? []) as Exercise[]);
      setSessions((sessionsRes.data ?? []) as WorkoutSession[]);
      void weekStart;
    } catch (error) {
      toast.error(`Não foi possível carregar os treinos. ${getErrorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── stats ── */
  const weekSessions = useMemo(() => {
    const start = thisWeekStart();
    return sessions.filter((s) => s.date >= start && s.date <= today);
  }, [sessions, today]);

  const totalSessions = sessions.length;
  const todayTrained = sessions.some((s) => s.date === today);

  /* ── plan CRUD ── */
  function openCreatePlan() {
    setEditingPlan(null);
    setPlanForm(EMPTY_PLAN);
    setShowPlanModal(true);
  }
  function openEditPlan(plan: WorkoutPlan) {
    setEditingPlan(plan);
    setPlanForm({ name: plan.name, description: plan.description ?? "", color: plan.color, days_of_week: plan.days_of_week ?? [] });
    setShowPlanModal(true);
  }
  async function savePlan() {
    if (!user || !planForm.name.trim()) return;
    setSavingPlan(true);
    const payload = { name: planForm.name.trim(), description: planForm.description.trim() || null, color: planForm.color, days_of_week: planForm.days_of_week };
    try {
      if (editingPlan) {
        const { data, error } = await supabase.from("workout_plans").update(payload).eq("id", editingPlan.id).eq("user_id", user.id).select().single();
        if (error) throw error;
        setPlans((p) => p.map((pl) => pl.id === editingPlan.id ? data as WorkoutPlan : pl));
        toast.success("Treino atualizado.");
      } else {
        const { data, error } = await supabase.from("workout_plans").insert({ ...payload, user_id: user.id }).select().single();
        if (error) throw error;
        const newPlan = data as WorkoutPlan;
        setPlans((p) => [...p, newPlan]);
        setExpandedPlan(newPlan.id);
        toast.success("Treino criado.");
      }
      setShowPlanModal(false);
    } catch (error) {
      toast.error(`Não foi possível salvar. ${getErrorMessage(error)}`);
    } finally {
      setSavingPlan(false);
    }
  }
  async function deletePlan(plan: WorkoutPlan) {
    if (!user || !confirm(`Excluir treino "${plan.name}" e todos seus exercícios?`)) return;
    setDeletingId(plan.id);
    try {
      const { error } = await supabase.from("workout_plans").delete().eq("id", plan.id).eq("user_id", user.id);
      if (error) throw error;
      setPlans((p) => p.filter((pl) => pl.id !== plan.id));
      setExercises((e) => e.filter((ex) => ex.plan_id !== plan.id));
      setSessions((s) => s.filter((se) => se.plan_id !== plan.id));
      toast.success("Treino excluído.");
    } catch (error) {
      toast.error(`Não foi possível excluir. ${getErrorMessage(error)}`);
    } finally {
      setDeletingId(null);
    }
  }

  /* ── exercise CRUD ── */
  function openCreateExercise(planId: string) {
    setEditingExercise(null);
    setExerciseForm(EMPTY_EXERCISE);
    setExercisePlanId(planId);
    setShowExerciseModal(true);
  }
  function openEditExercise(ex: Exercise) {
    setEditingExercise(ex);
    setExerciseForm({ name: ex.name, sets: ex.sets != null ? String(ex.sets) : "", reps: ex.reps ?? "", weight_kg: ex.weight_kg != null ? String(ex.weight_kg) : "", notes: ex.notes ?? "" });
    setExercisePlanId(ex.plan_id);
    setShowExerciseModal(true);
  }
  async function saveExercise() {
    if (!user || !exerciseForm.name.trim()) return;
    setSavingExercise(true);
    const planExercises = exercises.filter((e) => e.plan_id === exercisePlanId);
    const payload = {
      name: exerciseForm.name.trim(),
      sets: exerciseForm.sets ? Number(exerciseForm.sets) : null,
      reps: exerciseForm.reps.trim() || null,
      weight_kg: exerciseForm.weight_kg ? Number(exerciseForm.weight_kg) : null,
      notes: exerciseForm.notes.trim() || null,
      sort_order: editingExercise ? editingExercise.sort_order : planExercises.length,
    };
    try {
      if (editingExercise) {
        const { data, error } = await supabase.from("exercises").update(payload).eq("id", editingExercise.id).eq("user_id", user.id).select().single();
        if (error) throw error;
        setExercises((prev) => prev.map((e) => e.id === editingExercise.id ? data as Exercise : e));
        toast.success("Exercício atualizado.");
      } else {
        const { data, error } = await supabase.from("exercises").insert({ ...payload, plan_id: exercisePlanId, user_id: user.id }).select().single();
        if (error) throw error;
        setExercises((prev) => [...prev, data as Exercise]);
        toast.success("Exercício adicionado.");
      }
      setShowExerciseModal(false);
    } catch (error) {
      toast.error(`Não foi possível salvar. ${getErrorMessage(error)}`);
    } finally {
      setSavingExercise(false);
    }
  }
  async function deleteExercise(ex: Exercise) {
    if (!user || !confirm(`Excluir exercício "${ex.name}"?`)) return;
    setDeletingId(ex.id);
    try {
      const { error } = await supabase.from("exercises").delete().eq("id", ex.id).eq("user_id", user.id);
      if (error) throw error;
      setExercises((prev) => prev.filter((e) => e.id !== ex.id));
      toast.success("Exercício excluído.");
    } catch (error) {
      toast.error(`Não foi possível excluir. ${getErrorMessage(error)}`);
    } finally {
      setDeletingId(null);
    }
  }

  /* ── session log ── */
  function openLogSession(planId: string) {
    setSessionPlanId(planId);
    setSessionForm({ date: today, duration_minutes: "", notes: "" });
    setShowSessionModal(true);
  }
  async function saveSession() {
    if (!user) return;
    setSavingSession(true);
    const payload = {
      plan_id: sessionPlanId,
      user_id: user.id,
      date: sessionForm.date,
      duration_minutes: sessionForm.duration_minutes ? Number(sessionForm.duration_minutes) : null,
      notes: sessionForm.notes.trim() || null,
      completed: true,
    };
    try {
      const { data, error } = await supabase.from("workout_sessions").insert(payload).select().single();
      if (error) throw error;
      setSessions((prev) => [data as WorkoutSession, ...prev]);
      toast.success("🏋️ Treino registrado!");
      setShowSessionModal(false);
    } catch (error) {
      toast.error(`Não foi possível registrar. ${getErrorMessage(error)}`);
    } finally {
      setSavingSession(false);
    }
  }

  /* ── loading ── */
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-4">
        <div className="h-24 rounded-2xl skeleton" />
        {[...Array(3)].map((_, i) => <div key={i} className="h-40 rounded-2xl skeleton" />)}
      </div>
    );
  }

  const planSessionCounts = useMemo(() => {
    const map: Record<string, number> = {};
    sessions.forEach((s) => { map[s.plan_id] = (map[s.plan_id] ?? 0) + 1; });
    return map;
  }, [sessions]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Dumbbell className="w-5 h-5 text-workouts" />
              <h1 className="text-2xl font-bold text-foreground">Treinos</h1>
            </div>
            <p className="text-sm text-foreground/65">Seus planos de treino e histórico de sessões.</p>
          </div>
          <Button onClick={openCreatePlan}>
            <Plus className="w-4 h-4" /> Novo treino
          </Button>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-7">
        {[
          { label: "Planos ativos", value: plans.length, color: "text-workouts", Icon: Dumbbell },
          { label: "Esta semana", value: weekSessions.length, color: "text-workouts", Icon: CalendarCheck },
          { label: "Total de sessões", value: totalSessions, color: "text-workouts", Icon: BarChart2 },
          { label: "Hoje", value: todayTrained ? "✓" : "—", color: todayTrained ? "text-green-400" : "text-foreground/40", Icon: Flame },
        ].map((s) => (
          <div key={s.label} className="bg-surface-1 rounded-2xl border border-foreground/6 p-4">
            <s.Icon className={cn("w-4 h-4 mb-2", s.color)} />
            <p className={cn("text-xl font-bold", s.color)}>{s.value}</p>
            <p className="text-xs text-foreground/60 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex items-center bg-surface-1 border border-foreground/8 rounded-xl p-1 gap-0.5 w-fit mb-6">
        {(["plans", "history"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all",
              activeTab === tab ? "bg-foreground/10 text-foreground" : "text-foreground/50 hover:text-foreground"
            )}
          >
            {tab === "plans" ? <Dumbbell className="w-3.5 h-3.5" /> : <CalendarCheck className="w-3.5 h-3.5" />}
            {tab === "plans" ? "Planos" : "Histórico"}
          </button>
        ))}
      </div>

      {/* ── PLANS tab ── */}
      {activeTab === "plans" && (
        <>
          {plans.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-surface-1 border border-foreground/10 rounded-3xl text-center px-6 py-16"
            >
              <div className="w-16 h-16 rounded-2xl bg-workouts/10 flex items-center justify-center mx-auto mb-4">
                <Dumbbell className="w-8 h-8 text-workouts" />
              </div>
              <h2 className="font-semibold text-foreground">Crie seu primeiro plano de treino</h2>
              <p className="text-sm text-foreground/60 mt-2 mb-6 max-w-sm mx-auto">
                Organize seus exercícios em planos e registre cada sessão realizada.
              </p>
              <Button onClick={openCreatePlan}><Plus className="w-4 h-4" /> Criar treino</Button>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {plans.map((plan, idx) => {
                const planExercises = exercises.filter((e) => e.plan_id === plan.id).sort((a, b) => a.sort_order - b.sort_order);
                const isExpanded = expandedPlan === plan.id;
                const sessionCount = planSessionCounts[plan.id] ?? 0;
                const scheduledDays = plan.days_of_week ?? [];

                return (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="bg-surface-1 border border-foreground/8 rounded-2xl overflow-hidden"
                  >
                    {/* Plan header */}
                    <div className="flex items-center gap-3 p-4">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${plan.color}22`, color: plan.color }}
                      >
                        <Dumbbell className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground text-sm">{plan.name}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {scheduledDays.length > 0 && (
                            <p className="text-xs text-foreground/50">
                              {scheduledDays.sort((a, b) => a - b).map((d) => WEEKDAYS_SHORT[d]).join(" · ")}
                            </p>
                          )}
                          <span className="text-xs text-foreground/35">{planExercises.length} exercício{planExercises.length !== 1 ? "s" : ""}</span>
                          <span className="text-xs text-foreground/35">{sessionCount} sessão{sessionCount !== 1 ? "ões" : ""}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          variant="secondary"
                          className="!py-1.5 !px-3 !text-xs gap-1"
                          onClick={() => openLogSession(plan.id)}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Treinar
                        </Button>
                        <button onClick={() => openEditPlan(plan)} className="p-1.5 rounded-lg text-foreground/40 hover:text-foreground hover:bg-foreground/8 transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deletePlan(plan)} disabled={deletingId === plan.id} className="p-1.5 rounded-lg text-foreground/40 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setExpandedPlan(isExpanded ? null : plan.id)} className="p-1.5 rounded-lg text-foreground/40 hover:text-foreground hover:bg-foreground/8 transition-colors">
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Exercises list */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden border-t border-foreground/6"
                        >
                          <div className="p-4 space-y-2">
                            {planExercises.length === 0 ? (
                              <p className="text-sm text-foreground/40 text-center py-4">
                                Nenhum exercício ainda.{" "}
                                <button className="text-workouts hover:text-workouts-light font-medium transition-colors" onClick={() => openCreateExercise(plan.id)}>
                                  Adicionar
                                </button>
                              </p>
                            ) : (
                              <>
                                <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-x-3 gap-y-0 text-[10px] font-semibold uppercase tracking-widest text-foreground/35 px-1 mb-1">
                                  <span />
                                  <span>Exercício</span>
                                  <span className="text-center">Séries</span>
                                  <span className="text-center">Reps</span>
                                  <span className="text-center">Kg</span>
                                </div>
                                {planExercises.map((ex) => (
                                  <div key={ex.id} className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-x-3 items-center bg-surface-2 border border-foreground/5 rounded-xl px-3 py-2.5 group">
                                    <GripVertical className="w-3.5 h-3.5 text-foreground/20" />
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium text-foreground truncate">{ex.name}</p>
                                      {ex.notes && <p className="text-xs text-foreground/40 truncate">{ex.notes}</p>}
                                    </div>
                                    <span className="text-sm font-semibold text-foreground/70 text-center min-w-[32px]">{ex.sets ?? "—"}</span>
                                    <span className="text-sm font-semibold text-foreground/70 text-center min-w-[40px]">{ex.reps ?? "—"}</span>
                                    <div className="flex items-center gap-0.5">
                                      <span className="text-sm font-semibold text-foreground/70 min-w-[40px] text-center">{ex.weight_kg != null ? `${ex.weight_kg}` : "—"}</span>
                                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => openEditExercise(ex)} className="p-1 rounded-lg text-foreground/35 hover:text-foreground hover:bg-foreground/8 transition-colors">
                                          <Pencil className="w-3 h-3" />
                                        </button>
                                        <button onClick={() => deleteExercise(ex)} disabled={deletingId === ex.id} className="p-1 rounded-lg text-foreground/35 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </>
                            )}
                            <button
                              onClick={() => openCreateExercise(plan.id)}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-foreground/10 text-xs text-foreground/40 hover:text-foreground/60 hover:border-foreground/20 transition-all mt-1"
                            >
                              <Plus className="w-3.5 h-3.5" /> Adicionar exercício
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── HISTORY tab ── */}
      {activeTab === "history" && (
        <div>
          {sessions.length === 0 ? (
            <div className="bg-surface-1 border border-foreground/10 rounded-3xl text-center px-6 py-14">
              <CalendarCheck className="w-10 h-10 text-foreground/15 mx-auto mb-4" />
              <h2 className="font-semibold text-foreground">Nenhuma sessão registrada ainda</h2>
              <p className="text-sm text-foreground/60 mt-2">Clique em "Treinar" em qualquer plano para registrar uma sessão.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map((session, i) => {
                const plan = plans.find((p) => p.id === session.plan_id);
                const [y, m, d] = session.date.split("-").map(Number);
                const dateLabel = new Date(y, m - 1, d).toLocaleDateString("pt-BR", {
                  weekday: "short", day: "numeric", month: "short",
                });
                return (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="bg-surface-1 border border-foreground/6 rounded-xl flex items-center gap-3 px-4 py-3"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${plan?.color ?? "#f97316"}22`, color: plan?.color ?? "#f97316" }}
                    >
                      <Dumbbell className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{plan?.name ?? "Treino removido"}</p>
                      <p className="text-xs text-foreground/50 capitalize">{dateLabel}</p>
                      {session.notes && <p className="text-xs text-foreground/40 truncate">{session.notes}</p>}
                    </div>
                    {session.duration_minutes && (
                      <span className="flex items-center gap-1 text-xs text-foreground/40 flex-shrink-0">
                        <Clock className="w-3 h-3" />{session.duration_minutes} min
                      </span>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── PLAN MODAL ── */}
      <AnimatePresence>
        {showPlanModal && (
          <Modal title={editingPlan ? "Editar treino" : "Novo treino"} subtitle="Defina os dias e o nome do seu plano." onClose={() => setShowPlanModal(false)}>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-foreground/65 block mb-1.5">Nome do treino *</label>
                <input
                  autoFocus
                  value={planForm.name}
                  onChange={(e) => setPlanForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Ex: Treino A — Peito e Tríceps"
                  maxLength={100}
                  className="w-full bg-surface-3 border border-foreground/8 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder-foreground/25 outline-none focus:border-workouts/50"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground/65 block mb-1.5">Descrição (opcional)</label>
                <textarea
                  value={planForm.description}
                  onChange={(e) => setPlanForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Objetivo, observações gerais…"
                  rows={2}
                  maxLength={300}
                  className="w-full bg-surface-3 border border-foreground/8 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder-foreground/25 outline-none focus:border-workouts/50 resize-none"
                />
              </div>
              <div>
                <p className="text-xs font-medium text-foreground/65 mb-2">Dias da semana (opcional)</p>
                <div className="flex gap-1.5 flex-wrap">
                  {WEEKDAYS_SHORT.map((day, idx) => {
                    const selected = planForm.days_of_week.includes(idx);
                    return (
                      <button
                        key={idx}
                        onClick={() => setPlanForm((p) => ({
                          ...p,
                          days_of_week: selected ? p.days_of_week.filter((d) => d !== idx) : [...p.days_of_week, idx],
                        }))}
                        className={cn(
                          "w-10 h-10 rounded-full border text-xs font-medium transition-colors",
                          selected ? "bg-workouts text-white border-workouts" : "border-foreground/10 text-foreground/60 hover:border-workouts/40"
                        )}
                      >
                        {day.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-foreground/65 mb-2">Cor</p>
                <div className="flex gap-2 flex-wrap">
                  {WORKOUT_COLORS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setPlanForm((p) => ({ ...p, color: c.value }))}
                      className={cn("w-8 h-8 rounded-full transition-transform", planForm.color === c.value && "ring-2 ring-white ring-offset-2 ring-offset-surface-2 scale-110")}
                      style={{ backgroundColor: c.value }}
                      aria-label={c.label}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <Button variant="secondary" className="flex-1" onClick={() => setShowPlanModal(false)}>Cancelar</Button>
              <Button className="flex-1" onClick={savePlan} loading={savingPlan} disabled={!planForm.name.trim()}>
                {editingPlan ? "Salvar" : "Criar treino"}
              </Button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* ── EXERCISE MODAL ── */}
      <AnimatePresence>
        {showExerciseModal && (
          <Modal title={editingExercise ? "Editar exercício" : "Adicionar exercício"} subtitle="Defina séries, repetições e carga." onClose={() => setShowExerciseModal(false)}>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-foreground/65 block mb-1.5">Nome do exercício *</label>
                <input
                  autoFocus
                  value={exerciseForm.name}
                  onChange={(e) => setExerciseForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Ex: Supino reto, Agachamento livre…"
                  maxLength={100}
                  className="w-full bg-surface-3 border border-foreground/8 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder-foreground/25 outline-none focus:border-workouts/50"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground/65 block mb-1.5">Séries</label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={exerciseForm.sets}
                    onChange={(e) => setExerciseForm((p) => ({ ...p, sets: e.target.value }))}
                    placeholder="4"
                    className="w-full bg-surface-3 border border-foreground/8 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder-foreground/25 outline-none focus:border-workouts/50"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground/65 block mb-1.5">Reps</label>
                  <input
                    value={exerciseForm.reps}
                    onChange={(e) => setExerciseForm((p) => ({ ...p, reps: e.target.value }))}
                    placeholder="8-12"
                    maxLength={20}
                    className="w-full bg-surface-3 border border-foreground/8 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder-foreground/25 outline-none focus:border-workouts/50"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground/65 block mb-1.5">Carga (kg)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={exerciseForm.weight_kg}
                    onChange={(e) => setExerciseForm((p) => ({ ...p, weight_kg: e.target.value }))}
                    placeholder="60"
                    className="w-full bg-surface-3 border border-foreground/8 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder-foreground/25 outline-none focus:border-workouts/50"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-foreground/65 block mb-1.5">Observações (opcional)</label>
                <input
                  value={exerciseForm.notes}
                  onChange={(e) => setExerciseForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Dicas de execução, variações…"
                  maxLength={200}
                  className="w-full bg-surface-3 border border-foreground/8 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder-foreground/25 outline-none focus:border-workouts/50"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <Button variant="secondary" className="flex-1" onClick={() => setShowExerciseModal(false)}>Cancelar</Button>
              <Button className="flex-1" onClick={saveExercise} loading={savingExercise} disabled={!exerciseForm.name.trim()}>
                {editingExercise ? "Salvar" : "Adicionar"}
              </Button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* ── SESSION MODAL ── */}
      <AnimatePresence>
        {showSessionModal && (
          <Modal title="Registrar sessão" subtitle={`Registre um treino de "${plans.find((p) => p.id === sessionPlanId)?.name ?? ""}"`} onClose={() => setShowSessionModal(false)}>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-foreground/65 block mb-1.5">
                  <CalendarCheck className="w-3.5 h-3.5 inline mr-1" />Data do treino
                </label>
                <input
                  type="date"
                  value={sessionForm.date}
                  onChange={(e) => setSessionForm((p) => ({ ...p, date: e.target.value }))}
                  className="w-full bg-surface-3 border border-foreground/8 rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:border-workouts/50 dark:[color-scheme:dark]"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground/65 block mb-1.5">
                  <Clock className="w-3.5 h-3.5 inline mr-1" />Duração (minutos, opcional)
                </label>
                <input
                  type="number"
                  min={1}
                  max={600}
                  value={sessionForm.duration_minutes}
                  onChange={(e) => setSessionForm((p) => ({ ...p, duration_minutes: e.target.value }))}
                  placeholder="60"
                  className="w-full bg-surface-3 border border-foreground/8 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder-foreground/25 outline-none focus:border-workouts/50"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground/65 block mb-1.5">Anotações (opcional)</label>
                <textarea
                  value={sessionForm.notes}
                  onChange={(e) => setSessionForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Como foi o treino, recordes, observações…"
                  rows={2}
                  maxLength={400}
                  className="w-full bg-surface-3 border border-foreground/8 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder-foreground/25 outline-none focus:border-workouts/50 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <Button variant="secondary" className="flex-1" onClick={() => setShowSessionModal(false)}>Cancelar</Button>
              <Button className="flex-1" onClick={saveSession} loading={savingSession}>
                Registrar treino
              </Button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Shared Modal wrapper ────────────────────────────────────── */
function Modal({ title, subtitle, onClose, children }: {
  title: string; subtitle?: string; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-surface-2 border border-foreground/8 rounded-3xl p-5 sm:p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-bold text-foreground">{title}</h2>
            {subtitle && <p className="text-xs text-foreground/55 mt-1">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-foreground/50 hover:text-foreground hover:bg-foreground/5">
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}
