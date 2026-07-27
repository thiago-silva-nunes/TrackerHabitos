import { FormEvent, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ExternalLink,
  Link2,
  Plus,
  StickyNote,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { StudyLinkItem, StudyLinkKind } from "@/types/studies";

function storageKey(projectId: string) {
  return `study_links_${projectId}`;
}

function readItems(projectId: string): StudyLinkItem[] {
  try {
    const saved = localStorage.getItem(storageKey(projectId));
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function StudyLinksPanel({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<StudyLinkItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [kind, setKind] = useState<StudyLinkKind>("link");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    setItems(readItems(projectId));
  }, [projectId]);

  function persist(nextItems: StudyLinkItem[]) {
    setItems(nextItems);
    localStorage.setItem(storageKey(projectId), JSON.stringify(nextItems));
  }

  function resetForm() {
    setKind("link");
    setName("");
    setUrl("");
    setNote("");
    setShowForm(false);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmedName = name.trim();
    const normalizedUrl = normalizeUrl(url);

    if (!trimmedName) {
      toast.error("Informe um nome para consultar depois");
      return;
    }
    if (url.trim()) {
      try {
        new URL(normalizedUrl ?? "");
      } catch {
        toast.error("Informe uma URL válida");
        return;
      }
    }

    const newItem: StudyLinkItem = {
      id: crypto.randomUUID(),
      kind,
      name: trimmedName,
      url: normalizedUrl,
      note: note.trim() || null,
      created_at: new Date().toISOString(),
    };
    persist([newItem, ...items]);
    resetForm();
    toast.success(kind === "tool" ? "Ferramenta adicionada!" : "Link adicionado!");
  }

  function handleDelete(id: string) {
    persist(items.filter((item) => item.id !== id));
    toast.success("Item removido");
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-foreground">Links e ferramentas</h2>
          <p className="text-sm text-foreground/65 mt-1">
            Guarde referências rápidas para consultar durante os estudos.
          </p>
        </div>
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" /> Adicionar
          </Button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-surface-1 border border-studies/20 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-foreground">Novo item de consulta</h3>
            <button type="button" onClick={resetForm} className="p-1 text-foreground/60 hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {([
              ["link", "Link de site", Link2],
              ["tool", "Ferramenta", Wrench],
            ] as const).map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                onClick={() => setKind(value)}
                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-all ${
                  kind === value
                    ? "border-studies/50 bg-studies/15 text-studies"
                    : "border-foreground/8 bg-surface-2 text-foreground/65 hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <div>
              <label htmlFor="study-link-name" className="text-xs text-foreground/65 font-medium block mb-1.5">
                {kind === "tool" ? "Nome da ferramenta *" : "Nome do link *"}
              </label>
              <input
                id="study-link-name"
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={kind === "tool" ? "Ex: Figma, ChatGPT, Regex101..." : "Ex: Documentação oficial do React..."}
                className="w-full bg-surface-3 border border-foreground/8 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder-foreground/30 outline-none focus:border-studies/50 transition-colors"
              />
            </div>
            <div>
              <label htmlFor="study-link-url" className="text-xs text-foreground/65 font-medium block mb-1.5">
                URL {kind === "tool" ? "(opcional)" : "*"}
              </label>
              <input
                id="study-link-url"
                type="url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://..."
                className="w-full bg-surface-3 border border-foreground/8 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder-foreground/30 outline-none focus:border-studies/50 transition-colors"
              />
            </div>
            <div>
              <label htmlFor="study-link-note" className="text-xs text-foreground/65 font-medium block mb-1.5">
                Observação (opcional)
              </label>
              <textarea
                id="study-link-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={2}
                placeholder="Para que serve ou quando consultar..."
                className="w-full bg-surface-3 border border-foreground/8 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder-foreground/30 outline-none focus:border-studies/50 transition-colors resize-none"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={resetForm}>Cancelar</Button>
            <Button type="submit" size="sm">
              <Plus className="w-3.5 h-3.5" /> Salvar item
            </Button>
          </div>
        </form>
      )}

      {items.length === 0 && !showForm ? (
        <div className="text-center py-16 border border-dashed border-foreground/10 rounded-2xl">
          <div className="w-12 h-12 rounded-2xl bg-studies/10 text-studies flex items-center justify-center mx-auto mb-3">
            <Link2 className="w-6 h-6" />
          </div>
          <p className="text-foreground/75 text-sm font-medium">Nenhum link ou ferramenta salvo</p>
          <p className="text-foreground/60 text-sm mt-1">Adicione referências que você usa com frequência.</p>
          <Button size="sm" className="mt-5" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" /> Adicionar primeiro item
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((item) => {
            const Icon = item.kind === "tool" ? Wrench : Link2;
            return (
              <div key={item.id} className="bg-surface-1 border border-foreground/8 rounded-2xl p-4 group">
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    item.kind === "tool" ? "bg-orange-500/15 text-orange-400" : "bg-studies/15 text-studies"
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground text-sm truncate">{item.name}</p>
                        <p className="text-[11px] text-foreground/60 mt-0.5">
                          {item.kind === "tool" ? "Ferramenta" : "Link de site"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        aria-label={`Excluir ${item.name}`}
                        className="p-1.5 rounded-lg text-foreground/55 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-60 group-hover:opacity-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {item.note && (
                      <div className="flex items-start gap-1.5 mt-3 text-xs text-foreground/70">
                        <StickyNote className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-foreground/60" />
                        <p className="whitespace-pre-wrap">{item.note}</p>
                      </div>
                    )}
                    {item.url ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 mt-3 max-w-full text-xs text-studies hover:text-studies-light transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{item.url}</span>
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 mt-3 text-xs text-foreground/55">
                        Ferramenta sem link
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}