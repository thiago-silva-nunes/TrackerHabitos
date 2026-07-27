import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckSquare,
  Plus,
  X,
  Check,
  Pencil,
  Trash2,
  Calendar,
  Clock,
  Tag,
  RefreshCw,
  ChevronDown,
  AlertCircle,
  Circle,
  ArrowUpRight,
  LayoutList,
  Columns3,
  Filter,
} from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import {
  Task,
  TaskPriority,
  TaskStatus,
  RecurrenceType,
  PRIORITY_CONFIG,
  STATUS_CONFIG,
} from "@/types/tasks";

/* ── helpers ─────────────────────────────────────────────────── */

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDueDate(dateStr: string) {
  const today = todayKey();
  const tomorrow = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();
  if (dateStr === today) return "Hoje";
  if (dateStr === tomorrow) return "Amanhã";
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

function isOverdue(task: Task) {
  if (!task.due_date || task.status === "done" || task.status === "cancelled") return false;
  return task.due_date < todayKey();
}

function isDueToday(task: Task) {
  return task.due_date === todayKey();
}

function getErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) return String((error as { message: unknown }).message);
  return "Não foi possível concluir essa ação.";
}

/* ── form types ──────────────────────────────────────────────── */

interface TaskForm {
  title: string;
  description: string;
  priority: TaskPriority;
  due_date: string;
  due_time: string;
  category: string;
  is_recurring: boolean;
  recurrence_type: RecurrenceType;
}

const EMPTY_FORM: TaskForm = {
  title: "",
  description: "",
  priority: "medium",
  due_date: "",
  due_time: "",
  category: "",
  is_recurring: false,
  recurrence_type: "daily",
};

const KANBAN_COLUMNS: { status: TaskStatus; label: string; color: string; bg: string }[] = [
  { status: "todo",        label: "A fazer",      color: "text-foreground/70",  bg: "bg-foreground/4" },
  { status: "in_progress", label: "Em progresso", color: "text-tasks",          bg: "bg-tasks/8" },
  { status: "done",        label: "Concluídas",   color: "text-green-400",      bg: "bg-green-500/8" },
];

type ViewMode = "list" | "kanban";
type FilterStatus = "all" | TaskStatus;
type SortKey = "due_date" | "priority" | "created_at";

const PRIORITY_ORDER: Record<TaskPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

