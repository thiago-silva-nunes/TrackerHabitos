import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Plus, X, ChevronDown, ChevronRight,
  CheckCircle2, Circle, Clock, BookOpen, Terminal,
  Trash2, GripVertical, Pencil,
} from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { StudyProject, StudyTrackWithTopics, StudyTopic, TopicStatus } from "@/types/studies";
import { StudyTerminal } from "./StudyTerminal";

const STATUS_CONFIG: Record<TopicStatus, { icon: React.ElementType; label: string; color: string }> = {
  pending:     { icon: Circle,       label: "Pendente",     color: "text-foreground/30" },
  in_progress: { icon: Clock,        label: "Em progresso", color: "text-studies"       },
  done:        { icon: CheckCircle2, label: "Concluído",    color: "text-green-400"     },
};

type Tab = "trilhas" | "terminal";

export function StudyProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>("trilhas");
  const [project, setProject] = useState<StudyProject | null>(null);
  const [tracks, setTracks] = useState<StudyTrackWithTopics[]>([]);
  const [expandedTracks, setExpandedTracks] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const [showTrackModal, setShowTrackModal] = useState(false);
  const [trackTitle, setTrackTitle] = useState("");
  const [savingTrack, setSavingTrack] = useState(false);

  const [addingTopicToTrack, setAddingTopicToTrack] = useState<string | null>(null);
  const [topicTitle, setTopicTitle] = useState("");
  const [savingTopic, setSavingTopic] = useState(false);

  const fetchData = useCallback(async () => {
    if (!projectId || !user) return;
    setLoading(true);
    try {
      const [projectRes, tracksRes] = await Promise.all([
        supabase.from("study_projects").select("*").eq("id", projectId).single(),
        supabase.from("study_tracks").select("*").eq("project_id", projectId).order("sort_order"),
      ]);

      if (projectRes.error) { navigate("/estudos"); return; }
      setProject(projectRes.data);

      const tracksData = tracksRes.data ?? [];
      if (tracksData.length > 0) {
        const { data: topicsData } = await supabase
          .from("study_topics")
          .select("*")
          .in("track_id", tracksData.map((t) => t.id))
          .order("sort_order");

        setTracks(tracksData.map((track) => ({
          ...track,
          topics: (topicsData ?? []).filter((t) => t.track_id === track.id),
        })));
        setExpandedTracks(new Set([tracksData[0].id]));
      } else {
        setTracks([]);
      }
    } catch {
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, [projectId, user, navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function toggleTrack(id: string) {
    setExpandedTracks((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleCreateTrack() {
    if (!trackTitle.trim() || !user || !projectId) return;
    setSavingTrack(true);
    try {
      const { data, error } = await supabase.from("study_tracks").insert({
        project_id: projectId, user_id: user.id,
        title: trackTitle.trim(), sort_order: tracks.length,
      }).select().single();
      if (error) throw error;
      toast.success("Trilha criada!");
      setShowTrackModal(false);
      setTrackTitle("");
      setTracks((prev) => [...prev, { ...data, topics: [] }]);
      setExpandedTracks((prev) => new Set([...prev, data.id]));
    } catch { toast.error("Erro ao criar trilha"); }
    finally { setSavingTrack(false); }
  }

  async function handleDeleteTrack(trackId: string) {
    if (!confirm("Excluir esta trilha e todos os seus tópicos?")) return;
    await supabase.from("study_tracks").delete().eq("id", trackId);
    toast.success("Trilha excluída");
    setTracks((prev) => prev.filter((t) => t.id !== trackId));
  }

  async function handleCreateTopic(trackId: string) {
    if (!topicTitle.trim() || !user) return;
    setSavingTopic(true);
    try {
      const track = tracks.find((t) => t.id === trackId);
      const { data, error } = await supabase.from("study_topics").insert({
        track_id: trackId, user_id: user.id,
        title: topicTitle.trim(), status: "pending", sort_order: track?.topics.length ?? 0,
      }).select().single();
      if (error) throw error;
      toast.success("Tópico criado!");
      setTopicTitle("");
      setAddingTopicToTrack(null);
      setTracks((prev) => prev.map((t) => t.id === trackId ? { ...t, topics: [...t.topics, data] } : t));
    } catch { toast.error("Erro ao criar tópico"); }
    finally { setSavingTopic(false); }
  }

  async function handleDeleteTopic(trackId: string, topicId: string) {
    await supabase.from("study_topics").delete().eq("id", topicId);
    setTracks((prev) => prev.map((t) => t.id === trackId
      ? { ...t, topics: t.topics.filter((tp) => tp.id !== topicId) } : t));
  }

  async function handleStatusCycle(topic: StudyTopic, trackId: string) {
    const cycle: TopicStatus[] = ["pending", "in_progress", "done"];
    const next = cycle[(cycle.indexOf(topic.status) + 1) % cycle.length];
    await supabase.from("study_topics").update({ status: next }).eq("id", topic.id);
    setTracks((prev) => prev.map((t) => t.id === trackId
      ? { ...t, topics: t.topics.map((tp) => tp.id === topic.id ? { ...tp, status: next } : tp) }
      : t));
  }

  const allTopics = tracks.flatMap((t) => t.topics);
  const donePct = allTopics.length > 0
    ? Math.round((allTopics.filter((t) => t.status === "done").length / allTopics.length) * 100) : 0;

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-4">
        {[...Array(3)].map((_, i) => <div key={i} className="h-20 rounded-2xl skeleton" />)}
      </div>
    );
  }
  if (!project) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <button onClick={() => navigate("/estudos")}
          className="flex items-center gap-1.5 text-sm text-foreground/40 hover:text-foreground/70 transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> Estudos
        </button>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{project.emoji}</span>
          <div>
            <h1 className="text-xl font-bold text-foreground">{project.title}</h1>
            {project.description && <p className="text-sm text-foreground/40 mt-0.5">{project.description}</p>}
          </div>
        </div>

        {allTopics.length > 0 && (
          <div className="mt-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-foreground/30">
              <span>Progresso geral</span>
              <span>{allTopics.filter((t) => t.status === "done").length}/{allTopics.length} · {donePct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-foreground/6 overflow-hidden">
              <div className="h-full rounded-full bg-studies transition-all duration-500" style={{ width: `${donePct}%` }} />
            </div>
          </div>
        )}
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-2 rounded-xl p-1 mb-6">
        {([
          ["trilhas",  "Trilhas de Aprendizagem", BookOpen],
          ["terminal", "Terminal / Playground",   Terminal],
        ] as const).map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              tab === key ? "bg-surface-3 text-foreground shadow-sm" : "text-foreground/40 hover:text-foreground/70"
            }`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* ── Trilhas Tab ── */}
      {tab === "trilhas" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          {tracks.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-foreground/40 text-sm mb-4">Nenhuma trilha ainda. Crie a primeira!</p>
              <Button onClick={() => setShowTrackModal(true)} size="sm">
                <Plus className="w-4 h-4" /> Nova trilha
              </Button>
            </div>
          ) : (
            <>
              {tracks.map((track) => {
                const doneCount = track.topics.filter((t) => t.status === "done").length;
                const isExpanded = expandedTracks.has(track.id);
                return (
                  <div key={track.id} className="bg-surface-1 border border-foreground/6 rounded-2xl overflow-hidden">
                    <button onClick={() => toggleTrack(track.id)}
                      className="w-full flex items-center justify-between p-4 hover:bg-foreground/[0.02] transition-colors group">
                      <div className="flex items-center gap-3">
                        <GripVertical className="w-4 h-4 text-foreground/20" />
                        <span className="font-semibold text-foreground text-sm">{track.title}</span>
                        <span className="text-xs text-foreground/30 bg-foreground/5 rounded-full px-2 py-0.5">
                          {doneCount}/{track.topics.length}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteTrack(track.id); }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-foreground/20 hover:text-red-400 hover:bg-red-500/10 transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-foreground/40" /> : <ChevronRight className="w-4 h-4 text-foreground/40" />}
                      </div>
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                          <div className="border-t border-foreground/6">
                            {track.topics.map((topic) => {
                              const s = STATUS_CONFIG[topic.status];
                              const StatusIcon = s.icon;
                              return (
                                <div key={topic.id}
                                  className="flex items-center gap-3 px-4 py-3 border-b border-foreground/4 last:border-0 group hover:bg-foreground/[0.02] transition-colors">
                                  <button onClick={() => handleStatusCycle(topic, track.id)} className="flex-shrink-0" title={s.label}>
                                    <StatusIcon className={`w-4 h-4 ${s.color} transition-colors`} />
                                  </button>
                                  <button onClick={() => navigate(`/estudos/${projectId}/topico/${topic.id}`)}
                                    className="flex-1 text-left text-sm text-foreground/70 hover:text-foreground transition-colors">
                                    {topic.title}
                                  </button>
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                    <button onClick={() => navigate(`/estudos/${projectId}/topico/${topic.id}`)}
                                      className="p-1 rounded-lg text-foreground/30 hover:text-studies hover:bg-studies/10 transition-all">
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                    <button onClick={() => handleDeleteTopic(track.id, topic.id)}
                                      className="p-1 rounded-lg text-foreground/30 hover:text-red-400 hover:bg-red-500/10 transition-all">
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}

                            {addingTopicToTrack === track.id ? (
                              <div className="px-4 py-3 flex items-center gap-2">
                                <input autoFocus value={topicTitle}
                                  onChange={(e) => setTopicTitle(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleCreateTopic(track.id);
                                    if (e.key === "Escape") { setAddingTopicToTrack(null); setTopicTitle(""); }
                                  }}
                                  placeholder="Nome do tópico..."
                                  className="flex-1 bg-surface-3 border border-studies/40 rounded-lg px-3 py-1.5 text-sm text-foreground placeholder-foreground/25 outline-none" />
                                <Button size="sm" onClick={() => handleCreateTopic(track.id)} loading={savingTopic} disabled={!topicTitle.trim()}>
                                  Adicionar
                                </Button>
                                <button onClick={() => { setAddingTopicToTrack(null); setTopicTitle(""); }} className="p-1 text-foreground/30 hover:text-foreground">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <button onClick={() => { setAddingTopicToTrack(track.id); setTopicTitle(""); }}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-foreground/30 hover:text-foreground/60 hover:bg-foreground/[0.02] transition-all">
                                <Plus className="w-3.5 h-3.5" /> Adicionar tópico
                              </button>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}

              <Button variant="secondary" onClick={() => setShowTrackModal(true)} className="w-full">
                <Plus className="w-4 h-4" /> Nova trilha
              </Button>
            </>
          )}
        </motion.div>
      )}

      {/* ── Terminal Tab ── */}
      {tab === "terminal" && projectId && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <p className="text-sm text-foreground/40 mb-4">
            Playground de código — escreva, execute e experimente JavaScript, HTML e CSS diretamente aqui.
            Seus projetos ficam salvos neste projeto de estudos.
          </p>
          <StudyTerminal studyProjectId={projectId} />
        </motion.div>
      )}

      {/* Create Track Modal */}
      <AnimatePresence>
        {showTrackModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowTrackModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-surface-2 border border-foreground/8 rounded-2xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-foreground">Nova Trilha</h2>
                <button onClick={() => setShowTrackModal(false)} className="text-foreground/40 hover:text-foreground p-1"><X className="w-4 h-4" /></button>
              </div>
              <input autoFocus value={trackTitle} onChange={(e) => setTrackTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateTrack()}
                placeholder="Ex: Fundamentos, React Avançado, APIs..."
                className="w-full bg-surface-3 border border-foreground/8 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder-foreground/25 outline-none focus:border-studies/50 transition-colors mb-4" />
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => setShowTrackModal(false)}>Cancelar</Button>
                <Button className="flex-1" onClick={handleCreateTrack} loading={savingTrack} disabled={!trackTitle.trim()}>Criar trilha</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
