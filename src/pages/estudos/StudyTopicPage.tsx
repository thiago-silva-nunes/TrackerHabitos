import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Plus, X, Youtube, FileText, Trash2,
  ExternalLink, CheckCircle2, Circle, Clock, Save,
  Code, GripVertical, ChevronDown, Play, Terminal,
} from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/Button";
import { CodeEditor } from "@/components/ui/CodeEditor";
import { StudyTopic, TopicResource, TopicStatus } from "@/types/studies";

const STATUS_OPTIONS: { value: TopicStatus; label: string; icon: React.ElementType; color: string }[] = [
  { value: "pending",     label: "Pendente",      icon: Circle,       color: "text-foreground/30" },
  { value: "in_progress", label: "Em progresso",  icon: Clock,        color: "text-studies"       },
  { value: "done",        label: "Concluído",     icon: CheckCircle2, color: "text-green-400"     },
];

const LANGUAGES = [
  { id: "javascript", label: "JavaScript" },
  { id: "typescript", label: "TypeScript" },
  { id: "python",     label: "Python"     },
  { id: "html",       label: "HTML"       },
  { id: "css",        label: "CSS"        },
  { id: "sql",        label: "SQL"        },
  { id: "bash",       label: "Bash/Shell" },
  { id: "java",       label: "Java"       },
  { id: "csharp",     label: "C#"         },
  { id: "rust",       label: "Rust"       },
  { id: "go",         label: "Go"         },
  { id: "php",        label: "PHP"        },
];

function getYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) { const m = url.match(p); if (m) return m[1]; }
  return null;
}

function runJavaScript(code: string): Promise<string[]> {
  return new Promise((resolve) => {
    const logs: string[] = [];
    const iframe = document.createElement("iframe");
    iframe.sandbox.add("allow-scripts");
    iframe.style.display = "none";
    document.body.appendChild(iframe);
    const timeout = setTimeout(() => { document.body.removeChild(iframe); resolve(logs); }, 4000);
    window.addEventListener("message", function handler(e) {
      if (e.data?.type === "log") logs.push(e.data.text);
      if (e.data?.type === "error") logs.push(`✖ ${e.data.text}`);
      if (e.data?.type === "done") {
        window.removeEventListener("message", handler);
        clearTimeout(timeout);
        document.body.removeChild(iframe);
        resolve(logs);
      }
    });
    const src = `<html><body><script>
      const _logs=[];
      const _send=(t,x)=>window.parent.postMessage({type:t,text:x},'*');
      console.log=(...a)=>{const t=a.map(x=>typeof x==='object'?JSON.stringify(x,null,2):String(x)).join(' ');_send('log',t);};
      console.error=(...a)=>{_send('error',a.map(String).join(' '));};
      window.onerror=(m,s,l)=>{_send('error',m+' (linha '+l+')');_send('done',null);return true;};
      try{${code};_send('done',null);}catch(e){_send('error',e.message);_send('done',null);}
    <\/script></body></html>`;
    iframe.srcdoc = src;
  });
}

type AddMode = "youtube" | "note" | "code" | null;

