import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Plus, Trash2, X, FileCode, FileText, Globe,
  ChevronDown, TerminalIcon, FolderOpen, RefreshCcw, Download,
  PanelLeftOpen,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

/* ── Types ───────────────────────────────────────── */
interface TerminalFile {
  name: string;
  content: string;
  language: string;
}

interface TerminalProject {
  id: string;
  name: string;
  files: TerminalFile[];
  activeFile: string;
  createdAt: string;
}

interface ConsoleEntry {
  type: "log" | "warn" | "error" | "info" | "system";
  text: string;
  ts: number;
}

/* ── Constants ───────────────────────────────────── */
const LANGUAGES = [
  { id: "javascript", label: "JavaScript", ext: ".js" },
  { id: "html",       label: "HTML",       ext: ".html" },
  { id: "css",        label: "CSS",        ext: ".css" },
  { id: "typescript", label: "TypeScript", ext: ".ts" },
  { id: "json",       label: "JSON",       ext: ".json" },
  { id: "markdown",   label: "Markdown",   ext: ".md" },
];

const FILE_TEMPLATES: Record<string, string> = {
  ".js": `// Olá! Escreva seu JavaScript aqui
console.log("Olá, mundo!");

// Exemplo: funções
function somar(a, b) {
  return a + b;
}

console.log("2 + 3 =", somar(2, 3));
`,
  ".html": `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Minha Página</title>
  <style>
    body {
      font-family: sans-serif;
      max-width: 600px;
      margin: 40px auto;
      padding: 0 20px;
      background: #f5f5f5;
    }
    h1 { color: #a855f7; }
    button {
      background: #a855f7;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 8px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <h1>Olá, mundo!</h1>
  <p>Edite este HTML e clique em Executar.</p>
  <button onclick="alert('Funcionou!')">Clique aqui</button>

  <script>
    console.log("Página carregada!");
  </script>
</body>
</html>
`,
  ".css": `/* Meu CSS */
body {
  font-family: sans-serif;
  background: #f0f0f5;
  color: #333;
}

.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}
`,
  ".ts": `// TypeScript
interface Pessoa {
  nome: string;
  idade: number;
}

function saudar(p: Pessoa): string {
  return \`Olá, \${p.nome}! Você tem \${p.idade} anos.\`;
}

const pessoa: Pessoa = { nome: "Dev", idade: 25 };
console.log(saudar(pessoa));
`,
};

function getTemplate(filename: string): string {
  const ext = filename.substring(filename.lastIndexOf("."));
  return FILE_TEMPLATES[ext] ?? `// ${filename}\n`;
}

function getLang(filename: string): string {
  const ext = filename.substring(filename.lastIndexOf("."));
  return LANGUAGES.find((l) => l.ext === ext)?.id ?? "javascript";
}

function getFileIcon(filename: string) {
  const ext = filename.substring(filename.lastIndexOf("."));
  if (ext === ".html") return Globe;
  if (ext === ".css") return FileText;
  return FileCode;
}

function makeProject(name: string): TerminalProject {
  return {
    id: crypto.randomUUID(),
    name,
    activeFile: "index.js",
    createdAt: new Date().toISOString(),
    files: [{ name: "index.js", content: FILE_TEMPLATES[".js"], language: "javascript" }],
  };
}

