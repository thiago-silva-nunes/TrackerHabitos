import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  CheckSquare,
  Calendar,
  BookOpen,
  Dumbbell,
  Flame,
  ArrowRight,
  Sparkles,
  Circle,
  Check,
  AlertCircle,
  TrendingUp,
  Plus,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useModules } from "@/contexts/ModuleContext";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { formatDate } from "@/lib/utils";
import { ModuleKey } from "@/types/modules";
import { PRIORITY_CONFIG, TaskStatus } from "@/types/tasks";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useAuth as useAuthInner } from "@/contexts/AuthContext";
import toast from "react-hot-toast";

const ICON_MAP: Record<string, React.ElementType> = {
  CheckSquare, Calendar, BookOpen, Dumbbell, Flame,
};

const COLOR_BORDER: Record<ModuleKey, string> = {
  tasks:    "border-tasks/20 hover:border-tasks/40",
  events:   "border-events/20 hover:border-events/40",
  studies:  "border-studies/20 hover:border-studies/40",
  workouts: "border-workouts/20 hover:border-workouts/40",
  habits:   "border-habits/20 hover:border-habits/40",
};
const COLOR_ICON_BG: Record<ModuleKey, string> = {
  tasks:    "bg-tasks/15 text-tasks",
  events:   "bg-events/15 text-events",
  studies:  "bg-studies/15 text-studies",
  workouts: "bg-workouts/15 text-workouts",
  habits:   "bg-habits/15 text-habits",
};
const COLOR_ARROW: Record<ModuleKey, string> = {
  tasks:    "text-tasks",
  events:   "text-events",
  studies:  "text-studies",
  workouts: "text-workouts",
  habits:   "text-habits",
};
const MODULE_PROGRESS_COLOR: Record<ModuleKey, string> = {
  tasks:    "bg-tasks",
  events:   "bg-events",
  studies:  "bg-studies",
  workouts: "bg-workouts",
  habits:   "bg-habits",
};

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