export function StudyTopicPage() {
  const { projectId, topicId } = useParams<{ projectId: string; topicId: string }>();
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const navigate = useNavigate();

  const [topic, setTopic] = useState<StudyTopic | null>(null);
  const [resources, setResources] = useState<TopicResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [addMode, setAddMode] = useState<AddMode>(null);

  // Drag state
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // YouTube form
  const [ytUrl, setYtUrl] = useState("");
  const [ytTitle, setYtTitle] = useState("");
  const [savingYt, setSavingYt] = useState(false);

  // Note form
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // Code form
  const [codeTitle, setCodeTitle] = useState("");
  const [codeLang, setCodeLang] = useState("javascript");
  const [codeContent, setCodeContent] = useState("");
  const [codeComment, setCodeComment] = useState("");
  const [savingCode, setSavingCode] = useState(false);

  // Inline code output
  const [runningCode, setRunningCode] = useState<string | null>(null);
  const [codeOutput, setCodeOutput] = useState<Record<string, string[]>>({});

  // Edit states
  const [editingResource, setEditingResource] = useState<TopicResource | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editComment, setEditComment] = useState("");
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
    } catch { toast.error("Erro ao carregar tópico"); }
    finally { setLoading(false); }
  }, [topicId, user, navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleStatusChange(status: TopicStatus) {
    if (!topic) return;
    await supabase.from("study_topics").update({ status }).eq("id", topic.id);
    setTopic((t) => t ? { ...t, status } : t);
    toast.success("Status atualizado");
  }

  async function handleAddYoutube() {
    if (!ytUrl.trim() || !user || !topicId) return;
    const vid = getYouTubeId(ytUrl.trim());
    if (!vid) { toast.error("URL inválida"); return; }
    setSavingYt(true);
    try {
      const { data, error } = await supabase.from("topic_resources").insert({
        topic_id: topicId, user_id: user.id, type: "youtube",
        title: ytTitle.trim() || "Vídeo do YouTube",
        url: `https://www.youtube.com/watch?v=${vid}`,
        content: null, sort_order: resources.length,
      }).select().single();
      if (error) throw error;
      setResources((prev) => [...prev, data]);
      setYtUrl(""); setYtTitle(""); setAddMode(null);
      toast.success("Vídeo adicionado!");
    } catch { toast.error("Erro ao adicionar vídeo"); }
    finally { setSavingYt(false); }
  }

  async function handleAddNote() {
    if (!noteContent.trim() || !user || !topicId) return;
    setSavingNote(true);
    try {
      const { data, error } = await supabase.from("topic_resources").insert({
        topic_id: topicId, user_id: user.id, type: "note",
        title: noteTitle.trim() || "Anotação",
        url: null, content: noteContent.trim(), sort_order: resources.length,
      }).select().single();
      if (error) throw error;
      setResources((prev) => [...prev, data]);
      setNoteTitle(""); setNoteContent(""); setAddMode(null);
      toast.success("Anotação salva!");
    } catch { toast.error("Erro ao salvar"); }
    finally { setSavingNote(false); }
  }

  async function handleAddCode() {
    if (!codeContent.trim() || !user || !topicId) return;
    setSavingCode(true);
    try {
      const { data, error } = await supabase.from("topic_resources").insert({
        topic_id: topicId, user_id: user.id, type: "code",
        title: codeTitle.trim() || `Código ${codeLang}`,
        url: codeLang,
        content: codeContent.trim(),
        sort_order: resources.length,
      }).select().single();
      if (error) throw error;
      setResources((prev) => [...prev, data]);
      setCodeTitle(""); setCodeContent(""); setCodeComment(""); setAddMode(null);
      toast.success("Código salvo!");
    } catch { toast.error("Erro ao salvar"); }
    finally { setSavingCode(false); }
  }

  async function handleSaveEdit() {
    if (!editingResource) return;
    setSavingEdit(true);
    try {
      const updates: Partial<TopicResource> = { content: editContent.trim() };
      // For code: store comment in a JSON content wrapper if needed, or just use content
      await supabase.from("topic_resources").update(updates).eq("id", editingResource.id);
      setResources((prev) => prev.map((r) => r.id === editingResource.id ? { ...r, ...updates } : r));
      setEditingResource(null);
      toast.success("Salvo!");
    } catch { toast.error("Erro ao salvar"); }
    finally { setSavingEdit(false); }
  }

  async function handleDeleteResource(id: string) {
    await supabase.from("topic_resources").delete().eq("id", id);
    setResources((prev) => prev.filter((r) => r.id !== id));
    toast.success("Removido");
  }

  async function handleRunCode(resource: TopicResource) {
    if (resource.url !== "javascript") {
      toast.error("Execução disponível apenas para JavaScript");
      return;
    }
    setRunningCode(resource.id);
    const logs = await runJavaScript(resource.content ?? "");
    setCodeOutput((prev) => ({ ...prev, [resource.id]: logs }));
    setRunningCode(null);
  }

  // Drag to reorder
  function onDragStart(index: number) { setDragIndex(index); }
  function onDragOver(e: React.DragEvent, index: number) { e.preventDefault(); setDragOverIndex(index); }

  async function onDrop(dropIndex: number) {
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null); setDragOverIndex(null); return;
    }
    const reordered = [...resources];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(dropIndex, 0, moved);
    const withOrder = reordered.map((r, i) => ({ ...r, sort_order: i }));
    setResources(withOrder);
    setDragIndex(null); setDragOverIndex(null);
    await Promise.all(withOrder.map((r, i) =>
      supabase.from("topic_resources").update({ sort_order: i }).eq("id", r.id)
    ));
  }

  // Tab key in textareas
  function handleTabKey(e: React.KeyboardEvent<HTMLTextAreaElement>, setter: (v: string) => void) {
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = e.currentTarget;
      const s = ta.selectionStart, end = ta.selectionEnd;
      const v = ta.value;
      setter(v.substring(0, s) + "  " + v.substring(end));
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s + 2; });
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

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <button onClick={() => navigate(`/estudos/${projectId}`)} className="flex items-center gap-1.5 text-sm text-foreground/40 hover:text-foreground/70 transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> Voltar ao projeto
        </button>
        <h1 className="text-xl font-bold text-foreground leading-snug">{topic.title}</h1>

        {/* Status */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <span className="text-xs text-foreground/30">Status:</span>
          <div className="flex gap-1">
            {STATUS_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isActive = topic.status === opt.value;
              return (
                <button key={opt.value} onClick={() => handleStatusChange(opt.value)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${isActive ? "bg-foreground/10 text-foreground" : "text-foreground/30 hover:text-foreground/60 hover:bg-foreground/5"}`}>
                  <Icon className={`w-3.5 h-3.5 ${isActive ? opt.color : ""}`} />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
        {resources.length > 1 && (
          <p className="text-xs text-foreground/25 mt-2 flex items-center gap-1">
            <GripVertical className="w-3 h-3" /> Arraste os cards para reordenar
          </p>
        )}
      </motion.div>

      {/* Resources list */}
      <div className="space-y-3 mb-6">
        {resources.length === 0 && (
          <div className="text-center py-10 border border-dashed border-foreground/10 rounded-2xl">
            <p className="text-foreground/30 text-sm">Nenhum recurso ainda. Adicione vídeos, anotações ou código abaixo.</p>
          </div>
        )}

        {resources.map((resource, index) => {
          const isDragging = dragIndex === index;
          const isDragOver = dragOverIndex === index;

          return (
            <div
              key={resource.id}
              draggable
              onDragStart={() => onDragStart(index)}
              onDragOver={(e) => onDragOver(e, index)}
              onDrop={() => onDrop(index)}
              onDragEnd={() => { setDragIndex(null); setDragOverIndex(null); }}
              className={`bg-surface-1 border rounded-2xl overflow-hidden group transition-all ${
                isDragOver ? "border-studies/50 ring-1 ring-studies/20" :
                isDragging ? "border-foreground/20 opacity-40" :
                "border-foreground/6"
              }`}
            >
              {/* Drag handle */}
              <div className="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-grab">
                <GripVertical className="w-4 h-4 text-foreground/30" />
              </div>

              {/* ── YouTube ── */}
              {resource.type === "youtube" && (
                <div className="flex gap-4 p-4">
                  {(() => {
                    const vid = resource.url ? getYouTubeId(resource.url) : null;
                    return vid ? (
                      <div className="relative flex-shrink-0 w-28 h-20 rounded-xl overflow-hidden bg-surface-3">
                        <img src={`https://img.youtube.com/vi/${vid}/mqdefault.jpg`} alt="" className="w-full h-full object-cover" />
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
                          <Youtube className="w-3.5 h-3.5 text-red-400" />
                          <span className="text-xs text-red-400 font-medium">YouTube</span>
                        </div>
                        <p className="font-medium text-foreground text-sm">{resource.title}</p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                        <a href={resource.url ?? "#"} target="_blank" rel="noopener noreferrer"
                          className="p-1.5 rounded-lg text-foreground/30 hover:text-foreground hover:bg-foreground/10 transition-all">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <button onClick={() => handleDeleteResource(resource.id)}
                          className="p-1.5 rounded-lg text-foreground/30 hover:text-red-400 hover:bg-red-500/10 transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <a href={resource.url ?? "#"} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-foreground/30 hover:text-studies transition-colors truncate block mt-1">
                      {resource.url}
                    </a>
                  </div>
                </div>
              )}

              {/* ── Note ── */}
              {resource.type === "note" && (
                editingResource?.id === resource.id ? (
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-studies" />
                        <span className="text-xs text-studies font-medium">{resource.title}</span>
                      </div>
                      <button onClick={() => setEditingResource(null)} className="text-foreground/30 hover:text-foreground p-1"><X className="w-3.5 h-3.5" /></button>
                    </div>
                    <textarea autoFocus value={editContent} onChange={(e) => setEditContent(e.target.value)}
                      rows={8} className="w-full bg-surface-3 border border-studies/40 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder-foreground/25 outline-none resize-none font-mono leading-relaxed mb-3" />
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" onClick={() => setEditingResource(null)}>Cancelar</Button>
                      <Button size="sm" onClick={handleSaveEdit} loading={savingEdit}><Save className="w-3.5 h-3.5" /> Salvar</Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-studies" />
                        <span className="text-xs text-studies font-medium">{resource.title}</span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                        <button onClick={() => { setEditingResource(resource); setEditContent(resource.content ?? ""); }}
                          className="p-1.5 rounded-lg text-foreground/30 hover:text-studies hover:bg-studies/10 transition-all">
                          <Save className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeleteResource(resource.id)}
                          className="p-1.5 rounded-lg text-foreground/30 hover:text-red-400 hover:bg-red-500/10 transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <pre className="text-sm text-foreground/70 whitespace-pre-wrap font-sans leading-relaxed">{resource.content}</pre>
                    <button onClick={() => { setEditingResource(resource); setEditContent(resource.content ?? ""); }}
                      className="mt-3 text-xs text-foreground/25 hover:text-studies transition-colors">Clique para editar</button>
                  </div>
                )
              )}

              {/* ── Code block ── */}
              {resource.type === "code" && (
                <div>
                  <div className={`flex items-center justify-between px-4 py-2.5 border-b border-foreground/6 ${isDark ? "bg-[#0d0d14]" : "bg-[#e8e8f4]"}`}>
                    <div className="flex items-center gap-2">
                      <Code className="w-3.5 h-3.5 text-studies" />
                      <span className="text-xs text-studies font-medium">{resource.title}</span>
                      <span className="text-[10px] bg-foreground/10 text-foreground/40 px-1.5 py-0.5 rounded font-mono uppercase">
                        {resource.url}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      {resource.url === "javascript" && (
                        <button onClick={() => handleRunCode(resource)}
                          disabled={runningCode === resource.id}
                          className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-all">
                          {runningCode === resource.id ? <span className="w-3 h-3 border border-green-400 border-t-transparent rounded-full animate-spin" /> : <Play className="w-3 h-3" />}
                          Executar
                        </button>
                      )}
                      {editingResource?.id === resource.id ? null : (
                        <button onClick={() => { setEditingResource(resource); setEditContent(resource.content ?? ""); }}
                          className="p-1.5 rounded text-foreground/30 hover:text-studies hover:bg-studies/10 transition-all">
                          <Save className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button onClick={() => handleDeleteResource(resource.id)}
                        className="p-1.5 rounded text-foreground/30 hover:text-red-400 hover:bg-red-500/10 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {editingResource?.id === resource.id ? (
                    <div>
                      <CodeEditor
                        autoFocus
                        value={editContent}
                        onChange={setEditContent}
                        language={resource.url ?? "javascript"}
                        onKeyDown={(e) => handleTabKey(e, setEditContent)}
                        autoHeight
                        minLines={10}
                        maxLines={30}
                      />
                      <div className="flex gap-2 p-3 border-t border-foreground/6">
                        <Button variant="secondary" size="sm" onClick={() => setEditingResource(null)}>Cancelar</Button>
                        <Button size="sm" onClick={handleSaveEdit} loading={savingEdit}><Save className="w-3.5 h-3.5" /> Salvar</Button>
                      </div>
                    </div>
                  ) : (
                    <CodeEditor
                      value={resource.content ?? ""}
                      language={resource.url ?? "javascript"}
                      readOnly
                      autoHeight
                      minLines={3}
                      maxLines={30}
                      onClick={() => { setEditingResource(resource); setEditContent(resource.content ?? ""); }}
                    />
                  )}

                  {/* Code output */}
                  {codeOutput[resource.id] && (
                    <div className={`border-t border-foreground/10 px-4 py-3 ${isDark ? "bg-[#111118]" : "bg-[#e0e0ec]"}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Terminal className="w-3.5 h-3.5 text-green-400" />
                        <span className="text-xs text-green-400 font-medium">Saída</span>
                      </div>
                      <div className="space-y-1">
                        {codeOutput[resource.id].length === 0
                          ? <p className="text-xs text-foreground/30 font-mono">Nenhuma saída</p>
                          : codeOutput[resource.id].map((line, i) => (
                            <pre key={i} className={`text-xs font-mono ${line.startsWith("✖") ? "text-red-400" : "text-[#c8c8d8]"}`}>{line}</pre>
                          ))
                        }
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add resource buttons */}
      <AnimatePresence mode="wait">
        {addMode === null && (
          <motion.div key="buttons" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex gap-2 flex-wrap">
            <Button variant="secondary" onClick={() => setAddMode("youtube")}>
              <Youtube className="w-4 h-4 text-red-400" /> Vídeo YouTube
            </Button>
            <Button variant="secondary" onClick={() => setAddMode("note")}>
              <FileText className="w-4 h-4 text-studies" /> Anotação
            </Button>
            <Button variant="secondary" onClick={() => setAddMode("code")}>
              <Code className="w-4 h-4 text-green-400" /> Bloco de Código
            </Button>
          </motion.div>
        )}

        {/* ── YouTube form ── */}
        {addMode === "youtube" && (
          <motion.div key="yt" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            className="bg-surface-1 border border-foreground/8 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2"><Youtube className="w-4 h-4 text-red-400" /><span className="font-medium text-foreground text-sm">Adicionar vídeo do YouTube</span></div>
              <button onClick={() => { setAddMode(null); setYtUrl(""); setYtTitle(""); }} className="text-foreground/30 hover:text-foreground p-1"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-xs text-foreground/40 font-medium block mb-1.5">URL do vídeo *</label>
                <input autoFocus value={ytUrl} onChange={(e) => setYtUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full bg-surface-3 border border-foreground/8 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder-foreground/25 outline-none focus:border-studies/50 transition-colors" />
              </div>
              <div>
                <label className="text-xs text-foreground/40 font-medium block mb-1.5">Título (opcional)</label>
                <input value={ytTitle} onChange={(e) => setYtTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddYoutube()}
                  placeholder="Título do vídeo..."
                  className="w-full bg-surface-3 border border-foreground/8 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder-foreground/25 outline-none focus:border-studies/50 transition-colors" />
              </div>
              {ytUrl && getYouTubeId(ytUrl) && (
                <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <span className="text-xs text-green-400">URL válida</span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => { setAddMode(null); setYtUrl(""); setYtTitle(""); }}>Cancelar</Button>
              <Button size="sm" onClick={handleAddYoutube} loading={savingYt} disabled={!ytUrl.trim() || !getYouTubeId(ytUrl)}>
                <Plus className="w-3.5 h-3.5" /> Adicionar
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── Note form ── */}
        {addMode === "note" && (
          <motion.div key="note" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            className="bg-surface-1 border border-foreground/8 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-studies" /><span className="font-medium text-foreground text-sm">Nova anotação</span></div>
              <button onClick={() => { setAddMode(null); setNoteTitle(""); setNoteContent(""); }} className="text-foreground/30 hover:text-foreground p-1"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3 mb-4">
              <input autoFocus value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} placeholder="Título (opcional)"
                className="w-full bg-surface-3 border border-foreground/8 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder-foreground/25 outline-none focus:border-studies/50 transition-colors" />
              <textarea value={noteContent} onChange={(e) => setNoteContent(e.target.value)} rows={8}
                placeholder="Escreva suas anotações, conceitos, exemplos..."
                className="w-full bg-surface-3 border border-foreground/8 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder-foreground/25 outline-none focus:border-studies/50 transition-colors resize-none font-mono leading-relaxed" />
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => { setAddMode(null); setNoteTitle(""); setNoteContent(""); }}>Cancelar</Button>
              <Button size="sm" onClick={handleAddNote} loading={savingNote} disabled={!noteContent.trim()}>
                <Save className="w-3.5 h-3.5" /> Salvar
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── Code form ── */}
        {addMode === "code" && (
          <motion.div key="code" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            className="bg-surface-1 border border-foreground/8 rounded-2xl overflow-hidden">
            {/* Code form header */}
            <div className={`flex items-center justify-between px-4 py-3 border-b border-foreground/8 ${isDark ? "bg-[#0d0d14]" : "bg-[#e8e8f4]"}`}>
              <div className="flex items-center gap-3">
                <Code className="w-4 h-4 text-green-400" />
                <input value={codeTitle} onChange={(e) => setCodeTitle(e.target.value)} placeholder="Título do bloco..."
                  className="bg-transparent text-foreground text-sm outline-none placeholder-foreground/30 w-40" />
                <select value={codeLang} onChange={(e) => setCodeLang(e.target.value)}
                  className="bg-surface-3 border border-foreground/10 rounded-lg px-2 py-1 text-xs text-foreground/70 outline-none cursor-pointer">
                  {LANGUAGES.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
                </select>
              </div>
              <button onClick={() => { setAddMode(null); setCodeContent(""); setCodeTitle(""); }} className="text-foreground/30 hover:text-foreground p-1"><X className="w-4 h-4" /></button>
            </div>

            {/* Editor */}
            <CodeEditor
              autoFocus
              value={codeContent}
              onChange={setCodeContent}
              language={codeLang}
              onKeyDown={(e) => handleTabKey(e, setCodeContent)}
              placeholder={`// Escreva seu ${LANGUAGES.find(l => l.id === codeLang)?.label ?? "código"} aqui...`}
              autoHeight
              minLines={10}
              maxLines={30}
            />

            {/* Comment/notes below code */}
            <div className="p-4 border-t border-foreground/6">
              <label className="text-xs text-foreground/40 font-medium block mb-1.5">Comentário / explicação (opcional)</label>
              <textarea value={codeComment} onChange={(e) => setCodeComment(e.target.value)} rows={3}
                placeholder="Anote o que este código faz, por que é importante, quando usar..."
                className="w-full bg-surface-3 border border-foreground/8 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder-foreground/25 outline-none focus:border-studies/50 transition-colors resize-none mb-3" />
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => { setAddMode(null); setCodeContent(""); setCodeTitle(""); }}>Cancelar</Button>
                <Button size="sm" onClick={handleAddCode} loading={savingCode} disabled={!codeContent.trim()}>
                  <Save className="w-3.5 h-3.5" /> Salvar bloco
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