/* ── JS Execution ────────────────────────────────── */
function buildSandboxHtml(project: TerminalProject): string {
  const htmlFile = project.files.find((f) => f.name.endsWith(".html"));
  const jsFiles  = project.files.filter((f) => f.name.endsWith(".js") || f.name.endsWith(".ts"));
  const cssFiles = project.files.filter((f) => f.name.endsWith(".css"));

  const consoleScript = `
    <script>
      (function() {
        const send = (type, text) => window.parent.postMessage({ type, text }, '*');
        const fmt = (args) => args.map(a => {
          if (a === null) return 'null';
          if (a === undefined) return 'undefined';
          if (typeof a === 'object') { try { return JSON.stringify(a, null, 2); } catch { return String(a); } }
          return String(a);
        }).join(' ');
        ['log','info','warn','error'].forEach(m => {
          const orig = console[m];
          console[m] = (...args) => { send(m === 'error' ? 'error' : 'log', fmt(args)); orig.apply(console, args); };
        });
        window.addEventListener('error', e => send('error', e.message + ' (linha ' + e.lineno + ')'));
        window.addEventListener('unhandledrejection', e => send('error', 'Promise não tratada: ' + String(e.reason)));
        send('system', '▶ Executando...');
      })();
    <\/script>
  `;

  if (htmlFile) {
    // HTML project — inject console interceptor + other scripts/styles
    let html = htmlFile.content;
    const styleInjection = cssFiles.map((f) => `<style>/* ${f.name} */\n${f.content}</style>`).join("\n");
    const scriptInjection = jsFiles.map((f) => `<script>\n${f.content}\n<\/script>`).join("\n");
    // Inject before </head> or at start
    const injection = consoleScript + "\n" + styleInjection;
    if (html.includes("</head>")) {
      html = html.replace("</head>", injection + "\n</head>");
    } else {
      html = injection + "\n" + html;
    }
    if (scriptInjection) {
      html = html.replace("</body>", scriptInjection + "\n</body>");
    }
    return html;
  }

  // JS-only project
  const jsCode = jsFiles.map((f) => `// === ${f.name} ===\n${f.content}`).join("\n\n");
  return `<!DOCTYPE html><html><head>${consoleScript}</head><body>
    <style>body{display:none}</style>
    <script>\n${jsCode}\n<\/script>
  </body></html>`;
}

/* ── Storage ─────────────────────────────────────── */
function storageKey(projectId: string) { return `terminal_ws_${projectId}`; }

