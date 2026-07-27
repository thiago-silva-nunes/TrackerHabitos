import { NavLink } from "react-router-dom";
import { LayoutDashboard, CheckSquare, Calendar, BookOpen, Dumbbell, Flame, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useModules } from "@/contexts/ModuleContext";
import { useTheme } from "@/contexts/ThemeContext";
import { ModuleKey } from "@/types/modules";

const ICON_MAP: Record<string, React.ElementType> = { CheckSquare, Calendar, BookOpen, Dumbbell, Flame };

const COLOR_ACTIVE: Record<ModuleKey, string> = {
  tasks: "text-tasks", events: "text-events", studies: "text-studies",
  workouts: "text-workouts", habits: "text-habits",
};

export function BottomNav() {
  const { activeModules } = useModules();
  const { theme, toggleTheme } = useTheme();
  const visibleModules = activeModules.slice(0, 3);

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-surface-1/95 backdrop-blur-xl border-t border-foreground/6 safe-area-inset-bottom z-40">
      <div className="flex items-center justify-around px-2 py-2">
        <NavLink
          to="/"
          className={({ isActive }) =>
            cn("flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all",
               isActive ? "text-foreground" : "text-foreground/60"
            )
          }
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] font-medium">Home</span>
        </NavLink>

        {visibleModules.map((mod) => {
          const Icon = ICON_MAP[mod.icon] ?? Flame;
          return (
            <NavLink
              key={mod.key}
              to={mod.path}
              className={({ isActive }) =>
                cn("flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all",
                   isActive ? COLOR_ACTIVE[mod.key as ModuleKey] : "text-foreground/60"
                )
              }
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{mod.name}</span>
            </NavLink>
          );
        })}

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-foreground/60 hover:text-foreground transition-all"
          aria-label={theme === "dark" ? "Modo claro" : "Modo escuro"}
        >
          {theme === "dark"
            ? <><Sun className="w-5 h-5" /><span className="text-[10px] font-medium">Claro</span></>
            : <><Moon className="w-5 h-5" /><span className="text-[10px] font-medium">Escuro</span></>
          }
        </button>
      </div>
    </nav>
  );
}
