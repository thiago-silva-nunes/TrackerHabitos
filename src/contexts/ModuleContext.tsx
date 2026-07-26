/**
 * ModuleContext — manages which modules the user has active and their order.
 *
 * On first login we seed the DB with DEFAULT_MODULES (all active).
 * Subsequent sessions load from the `modules` table.
 *
 * Architecture note: adding a new module only requires:
 *   1. Extending the ModuleKey union in types/modules.ts
 *   2. Adding its config to DEFAULT_MODULES
 *   3. Creating the page + route
 *   This context and DB layer need zero changes.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import { UserModule, DEFAULT_MODULES } from "@/types/modules";
import { useAuth } from "@/contexts/AuthContext";

interface ModuleContextValue {
  modules: UserModule[];
  activeModules: UserModule[];
  loading: boolean;
  toggleModule: (key: string) => Promise<void>;
  reorderModules: (keys: string[]) => Promise<void>;
}

const ModuleContext = createContext<ModuleContextValue | null>(null);

export function ModuleProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [modules, setModules] = useState<UserModule[]>([]);
  const [loading, setLoading] = useState(true);

  // Seed default modules for a brand-new user
  const seedModules = useCallback(async (userId: string) => {
    const rows = DEFAULT_MODULES.map((m, idx) => ({
      user_id: userId,
      key: m.key,
      name: m.name,
      icon: m.icon,
      color: m.color,
      is_active: true,
      sort_order: idx,
    }));
    const { error } = await supabase.from("modules").insert(rows);
    if (error) console.error("Error seeding modules:", error);
  }, []);

  const loadModules = useCallback(async (userId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("modules")
      .select("*")
      .eq("user_id", userId)
      .order("sort_order");

    if (error) {
      console.error("Error loading modules:", error);
      setLoading(false);
      return;
    }

    if (!data || data.length === 0) {
      await seedModules(userId);
      await loadModules(userId);
      return;
    }

    // Merge DB data with static config (description, path) from DEFAULT_MODULES
    const enriched: UserModule[] = (data as UserModule[]).map((row) => {
      const config = DEFAULT_MODULES.find((m) => m.key === row.key);
      return { ...row, path: config?.path ?? "/", description: config?.description ?? "" };
    });

    setModules(enriched);
    setLoading(false);
  }, [seedModules]);

  useEffect(() => {
    if (user) {
      loadModules(user.id);
    } else {
      setModules([]);
      setLoading(false);
    }
  }, [user, loadModules]);

  const toggleModule = useCallback(async (key: string) => {
    if (!user) return;
    const mod = modules.find((m) => m.key === key);
    if (!mod) return;
    const newValue = !mod.is_active;
    await supabase
      .from("modules")
      .update({ is_active: newValue })
      .eq("user_id", user.id)
      .eq("key", key);
    setModules((prev) =>
      prev.map((m) => (m.key === key ? { ...m, is_active: newValue } : m))
    );
  }, [user, modules]);

  const reorderModules = useCallback(async (keys: string[]) => {
    if (!user) return;
    const updates = keys.map((key, idx) =>
      supabase
        .from("modules")
        .update({ sort_order: idx })
        .eq("user_id", user.id)
        .eq("key", key)
    );
    await Promise.all(updates);
    setModules((prev) => {
      const sorted = [...prev].sort(
        (a, b) => keys.indexOf(a.key) - keys.indexOf(b.key)
      );
      return sorted.map((m, idx) => ({ ...m, sort_order: idx }));
    });
  }, [user]);

  const activeModules = modules.filter((m) => m.is_active);

  return (
    <ModuleContext.Provider
      value={{ modules, activeModules, loading, toggleModule, reorderModules }}
    >
      {children}
    </ModuleContext.Provider>
  );
}

export function useModules() {
  const ctx = useContext(ModuleContext);
  if (!ctx) throw new Error("useModules must be used inside <ModuleProvider>");
  return ctx;
}