function loadProjects(projectId: string): TerminalProject[] {
  try {
    const raw = localStorage.getItem(storageKey(projectId));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveProjects(projectId: string, projects: TerminalProject[]) {
  localStorage.setItem(storageKey(projectId), JSON.stringify(projects));
}

/* ── Component ───────────────────────────────────── */
export function StudyTerminal({ studyProjectId }: { studyProjectId: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const [projects, setProjects] = useState<TerminalProject[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [consoleLogs, setConsoleLogs] = useState<ConsoleEntry[]>([]);
  const [outputTab, setOutputTab] = useState<"console" | "preview">("console");
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [showNewFile, setShowNewFile] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [running, setRunning] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Init
  useEffect(() => {
    const stored = loadProjects(studyProjectId);
    if (stored.length === 0) {
      const starter = makeProject("Primeiro projeto");
      setProjects([starter]);
      setActiveProjectId(starter.id);
      saveProjects(studyProjectId, [starter]);
    } else {
      setProjects(stored);
      setActiveProjectId(stored[0].id);
    }
  }, [studyProjectId]);

  // Listen for iframe messages
  useEffect(() => {
    function handler(e: MessageEvent) {
      const { type, text } = e.data ?? {};
      if (!type) return;
      setConsoleLogs((prev) => [...prev, { type: type as ConsoleEntry["type"], text, ts: Date.now() }]);
      if (type === "system") setRunning(false);
    }
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const activeProject = projects.find((p) => p.id === activeProjectId) ?? null;
  const activeFile = activeProject?.files.find((f) => f.name === activeProject.activeFile) ?? null;

  function updateProject(updated: TerminalProject) {
    const next = projects.map((p) => p.id === updated.id ? updated : p);
    setProjects(next);
    saveProjects(studyProjectId, next);
  }

  function handleCodeChange(value: string) {
    if (!activeProject || !activeFile) return;
    const updatedFiles = activeProject.files.map((f) =>
      f.name === activeFile.name ? { ...f, content: value } : f
    );
    updateProject({ ...activeProject, files: updatedFiles });
  }

  function handleRun() {
    if (!activeProject || !iframeRef.current) return;
    setRunning(true);
    setConsoleLogs([]);
    const html = buildSandboxHtml(activeProject);
    iframeRef.current.srcdoc = html;
    setOutputTab("preview");
    // If JS-only, show console instead
    const hasHtml = activeProject.files.some((f) => f.name.endsWith(".html"));
    if (!hasHtml) setOutputTab("console");
    // Fallback timeout
    setTimeout(() => setRunning(false), 5000);
  }

  function handleCreateProject() {
    if (!newProjectName.trim()) return;
    const p = makeProject(newProjectName.trim());
    const next = [...projects, p];
    setProjects(next);
    setActiveProjectId(p.id);
    saveProjects(studyProjectId, next);
    setNewProjectName("");
    setShowNewProject(false);
  }

  function handleDeleteProject(id: string) {
    if (!confirm("Excluir este projeto?")) return;
    const next = projects.filter((p) => p.id !== id);
    setProjects(next);
    saveProjects(studyProjectId, next);
    if (activeProjectId === id) setActiveProjectId(next[0]?.id ?? null);
  }

  function handleAddFile() {
    if (!newFileName.trim() || !activeProject) return;
    const name = newFileName.trim().includes(".")
      ? newFileName.trim()
      : `${newFileName.trim()}.js`;
    if (activeProject.files.find((f) => f.name === name)) {
      setNewFileName("");
      setShowNewFile(false);
      return;
    }
    const file: TerminalFile = { name, content: getTemplate(name), language: getLang(name) };
    const updated = { ...activeProject, files: [...activeProject.files, file], activeFile: name };
    updateProject(updated);
    setNewFileName("");
    setShowNewFile(false);
  }

  function handleDeleteFile(filename: string) {
    if (!activeProject || activeProject.files.length <= 1) return;
    const files = activeProject.files.filter((f) => f.name !== filename);
    const newActive = filename === activeProject.activeFile ? files[0].name : activeProject.activeFile;
    updateProject({ ...activeProject, files, activeFile: newActive });
  }

  function downloadFile() {
    if (!activeFile) return;
    const blob = new Blob([activeFile.content], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = activeFile.name;
    a.click();
  }

  // Tab key support in editor
  function handleEditorKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = editorRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const value = ta.value;
      const newValue = value.substring(0, start) + "  " + value.substring(end);
      handleCodeChange(newValue);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
      });
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleRun();
    }
  }

  return (
    <div className="flex h-[calc(100vh-200px)] min-h-[500px] rounded-2xl overflow-hidden border border-foreground/6 bg-surface-1">

      {/* ── Left: Project sidebar ── */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ width: 0 }} animate={{ width: 200 }} exit={{ width: 0 }}
            className="flex-shrink-0 bg-surface-2 border-r border-foreground/6 flex flex-col overflow-hidden"
          >
            <div className="p-3 border-b border-foreground/6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-foreground/40 uppercase tracking-wider">Projetos</span>
                <button onClick={() => setShowNewProject(true)} className="p-1 rounded text-foreground/40 hover:text-foreground hover:bg-foreground/6 transition-all">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {showNewProject && (
                <div className="flex gap-1 mb-2">
                  <input
                    autoFocus
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleCreateProject(); if (e.key === "Escape") setShowNewProject(false); }}
                    placeholder="nome..."
                    className="flex-1 bg-surface-3 border border-foreground/8 rounded px-2 py-1 text-xs text-foreground outline-none"
                  />
                  <button onClick={handleCreateProject} className="p-1 rounded bg-studies/20 text-studies">
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
              {projects.map((p) => (
                <div key={p.id} className={`group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all ${activeProjectId === p.id ? "bg-studies/15 text-studies" : "text-foreground/60 hover:bg-foreground/5 hover:text-foreground"}`}
                  onClick={() => setActiveProjectId(p.id)}>
                  <FolderOpen className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="text-xs flex-1 truncate">{p.name}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteProject(p.id); }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-red-400/60 hover:text-red-400 transition-all"
                  ><Trash2 className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Center: Editor ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Editor toolbar */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-foreground/6 bg-surface-1 overflow-x-auto">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="p-1.5 rounded text-foreground/40 hover:text-foreground hover:bg-foreground/6 transition-all flex-shrink-0"
          ><PanelLeftOpen className="w-4 h-4" /></button>

          {/* File tabs */}
          <div className="flex items-center gap-1 flex-1 overflow-x-auto">
            {activeProject?.files.map((f) => {
              const Icon = getFileIcon(f.name);
              const isActive = f.name === activeProject.activeFile;
              return (
                <div key={f.name} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium flex-shrink-0 group transition-all cursor-pointer ${isActive ? "bg-foreground/10 text-foreground" : "text-foreground/40 hover:text-foreground/70 hover:bg-foreground/5"}`}
                  onClick={() => updateProject({ ...activeProject, activeFile: f.name })}>
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  {f.name}
                  {activeProject.files.length > 1 && (
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteFile(f.name); }}
                      className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all ml-0.5">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              );
            })}
            <button
              onClick={() => setShowNewFile(true)}
              className="flex-shrink-0 p-1 rounded text-foreground/30 hover:text-foreground hover:bg-foreground/6 transition-all"
            ><Plus className="w-3.5 h-3.5" /></button>

            {showNewFile && (
              <input
                autoFocus
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddFile(); if (e.key === "Escape") setShowNewFile(false); }}
                placeholder="arquivo.js"
                className="w-28 bg-surface-3 border border-foreground/8 rounded px-2 py-0.5 text-xs text-foreground outline-none"
              />
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={downloadFile} className="p-1.5 rounded text-foreground/40 hover:text-foreground hover:bg-foreground/6 transition-all" title="Baixar arquivo">
              <Download className="w-3.5 h-3.5" />
            </button>
            <Button size="sm" onClick={handleRun} loading={running} className="!px-3 !py-1.5 !text-xs">
              <Play className="w-3 h-3" /> Executar <span className="text-foreground/40 text-[10px] ml-0.5">Ctrl+↵</span>
            </Button>
          </div>
        </div>

        {/* Code editor */}
        <div className="flex-1 relative overflow-hidden bg-[#0d0d14]">
          {activeFile ? (
            <div className="h-full flex">
              {/* Line numbers */}
              <div className="flex-shrink-0 w-10 bg-[#0d0d14] text-foreground/20 text-right pr-2 py-3 select-none overflow-hidden pointer-events-none font-mono text-xs leading-[1.7]">
                {activeFile.content.split("\n").map((_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>
              <textarea
                ref={editorRef}
                value={activeFile.content}
                onChange={(e) => handleCodeChange(e.target.value)}
                onKeyDown={handleEditorKeyDown}
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="off"
                className="flex-1 bg-transparent text-[#e8e8f0] py-3 pr-4 pl-2 outline-none resize-none code-editor leading-[1.7] text-sm"
                style={{ fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', 'Courier New', monospace" }}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-foreground/20 text-sm">
              Selecione ou crie um arquivo
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Output ── */}
      <div className="w-72 xl:w-96 flex-shrink-0 border-l border-foreground/6 flex flex-col bg-[#0d0d14]">
        {/* Output tabs */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-foreground/10 bg-[#111118]">
          <button
            onClick={() => setOutputTab("console")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all ${outputTab === "console" ? "bg-foreground/10 text-foreground" : "text-foreground/40 hover:text-foreground/70"}`}
          ><TerminalIcon className="w-3.5 h-3.5" /> Console</button>
          <button
            onClick={() => setOutputTab("preview")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all ${outputTab === "preview" ? "bg-foreground/10 text-foreground" : "text-foreground/40 hover:text-foreground/70"}`}
          ><Globe className="w-3.5 h-3.5" /> Preview</button>
          <div className="flex-1" />
          <button onClick={() => setConsoleLogs([])} className="p-1 rounded text-foreground/20 hover:text-foreground/50 transition-all" title="Limpar">
            <RefreshCcw className="w-3 h-3" />
          </button>
        </div>

        {/* Console */}
        {outputTab === "console" && (
          <div className="flex-1 overflow-y-auto p-3 space-y-1 font-mono text-xs">
            {consoleLogs.length === 0 ? (
              <p className="text-foreground/20 text-center mt-8">
                Execute o código para ver a saída aqui
              </p>
            ) : (
              consoleLogs.map((entry, i) => (
                <div key={i} className={`flex gap-2 ${
                  entry.type === "error" ? "text-red-400" :
                  entry.type === "warn" ? "text-yellow-400" :
                  entry.type === "system" ? "text-studies/70" :
                  "text-[#c8c8d8]"
                }`}>
                  <span className="text-foreground/20 select-none flex-shrink-0">
                    {entry.type === "error" ? "✖" : entry.type === "warn" ? "⚠" : entry.type === "system" ? "▶" : ">"}
                  </span>
                  <pre className="flex-1 whitespace-pre-wrap break-all">{entry.text}</pre>
                </div>
              ))
            )}
          </div>
        )}

        {/* Preview iframe */}
        {outputTab === "preview" && (
          <div className="flex-1 relative bg-white">
            <iframe
              ref={iframeRef}
              sandbox="allow-scripts allow-same-origin allow-modals allow-forms"
              className="w-full h-full border-0"
              title="Preview"
            />
          </div>
        )}
      </div>
    </div>
  );
}
