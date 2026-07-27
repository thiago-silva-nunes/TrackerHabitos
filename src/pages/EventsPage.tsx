import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Plus,
  Pencil,
  Trash2,
  X,
  AlignLeft,
} from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { CalendarEvent, EVENT_COLORS } from "@/types/events";

/* ── helpers ─────────────────────────────────────────────────── */
function pad(n: number) { return String(n).padStart(2, "0"); }

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDisplayDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", {
    weekday: "long", day: "numeric", month: "long",
  });
}

function formatShortDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", {
    day: "numeric", month: "short",
  });
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function firstDayOfMonth(year: number, month: number) {
  // 0=sun → we use mon-first: (0+6)%7=6, 1→0, 2→1 ...
  const d = new Date(year, month, 1).getDay();
  return (d + 6) % 7;
}

function getErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error)
    return String((error as { message: unknown }).message);
  return "Não foi possível concluir essa ação.";
}

const MONTH_NAMES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];
const WEEKDAY_LABELS = ["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"];

/* ── form ─────────────────────────────────────────────────────── */
interface EventForm {
  title: string;
  description: string;
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  is_all_day: boolean;
  color: string;
  location: string;
}

function emptyForm(date?: string): EventForm {
  return {
    title: "",
    description: "",
    start_date: date ?? todayStr(),
    start_time: "",
    end_date: "",
    end_time: "",
    is_all_day: false,
    color: "#ec4899",
    location: "",
  };
}