/* ══════════════════════════════════════════════════════════════ */
export function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [view, setView] = useState<ViewMode>("kanban");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterPriority, setFilterPriority] = useState<TaskPriority | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("due_date");
  const [showFilters, setShowFilters] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [form, setForm] = useState<TaskForm>(EMPTY_FORM);

  /* ── data ── */
  const fetchTasks = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setTasks((data ?? []) as Task[]);
    } catch (error) {
      toast.error(`Não foi possível carregar as tarefas. ${getErrorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  /* ── stats ── */
  const today = todayKey();
  const total = tasks.filter((t) => t.status !== "cancelled").length;
  const doneTotal = tasks.filter((t) => t.status === "done").length;
  const todayTasks = tasks.filter((t) => t.due_date === today && t.status !== "cancelled");
  const todayDone = todayTasks.filter((t) => t.status === "done").length;
  const overdueTasks = tasks.filter(isOverdue);

  /* ── filtered/sorted list ── */
  const filtered = useMemo(() => {
    let list = [...tasks];
    if (filterStatus !== "all") list = list.filter((t) => t.status === filterStatus);
    if (filterPriority !== "all") list = list.filter((t) => t.priority === filterPriority);
    list.sort((a, b) => {
      if (sortKey === "priority") return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (sortKey === "due_date") {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return a.due_date.localeCompare(b.due_date);
      }
      return b.created_at.localeCompare(a.created_at);
    });
    return list;
  }, [tasks, filterStatus, filterPriority, sortKey]);

  const kanbanGroups = useMemo(() => {
    const all = filterPriority !== "all" ? tasks.filter((t) => t.priority === filterPriority) : tasks;
    return {
      todo:        all.filter((t) => t.status === "todo").sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]),
      in_progress: all.filter((t) => t.status === "in_progress").sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]),
      done:        all.filter((t) => t.status === "done").sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
    };
  }, [tasks, filterPriority]);

  /* ── modal ── */
  function openCreate() {
    setEditingTask(null);
    setForm({ ...EMPTY_FORM, due_date: today });
    setShowModal(true);
  }
  function openEdit(task: Task) {
    setEditingTask(task);
    setForm({
      title: task.title,
      description: task.description ?? "",
      priority: task.priority,
      due_date: task.due_date ?? "",
      due_time: task.due_time ?? "",
      category: task.category ?? "",
      is_recurring: task.is_recurring,
      recurrence_type: task.recurrence_type ?? "daily",
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!user || !form.title.trim()) return;
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      priority: form.priority,
      due_date: form.due_date || null,
      due_time: form.due_time || null,
      category: form.category.trim() || null,
      is_recurring: form.is_recurring,
      recurrence_type: form.is_recurring ? form.recurrence_type : null,
      recurrence_config: {},
      updated_at: new Date().toISOString(),
    };
    try {
      if (editingTask) {
        const { data, error } = await supabase
          .from("tasks").update(payload).eq("id", editingTask.id).eq("user_id", user.id).select().single();
        if (error) throw error;
        setTasks((prev) => prev.map((t) => t.id === editingTask.id ? data as Task : t));
        toast.success("Tarefa atualizada.");
      } else {
        const { data, error } = await supabase
          .from("tasks").insert({ ...payload, user_id: user.id, status: "todo" }).select().single();
        if (error) throw error;
        setTasks((prev) => [data as Task, ...prev]);
        toast.success("Tarefa criada.");
      }
      setShowModal(false);
    } catch (error) {
      toast.error(`Não foi possível salvar a tarefa. ${getErrorMessage(error)}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(task: Task) {
    if (!user || !confirm(`Excluir "${task.title}"?`)) return;
    setDeletingId(task.id);
    try {
      const { error } = await supabase.from("tasks").delete().eq("id", task.id).eq("user_id", user.id);
      if (error) throw error;
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
      toast.success("Tarefa excluída.");
    } catch (error) {
      toast.error(`Não foi possível excluir. ${getErrorMessage(error)}`);
    } finally {
      setDeletingId(null);
    }
  }

  async function cycleStatus(task: Task) {
    if (!user) return;
    const next: TaskStatus = task.status === "todo" ? "in_progress" : task.status === "in_progress" ? "done" : "todo";
    setTogglingId(task.id);
    try {
      const { data, error } = await supabase
        .from("tasks").update({ status: next, updated_at: new Date().toISOString() })
        .eq("id", task.id).eq("user_id", user.id).select().single();
      if (error) throw error;
      setTasks((prev) => prev.map((t) => t.id === task.id ? data as Task : t));
      if (next === "done") toast.success("✅ Tarefa concluída!");
    } catch (error) {
      toast.error(`Não foi possível atualizar. ${getErrorMessage(error)}`);
    } finally {
      setTogglingId(null);
    }
  }

  async function moveToStatus(task: Task, status: TaskStatus) {
    if (!user || task.status === status) return;
    try {
      const { data, error } = await supabase
        .from("tasks").update({ status, updated_at: new Date().toISOString() })
        .eq("id", task.id).eq("user_id", user.id).select().single();
      if (error) throw error;
      setTasks((prev) => prev.map((t) => t.id === task.id ? data as Task : t));
      if (status === "done") toast.success("✅ Tarefa concluída!");
    } catch (error) {
      toast.error(`Não foi possível mover. ${getErrorMessage(error)}`);
    }
  }

  /* ── loading skeleton ── */
  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-4">
        <div className="h-24 rounded-2xl skeleton" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-64 rounded-2xl skeleton" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CheckSquare className="w-5 h-5 text-tasks" />
              <h1 className="text-2xl font-bold text-foreground">Tarefas</h1>
            </div>
            <p className="text-sm text-foreground/65">Organize o que precisa ser feito, passo a passo.</p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4" /> Nova tarefa
          </Button>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-7">
        {[
          { label: "Total ativas",    value: total,                        color: "text-tasks" },
          { label: "Concluídas",      value: doneTotal,                    color: "text-green-400" },
          { label: "Para hoje",       value: `${todayDone}/${todayTasks.length}`, color: "text-studies" },
          { label: "Atrasadas",       value: overdueTasks.length,          color: overdueTasks.length > 0 ? "text-red-400" : "text-foreground/40" },
        ].map((s) => (
          <div key={s.label} className="bg-surface-1 rounded-2xl border border-foreground/6 p-4">
            <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
            <p className="text-xs text-foreground/60 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Overdue banner */}
      <AnimatePresence>
        {overdueTasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3 mb-5"
          >
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-400">
              {overdueTasks.length === 1
                ? "1 tarefa atrasada"
                : `${overdueTasks.length} tarefas atrasadas`}
              {" — "}
              <button className="underline underline-offset-2 font-medium" onClick={() => { setFilterStatus("all"); setView("list"); setSortKey("due_date"); }}>
                ver todas
              </button>
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        {/* View toggle */}
        <div className="flex items-center bg-surface-1 border border-foreground/8 rounded-xl p-1 gap-0.5">
          {(["kanban", "list"] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                view === v ? "bg-foreground/10 text-foreground" : "text-foreground/50 hover:text-foreground"
              )}
            >
              {v === "kanban" ? <Columns3 className="w-3.5 h-3.5" /> : <LayoutList className="w-3.5 h-3.5" />}
              {v === "kanban" ? "Kanban" : "Lista"}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all",
              showFilters ? "bg-tasks/10 border-tasks/30 text-tasks" : "bg-surface-1 border-foreground/8 text-foreground/60 hover:text-foreground"
            )}
          >
            <Filter className="w-3.5 h-3.5" />
            Filtros
            {(filterStatus !== "all" || filterPriority !== "all") && (
              <span className="w-1.5 h-1.5 rounded-full bg-tasks" />
            )}
          </button>
        </div>
      </div>

      {/* Filter panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-5"
          >
            <div className="bg-surface-1 border border-foreground/8 rounded-2xl p-4 flex flex-wrap gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-foreground/40 mb-2">Status</p>
                <div className="flex flex-wrap gap-1.5">
                  {(["all", "todo", "in_progress", "done"] as (FilterStatus)[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setFilterStatus(s)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-medium border transition-all",
                        filterStatus === s
                          ? "bg-tasks/15 border-tasks/40 text-tasks"
                          : "border-foreground/8 text-foreground/55 hover:text-foreground"
                      )}
                    >
                      {s === "all" ? "Todos" : STATUS_CONFIG[s as TaskStatus].label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-foreground/40 mb-2">Prioridade</p>
                <div className="flex flex-wrap gap-1.5">
                  {(["all", "urgent", "high", "medium", "low"] as (TaskPriority | "all")[]).map((p) => {
                    const cfg = p !== "all" ? PRIORITY_CONFIG[p as TaskPriority] : null;
                    return (
                      <button
                        key={p}
                        onClick={() => setFilterPriority(p)}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-xs font-medium border transition-all",
                          filterPriority === p && p === "all" && "bg-tasks/15 border-tasks/40 text-tasks",
                          filterPriority === p && p !== "all" && cfg ? `${cfg.bg} ${cfg.border} ${cfg.color}` : "",
                          filterPriority !== p ? "border-foreground/8 text-foreground/55 hover:text-foreground" : ""
                        )}
                      >
                        {p === "all" ? "Todas" : cfg?.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-foreground/40 mb-2">Ordenar por</p>
                <div className="flex flex-wrap gap-1.5">
                  {([["due_date", "Vencimento"], ["priority", "Prioridade"], ["created_at", "Criação"]] as [SortKey, string][]).map(([k, l]) => (
                    <button
                      key={k}
                      onClick={() => setSortKey(k)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-medium border transition-all",
                        sortKey === k ? "bg-tasks/15 border-tasks/40 text-tasks" : "border-foreground/8 text-foreground/55 hover:text-foreground"
                      )}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {tasks.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-surface-1 border border-foreground/10 rounded-3xl text-center px-6 py-16"
        >
          <div className="w-16 h-16 rounded-2xl bg-tasks/10 flex items-center justify-center mx-auto mb-4">
            <CheckSquare className="w-8 h-8 text-tasks" />
          </div>
          <h2 className="font-semibold text-foreground">Comece adicionando uma tarefa</h2>
          <p className="text-sm text-foreground/60 mt-2 mb-6 max-w-sm mx-auto">
            Capture tudo que precisa ser feito — com prioridade, data e categoria.
          </p>
          <Button onClick={openCreate}><Plus className="w-4 h-4" /> Criar primeira tarefa</Button>
        </motion.div>
      )}

      {/* ── KANBAN ── */}
      {tasks.length > 0 && view === "kanban" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {KANBAN_COLUMNS.map((col) => {
            const colTasks = kanbanGroups[col.status as keyof typeof kanbanGroups];
            return (
              <div key={col.status} className="flex flex-col">
                <div className={cn("flex items-center justify-between px-3 py-2 rounded-xl mb-3", col.bg)}>
                  <span className={cn("text-xs font-semibold uppercase tracking-wider", col.color)}>{col.label}</span>
                  <span className={cn("text-xs font-bold tabular-nums", col.color)}>{colTasks.length}</span>
                </div>
                <div className="flex flex-col gap-2 min-h-[120px]">
                  <AnimatePresence initial={false}>
                    {colTasks.map((task) => (
                      <KanbanCard
                        key={task.id}
                        task={task}
                        onEdit={() => openEdit(task)}
                        onDelete={() => handleDelete(task)}
                        onMove={(status) => moveToStatus(task, status)}
                        deleting={deletingId === task.id}
                        toggling={togglingId === task.id}
                      />
                    ))}
                  </AnimatePresence>
                  {colTasks.length === 0 && (
                    <div className="flex-1 border-2 border-dashed border-foreground/6 rounded-xl flex items-center justify-center py-8">
                      <p className="text-xs text-foreground/25">Nenhuma tarefa aqui</p>
                    </div>
                  )}
                  {col.status === "todo" && (
                    <button
                      onClick={openCreate}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-foreground/10 text-xs text-foreground/40 hover:text-foreground/60 hover:border-foreground/20 transition-all mt-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Adicionar tarefa
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── LIST ── */}
      {tasks.length > 0 && view === "list" && (
        <div className="space-y-2">
          {filtered.length === 0 && (
            <div className="text-center py-12">
              <p className="text-foreground/40 text-sm">Nenhuma tarefa com esses filtros.</p>
            </div>
          )}
          <AnimatePresence initial={false}>
            {filtered.map((task, i) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ delay: i * 0.02 }}
              >
                <ListRow
                  task={task}
                  onToggle={() => cycleStatus(task)}
                  onEdit={() => openEdit(task)}
                  onDelete={() => handleDelete(task)}
                  deleting={deletingId === task.id}
                  toggling={togglingId === task.id}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ── MODAL ── */}
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
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-surface-2 border border-foreground/8 rounded-3xl p-5 sm:p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-bold text-foreground">{editingTask ? "Editar tarefa" : "Nova tarefa"}</h2>
                  <p className="text-xs text-foreground/55 mt-1">Defina o que precisa ser feito.</p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 rounded-xl text-foreground/50 hover:text-foreground hover:bg-foreground/5">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="text-xs font-medium text-foreground/65 block mb-1.5">Título *</label>
                  <input
                    autoFocus
                    value={form.title}
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                    placeholder="Ex: Enviar relatório mensal"
                    maxLength={150}
                    className="w-full bg-surface-3 border border-foreground/8 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder-foreground/25 outline-none focus:border-tasks/50"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs font-medium text-foreground/65 block mb-1.5">Descrição (opcional)</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Detalhes, contexto, links…"
                    rows={2}
                    maxLength={500}
                    className="w-full bg-surface-3 border border-foreground/8 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder-foreground/25 outline-none focus:border-tasks/50 resize-none"
                  />
                </div>

                {/* Priority */}
                <div>
                  <p className="text-xs font-medium text-foreground/65 mb-2">Prioridade</p>
                  <div className="grid grid-cols-4 gap-2">
                    {(["low", "medium", "high", "urgent"] as TaskPriority[]).map((p) => {
                      const cfg = PRIORITY_CONFIG[p];
                      return (
                        <button
                          key={p}
                          onClick={() => setForm((prev) => ({ ...prev, priority: p }))}
                          className={cn(
                            "rounded-xl border px-2 py-2 text-xs font-medium transition-colors",
                            form.priority === p ? `${cfg.bg} ${cfg.border} ${cfg.color}` : "bg-foreground/[0.02] border-foreground/8 text-foreground/55 hover:text-foreground"
                          )}
                        >
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Due date + time */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-foreground/65 block mb-1.5">
                      <Calendar className="w-3.5 h-3.5 inline mr-1" />
                      Data de vencimento
                    </label>
                    <input
                      type="date"
                      value={form.due_date}
                      onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))}
                      className="w-full bg-surface-3 border border-foreground/8 rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:border-tasks/50 dark:[color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground/65 block mb-1.5">
                      <Clock className="w-3.5 h-3.5 inline mr-1" />
                      Horário (opcional)
                    </label>
                    <input
                      type="time"
                      value={form.due_time}
                      onChange={(e) => setForm((p) => ({ ...p, due_time: e.target.value }))}
                      className="w-full bg-surface-3 border border-foreground/8 rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:border-tasks/50 dark:[color-scheme:dark]"
                    />
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="text-xs font-medium text-foreground/65 block mb-1.5">
                    <Tag className="w-3.5 h-3.5 inline mr-1" />
                    Categoria (opcional)
                  </label>
                  <input
                    value={form.category}
                    onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                    placeholder="Ex: Trabalho, Pessoal, Saúde…"
                    maxLength={50}
                    className="w-full bg-surface-3 border border-foreground/8 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder-foreground/25 outline-none focus:border-tasks/50"
                  />
                </div>

                {/* Recurrence toggle */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-foreground/65 flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5" />
                      Tarefa recorrente
                    </label>
                    <button
                      onClick={() => setForm((p) => ({ ...p, is_recurring: !p.is_recurring }))}
                      className={cn(
                        "w-10 h-5 rounded-full transition-colors relative",
                        form.is_recurring ? "bg-tasks" : "bg-foreground/15"
                      )}
                    >
                      <span className={cn(
                        "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
                        form.is_recurring ? "translate-x-5" : "translate-x-0.5"
                      )} />
                    </button>
                  </div>

                  {form.is_recurring && (
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {(["daily", "weekly", "monthly"] as RecurrenceType[]).map((r) => {
                        const labels = { daily: "Diário", weekly: "Semanal", monthly: "Mensal" };
                        return (
                          <button
                            key={r}
                            onClick={() => setForm((p) => ({ ...p, recurrence_type: r }))}
                            className={cn(
                              "rounded-xl border px-3 py-2 text-xs font-medium transition-colors",
                              form.recurrence_type === r
                                ? "bg-tasks/15 border-tasks/50 text-tasks"
                                : "bg-foreground/[0.02] border-foreground/8 text-foreground/55 hover:text-foreground"
                            )}
                          >
                            {labels[r]}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 mt-7">
                <Button variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>Cancelar</Button>
                <Button className="flex-1" onClick={handleSave} loading={saving} disabled={!form.title.trim()}>
                  {editingTask ? "Salvar alterações" : "Criar tarefa"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   KANBAN CARD
══════════════════════════════════════════════════════════════ */
interface KanbanCardProps {
  task: Task;
  onEdit: () => void;
  onDelete: () => void;
  onMove: (status: TaskStatus) => void;
  deleting: boolean;
  toggling: boolean;
}

function KanbanCard({ task, onEdit, onDelete, onMove, deleting, toggling }: KanbanCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const overdue = isOverdue(task);
  const dueToday = isDueToday(task);
  const cfg = PRIORITY_CONFIG[task.priority];

  const nextStatuses: { status: TaskStatus; label: string }[] = task.status === "todo"
    ? [{ status: "in_progress", label: "Mover para Em progresso" }, { status: "done", label: "Marcar como Concluída" }]
    : task.status === "in_progress"
    ? [{ status: "todo", label: "Voltar para A fazer" }, { status: "done", label: "Marcar como Concluída" }]
    : [{ status: "todo", label: "Reabrir" }, { status: "in_progress", label: "Colocar Em progresso" }];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className={cn(
        "bg-surface-1 border rounded-xl p-3 group",
        task.status === "done" ? "border-foreground/6 opacity-60" : "border-foreground/8 hover:border-foreground/16",
        overdue && "border-red-500/20 bg-red-500/[0.02]"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className={cn("text-sm font-medium leading-snug", task.status === "done" && "line-through text-foreground/50")}>
          {task.title}
        </p>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={onEdit} className="p-1 rounded-lg text-foreground/40 hover:text-foreground hover:bg-foreground/8 transition-colors">
            <Pencil className="w-3 h-3" />
          </button>
          <button onClick={onDelete} disabled={deleting} className="p-1 rounded-lg text-foreground/40 hover:text-red-400 hover:bg-red-500/10 transition-colors">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {task.description && (
        <p className="text-xs text-foreground/45 mb-2 line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center flex-wrap gap-1.5 mt-2">
        {/* Priority */}
        <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-md border", cfg.bg, cfg.border, cfg.color)}>
          {cfg.label}
        </span>

        {/* Due date */}
        {task.due_date && (
          <span className={cn(
            "flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md font-medium",
            overdue ? "text-red-400 bg-red-500/10" : dueToday ? "text-tasks bg-tasks/10" : "text-foreground/40 bg-foreground/6"
          )}>
            <Calendar className="w-2.5 h-2.5" />
            {formatDueDate(task.due_date)}
            {task.due_time && ` · ${task.due_time.slice(0, 5)}`}
          </span>
        )}

        {/* Category */}
        {task.category && (
          <span className="flex items-center gap-1 text-[10px] text-foreground/40 bg-foreground/6 px-1.5 py-0.5 rounded-md">
            <Tag className="w-2.5 h-2.5" />{task.category}
          </span>
        )}

        {/* Recurrence */}
        {task.is_recurring && (
          <span className="text-[10px] text-foreground/35 bg-foreground/5 px-1.5 py-0.5 rounded-md">
            <RefreshCw className="w-2.5 h-2.5 inline" />
          </span>
        )}
      </div>

      {/* Move button */}
      <div className="relative mt-2.5">
        <button
          onClick={() => setShowMenu((v) => !v)}
          disabled={toggling}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-foreground/[0.03] hover:bg-foreground/8 text-xs text-foreground/50 hover:text-foreground transition-all"
        >
          <span className="flex items-center gap-1.5">
            <ArrowUpRight className="w-3 h-3" />
            Mover para…
          </span>
          <ChevronDown className="w-3 h-3" />
        </button>
        <AnimatePresence>
          {showMenu && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute bottom-full left-0 right-0 mb-1 bg-surface-3 border border-foreground/10 rounded-xl shadow-lg overflow-hidden z-10"
            >
              {nextStatuses.map((ns) => (
                <button
                  key={ns.status}
                  onClick={() => { onMove(ns.status); setShowMenu(false); }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-foreground/8 text-foreground/70 hover:text-foreground transition-colors"
                >
                  {ns.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════
   LIST ROW
══════════════════════════════════════════════════════════════ */
interface ListRowProps {
  task: Task;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
  toggling: boolean;
}

function ListRow({ task, onToggle, onEdit, onDelete, deleting, toggling }: ListRowProps) {
  const overdue = isOverdue(task);
  const dueToday = isDueToday(task);
  const cfg = PRIORITY_CONFIG[task.priority];
  const done = task.status === "done";
  const cancelled = task.status === "cancelled";

  return (
    <div className={cn(
      "bg-surface-1 border rounded-xl p-3.5 flex items-center gap-3 group transition-all",
      done || cancelled ? "border-foreground/6 opacity-60" : "border-foreground/8 hover:border-foreground/16",
      overdue && "border-red-500/20"
    )}>
      {/* Check circle */}
      <button
        onClick={onToggle}
        disabled={toggling || cancelled}
        className="flex-shrink-0 transition-transform hover:scale-110"
        aria-label={done ? "Reabrir tarefa" : "Avançar status"}
      >
        {done ? (
          <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
            <Check className="w-3 h-3 text-white" strokeWidth={3} />
          </div>
        ) : task.status === "in_progress" ? (
          <div className="w-5 h-5 rounded-full border-2 border-tasks bg-tasks/20 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-tasks" />
          </div>
        ) : (
          <Circle className="w-5 h-5 text-foreground/25 hover:text-foreground/50 transition-colors" />
        )}
      </button>

      {/* Title + meta */}
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium", done && "line-through text-foreground/45", cancelled && "line-through text-foreground/30")}>
          {task.title}
        </p>
        <div className="flex items-center flex-wrap gap-2 mt-1">
          {task.due_date && (
            <span className={cn(
              "flex items-center gap-1 text-[10px] font-medium",
              overdue ? "text-red-400" : dueToday ? "text-tasks" : "text-foreground/40"
            )}>
              <Calendar className="w-3 h-3" />
              {formatDueDate(task.due_date)}
              {task.due_time && ` · ${task.due_time.slice(0, 5)}`}
            </span>
          )}
          {task.category && (
            <span className="flex items-center gap-1 text-[10px] text-foreground/35">
              <Tag className="w-3 h-3" />{task.category}
            </span>
          )}
          {task.is_recurring && <RefreshCw className="w-3 h-3 text-foreground/30" />}
        </div>
      </div>

      {/* Priority */}
      <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-lg border flex-shrink-0 hidden sm:block", cfg.bg, cfg.border, cfg.color)}>
        {cfg.label}
      </span>

      {/* Actions */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button onClick={onEdit} className="p-1.5 rounded-lg text-foreground/40 hover:text-foreground hover:bg-foreground/8 transition-colors" aria-label="Editar">
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button onClick={onDelete} disabled={deleting} className="p-1.5 rounded-lg text-foreground/40 hover:text-red-400 hover:bg-red-500/10 transition-colors" aria-label="Excluir">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
