import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Plus, X, Youtube, FileText, Trash2,
  ExternalLink, CheckCircle2, Circle, Clock, Save,
  Code, GripVertical, Play, Terminal, MonitorPlay,
  PanelRight, ChevronDown, ChevronUp,
} from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/Button";
import { CodeEditor } from "@/components/ui/CodeEditor";
import { StudyTopic, TopicResource, TopicStatus } from "@/types/studies";

const STATUS_OPTIONS: { value: TopicStatus; label: string; icon: React.ElementType; color: string }[] = [
  { value: "pending",     label: "Pendente",      icon: Circle,       color: "text-foreground/60" },
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
    /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,
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

  // ── Workspace panel state ──
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [panelResource, setPanelResource] = useState<TopicResource | null>(null);
  const [panelContent, setPanelContent] = useState("");
  const [panelSaving, setPanelSaving] = useState(false);
  const [panelDirty, setPanelDirty] = useState(false);

  // Resource list collapsed on mobile
  const [listCollapsed, setListCollapsed] = useState(false);

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
      const list: TopicResource[] = resourcesRes.data ?? [];
      setResources(list);

      // Auto-select first video and first editor resource
      const firstVid = list.find((r) => r.type === "youtube");
      const firstEd = list.find((r) => r.type === "note" || r.type === "code");
      if (firstVid) setActiveVideoId((prev) => prev ?? firstVid.id);
      if (firstEd) {
        setPanelResource((prev) => prev ?? firstEd);
        setPanelContent((prev) => prev || (firstEd.content ?? ""));
      }
    } catch { toast.error("Erro ao carregar tópico"); }
    finally { setLoading(false); }
  }, [topicId, user, navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function openInPanel(resource: TopicResource) {
    if (panelDirty) {
      if (!confirm("Há alterações não salvas. Descartar e abrir outro recurso?")) return;
    }
    setPanelResource(resource);
    setPanelContent(resource.content ?? "");
    setPanelDirty(false);
  }

  async function handleStatusChange(status: TopicStatus) {
    if (!topic) return;
    await supabase.from("study_topics").update({ status }).eq("id", topic.id);
    setTopic((t) => t ? { ...t, status } : t);
    toast.success("Status atualizado");
  }

  async function handlePanelSave() {
    if (!panelResource || !panelDirty) return;
    setPanelSaving(true);
    try {
      await supabase.from("topic_resources").update({ content: panelContent.trim() }).eq("id", panelResource.id);
      setResources((prev) => prev.map((r) => r.id === panelResource.id ? { ...r, content: panelContent.trim() } : r));
      setPanelResource((prev) => prev ? { ...prev, content: panelContent.trim() } : null);
      setPanelDirty(false);
      toast.success("Salvo!");
    } catch { toast.error("Erro ao salvar"); }
    finally { setPanelSaving(false); }
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
      setActiveVideoId(data.id);
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
      openInPanel(data);
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
      openInPanel(data);
      setCodeTitle(""); setCodeContent(""); setCodeComment(""); setAddMode(null);
      toast.success("Código salvo!");
    } catch { toast.error("Erro ao salvar"); }
    finally { setSavingCode(false); }
  }

  async function handleDeleteResource(id: string) {
    await supabase.from("topic_resources").delete().eq("id", id);
    setResources((prev) => prev.filter((r) => r.id !== id));
    if (activeVideoId === id) setActiveVideoId(null);
    if (panelResource?.id === id) { setPanelResource(null); setPanelContent(""); setPanelDirty(false); }
    toast.success("Removido");
  }

  async function handleRunCode(resource: TopicResource) {
    if (resource.url !== "javascript") {
      toast.error("Execução disponível apenas para JavaScript");
      return;
    }
    setRunningCode(resource.id);
    const content = panelResource?.id === resource.id ? panelContent : (resource.content ?? "");
    const logs = await runJavaScript(content);
    setCodeOutput((prev) => ({ ...prev, [resource.id]: logs }));
    setRunningCode(null);
  }

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

  // ── Active video resource ──
  const activeVideo = resources.find((r) => r.id === activeVideoId) ?? null;
  const activeVideoYtId = activeVideo?.url ? getYouTubeId(activeVideo.url) : null;

  if (loading) {
    return (
      <div className="px-4 sm:px-6 py-8 space-y-4 max-w-7xl">
        <div className="h-6 w-32 rounded-lg skeleton" />
        <div className="h-8 w-64 rounded-xl skeleton" />
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          <div className="h-80 rounded-2xl skeleton" />
          <div className="h-80 rounded-2xl skeleton" />
        </div>
        {[...Array(3)].map((_, i) => <div key={i} className="h-14 rounded-xl skeleton" />)}
      </div>
    );
  }
  if (!topic) return null;

  const currentStatus = STATUS_OPTIONS.find((s) => s.value === topic.status)!;
  const StatusIcon = currentStatus.icon;

  return (
    <div className="px-4 sm:px-6 py-6 max-w-[1600px]">

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
        <button onClick={() => navigate(`/estudos/${projectId}`)}
          className="flex items-center gap-1.5 text-sm text-foreground/60 hover:text-foreground transition-colors mb-3">
          <ArrowLeft className="w-4 h-4" /> Voltar ao projeto
        </button>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <h1 className="text-lg font-bold text-foreground leading-snug">{topic.title}</h1>

          {/* Status selector */}
          <div className="flex items-center gap-1 bg-surface-2 rounded-xl p-1">
            {STATUS_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isActive = topic.status === opt.value;
              return (
                <button key={opt.value} onClick={() => handleStatusChange(opt.value)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive ? "bg-surface-3 text-foreground shadow-sm" : "text-foreground/55 hover:text-foreground"
                  }`}>
                  <Icon className={`w-3.5 h-3.5 ${isActive ? opt.color : ""}`} />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* ── Workspace: split panels ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 mb-4">

        {/* LEFT — Video player */}
        <div className={`flex flex-col border rounded-2xl overflow-hidden ${isDark ? "bg-[#0c0c14] border-foreground/8" : "bg-[#f0f0f8] border-foreground/10"}`}
          style={{ minHeight: "380px" }}>
          {/* Panel header */}
          <div className={`flex items-center justify-between px-4 py-2.5 border-b ${isDark ? "border-foreground/6 bg-[#0e0e18]" : "border-foreground/8 bg-[#e8e8f4]"}`}>
            <div className="flex items-center gap-2">
              <MonitorPlay className="w-4 h-4 text-red-400" />
              <span className="text-xs font-semibold text-foreground/80">
                {activeVideo ? activeVideo.title : "Vídeo"}
              </span>
              {activeVideo && (
                <a href={activeVideo.url ?? "#"} target="_blank" rel="noopener noreferrer"
                  className="text-foreground/40 hover:text-foreground/70 transition-colors">
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            {resources.filter((r) => r.type === "youtube").length > 1 && (
              <span className="text-[10px] text-foreground/40">
                {resources.filter((r) => r.type === "youtube").findIndex((r) => r.id === activeVideoId) + 1} /
                {resources.filter((r) => r.type === "youtube").length}
              </span>
            )}
          </div>

          {/* Video area */}
          <div className="flex-1 flex items-center justify-center">
            {activeVideoYtId ? (
              <iframe
                key={activeVideoYtId}
                src={`https://www.youtube-nocookie.com/embed/${activeVideoYtId}?rel=0`}
                title={activeVideo?.title ?? "Vídeo"}
                className="w-full h-full border-0"
                style={{ minHeight: "340px" }}
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : (
              <div className="flex flex-col items-center gap-3 py-12 px-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
                  <Youtube className="w-7 h-7 text-red-400/60" />
                </div>
                <p className="text-sm text-foreground/50">Nenhum vídeo selecionado</p>
                <p className="text-xs text-foreground/35">
                  Adicione um vídeo do YouTube na lista abaixo e clique em <strong>Ver</strong> para exibir aqui.
                </p>
                <button onClick={() => setAddMode("youtube")}
                  className="mt-1 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all">
                  <Plus className="w-3.5 h-3.5" /> Adicionar vídeo
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — Notes / Code editor */}
        <div className={`flex flex-col border rounded-2xl overflow-hidden ${isDark ? "bg-surface-1 border-foreground/8" : "bg-surface-1 border-foreground/10"}`}
          style={{ minHeight: "380px" }}>
          {/* Panel header */}
          <div className={`flex items-center justify-between px-4 py-2.5 border-b flex-shrink-0 ${isDark ? "border-foreground/6 bg-[#0e0e18]" : "border-foreground/8 bg-[#e8e8f4]"}`}>
            <div className="flex items-center gap-2 min-w-0">
              <PanelRight className="w-4 h-4 text-studies flex-shrink-0" />
              {panelResource ? (
                <>
                  {panelResource.type === "note"
                    ? <FileText className="w-3.5 h-3.5 text-studies flex-shrink-0" />
                    : <Code className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />}
                  <span className="text-xs font-semibold text-foreground/80 truncate">{panelResource.title}</span>
                  {panelResource.type === "code" && (
                    <span className="text-[10px] bg-foreground/10 text-foreground/50 px-1.5 py-0.5 rounded font-mono uppercase flex-shrink-0">
                      {panelResource.url}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-xs font-semibold text-foreground/50">Anotações / Código</span>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {panelResource?.type === "code" && panelResource.url === "javascript" && (
                <button onClick={() => handleRunCode(panelResource)}
                  disabled={runningCode === panelResource.id}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-all">
                  {runningCode === panelResource.id
                    ? <span className="w-3 h-3 border border-green-400 border-t-transparent rounded-full animate-spin" />
                    : <Play className="w-3 h-3" />}
                  Executar
                </button>
              )}
              {panelDirty && (
                <button onClick={handlePanelSave} disabled={panelSaving}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-studies/15 text-studies hover:bg-studies/25 transition-all">
                  {panelSaving
                    ? <span className="w-3 h-3 border border-studies border-t-transparent rounded-full animate-spin" />
                    : <Save className="w-3 h-3" />}
                  Salvar
                </button>
              )}
            </div>
          </div>

          {/* Editor area */}
          <div className="flex-1 overflow-auto">
            {panelResource ? (
              panelResource.type === "note" ? (
                <textarea
                  value={panelContent}
                  onChange={(e) => { setPanelContent(e.target.value); setPanelDirty(true); }}
                  onKeyDown={(e) => handleTabKey(e, (v) => { setPanelContent(v); setPanelDirty(true); })}
                  placeholder="Escreva suas anotações aqui..."
                  className="w-full h-full min-h-[340px] bg-transparent px-4 py-3 text-sm text-foreground placeholder-foreground/25 outline-none resize-none font-mono leading-relaxed"
                />
              ) : (
                <div className="flex flex-col h-full">
                  <CodeEditor
                    value={panelContent}
                    onChange={(v) => { setPanelContent(v); setPanelDirty(true); }}
                    language={panelResource.url ?? "javascript"}
                    autoHeight
                    minLines={14}
                    maxLines={40}
                  />
                  {/* Code output */}
                  {codeOutput[panelResource.id] && (
                    <div className={`border-t border-foreground/10 px-4 py-3 flex-shrink-0 ${isDark ? "bg-[#111118]" : "bg-[#e0e0ec]"}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Terminal className="w-3.5 h-3.5 text-green-400" />
                        <span className="text-xs text-green-400 font-medium">Saída</span>
                        <button onClick={() => setCodeOutput((p) => { const n = {...p}; delete n[panelResource.id]; return n; })}
                          className="ml-auto text-foreground/40 hover:text-foreground/70 transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="space-y-0.5">
                        {codeOutput[panelResource.id].length === 0
                          ? <p className="text-xs text-foreground/60 font-mono">Nenhuma saída</p>
                          : codeOutput[panelResource.id].map((line, i) => (
                            <pre key={i} className={`text-xs font-mono ${line.startsWith("✖") ? "text-red-400" : "text-[#c8c8d8]"}`}>{line}</pre>
                          ))
                        }
                      </div>
                    </div>
                  )}
                </div>
              )
            ) : (
              <div className="flex flex-col items-center gap-3 py-12 px-6 text-center h-full justify-center">
                <div className="w-14 h-14 rounded-2xl bg-studies/10 flex items-center justify-center">
                  <FileText className="w-7 h-7 text-studies/50" />
                </div>
                <p className="text-sm text-foreground/50">Nenhum recurso aberto</p>
                <p className="text-xs text-foreground/35">
                  Clique em <strong>Editar</strong> em uma anotação ou bloco de código abaixo para abrir aqui.
                </p>
                <div className="flex gap-2 mt-1">
                  <button onClick={() => setAddMode("note")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-studies/10 text-studies hover:bg-studies/20 transition-all">
                    <Plus className="w-3.5 h-3.5" /> Anotação
                  </button>
                  <button onClick={() => setAddMode("code")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-all">
                    <Plus className="w-3.5 h-3.5" /> Código
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Resource list ── */}
      <div className="mb-4">
        {/* List header */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setListCollapsed((v) => !v)}
            className="flex items-center gap-2 text-sm font-semibold text-foreground/80 hover:text-foreground transition-colors">
            {listCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            Recursos
            <span className="text-xs font-normal text-foreground/45 bg-foreground/6 px-1.5 py-0.5 rounded-md">
              {resources.length}
            </span>
          </button>

          {/* Add buttons */}
          {addMode === null && (
            <div className="flex gap-1.5">
              <button onClick={() => setAddMode("youtube")}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-foreground/5 text-foreground/70 hover:bg-red-500/10 hover:text-red-400 transition-all border border-foreground/6">
                <Youtube className="w-3.5 h-3.5" /> Vídeo
              </button>
              <button onClick={() => setAddMode("note")}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-foreground/5 text-foreground/70 hover:bg-studies/10 hover:text-studies transition-all border border-foreground/6">
                <FileText className="w-3.5 h-3.5" /> Anotação
              </button>
              <button onClick={() => setAddMode("code")}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-foreground/5 text-foreground/70 hover:bg-green-500/10 hover:text-green-400 transition-all border border-foreground/6">
                <Code className="w-3.5 h-3.5" /> Código
              </button>
            </div>
          )}
        </div>

        {/* Add forms */}
        <AnimatePresence mode="wait">
          {addMode === "youtube" && (
            <motion.div key="yt" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              className="bg-surface-1 border border-foreground/8 rounded-2xl p-4 mb-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Youtube className="w-4 h-4 text-red-400" />
                  <span className="font-medium text-foreground text-sm">Adicionar vídeo do YouTube</span>
                </div>
                <button onClick={() => { setAddMode(null); setYtUrl(""); setYtTitle(""); }}
                  className="text-foreground/50 hover:text-foreground p-1"><X className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-xs text-foreground/60 font-medium block mb-1.5">URL do vídeo *</label>
                  <input autoFocus value={ytUrl} onChange={(e) => setYtUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full bg-surface-3 border border-foreground/8 rounded-xl px-3 py-2 text-sm text-foreground placeholder-foreground/25 outline-none focus:border-studies/50 transition-colors" />
                </div>
                <div>
                  <label className="text-xs text-foreground/60 font-medium block mb-1.5">Título (opcional)</label>
                  <input value={ytTitle} onChange={(e) => setYtTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddYoutube()}
                    placeholder="Título do vídeo..."
                    className="w-full bg-surface-3 border border-foreground/8 rounded-xl px-3 py-2 text-sm text-foreground placeholder-foreground/25 outline-none focus:border-studies/50 transition-colors" />
                </div>
              </div>
              {ytUrl && getYouTubeId(ytUrl) && (
                <div className="flex items-center gap-2 p-2.5 bg-green-500/10 border border-green-500/20 rounded-xl mb-3">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-xs text-green-400">URL válida</span>
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => { setAddMode(null); setYtUrl(""); setYtTitle(""); }}>Cancelar</Button>
                <Button size="sm" onClick={handleAddYoutube} loading={savingYt} disabled={!ytUrl.trim() || !getYouTubeId(ytUrl)}>
                  <Plus className="w-3.5 h-3.5" /> Adicionar
                </Button>
              </div>
            </motion.div>
          )}

          {addMode === "note" && (
            <motion.div key="note" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              className="bg-surface-1 border border-foreground/8 rounded-2xl p-4 mb-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-studies" />
                  <span className="font-medium text-foreground text-sm">Nova anotação</span>
                </div>
                <button onClick={() => { setAddMode(null); setNoteTitle(""); setNoteContent(""); }}
                  className="text-foreground/50 hover:text-foreground p-1"><X className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <input autoFocus value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="Título (opcional)"
                  className="w-full bg-surface-3 border border-foreground/8 rounded-xl px-3 py-2 text-sm text-foreground placeholder-foreground/25 outline-none focus:border-studies/50 transition-colors" />
                <div className="text-xs text-foreground/40 flex items-center">
                  A anotação abrirá no painel direito para edição completa
                </div>
              </div>
              <textarea value={noteContent} onChange={(e) => setNoteContent(e.target.value)} rows={4}
                placeholder="Escreva suas anotações, conceitos, exemplos..."
                className="w-full bg-surface-3 border border-foreground/8 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder-foreground/25 outline-none focus:border-studies/50 transition-colors resize-none font-mono leading-relaxed mb-3" />
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => { setAddMode(null); setNoteTitle(""); setNoteContent(""); }}>Cancelar</Button>
                <Button size="sm" onClick={handleAddNote} loading={savingNote} disabled={!noteContent.trim()}>
                  <Save className="w-3.5 h-3.5" /> Salvar e abrir
                </Button>
              </div>
            </motion.div>
          )}

          {addMode === "code" && (
            <motion.div key="code" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              className="bg-surface-1 border border-foreground/8 rounded-2xl overflow-hidden mb-3">
              <div className={`flex items-center justify-between px-4 py-2.5 border-b border-foreground/8 ${isDark ? "bg-[#0d0d14]" : "bg-[#e8e8f4]"}`}>
                <div className="flex items-center gap-3">
                  <Code className="w-4 h-4 text-green-400" />
                  <input value={codeTitle} onChange={(e) => setCodeTitle(e.target.value)}
                    placeholder="Título do bloco..."
                    className="bg-transparent text-foreground text-sm outline-none placeholder-foreground/30 w-36" />
                  <select value={codeLang} onChange={(e) => setCodeLang(e.target.value)}
                    className="bg-surface-3 border border-foreground/10 rounded-lg px-2 py-1 text-xs text-foreground/70 outline-none cursor-pointer">
                    {LANGUAGES.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
                  </select>
                </div>
                <button onClick={() => { setAddMode(null); setCodeContent(""); setCodeTitle(""); }}
                  className="text-foreground/50 hover:text-foreground p-1"><X className="w-4 h-4" /></button>
              </div>
              <CodeEditor autoFocus value={codeContent} onChange={setCodeContent} language={codeLang}
                placeholder={`// Escreva seu ${LANGUAGES.find(l => l.id === codeLang)?.label ?? "código"} aqui...`}
                autoHeight minLines={8} maxLines={20} />
              <div className="p-4 border-t border-foreground/6">
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => { setAddMode(null); setCodeContent(""); setCodeTitle(""); }}>Cancelar</Button>
                  <Button size="sm" onClick={handleAddCode} loading={savingCode} disabled={!codeContent.trim()}>
                    <Save className="w-3.5 h-3.5" /> Salvar e abrir
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Resource cards list */}
        {!listCollapsed && (
          <div className="space-y-1.5">
            {resources.length === 0 && addMode === null && (
              <div className="text-center py-8 border border-dashed border-foreground/10 rounded-2xl">
                <p className="text-foreground/50 text-sm">
                  Nenhum recurso ainda. Adicione vídeos, anotações ou código acima.
                </p>
              </div>
            )}

            {resources.map((resource, index) => {
              const isDragging = dragIndex === index;
              const isDragOver = dragOverIndex === index;
              const isActiveVideo = resource.id === activeVideoId;
              const isActivePanel = resource.id === panelResource?.id;

              return (
                <div
                  key={resource.id}
                  draggable
                  onDragStart={() => onDragStart(index)}
                  onDragOver={(e) => onDragOver(e, index)}
                  onDrop={() => onDrop(index)}
                  onDragEnd={() => { setDragIndex(null); setDragOverIndex(null); }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border group transition-all cursor-default ${
                    isDragOver ? "border-studies/40 bg-studies/5 ring-1 ring-studies/20" :
                    isDragging ? "opacity-40 border-foreground/15" :
                    isActiveVideo || isActivePanel
                      ? "border-studies/25 bg-studies/5"
                      : "border-foreground/6 bg-surface-1 hover:border-foreground/15 hover:bg-foreground/[0.02]"
                  }`}
                >
                  {/* Drag handle */}
                  <GripVertical className="w-4 h-4 text-foreground/25 cursor-grab flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />

                  {/* Type icon */}
                  <div className="flex-shrink-0">
                    {resource.type === "youtube" && <Youtube className="w-4 h-4 text-red-400" />}
                    {resource.type === "note" && <FileText className="w-4 h-4 text-studies" />}
                    {resource.type === "code" && <Code className="w-4 h-4 text-green-400" />}
                  </div>

                  {/* Title + meta */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground/85 truncate font-medium">{resource.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-foreground/40 uppercase font-mono">
                        {resource.type === "youtube" ? "YouTube" : resource.type === "note" ? "Nota" : (resource.url ?? "código")}
                      </span>
                      {isActiveVideo && (
                        <span className="text-[10px] text-red-400 bg-red-500/10 px-1.5 rounded font-medium">► ao vivo</span>
                      )}
                      {isActivePanel && (
                        <span className="text-[10px] text-studies bg-studies/10 px-1.5 rounded font-medium">
                          {panelDirty ? "✎ editando*" : "✎ aberto"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {resource.type === "youtube" && (
                      <button
                        onClick={() => setActiveVideoId(resource.id)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                          isActiveVideo
                            ? "bg-red-500/15 text-red-400"
                            : "bg-foreground/5 text-foreground/60 hover:bg-red-500/10 hover:text-red-400"
                        }`}>
                        <Play className="w-3 h-3" />
                        Ver
                      </button>
                    )}
                    {(resource.type === "note" || resource.type === "code") && (
                      <button
                        onClick={() => openInPanel(resource)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                          isActivePanel
                            ? "bg-studies/15 text-studies"
                            : "bg-foreground/5 text-foreground/60 hover:bg-studies/10 hover:text-studies"
                        }`}>
                        <PanelRight className="w-3 h-3" />
                        Editar
                      </button>
                    )}
                    {resource.type === "youtube" && (
                      <a href={resource.url ?? "#"} target="_blank" rel="noopener noreferrer"
                        className="p-1.5 rounded-lg text-foreground/40 hover:text-foreground/70 hover:bg-foreground/8 transition-all opacity-0 group-hover:opacity-100">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button onClick={() => handleDeleteResource(resource.id)}
                      className="p-1.5 rounded-lg text-foreground/40 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
