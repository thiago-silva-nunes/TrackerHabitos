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
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useModules } from "@/contexts/ModuleContext";
import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { formatDate } from "@/lib/utils";
import { ModuleKey } from "@/types/modules";

const ICON_MAP: Record<string, React.ElementType> = {
  CheckSquare,
  Calendar,
  BookOpen,
  Dumbbell,
  Flame,
};

// Module colour classes for card accents
const COLOR_BORDER: Record<ModuleKey, string> = {
  tasks: "border-tasks/20 hover:border-tasks/40",
  events: "border-events/20 hover:border-events/40",
  studies: "border-studies/20 hover:border-studies/40",
  workouts: "border-workouts/20 hover:border-workouts/40",
  habits: "border-habits/20 hover:border-habits/40",
};

const COLOR_ICON_BG: Record<ModuleKey, string> = {
  tasks: "bg-tasks/15 text-tasks",
  events: "bg-events/15 text-events",
  studies: "bg-studies/15 text-studies",
  workouts: "bg-workouts/15 text-workouts",
  habits: "bg-habits/15 text-habits",
};

const COLOR_ARROW: Record<ModuleKey, string> = {
  tasks: "text-tasks",
  events: "text-events",
  studies: "text-studies",
  workouts: "text-workouts",
  habits: "text-habits",
};

// Module descriptions for the "coming soon" cards
const MODULE_DESCRIPTIONS: Record<ModuleKey, string> = {
  tasks: "Gerencie suas tarefas e projetos do dia a dia.",
  events: "Agenda e compromissos em calendário visual.",
  studies: "Matérias, conteúdos e sessões de estudo.",
  workouts: "Planos de treino e evolução de carga.",
  habits: "Hábitos recorrentes com streaks e conquistas.",
};

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

export function DashboardPage() {
  const { user } = useAuth();
  const { activeModules, loading } = useModules();
  const navigate = useNavigate();

  const firstName = user?.email?.split("@")[0] ?? "usuário";
  const today = formatDate(new Date());

  // Greeting based on time of day
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

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
            <p className="text-sm text-foreground/40 mb-1 capitalize">{today}</p>
            <h1 className="text-2xl font-bold text-foreground">
              {greeting},{" "}
              <span className="text-habits capitalize">{firstName}</span> 👋
            </h1>
            <p className="text-sm text-foreground/40 mt-1">
              Aqui está o seu resumo de hoje.
            </p>
          </div>

          {/* Motivational badge */}
          <div className="flex items-center gap-2 bg-habits/10 border border-habits/20 rounded-full px-3 py-1.5 flex-shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-habits" />
            <span className="text-xs font-medium text-habits">Foco total!</span>
          </div>
        </div>
      </motion.div>

      {/* Stats row — placeholder for Etapa 2+ */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8"
      >
        {[
          { label: "Tarefas hoje", value: "—", color: "text-tasks" },
          { label: "Hábitos pendentes", value: "—", color: "text-habits" },
          { label: "Eventos hoje", value: "—", color: "text-events" },
          { label: "Horas estudadas", value: "—", color: "text-studies" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-surface-1 rounded-2xl border border-foreground/6 p-4"
          >
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-foreground/40 mt-1">{stat.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Module cards */}
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-foreground/40 uppercase tracking-widest mb-4">
          Módulos ativos
        </h2>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : activeModules.length === 0 ? (
          <div className="bg-surface-1 rounded-2xl border border-foreground/6 p-8 text-center">
            <p className="text-foreground/40 text-sm">
              Nenhum módulo ativo.{" "}
              <button
                onClick={() => navigate("/modulos")}
                className="text-habits hover:text-habits-light transition-colors font-medium"
              >
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
              return (
                <motion.button
                  key={mod.key}
                  variants={itemVariants}
                  onClick={() => navigate(mod.path)}
                  className={`bg-surface-1 rounded-2xl border ${COLOR_BORDER[key]} p-5 text-left transition-all group`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${COLOR_ICON_BG[key]}`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">{mod.name}</p>
                        <p className="text-xs text-foreground/40 mt-0.5">
                          {MODULE_DESCRIPTIONS[key]}
                        </p>
                      </div>
                    </div>
                    <ArrowRight
                      className={`w-4 h-4 ${COLOR_ARROW[key]} opacity-0 group-hover:opacity-100 translate-x-0 group-hover:translate-x-1 transition-all flex-shrink-0 mt-1`}
                    />
                  </div>

                  {/* Placeholder progress bar */}
                  <div className="mt-4 h-1 rounded-full bg-foreground/6 overflow-hidden">
                    <div className="h-full w-0 rounded-full bg-current opacity-40" />
                  </div>
                  <p className="text-xs text-foreground/25 mt-1.5">
                    Em breve: dados reais
                  </p>
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}