export function DashboardPage() {
  const { user } = useAuth();
  const { activeModules, loading: modulesLoading } = useModules();
  const navigate = useNavigate();
  const { stats, refetch } = useDashboardStats();

  const firstName = (
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email?.split("@")[0] ||
    "usuário"
  );
  const today = formatDate(new Date());
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  /* Module progress data */
  function getModuleProgress(key: ModuleKey): { value: number; label: string } {
    if (key === "habits") {
      const total = stats.habitsDueToday;
      const done  = stats.habitsDoneToday;
      if (total === 0) return { value: 0, label: "Nenhum hábito hoje" };
      return { value: done / total, label: `${done}/${total} hábitos feitos` };
    }
    if (key === "tasks") {
      const total = stats.tasksDueToday + stats.tasksDoneTodayCount;
      const done  = stats.tasksDoneTodayCount;
      if (total === 0) return { value: 0, label: "Sem tarefas para hoje" };
      return { value: done / total, label: `${done}/${total} tarefas concluídas` };
    }
    if (key === "studies") {
      const n = stats.studyProjectsCount;
      return { value: n > 0 ? 1 : 0, label: `${n} projeto${n !== 1 ? "s" : ""} de estudo` };
    }
    if (key === "events") {
      const n = stats.eventsToday;
      return { value: n > 0 ? 1 : 0, label: n === 0 ? "Sem eventos hoje" : `${n} evento${n !== 1 ? "s" : ""} hoje` };
    }
    if (key === "workouts") {
      const n = stats.workoutsThisWeek;
      return { value: Math.min(n / 5, 1), label: `${n} treino${n !== 1 ? "s" : ""} esta semana` };
    }
    return { value: 0, label: "Em breve" };
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-foreground/65 mb-1 capitalize">{today}</p>
            <h1 className="text-2xl font-bold text-foreground">
              {greeting},{" "}
              <span className="text-tasks capitalize">{firstName}</span> 👋
            </h1>
            <p className="text-sm text-foreground/65 mt-1">
              Aqui está o resumo da sua vida hoje.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-tasks/10 border border-tasks/20 rounded-full px-3 py-1.5 flex-shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-tasks" />
            <span className="text-xs font-medium text-tasks">Foco total!</span>
          </div>
        </div>
      </motion.div>

      {/* Stats row */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8"
      >
        <StatCard
          label="Tarefas hoje"
          value={stats.loading ? "—" : stats.tasksDueToday > 0 ? `${stats.tasksDoneTodayCount}/${stats.tasksDueToday}` : stats.tasksDoneTodayCount > 0 ? `${stats.tasksDoneTodayCount}` : "0"}
          color="text-tasks"
          onClick={() => navigate("/tarefas")}
          alert={!stats.loading && stats.tasksOverdue > 0 ? `${stats.tasksOverdue} atrasada${stats.tasksOverdue > 1 ? "s" : ""}` : undefined}
        />
        <StatCard
          label="Hábitos hoje"
          value={stats.loading ? "—" : `${stats.habitsDoneToday}/${stats.habitsDueToday}`}
          color="text-habits"
          onClick={() => navigate("/habitos")}
        />
        <StatCard
          label="Eventos hoje"
          value={stats.loading ? "—" : `${stats.eventsToday}`}
          color="text-events"
          onClick={() => navigate("/eventos")}
        />
        <StatCard
          label="Treinos na semana"
          value={stats.loading ? "—" : `${stats.workoutsThisWeek}`}
          color="text-workouts"
          onClick={() => navigate("/treinos")}
        />
      </motion.div>

      {/* Today's Agenda */}
      {!stats.loading && (stats.todayTaskList.length > 0 || stats.todayHabits.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground/65 uppercase tracking-widest">
              Agenda de hoje
            </h2>
          </div>
          <div className="bg-surface-1 border border-foreground/6 rounded-2xl divide-y divide-foreground/5">
            {/* Pending tasks today */}
            {stats.todayTaskList.map((task) => {
              const cfg = PRIORITY_CONFIG[task.priority];
              return (
                <TodayTaskRow
                  key={task.id}
                  taskId={task.id}
                  title={task.title}
                  priorityLabel={cfg.label}
                  priorityColor={cfg.color}
                  priorityBg={cfg.bg}
                  status={task.status}
                  onDone={refetch}
                />
              );
            })}

            {/* Habits today */}
            {stats.todayHabits.map((habit) => (
              <div key={habit.id} className="flex items-center gap-3 px-4 py-3">
                <div
                  className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                  style={{ borderColor: habit.color, backgroundColor: stats.habitCheckinsToday.has(habit.id) ? habit.color : "transparent" }}
                >
                  {stats.habitCheckinsToday.has(habit.id) && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                </div>
                <span className={cn("text-sm flex-1", stats.habitCheckinsToday.has(habit.id) && "line-through text-foreground/40")}>
                  {habit.name}
                </span>
                <span className="text-[10px] text-foreground/35 bg-foreground/5 px-2 py-0.5 rounded-md">Hábito</span>
              </div>
            ))}

            {/* Add task quick link */}
            <button
              onClick={() => navigate("/tarefas")}
              className="w-full flex items-center gap-3 px-4 py-3 text-foreground/35 hover:text-foreground/60 hover:bg-foreground/3 transition-all rounded-b-2xl"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm">Adicionar tarefa para hoje</span>
            </button>
          </div>
        </motion.div>
      )}

      {/* Alerts */}
      {!stats.loading && stats.tasksOverdue > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-3 bg-red-500/8 border border-red-500/20 rounded-2xl px-4 py-3 mb-6 cursor-pointer"
          onClick={() => navigate("/tarefas")}
        >
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400 flex-1">
            {stats.tasksOverdue === 1
              ? "Você tem 1 tarefa atrasada."
              : `Você tem ${stats.tasksOverdue} tarefas atrasadas.`}
          </p>
          <ArrowRight className="w-4 h-4 text-red-400" />
        </motion.div>
      )}

      {/* Module cards */}
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-foreground/65 uppercase tracking-widest mb-4">
          Módulos ativos
        </h2>

        {modulesLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : activeModules.length === 0 ? (
          <div className="bg-surface-1 rounded-2xl border border-foreground/6 p-8 text-center">
            <p className="text-foreground/40 text-sm">
              Nenhum módulo ativo.{" "}
              <button onClick={() => navigate("/modulos")} className="text-tasks hover:text-tasks-light transition-colors font-medium">
                Ativar módulos
              </button>
            </p>
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            {activeModules.map((mod) => {
              const Icon = ICON_MAP[mod.icon] ?? Flame;
              const key = mod.key as ModuleKey;
              const progress = getModuleProgress(key);
              return (
                <motion.button
                  key={mod.key}
                  variants={itemVariants}
                  onClick={() => navigate(mod.path)}
                  className={`bg-surface-1 rounded-2xl border ${COLOR_BORDER[key]} p-5 text-left transition-all group`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${COLOR_ICON_BG[key]}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">{mod.name}</p>
                        <p className="text-xs text-foreground/65 mt-0.5">{progress.label}</p>
                      </div>
                    </div>
                    <ArrowRight
                      className={`w-4 h-4 ${COLOR_ARROW[key]} opacity-0 group-hover:opacity-100 translate-x-0 group-hover:translate-x-1 transition-all flex-shrink-0 mt-1`}
                    />
                  </div>

                  {/* Progress bar */}
                  <div className="mt-4 h-1 rounded-full bg-foreground/6 overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${MODULE_PROGRESS_COLOR[key]}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.round(progress.value * 100)}%` }}
                      transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
                    />
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </div>

      {/* Quick stats footer */}
      {!stats.loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-6 flex items-center gap-2 text-xs text-foreground/35"
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Dados atualizados agora</span>
        </motion.div>
      )}
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────── */

function StatCard({
  label, value, color, onClick, alert,
}: {
  label: string; value: string | number; color: string; onClick?: () => void; alert?: string;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={cn(
        "bg-surface-1 rounded-2xl border border-foreground/6 p-4 text-left",
        onClick && "hover:border-foreground/12 transition-colors cursor-pointer"
      )}
    >
      <p className={cn("text-2xl font-bold", color)}>{value}</p>
      <p className="text-xs text-foreground/65 mt-1">{label}</p>
      {alert && (
        <p className="text-[10px] text-red-400 mt-1 font-medium">{alert}</p>
      )}
    </Tag>
  );
}

function TodayTaskRow({
  taskId, title, priorityLabel, priorityColor, priorityBg, status, onDone,
}: {
  taskId: string;
  title: string;
  priorityLabel: string;
  priorityColor: string;
  priorityBg: string;
  status: TaskStatus;
  onDone: () => void;
}) {
  const { user } = useAuthInner();
  const [marking, setMarking] = useState(false);
  const done = status === "done";

  async function markDone() {
    if (!user || done) return;
    setMarking(true);
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ status: "done", updated_at: new Date().toISOString() })
        .eq("id", taskId)
        .eq("user_id", user.id);
      if (error) throw error;
      toast.success("✅ Tarefa concluída!");
      onDone();
    } catch {
      toast.error("Não foi possível concluir a tarefa.");
    } finally {
      setMarking(false);
    }
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 group">
      <button
        onClick={markDone}
        disabled={marking || done}
        className="flex-shrink-0 transition-transform hover:scale-110"
        aria-label={done ? "Concluída" : "Marcar como concluída"}
      >
        {done ? (
          <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
            <Check className="w-3 h-3 text-white" strokeWidth={3} />
          </div>
        ) : (
          <Circle className="w-5 h-5 text-foreground/25 hover:text-foreground/50 transition-colors" />
        )}
      </button>
      <span className={cn("text-sm flex-1", done && "line-through text-foreground/40")}>{title}</span>
      <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-md", priorityBg, priorityColor)}>
        {priorityLabel}
      </span>
    </div>
  );
}
