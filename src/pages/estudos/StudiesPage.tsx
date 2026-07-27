import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, BookOpen, Trash2, X, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StudyProjectWithStats } from "@/types/studies";

const EMOJIS = ["📚", "💻", "🧠", "🔬", "🎯", "⚡", "🚀", "🌐", "🛠️", "📐", "🔧", "📊"];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } } };

export function StudiesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<StudyProjectWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", emoji: "📚" });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch projects
      const { data: projectsData, error } = await supabase
        .from("study_projects")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch topic stats for each project
      const projectsWithStats = await Promise.all(
        (projectsData ?? []).map(async (p) => {
          const { data: tracks } = await supabase
            .from("study_tracks")
            .select("id")
            .eq("project_id", p.id);

          if (!tracks || tracks.length === 0) {
            return { ...p, total_topics: 0, done_topics: 0 };
          }

          const trackIds = tracks.map((t) => t.id);
          const { data: topics } = await supabase
            .from("study_topics")
            .select("id, status")
            .in("track_id", trackIds);

          const total = topics?.length ?? 0;
          const done = topics?.filter((t) => t.status === "done").length ?? 0;
          return { ...p, total_topics: total, done_topics: done };
        })
      );

      setProjects(projectsWithStats);
    } catch {
      toast.error("Erro ao carregar projetos");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  async function handleCreate() {
    if (!form.title.trim() || !user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("study_projects").insert({
        user_id: user.id,
        title: form.title.trim(),
        description: form.description.trim() || null,
        emoji: form.emoji,
      });
      if (error) throw error;
      toast.success("Projeto criado!");
      setShowModal(false);
      setForm({ title: "", description: "", emoji: "📚" });
      fetchProjects();
    } catch {
      toast.error("Erro ao criar projeto");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Excluir este projeto e todo o seu conteúdo?")) return;
    setDeletingId(id);
    try {
      const { error } = await supabase.from("study_projects").delete().eq("id", id);
      if (error) throw error;
      toast.success("Projeto excluído");
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch {
      toast.error("Erro ao excluir");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-5 h-5 text-studies" />
            <h1 className="text-xl font-bold text-foreground">Estudos</h1>
          </div>
          <p className="text-sm text-foreground/65">Seus projetos de aprendizagem</p>
        </div>
        <Button onClick={() => setShowModal(true)} size="sm">
          <Plus className="w-4 h-4" /> Novo projeto
        </Button>
      </motion.div>

      {/* Projects grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 rounded-2xl skeleton" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <div className="w-16 h-16 rounded-2xl bg-studies/10 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-studies" />
          </div>
          <p className="text-foreground/60 font-medium mb-1">Nenhum projeto ainda</p>
          <p className="text-foreground/60 text-sm mb-6">Crie seu primeiro projeto de estudos</p>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4" /> Criar projeto
          </Button>
        </motion.div>
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        >
          {projects.map((project) => {
            const pct = project.total_topics > 0
              ? Math.round((project.done_topics / project.total_topics) * 100)
              : 0;
            return (
              <motion.div key={project.id} variants={item}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/estudos/${project.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate(`/estudos/${project.id}`);
                    }
                  }}
                  className="w-full text-left bg-surface-1 border border-studies/20 hover:border-studies/40 rounded-2xl p-5 transition-all group relative"
                >
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{project.emoji}</span>
                      <div>
                        <p className="font-semibold text-foreground text-sm leading-snug">{project.title}</p>
                        {project.description && (
                          <p className="text-xs text-foreground/65 mt-0.5 line-clamp-1">{project.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={(e) => handleDelete(project.id, e)}
                        disabled={deletingId === project.id}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-foreground/60 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <ChevronRight className="w-4 h-4 text-studies opacity-0 group-hover:opacity-100 transition-all" />
                    </div>
                  </div>
                  {/* Progress */}
                  <div className="space-y-1.5">
                    <div className="h-1.5 rounded-full bg-foreground/6 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-studies transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-foreground/60">
                      {project.done_topics}/{project.total_topics} tópicos concluídos · {pct}%
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Create Project Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-surface-2 border border-foreground/8 rounded-2xl p-6 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-foreground">Novo Projeto</h2>
                <button onClick={() => setShowModal(false)} className="text-foreground/40 hover:text-foreground p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Emoji picker */}
              <div className="mb-4">
                <p className="text-xs text-foreground/65 mb-2 font-medium">Ícone</p>
                <div className="flex flex-wrap gap-2">
                  {EMOJIS.map((e) => (
                    <button
                      key={e}
                      onClick={() => setForm((f) => ({ ...f, emoji: e }))}
                      className={`text-xl w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                        form.emoji === e ? "bg-studies/20 ring-1 ring-studies/60" : "bg-foreground/5 hover:bg-foreground/10"
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 mb-5">
                <div>
                  <label className="text-xs text-foreground/65 font-medium block mb-1.5">Título *</label>
                  <input
                    autoFocus
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                    placeholder="Ex: Aprender React, Master TypeScript..."
                    className="w-full bg-surface-3 border border-foreground/8 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder-foreground/25 outline-none focus:border-studies/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-foreground/65 font-medium block mb-1.5">Descrição (opcional)</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Do que se trata este projeto?"
                    rows={2}
                    className="w-full bg-surface-3 border border-foreground/8 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder-foreground/25 outline-none focus:border-studies/50 transition-colors resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>
                  Cancelar
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleCreate}
                  loading={saving}
                  disabled={!form.title.trim()}
                >
                  Criar projeto
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
