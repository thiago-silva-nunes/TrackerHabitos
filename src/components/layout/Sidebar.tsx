/**
 * Sidebar — desktop navigation (hidden on mobile).
 * Shows the active modules as nav items plus a Dashboard link.
 */
import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  CheckSquare,
  Calendar,
  BookOpen,
  Dumbbell,
  Flame,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useModules } from "@/contexts/ModuleContext";
import { ModuleKey } from "@/types/modules";

// Map module icon strings to Lucide components
const ICON_MAP: Record<string, React.ElementType> = {
  CheckSquare,
  Calendar,
  BookOpen,
  Dumbbell,
  Flame,
};

// Map module colour tokens to active-state styles
const COLOR_ACTIVE: Record<ModuleKey, string> = {
  tasks: "text-tasks bg-tasks/10 border-tasks/20",
  events: "text-events bg-events/10 border-events/20",
  studies: "text-studies bg-studies/10 border-studies/20",
  workouts: "text-workouts bg-workouts/10 border-workouts/20",
  habits: "text-habits bg-habits/10 border-habits/20",
};

const COLOR_ICON_ACTIVE: Record<ModuleKey, string> = {
  tasks: "text-tasks",
  events: "text-events",
  studies: "text-studies",
  workouts: "text-workouts",
  habits: "text-habits",
};

export function Sidebar() {
  const { signOut, user } = useAuth();
  const { activeModules } = useModules();
  const location = useLocation();

  const isDashboard = location.pathname === "/";

  return (
    <aside className="hidden lg:flex flex-col w-64 h-full bg-surface-1 border-r border-white/6 py-6 px-3 gap-1 flex-shrink-0">
      {/* Brand */}
      <div className="flex items-center gap-3 px-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-habits flex items-center justify-center shadow-lg shadow-habits/30 flex-shrink-0">
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
            <path
              d="M5 12.5l4.5 4.5 9.5-9.5"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div>
          <p className="font-semibold text-sm text-white leading-tight">Tracker</p>
          <p className="text-xs text-white/40">Hábitos</p>
        </div>
      </div>

      {/* Dashboard link */}
      <NavLink
        to="/"
        className={({ isActive }) =>
          cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border",
            isActive
              ? "text-white bg-white/8 border-white/10"
              : "text-white/50 border-transparent hover:text-white/80 hover:bg-white/4"
          )
        }
      >
        <LayoutDashboard className="w-4 h-4 flex-shrink-0" />
        Dashboard
      </NavLink>

      {/* Divider */}
      <div className="my-2 border-t border-white/6" />
      <p className="px-3 text-[11px] font-semibold uppercase tracking-widest text-white/25 mb-1">
        Módulos
      </p>

      {/* Module links */}
      {activeModules.map((mod) => {
        const Icon = ICON_MAP[mod.icon] ?? Flame;
        return (
          <NavLink
            key={mod.key}
            to={mod.path}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border",
                isActive
                  ? COLOR_ACTIVE[mod.key as ModuleKey]
                  : "text-white/50 border-transparent hover:text-white/80 hover:bg-white/4"
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={cn(
                    "w-4 h-4 flex-shrink-0 transition-colors",
                    isActive ? COLOR_ICON_ACTIVE[mod.key as ModuleKey] : ""
                  )}
                />
                {mod.name}
              </>
            )}
          </NavLink>
        );
      })}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom actions */}
      <div className="border-t border-white/6 pt-3 space-y-0.5">
        <NavLink
          to="/modulos"
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border border-transparent",
              isActive
                ? "text-white bg-white/8"
                : "text-white/50 hover:text-white/80 hover:bg-white/4"
            )
          }
        >
          <Settings className="w-4 h-4 flex-shrink-0" />
          Meus Módulos
        </NavLink>

        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/40 hover:text-red-400 hover:bg-red-500/8 transition-all"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          Sair
        </button>

        {/* User avatar */}
        <div className="flex items-center gap-3 px-3 py-3 mt-2 rounded-xl bg-white/3">
          <div className="w-8 h-8 rounded-full bg-habits/30 flex items-center justify-center text-habits text-sm font-semibold flex-shrink-0">
            {user?.email?.charAt(0).toUpperCase() ?? "U"}
          </div>
          <p className="text-xs text-white/40 truncate">{user?.email}</p>
        </div>
      </div>
    </aside>
  );
}