/* ══════════════════════════════════════════════════════════════ */
export function EventsPage() {
  const { user } = useAuth();
  const today = todayStr();

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Calendar navigation
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const [selectedDay, setSelectedDay] = useState<string>(today);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [form, setForm] = useState<EventForm>(emptyForm());

  /* ── fetch ── */
  const fetchEvents = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("user_id", user.id)
        .order("start_date", { ascending: true })
        .order("start_time", { ascending: true });
      if (error) throw error;
      setEvents((data ?? []) as CalendarEvent[]);
    } catch (error) {
      toast.error(`Não foi possível carregar os eventos. ${getErrorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  /* ── computed ── */
  // Events indexed by start_date
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((ev) => {
      const key = ev.start_date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    });
    return map;
  }, [events]);

  const selectedEvents = useMemo(
    () => eventsByDay.get(selectedDay) ?? [],
    [eventsByDay, selectedDay]
  );

  // Stats
  const today_events = eventsByDay.get(today)?.length ?? 0;
  const thisMonthKey = `${viewYear}-${pad(viewMonth + 1)}`;
  const thisMonthEvents = events.filter((e) => e.start_date.startsWith(thisMonthKey)).length;
  const upcomingEvents = events.filter((e) => e.start_date >= today).length;

  /* ── calendar grid ── */
  const totalDays = daysInMonth(viewYear, viewMonth);
  const startOffset = firstDayOfMonth(viewYear, viewMonth);
  const totalCells = Math.ceil((startOffset + totalDays) / 7) * 7;

  function prevMonth() {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  }
  function goToToday() {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setSelectedDay(today);
  }

  /* ── modal ── */
  function openCreate(date?: string) {
    setEditingEvent(null);
    setForm(emptyForm(date ?? selectedDay));
    setShowModal(true);
  }
  function openEdit(ev: CalendarEvent) {
    setEditingEvent(ev);
    setForm({
      title: ev.title,
      description: ev.description ?? "",
      start_date: ev.start_date,
      start_time: ev.start_time ?? "",
      end_date: ev.end_date ?? "",
      end_time: ev.end_time ?? "",
      is_all_day: ev.is_all_day,
      color: ev.color,
      location: ev.location ?? "",
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!user || !form.title.trim()) return;
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      start_date: form.start_date,
      start_time: form.is_all_day ? null : (form.start_time || null),
      end_date: form.end_date || null,
      end_time: form.is_all_day ? null : (form.end_time || null),
      is_all_day: form.is_all_day,
      color: form.color,
      location: form.location.trim() || null,
    };
    try {
      if (editingEvent) {
        const { data, error } = await supabase
          .from("events").update(payload).eq("id", editingEvent.id).eq("user_id", user.id)
          .select().single();
        if (error) throw error;
        setEvents((prev) => prev.map((e) => e.id === editingEvent.id ? data as CalendarEvent : e));
        toast.success("Evento atualizado.");
      } else {
        const { data, error } = await supabase
          .from("events").insert({ ...payload, user_id: user.id }).select().single();
        if (error) throw error;
        setEvents((prev) => [...prev, data as CalendarEvent]
          .sort((a, b) => a.start_date.localeCompare(b.start_date)));
        toast.success("Evento criado.");
      }
      setShowModal(false);
      setSelectedDay(form.start_date);
    } catch (error) {
      toast.error(`Não foi possível salvar. ${getErrorMessage(error)}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(ev: CalendarEvent) {
    if (!user || !confirm(`Excluir "${ev.title}"?`)) return;
    setDeletingId(ev.id);
    try {
      const { error } = await supabase.from("events").delete().eq("id", ev.id).eq("user_id", user.id);
      if (error) throw error;
      setEvents((prev) => prev.filter((e) => e.id !== ev.id));
      toast.success("Evento excluído.");
    } catch (error) {
      toast.error(`Não foi possível excluir. ${getErrorMessage(error)}`);
    } finally {
      setDeletingId(null);
    }
  }

  /* ── loading ── */
  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-4">
        <div className="h-24 rounded-2xl skeleton" />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
          <div className="h-80 rounded-2xl skeleton" />
          <div className="h-80 rounded-2xl skeleton" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-5 h-5 text-events" />
              <h1 className="text-2xl font-bold text-foreground">Eventos</h1>
            </div>
            <p className="text-sm text-foreground/65">Sua agenda e compromissos em um só lugar.</p>
          </div>
          <Button onClick={() => openCreate()}>
            <Plus className="w-4 h-4" /> Novo evento
          </Button>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-7">
        {[
          { label: "Hoje", value: today_events, color: "text-events" },
          { label: "Este mês", value: thisMonthEvents, color: "text-events" },
          { label: "Próximos", value: upcomingEvents, color: "text-events" },
        ].map((s) => (
          <div key={s.label} className="bg-surface-1 rounded-2xl border border-foreground/6 p-4">
            <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
            <p className="text-xs text-foreground/60 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">
        {/* Calendar */}
        <div className="bg-surface-1 border border-foreground/6 rounded-3xl p-5">
          {/* Calendar nav */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-foreground/8 text-foreground/60 hover:text-foreground transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h2 className="text-base font-semibold text-foreground min-w-[160px] text-center">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </h2>
              <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-foreground/8 text-foreground/60 hover:text-foreground transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <button onClick={goToToday} className="text-xs font-medium text-events hover:text-events-light transition-colors px-3 py-1.5 rounded-lg hover:bg-events/8">
              Hoje
            </button>
          </div>

          {/* Weekday labels */}
          <div className="grid grid-cols-7 mb-2">
            {WEEKDAY_LABELS.map((d) => (
              <div key={d} className="text-center text-[10px] font-semibold uppercase tracking-widest text-foreground/35 py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: totalCells }, (_, i) => {
              const dayNum = i - startOffset + 1;
              if (dayNum < 1 || dayNum > totalDays) {
                return <div key={i} />;
              }
              const dateStr = `${viewYear}-${pad(viewMonth + 1)}-${pad(dayNum)}`;
              const isToday = dateStr === today;
              const isSelected = dateStr === selectedDay;
              const dayEvents = eventsByDay.get(dateStr) ?? [];
              const hasEvents = dayEvents.length > 0;

              return (
                <button
                  key={i}
                  onClick={() => setSelectedDay(dateStr)}
                  className={cn(
                    "relative flex flex-col items-center py-2 rounded-xl transition-all group min-h-[52px]",
                    isSelected
                      ? "bg-events text-white shadow-lg shadow-events/25"
                      : isToday
                      ? "bg-events/10 text-events"
                      : "hover:bg-foreground/5 text-foreground/80"
                  )}
                >
                  <span className={cn("text-sm font-medium", isToday && !isSelected && "font-bold")}>
                    {dayNum}
                  </span>
                  {hasEvents && (
                    <div className="flex gap-0.5 mt-1 flex-wrap justify-center max-w-[40px]">
                      {dayEvents.slice(0, 3).map((ev) => (
                        <span
                          key={ev.id}
                          className={cn("w-1.5 h-1.5 rounded-full", isSelected ? "bg-white/70" : "")}
                          style={!isSelected ? { backgroundColor: ev.color } : undefined}
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Day detail */}
        <div className="flex flex-col gap-3">
          <div className="bg-surface-1 border border-foreground/6 rounded-3xl p-5 flex-1">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-foreground/40 mb-0.5">
                  Selecionado
                </p>
                <h3 className="text-sm font-semibold text-foreground capitalize">
                  {formatDisplayDate(selectedDay)}
                </h3>
              </div>
              <button
                onClick={() => openCreate(selectedDay)}
                className="w-8 h-8 rounded-xl bg-events/10 text-events hover:bg-events/20 transition-colors flex items-center justify-center"
                title="Adicionar evento neste dia"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <AnimatePresence mode="wait">
              {selectedEvents.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-10 text-center"
                >
                  <Calendar className="w-8 h-8 text-foreground/15 mb-3" />
                  <p className="text-sm text-foreground/35">Nenhum evento neste dia</p>
                  <button
                    onClick={() => openCreate(selectedDay)}
                    className="mt-3 text-xs text-events hover:text-events-light transition-colors font-medium"
                  >
                    + Adicionar evento
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="events"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-2"
                >
                  {selectedEvents.map((ev) => (
                    <EventCard
                      key={ev.id}
                      event={ev}
                      onEdit={() => openEdit(ev)}
                      onDelete={() => handleDelete(ev)}
                      deleting={deletingId === ev.id}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Upcoming events mini-list */}
          {events.filter((e) => e.start_date > selectedDay).length > 0 && (
            <div className="bg-surface-1 border border-foreground/6 rounded-2xl p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-foreground/40 mb-3">
                Próximos eventos
              </p>
              <div className="space-y-2">
                {events
                  .filter((e) => e.start_date > selectedDay)
                  .slice(0, 4)
                  .map((ev) => (
                    <button
                      key={ev.id}
                      onClick={() => setSelectedDay(ev.start_date)}
                      className="w-full flex items-center gap-2.5 text-left group"
                    >
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: ev.color }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground/80 truncate group-hover:text-foreground transition-colors">
                          {ev.title}
                        </p>
                        <p className="text-[10px] text-foreground/40">{formatShortDate(ev.start_date)}</p>
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Empty state */}
      {events.length === 0 && !loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6 bg-surface-1 border border-foreground/10 rounded-3xl text-center px-6 py-14"
        >
          <div className="w-16 h-16 rounded-2xl bg-events/10 flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-events" />
          </div>
          <h2 className="font-semibold text-foreground">Adicione seu primeiro evento</h2>
          <p className="text-sm text-foreground/60 mt-2 mb-6 max-w-sm mx-auto">
            Compromissos, reuniões, datas importantes — tudo no seu calendário.
          </p>
          <Button onClick={() => openCreate()}><Plus className="w-4 h-4" /> Criar evento</Button>
        </motion.div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-surface-2 border border-foreground/8 rounded-3xl p-5 sm:p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-bold text-foreground">{editingEvent ? "Editar evento" : "Novo evento"}</h2>
                  <p className="text-xs text-foreground/55 mt-1">Adicione um compromisso à sua agenda.</p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 rounded-xl text-foreground/50 hover:text-foreground hover:bg-foreground/5">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="text-xs font-medium text-foreground/65 block mb-1.5">Título *</label>
                  <input
                    autoFocus
                    value={form.title}
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                    placeholder="Ex: Consulta médica, Reunião de equipe…"
                    maxLength={150}
                    className="w-full bg-surface-3 border border-foreground/8 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder-foreground/25 outline-none focus:border-events/50"
                  />
                </div>

                {/* All day toggle */}
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-foreground/65">Dia inteiro</label>
                  <button
                    onClick={() => setForm((p) => ({ ...p, is_all_day: !p.is_all_day }))}
                    className={cn(
                      "w-10 h-5 rounded-full transition-colors relative",
                      form.is_all_day ? "bg-events" : "bg-foreground/15"
                    )}
                  >
                    <span className={cn(
                      "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
                      form.is_all_day ? "translate-x-5" : "translate-x-0.5"
                    )} />
                  </button>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-foreground/65 block mb-1.5">Data início *</label>
                    <input
                      type="date"
                      value={form.start_date}
                      onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
                      className="w-full bg-surface-3 border border-foreground/8 rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:border-events/50 dark:[color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground/65 block mb-1.5">Data fim (opcional)</label>
                    <input
                      type="date"
                      value={form.end_date}
                      onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))}
                      min={form.start_date}
                      className="w-full bg-surface-3 border border-foreground/8 rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:border-events/50 dark:[color-scheme:dark]"
                    />
                  </div>
                </div>

                {/* Times */}
                {!form.is_all_day && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-foreground/65 block mb-1.5">
                        <Clock className="w-3.5 h-3.5 inline mr-1" />Horário início
                      </label>
                      <input
                        type="time"
                        value={form.start_time}
                        onChange={(e) => setForm((p) => ({ ...p, start_time: e.target.value }))}
                        className="w-full bg-surface-3 border border-foreground/8 rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:border-events/50 dark:[color-scheme:dark]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-foreground/65 block mb-1.5">
                        <Clock className="w-3.5 h-3.5 inline mr-1" />Horário fim
                      </label>
                      <input
                        type="time"
                        value={form.end_time}
                        onChange={(e) => setForm((p) => ({ ...p, end_time: e.target.value }))}
                        className="w-full bg-surface-3 border border-foreground/8 rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:border-events/50 dark:[color-scheme:dark]"
                      />
                    </div>
                  </div>
                )}

                {/* Location */}
                <div>
                  <label className="text-xs font-medium text-foreground/65 block mb-1.5">
                    <MapPin className="w-3.5 h-3.5 inline mr-1" />Local (opcional)
                  </label>
                  <input
                    value={form.location}
                    onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                    placeholder="Ex: Sala de reunião, Online, Rua…"
                    maxLength={120}
                    className="w-full bg-surface-3 border border-foreground/8 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder-foreground/25 outline-none focus:border-events/50"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs font-medium text-foreground/65 block mb-1.5">
                    <AlignLeft className="w-3.5 h-3.5 inline mr-1" />Descrição (opcional)
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Detalhes, link da reunião, o que levar…"
                    rows={2}
                    maxLength={500}
                    className="w-full bg-surface-3 border border-foreground/8 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder-foreground/25 outline-none focus:border-events/50 resize-none"
                  />
                </div>

                {/* Color */}
                <div>
                  <p className="text-xs font-medium text-foreground/65 mb-2">Cor</p>
                  <div className="flex gap-2 flex-wrap">
                    {EVENT_COLORS.map((c) => (
                      <button
                        key={c.value}
                        onClick={() => setForm((p) => ({ ...p, color: c.value }))}
                        className={cn(
                          "w-8 h-8 rounded-full transition-transform",
                          form.color === c.value && "ring-2 ring-white ring-offset-2 ring-offset-surface-2 scale-110"
                        )}
                        style={{ backgroundColor: c.value }}
                        aria-label={c.label}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-7">
                <Button variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>Cancelar</Button>
                <Button className="flex-1" onClick={handleSave} loading={saving} disabled={!form.title.trim() || !form.start_date}>
                  {editingEvent ? "Salvar alterações" : "Criar evento"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Event Card ──────────────────────────────────────────────── */
function EventCard({ event, onEdit, onDelete, deleting }: {
  event: CalendarEvent; onEdit: () => void; onDelete: () => void; deleting: boolean;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-surface-2 border border-foreground/6 group">
      <div className="w-3 h-3 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: event.color }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{event.title}</p>
        {!event.is_all_day && (event.start_time || event.end_time) && (
          <p className="text-xs text-foreground/50 mt-0.5 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {event.start_time?.slice(0, 5)}
            {event.end_time && ` – ${event.end_time.slice(0, 5)}`}
          </p>
        )}
        {event.is_all_day && (
          <p className="text-xs text-foreground/40 mt-0.5">Dia inteiro</p>
        )}
        {event.location && (
          <p className="text-xs text-foreground/45 mt-0.5 flex items-center gap-1">
            <MapPin className="w-3 h-3" />{event.location}
          </p>
        )}
        {event.description && (
          <p className="text-xs text-foreground/45 mt-1 line-clamp-2">{event.description}</p>
        )}
      </div>
      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button onClick={onEdit} className="p-1.5 rounded-lg text-foreground/40 hover:text-foreground hover:bg-foreground/8 transition-colors">
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button onClick={onDelete} disabled={deleting} className="p-1.5 rounded-lg text-foreground/40 hover:text-red-400 hover:bg-red-500/10 transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
