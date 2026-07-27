import { useState } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  Calendar,
  CheckSquare,
  Dumbbell,
  Flame,
  Mail,
  Save,
  UserRound,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useModules } from "@/contexts/ModuleContext";
import { supabase } from "@/lib/supabase";
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
  tasks: "bg-tasks/10 border-tasks/25",
  events: "bg-events/10 border-events/25",
  studies: "bg-studies/10 border-studies/25",
  workouts: "bg-workouts/10 border-workouts/25",
  habits: "bg-habits/10 border-habits/25",
};

const COLOR_ICON: Record<ModuleKey, string> = {
  tasks: "text-tasks",
  events: "text-events",
  studies: "text-studies",
  workouts: "text-workouts",
  habits: "text-habits",
};

const MODULE_DESCRIPTIONS: Record<ModuleKey, string> = {
  tasks: "Organize o que precisa ser feito.",
  events: "Acompanhe sua agenda e compromissos.",
  studies: "Crie trilhas e avance nos seus estudos.",
  workouts: "Planeje treinos e acompanhe sua evolução.",
  habits: "Construa constância no seu dia a dia.",
};

export function ProfilePage() {
  const { user } = useAuth();
  const { modules, activeModules, toggleModule, loading: modulesLoading } = useModules();
  const initialName = (user?.user_metadata?.full_name as string | undefined) ?? "";
  const [name, setName] = useState(initialName);
  const [savingProfile, setSavingProfile] = useState(false);

  const email = user?.email ?? "";
  const avatarLabel = (name.trim() || email || "U").charAt(0).toUpperCase();

  async function handleSaveProfile() {
    if (!user) return;
    setSavingProfile(true);
    const { error } = await supabase.auth.updateUser({
      data: { full_name: name.trim() || null },
    });
    setSavingProfile(false);

    if (error) {
      toast.error("Não foi possível salvar seu perfil.");
      return;
    }
    toast.success("Perfil atualizado.");
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-habits mb-2">
          Personalização
        </p>
        <h1 className="text-2xl font-bold text-foreground">Seu perfil</h1>
        <p className="text-sm text-foreground/65 mt-1">
          Ajuste seus dados e escolha apenas os módulos que fazem sentido para sua rotina.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.4fr)] gap-5 items-start">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface-1 border border-foreground/6 rounded-3xl p-5 sm:p-6"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-habits/20 text-habits flex items-center justify-center text-2xl font-bold">
              {avatarLabel}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-foreground truncate">
                {name.trim() || "Seu perfil"}
              </p>
              <p className="text-sm text-foreground/60 truncate">{email}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="profile-name"
                className="text-xs font-medium text-foreground/65 block mb-1.5"
              >
                Como quer ser chamado?
              </label>
              <input
                id="profile-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Seu nome"
                maxLength={80}
                className="w-full bg-surface-2 border border-foreground/8 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder-foreground/25 outline-none focus:border-habits/50 transition-colors"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-foreground/65 block mb-1.5">
                E-mail da conta
              </label>
              <div className="flex items-center gap-2 bg-foreground/4 border border-foreground/6 rounded-xl px-3 py-2.5 text-sm text-foreground/60">
                <Mail className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{email}</span>
              </div>
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={savingProfile || name === initialName}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-habits text-white px-4 py-2.5 text-sm font-medium transition-all hover:bg-habits-light disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {savingProfile ? "Salvando..." : "Salvar perfil"}
            </button>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-surface-1 border border-foreground/6 rounded-3xl p-5 sm:p-6"
        >
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <UserRound className="w-4 h-4 text-habits" />
                <h2 className="font-semibold text-foreground">Meus módulos</h2>
              </div>
              <p className="text-sm text-foreground/60">
                Ativos no seu menu:{" "}
                <span className="text-foreground font-medium">{activeModules.length}</span>
              </p>
            </div>
            <span className="text-xs text-foreground/50 bg-foreground/5 rounded-full px-2.5 py-1">
              Personalizado
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {modules.map((module, index) => {
              const key = module.key as ModuleKey;
              const Icon = ICON_MAP[module.icon] ?? Flame;
              return (
                <motion.div
                  key={module.key}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 + index * 0.04 }}
                  className={cn(
                    "rounded-2xl border p-4 transition-all",
                    module.is_active
                      ? COLOR_ACTIVE_BG[key]
                      : "bg-foreground/[0.02] border-foreground/6 opacity-65"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        module.is_active ? "bg-foreground/8" : "bg-foreground/5"
                      )}
                    >
                      <Icon
                        className={cn(
                          "w-5 h-5",
                          module.is_active ? COLOR_ICON[key] : "text-foreground/50"
                        )}
                      />
                    </div>
                    <button
                      disabled={modulesLoading}
                      onClick={() => toggleModule(module.key)}
                      className={cn(
                        "relative w-11 h-6 rounded-full transition-all flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-habits/50",
                        module.is_active ? "bg-habits" : "bg-foreground/10"
                      )}
                      aria-label={`${module.is_active ? "Desativar" : "Ativar"} módulo ${module.name}`}
                      aria-pressed={module.is_active}
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all",
                          module.is_active ? "left-[calc(100%-1.375rem)]" : "left-0.5"
                        )}
                      />
                    </button>
                  </div>
                  <p className="font-semibold text-sm text-foreground mt-3">{module.name}</p>
                  <p className="text-xs text-foreground/60 mt-1 leading-relaxed">
                    {MODULE_DESCRIPTIONS[key]}
                  </p>
                </motion.div>
              );
            })}
          </div>

          <p className="text-xs text-foreground/50 mt-5">
            Você pode alterar essa seleção quando quiser. Os módulos desativados deixam de
            aparecer na navegação, mas seus dados continuam guardados.
          </p>
        </motion.section>
      </div>
    </div>
  );
}