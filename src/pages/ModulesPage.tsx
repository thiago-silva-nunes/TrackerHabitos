import { motion } from "framer-motion";
import {
  CheckSquare,
  Calendar,
  BookOpen,
  Dumbbell,
  Flame,
} from "lucide-react";
import { useModules } from "@/contexts/ModuleContext";
import { ModuleKey } from "@/types/modules";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, React.ElementType> = {
  CheckSquare,
  Calendar,
  BookOpen,
  Dumbbell,
  Flame,
};

const COLOR_ACTIVE_BG: Record<ModuleKey, string> = {
  tasks: "bg-tasks/15 border-tasks/30",
  events: "bg-events/15 border-events/30",
  studies: "bg-studies/15 border-studies/30",
  workouts: "bg-workouts/15 border-workouts/30",
  habits: "bg-habits/15 border-habits/30",
};

const COLOR_ICON: Record<ModuleKey, string> = {
  tasks: "text-tasks",
  events: "text-events",
  studies: "text-studies",
  workouts: "text-workouts",
  habits: "text-habits",
};

const MODULE_DESCRIPTIONS: Record<ModuleKey, string> = {
  tasks: "Tarefas, Kanban e recorrência",
  events: "Calendário e compromissos",
  studies: "Matérias, tópicos e sessões",
  workouts: "Treinos e evolução de carga",
  habits: "Streaks, heatmap e conquistas",
};

export function ModulesPage() {
  const { modules, toggleModule, loading } = useModules();

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-bold text-white">Meus Módulos</h1>
        <p className="text-sm text-white/40 mt-1">
          Ative ou desative módulos conforme sua rotina. Novas funcionalidades chegam como novos módulos.
        </p>
      </motion.div>

      <div className="space-y-3">
        {modules.map((mod, idx) => {
          const Icon = ICON_MAP[mod.icon] ?? Flame;
          const key = mod.key as ModuleKey;
          return (
            <motion.div
              key={mod.key}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.3 }}
              className={cn(
                "flex items-center gap-4 p-4 rounded-2xl border transition-all",
                mod.is_active
                  ? COLOR_ACTIVE_BG[key]
                  : "bg-surface-1 border-white/6 opacity-60"
              )}
            >
              {/* Icon */}
              <div
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                  mod.is_active ? "bg-black/20" : "bg-white/5"
                )}
              >
                <Icon
                  className={cn(
                    "w-5 h-5",
                    mod.is_active ? COLOR_ICON[key] : "text-white/30"
                  )}
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className={cn("font-semibold text-sm", mod.is_active ? "text-white" : "text-white/40")}>
                  {mod.name}
                </p>
                <p className="text-xs text-white/30">{MODULE_DESCRIPTIONS[key]}</p>
              </div>

              {/* Toggle */}
              <button
                disabled={loading}
                onClick={() => toggleModule(mod.key)}
                className={cn(
                  "relative w-11 h-6 rounded-full transition-all flex-shrink-0 focus:outline-none",
                  mod.is_active ? "bg-habits" : "bg-white/10"
                )}
                aria-label={mod.is_active ? "Desativar" : "Ativar"}
              >
                <span
                  className={cn(
                    "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all",
                    mod.is_active ? "left-[calc(100%-1.375rem)]" : "left-0.5"
                  )}
                />
              </button>
            </motion.div>
          );
        })}
      </div>

      <p className="text-xs text-white/20 text-center mt-8">
        Mais módulos chegando em breve: Finanças, Leitura, Sono, Água, Metas…
      </p>
    </div>
  );
}
