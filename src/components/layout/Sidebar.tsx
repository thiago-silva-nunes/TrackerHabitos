import { NavLink } from "react-router-dom";
import { useState } from "react";
import { Moon, Sun, LayoutDashboard, CheckSquare, Calendar, BookOpen, Dumbbell, Flame, Settings, LogOut, PanelLeftClose, PanelLeftOpen, UserRound } from "lucide-react";
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
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("sidebar-collapsed") === "true");

  function toggleSidebar() {
    setCollapsed((value) => {
      const next = !value;
      localStorage.setItem("sidebar-collapsed", String(next));
      return next;
    });
  }

  return (
    <aside className={cn(
      "hidden lg:flex flex-col h-full bg-surface-1 border-r border-foreground/6 py-6 px-3 gap-1 flex-shrink-0 transition-[width] duration-200",
      collapsed ? "w-[76px]" : "w-64",
    )}>
      {/* Brand */}
      <div className={cn("flex items-center px-3 mb-6", collapsed ? "justify-center" : "justify-between")}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-habits flex items-center justify-center shadow-lg shadow-habits/30 flex-shrink-0">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
              <path d="M5 12.5l4.5 4.5 9.5-9.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className={cn("overflow-hidden transition-all", collapsed ? "w-0 opacity-0" : "w-auto opacity-100")}>
            <p className="font-semibold text-sm text-foreground leading-tight">Tracker</p>
            <p className="text-xs text-foreground/65">Hábitos</p>
          </div>
        </div>
        {!collapsed && (
          <button
            onClick={toggleTheme}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground/60 hover:text-foreground hover:bg-foreground/6 transition-all"
            title={theme === "dark" ? "Modo claro" : "Modo escuro"}
            aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Dashboard link */}
      <NavLink
        to="/"
        className={({ isActive }) =>
          cn("flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border",
            collapsed && "justify-center px-0",
            isActive ? "text-foreground bg-foreground/8 border-foreground/10" : "text-foreground/65 border-transparent hover:text-foreground hover:bg-foreground/4"
          )
        }
        title={collapsed ? "Dashboard" : undefined}
      >
        <LayoutDashboard className="w-4 h-4 flex-shrink-0" />
        {!collapsed && "Dashboard"}
      </NavLink>

      <div className="my-2 border-t border-foreground/6" />
      {!collapsed && <p className="px-3 text-[11px] font-semibold uppercase tracking-widest text-foreground/60 mb-1">Módulos</p>}

      {activeModules.map((mod) => {
        const Icon = ICON_MAP[mod.icon] ?? Flame;
        return (
          <NavLink
            key={mod.key}
            to={mod.path}
            className={({ isActive }) =>
              cn("flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border",
                collapsed && "justify-center px-0",
                isActive ? COLOR_ACTIVE[mod.key as ModuleKey] : "text-foreground/65 border-transparent hover:text-foreground hover:bg-foreground/4"
              )
            }
            title={collapsed ? mod.name : undefined}
          >
            {({ isActive }) => (
              <>
                <Icon className={cn("w-4 h-4 flex-shrink-0 transition-colors", isActive ? COLOR_ICON_ACTIVE[mod.key as ModuleKey] : "")} />
                {!collapsed && mod.name}
              </>
            )}
          </NavLink>
        );
      })}

      <div className="flex-1" />

      <div className="border-t border-foreground/6 pt-3 space-y-0.5">
        <button
          onClick={toggleSidebar}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground/65 hover:text-foreground hover:bg-foreground/4 transition-all",
            collapsed && "justify-center px-0",
          )}
          title={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
          aria-label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
        >
          {collapsed ? <PanelLeftOpen className="w-4 h-4 flex-shrink-0" /> : <PanelLeftClose className="w-4 h-4 flex-shrink-0" />}
          {!collapsed && "Recolher menu"}
        </button>
        <NavLink
          to="/perfil"
          className={({ isActive }) =>
            cn("flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border border-transparent",
              collapsed && "justify-center px-0",
              isActive ? "text-foreground bg-foreground/8" : "text-foreground/65 hover:text-foreground hover:bg-foreground/4"
            )
          }
          title={collapsed ? "Perfil e módulos" : undefined}
        >
          <UserRound className="w-4 h-4 flex-shrink-0" />
          {!collapsed && "Perfil e módulos"}
        </NavLink>

        <button
          onClick={signOut}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground/65 hover:text-red-400 hover:bg-red-500/8 transition-all",
            collapsed && "justify-center px-0",
          )}
          title={collapsed ? "Sair" : undefined}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && "Sair"}
        </button>

        <NavLink to="/perfil" className={cn("flex items-center gap-3 px-3 py-3 mt-2 rounded-xl bg-foreground/3 hover:bg-foreground/6 transition-colors", collapsed && "justify-center px-0")} title={collapsed ? user?.email ?? "Usuário" : undefined}>
          <div className="w-8 h-8 rounded-full bg-habits/30 flex items-center justify-center text-habits text-sm font-semibold flex-shrink-0">
            {((user?.user_metadata?.full_name as string | undefined) || user?.email || "U").charAt(0).toUpperCase()}
          </div>
          {!collapsed && <p className="text-xs text-foreground/65 truncate">{(user?.user_metadata?.full_name as string | undefined) || user?.email}</p>}
        </NavLink>
      </div>
    </aside>
  );
}
