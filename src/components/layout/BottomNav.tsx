/**
 * BottomNav — mobile navigation bar (visible below lg breakpoint).
 * Shows Dashboard + the first 4 active modules + a "+" add button.
 */
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  CheckSquare,
  Calendar,
  BookOpen,
  Dumbbell,
  Flame,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useModules } from "@/contexts/ModuleContext";
import { ModuleKey } from "@/types/modules";

const ICON_MAP: Record<string, React.ElementType> = {
  CheckSquare,
  Calendar,
  BookOpen,
  Dumbbell,
  Flame,
};

const COLOR_ACTIVE: Record<ModuleKey, string> = {
  tasks: "text-tasks",
  events: "text-events",
  studies: "text-studies",
  workouts: "text-workouts",
  habits: "text-habits",
};

export function BottomNav() {
  const { activeModules } = useModules();
  const location = useLocation();

  // Show Dashboard + first 3 active modules to avoid overflow
  const visibleModules = activeModules.slice(0, 3);

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-surface-1/95 backdrop-blur-xl border-t border-white/6 safe-area-inset-bottom z-40">
      <div className="flex items-center justify-around px-2 py-2">
        {/* Dashboard */}
        <NavLink
          to="/"
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all",
              isActive ? "text-white" : "text-white/35"
            )
          }
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] font-medium">Home</span>
        </NavLink>

        {/* Active modules */}
        {visibleModules.map((mod) => {
          const Icon = ICON_MAP[mod.icon] ?? Flame;
          return (
            <NavLink
              key={mod.key}
              to={mod.path}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all",
                  isActive
                    ? COLOR_ACTIVE[mod.key as ModuleKey]
                    : "text-white/35"
                )
              }
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{mod.name}</span>
            </NavLink>
          );
        })}

        {/* Contextual add button */}
        <button
          className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-white/35 hover:text-white transition-all"
          aria-label="Adicionar"
        >
          <div className="w-8 h-8 rounded-full bg-habits flex items-center justify-center shadow-lg shadow-habits/30">
            <Plus className="w-4 h-4 text-white" />
          </div>
        </button>
      </div>
    </nav>
  );
}
