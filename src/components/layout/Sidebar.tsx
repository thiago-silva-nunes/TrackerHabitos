import { NavLink } from "react-router-dom";
import { Moon, Sun, LayoutDashboard, CheckSquare, Calendar, BookOpen, Dumbbell, Flame, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useModules } from "@/contexts/ModuleContext";
import { useTheme } from "@/contexts/ThemeContext";
import { ModuleKey } from "@/types/modules";

const ICON_MAP: Record<string, React.ElementType> = { CheckSquare, Calendar, BookOpen, Dumbbell, Flame };

const COLOR_ACTIVE: Record<ModuleKey, string> = {
  tasks: "text-tasks bg-tasks/10 border-tasks/20",
  events: "text-events bg-events/10 border-events/20",
  studies: "text-studies bg-studies/10 border-studies/20",
  workouts: "text-workouts bg-workouts/10 border-workouts/20",
  habits: "text-habits bg-habits/10 border-habits/20",
};

const COLOR_ICON_ACTIVE: Record<ModuleKey, string> = {
  tasks: "text-tasks", events: "text-events", studies: "text-studies",
  workouts: "text-workouts", habits: "text-habits",
};

export function Sidebar() {
  const { signOut, user } = useAuth();
  const { activeModules } = useModules();
  const { theme, toggleTheme } = useTheme();

  return (
    <aside className="hidden lg:flex flex-col w-64 h-full bg-surface-1 border-r border-foreground/6 py-6 px-3 gap-1 flex-shrink-0">
      {/* Brand */}
      <div className="flex items-center justify-between px-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-habits flex items-center justify-center shadow-lg shadow-habits/30 flex-shrink-0">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
              <path d="M5 12.5l4.5 4.5 9.5-9.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-sm text-foreground leading-tight">Tracker</p>
            <p className="text-xs text-foreground/40">Hábitos</p>
          </div>
        </div>
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground/40 hover:text-foreground hover:bg-foreground/6 transition-all"
          title={theme === "dark" ? "Modo claro" : "Modo escuro"}
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      {/* Dashboard link */}
      <NavLink
        to="/"
        className={({ isActive }) =>
          cn("flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border",
            isActive ? "text-foreground bg-foreground/8 border-foreground/10" : "text-foreground/50 border-transparent hover:text-foreground/80 hover:bg-foreground/4"
          )
        }
      >
        <LayoutDashboard className="w-4 h-4 flex-shrink-0" /> Dashboard
      </NavLink>

      <div className="my-2 border-t border-foreground/6" />
      <p className="px-3 text-[11px] font-semibold uppercase tracking-widest text-foreground/25 mb-1">Módulos</p>

      {activeModules.map((mod) => {
        const Icon = ICON_MAP[mod.icon] ?? Flame;
        return (
          <NavLink
            key={mod.key}
            to={mod.path}
            className={({ isActive }) =>
              cn("flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border",
                isActive ? COLOR_ACTIVE[mod.key as ModuleKey] : "text-foreground/50 border-transparent hover:text-foreground/80 hover:bg-foreground/4"
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={cn("w-4 h-4 flex-shrink-0 transition-colors", isActive ? COLOR_ICON_ACTIVE[mod.key as ModuleKey] : "")} />
                {mod.name}
              </>
            )}
          </NavLink>
        );
      })}

      <div className="flex-1" />

      <div className="border-t border-foreground/6 pt-3 space-y-0.5">
        <NavLink
          to="/modulos"
          className={({ isActive }) =>
            cn("flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border border-transparent",
              isActive ? "text-foreground bg-foreground/8" : "text-foreground/50 hover:text-foreground/80 hover:bg-foreground/4"
            )
          }
        >
          <Settings className="w-4 h-4 flex-shrink-0" /> Meus Módulos
        </NavLink>

        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground/40 hover:text-red-400 hover:bg-red-500/8 transition-all"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" /> Sair
        </button>

        <div className="flex items-center gap-3 px-3 py-3 mt-2 rounded-xl bg-foreground/3">
          <div className="w-8 h-8 rounded-full bg-habits/30 flex items-center justify-center text-habits text-sm font-semibold flex-shrink-0">
            {user?.email?.charAt(0).toUpperCase() ?? "U"}
          </div>
          <p className="text-xs text-foreground/40 truncate">{user?.email}</p>
        </div>
      </div>
    </aside>
  );
}
