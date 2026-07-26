import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Plus, X, Youtube, FileText, Trash2,
  ExternalLink, CheckCircle2, Circle, Clock, Save,
} from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { StudyTopic, TopicResource, TopicStatus } from "@/types/studies";

const STATUS_OPTIONS: { value: TopicStatus; label: string; icon: React.ElementType; color: string }[] = [
  { value: "pending", label: "Pendente", icon: Circle, color: "text-white/30" },
  { value: "in_progress", label: "Em progresso", icon: Clock, color: "text-studies" },
  { value: "done", label: "Concluído", icon: CheckCircle2, color: "text-green-400" },
];

function getYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const m = url.match(pattern);
    if (m) return m[1];
  }
  return null;
}

type AddMode = "youtube" | "note" | null;

export function StudyTopicPage() {
  const { projectId, topicId } = useParams<{ projectId: string; topicId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [topic, setTopic] = useState<StudyTopic | null>(null);
  const [resources, setResources] = useState<TopicResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [addMode, setAddMode] = useState<AddMode>(null);

  // YouTube form
  const [ytUrl, setYtUrl] = useState("");
  const [ytTitle, setYtTitle] = useState("");
  const [savingYt, setSavingYt] = useState(false);

  // Note form
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // Edit note
  const [editingNote, setEditingNote] = useState<TopicResource | null>(null);
  const [editContent, setEditContent] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchData = useCallback(async () => {
    if (!topicId || !user) return;
    setLoading(true);
    try {
      const [topicRes, resourcesRes] = await Promise.all([
        supabase.from("study_topics").select("*").eq("id", topicId).single(),
        supabase.from("topic_resources").select("*").eq("topic_id", topicId).order("sort_order"),
      ]);
      if (topicRes.error) { navigate(-1); return; }
      setTopic(topicRes.data);
      setResources(resourcesRes.data ?? []);
    } catch {
      toast.error("Erro ao carregar tópico");
    } finally {
      setLoading(false);
    }
  }, [topicId, user, navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleStatusChange(status: TopicStatus) {
    if (!topic) return;
    try {
      await supabase.from("study_topics").update({ status }).eq("id", topic.id);
      setTopic((t) => t ? { ...t, status } : t);
      toast.success("Status atualizado");
    } catch {
      toast.error("Erro ao atualizar status");
    }
  }

  async function handleAddYoutube() {
    if (!ytUrl.trim() || !user || !topicId) return;
    const videoId = getYouTubeId(ytUrl.trim());
    if (!videoId) {
      toast.error("URL do YouTube inválida");
      return;
    }
    setSavingYt(true);
    try {
      const { data, error } = await supabase.from("topic_resources").insert({
        topic_id: topicId,
        user_id: user.id,
        type: "youtube",
        title: ytTitle.trim() || `Vídeo do YouTube`,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        content: null,
        sort_order: resources.length,
      }).select().single();
      if (error) throw error;
      toast.success("Vídeo adicionado!");
      setResources((prev) => [...prev, data]);
      setYtUrl("");
      setYtTitle("");
      setAddMode(null);
    } catch {
      toast.error("Erro ao adicionar vídeo");
    } finally {
      setSavingYt(false);
    }
  }

  async function handleAddNote() {
    if (!noteContent.trim() || !user || !topicId) return;
    setSavingNote(true);
    try {
      const { data, error } = await supabase.from("topic_resources").insert({
        topic_id: topicId,
        user_id: user.id,
        type: "note",
        title: noteTitle.trim() || "Anotação",
        url: null,
        content: noteContent.trim(),
        sort_order: resources.length,
      }).select().single();
      if (error) throw error;
      toast.success("Anotação salva!");
      setResources((prev) => [...prev, data]);
      setNoteTitle("");
      setNoteContent("");
      setAddMode(null);
    } catch {
      toast.error("Erro ao salvar anotação");
    } finally {
      setSavingNote(false);
    }
  }

  async function handleSaveEditNote() {
    if (!editingNote || !editContent.trim()) return;
    setSavingEdit(true);
    try {
      const { error } = await supabase.from("topic_resources")
        .update({ content: editContent.trim() })
        .eq("id", editingNote.id);
      if (error) throw error;
      toast.success("Anotação atualizada!");
      setResources((prev) =>
        prev.map((r) => r.id === editingNote.id ? { ...r, content: editContent.trim() } : r)
      );
      setEditingNote(null);
      setEditContent("");
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDeleteResource(id: string) {
    try {
      await supabase.from("topic_resources").delete().eq("id", id);
      setResources((prev) => prev.filter((r) => r.id !== id));
      toast.success("Removido");
    } catch {
      toast.error("Erro ao remover");
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-4">
        <div className="h-6 w-32 rounded-lg skeleton" />
        <div className="h-8 w-64 rounded-xl skeleton" />
        {[...Array(3)].map((_, i) => <div key={i} className="h-28 rounded-2xl skeleton" />)}
      </div>
    );
  }

  if (!topic) return null;

  const currentStatus = STATUS_OPTIONS.find((s) => s.value === topic.status)!;
  const StatusIcon = currentStatus.icon;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <button
          onClick={() => navigate(`/estudos/${projectId}`)}
          className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar ao projeto
        </button>

        <div className="flex items-start justify-between gap-4">
          <h1 className="text-xl font-bold text-white leading-snug">{topic.title}</h1>
        </div>

        {/* Status selector */}
        <div className="flex items-center gap-2 mt-3">
          <span className="text-xs text-white/30">Status:</span>
          <div className="flex gap-1">
            {STATUS_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isActive = topic.status === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => handleStatusChange(opt.value)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? "bg-white/10 text-white"
                      : "text-white/30 hover:text-white/60 hover:bg-white/5"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? opt.color : ""}`} />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Resources */}
      <div className="space-y-3 mb-6">
        {resources.length === 0 && (
          <div className="text-center py-10 border border-dashed border-white/10 rounded-2xl">
            <p className="text-white/30 text-sm">Nenhum recurso ainda. Adicione vídeos ou anotações abaixo.</p>
          </div>
        )}

        {resources.map((resource) => (
          <motion.div
            key={resource.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-surface-1 border border-white/6 rounded-2xl overflow-hidden group"
          >
            {resource.type === "youtube" ? (
              // ── YouTube card ──
              <div className="flex gap-4 p-4">
                {/* Thumbnail */}
                {(() => {
                  const vid = resource.url ? getYouTubeId(resource.url) : null;
                  return vid ? (
                    <div className="relative flex-shrink-0 w-28 h-20 rounded-xl overflow-hidden bg-surface-3">
                      <img
                        src={`https://img.youtube.com/vi/${vid}/mqdefault.jpg`}
                        alt={resource.title ?? ""}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
                          <div className="w-0 h-0 border-t-[5px] border-t-transparent border-l-[8px] border-l-white border-b-[5px] border-b-transparent ml-0.5" />
                        </div>
                      </div>
                    </div>
                  ) : null;
                })()}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Youtube className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                        <span className="text-xs text-red-400 font-medium">YouTube</span>
                      </div>
                      <p className="font-medium text-white text-sm leading-snug">{resource.title}</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                      <a
                        href={resource.url ?? "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-all"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={() => handleDeleteResource(resource.id)}
                        className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <a
                    href={resource.url ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-white/30 hover:text-studies transition-colors truncate block mt-1"
                  >
                    {resource.url}
                  </a>
                </div>
              </div>
            ) : (
              // ── Note card ──
              editingNote?.id === resource.id ? (
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-studies" />
                      <span className="text-xs text-studies font-medium">{resource.title}</span>
                    </div>
                    <button onClick={() => setEditingNote(null)} className="text-white/30 hover:text-white p-1">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <textarea
                    autoFocus
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={8}
                    className="w-full bg-surface-3 border border-studies/40 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none resize-none font-mono leading-relaxed mb-3"
                  />
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setEditingNote(null)}>Cancelar</Button>
                    <Button size="sm" onClick={handleSaveEditNote} loading={savingEdit}>
                      <Save className="w-3.5 h-3.5" /> Salvar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-studies flex-shrink-0" />
                      <span className="text-xs text-studies font-medium">{resource.title}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                      <button
                        onClick={() => { setEditingNote(resource); setEditContent(resource.content ?? ""); }}
                        className="p-1.5 rounded-lg text-white/30 hover:text-studies hover:bg-studies/10 transition-all"
                      >
                        <Save className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteResource(resource.id)}
                        className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <pre className="text-sm text-white/70 whitespace-pre-wrap font-sans leading-relaxed">
                    {resource.content}
                  </pre>
                  <button
                    onClick={() => { setEditingNote(resource); setEditContent(resource.content ?? ""); }}
                    className="mt-3 text-xs text-white/25 hover:text-studies transition-colors"
                  >
                    Clique para editar
                  </button>
                </div>
              )
            )}
          </motion.div>
        ))}
      </div>

      {/* Add resource section */}
      <AnimatePresence mode="wait">
        {addMode === null ? (
          <motion.div
            key="buttons"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex gap-2 flex-wrap"
          >
            <Button variant="secondary" onClick={() => setAddMode("youtube")}>
              <Youtube className="w-4 h-4 text-red-400" /> Adicionar vídeo do YouTube
            </Button>
            <Button variant="secondary" onClick={() => setAddMode("note")}>
              <FileText className="w-4 h-4 text-studies" /> Adicionar anotação
            </Button>
          </motion.div>
        ) : addMode === "youtube" ? (
          <motion.div
            key="youtube-form"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            className="bg-surface-1 border border-white/8 rounded-2xl p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Youtube className="w-4 h-4 text-red-400" />
                <span className="font-medium text-white text-sm">Adicionar vídeo do YouTube</span>
              </div>
              <button onClick={() => { setAddMode(null); setYtUrl(""); setYtTitle(""); }} className="text-white/30 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-xs text-white/40 font-medium block mb-1.5">URL do vídeo *</label>
                <input
                  autoFocus
                  value={ytUrl}
                  onChange={(e) => setYtUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=... ou https://youtu.be/..."
                  className="w-full bg-surface-3 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-studies/50 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-white/40 font-medium block mb-1.5">Título (opcional)</label>
                <input
                  value={ytTitle}
                  onChange={(e) => setYtTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddYoutube()}
                  placeholder="Deixe em branco para usar o título padrão"
                  className="w-full bg-surface-3 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-studies/50 transition-colors"
                />
              </div>
              {ytUrl && getYouTubeId(ytUrl) && (
                <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                  <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span className="text-xs text-green-400">URL válida — ID: {getYouTubeId(ytUrl)}</span>
                </div>
              )}
              {ytUrl && !getYouTubeId(ytUrl) && (
                <div className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <X className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span className="text-xs text-red-400">URL inválida. Use um link do YouTube válido.</span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => { setAddMode(null); setYtUrl(""); setYtTitle(""); }}>Cancelar</Button>
              <Button size="sm" onClick={handleAddYoutube} loading={savingYt} disabled={!ytUrl.trim() || !getYouTubeId(ytUrl)}>
                <Plus className="w-3.5 h-3.5" /> Adicionar vídeo
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="note-form"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            className="bg-surface-1 border border-white/8 rounded-2xl p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-studies" />
                <span className="font-medium text-white text-sm">Nova anotação</span>
              </div>
              <button onClick={() => { setAddMode(null); setNoteTitle(""); setNoteContent(""); }} className="text-white/30 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-xs text-white/40 font-medium block mb-1.5">Título (opcional)</label>
                <input
                  autoFocus
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="Ex: Conceitos principais, Exemplo de código..."
                  className="w-full bg-surface-3 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-studies/50 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-white/40 font-medium block mb-1.5">Conteúdo *</label>
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Escreva suas anotações, código de exemplo, conceitos importantes..."
                  rows={8}
                  className="w-full bg-surface-3 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-studies/50 transition-colors resize-none font-mono leading-relaxed"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => { setAddMode(null); setNoteTitle(""); setNoteContent(""); }}>Cancelar</Button>
              <Button size="sm" onClick={handleAddNote} loading={savingNote} disabled={!noteContent.trim()}>
                <Save className="w-3.5 h-3.5" /> Salvar anotação
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
