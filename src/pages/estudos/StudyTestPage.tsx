import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Plus, X, Trash2, CheckCircle2, XCircle,
  RotateCcw, FlaskConical, Trophy, ChevronRight, Save,
  Pencil, Check,
} from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { StudyTest, TestQuestion, TestAttempt } from "@/types/studies";

type Mode = "manage" | "taking" | "result";

interface DraftQuestion {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

const emptyDraft = (): DraftQuestion => ({
  question: "",
  options: ["", "", "", ""],
  correct_index: 0,
  explanation: "",
});

export function StudyTestPage() {
  const { projectId, testId } = useParams<{ projectId: string; testId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [test, setTest] = useState<StudyTest | null>(null);
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>("manage");

  // Question form
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [draft, setDraft] = useState<DraftQuestion>(emptyDraft());
  const [savingQ, setSavingQ] = useState(false);
  const [editingQ, setEditingQ] = useState<TestQuestion | null>(null);

  // Test taking state
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [lastAttempt, setLastAttempt] = useState<TestAttempt | null>(null);

  const fetchData = useCallback(async () => {
    if (!testId || !user) return;
    setLoading(true);
    try {
      const [testRes, questionsRes, attemptsRes] = await Promise.all([
        supabase.from("study_tests").select("*").eq("id", testId).single(),
        supabase.from("test_questions").select("*").eq("test_id", testId).order("sort_order"),
        supabase.from("test_attempts").select("*").eq("test_id", testId).eq("user_id", user.id).order("completed_at", { ascending: false }),
      ]);
      if (testRes.error) { navigate(`/estudos/${projectId}`); return; }
      setTest(testRes.data);
      setQuestions(questionsRes.data ?? []);
      setAttempts(attemptsRes.data ?? []);
    } catch {
      toast.error("Erro ao carregar teste");
    } finally {
      setLoading(false);
    }
  }, [testId, user, navigate, projectId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Question management ──

  function startEditQuestion(q: TestQuestion) {
    setEditingQ(q);
    setDraft({
      question: q.question,
      options: [...q.options],
      correct_index: q.correct_index,
      explanation: q.explanation ?? "",
    });
    setShowQuestionForm(true);
  }

  async function handleSaveQuestion() {
    if (!draft.question.trim() || draft.options.filter((o) => o.trim()).length < 2 || !user || !testId) {
      toast.error("Preencha a pergunta e ao menos 2 alternativas");
      return;
    }
    setSavingQ(true);
    try {
      const cleanOptions = draft.options.filter((o) => o.trim());
      const payload = {
        test_id: testId,
        question: draft.question.trim(),
        options: cleanOptions,
        correct_index: Math.min(draft.correct_index, cleanOptions.length - 1),
        explanation: draft.explanation.trim() || null,
        sort_order: editingQ ? editingQ.sort_order : questions.length,
      };

      if (editingQ) {
        const { error } = await supabase.from("test_questions").update(payload).eq("id", editingQ.id);
        if (error) throw error;
        setQuestions((prev) => prev.map((q) => q.id === editingQ.id ? { ...q, ...payload } : q));
        toast.success("Questão atualizada!");
      } else {
        const { data, error } = await supabase.from("test_questions").insert(payload).select().single();
        if (error) throw error;
        setQuestions((prev) => [...prev, data]);
        toast.success("Questão adicionada!");
      }

      setShowQuestionForm(false);
      setDraft(emptyDraft());
      setEditingQ(null);
    } catch {
      toast.error("Erro ao salvar questão");
    } finally {
      setSavingQ(false);
    }
  }

  async function handleDeleteQuestion(id: string) {
    try {
      await supabase.from("test_questions").delete().eq("id", id);
      setQuestions((prev) => prev.filter((q) => q.id !== id));
      toast.success("Questão removida");
    } catch {
      toast.error("Erro ao remover");
    }
  }

  // ── Test taking ──

  function startTest() {
    setSelectedAnswers(new Array(questions.length).fill(null));
    setCurrentQ(0);
    setSubmitted(false);
    setLastAttempt(null);
    setMode("taking");
  }

  function selectAnswer(optionIndex: number) {
    if (submitted) return;
    setSelectedAnswers((prev) => {
      const next = [...prev];
      next[currentQ] = optionIndex;
      return next;
    });
  }

  function goNext() {
    if (currentQ < questions.length - 1) setCurrentQ((c) => c + 1);
  }

  function goPrev() {
    if (currentQ > 0) setCurrentQ((c) => c - 1);
  }

  async function handleSubmitTest() {
    if (!user || !testId) return;
    const answers = selectedAnswers.map((a) => a ?? -1);
    const score = questions.reduce((acc, q, i) => acc + (answers[i] === q.correct_index ? 1 : 0), 0);
    const total = questions.length;

    try {
      const { data, error } = await supabase.from("test_attempts").insert({
        test_id: testId,
        user_id: user.id,
        score,
        total,
        answers,
      }).select().single();
      if (error) throw error;
      setLastAttempt(data);
      setAttempts((prev) => [data, ...prev]);
      setMode("result");
    } catch {
      toast.error("Erro ao salvar resultado");
    }
  }

  const answeredCount = selectedAnswers.filter((a) => a !== null).length;

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-4">
        <div className="h-6 w-32 rounded-lg skeleton" />
        <div className="h-8 w-64 rounded-xl skeleton" />
        {[...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-2xl skeleton" />)}
      </div>
    );
  }

  if (!test) return null;

  // ── RESULT screen ──
  if (mode === "result" && lastAttempt) {
    const pct = Math.round((lastAttempt.score / lastAttempt.total) * 100);
    const passed = pct >= 70;
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center mb-8">
          <div className={`w-20 h-20 rounded-2xl mx-auto flex items-center justify-center mb-4 ${passed ? "bg-green-500/15" : "bg-red-500/15"}`}>
            {passed ? <Trophy className="w-10 h-10 text-green-400" /> : <FlaskConical className="w-10 h-10 text-red-400" />}
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">{passed ? "Parabéns! 🎉" : "Quase lá!"}</h1>
          <p className="text-white/40 text-sm mb-4">{test.title}</p>
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-lg font-bold ${passed ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}>
            {lastAttempt.score}/{lastAttempt.total} · {pct}%
          </div>
        </motion.div>

        {/* Per-question review */}
        <div className="space-y-3 mb-6">
          {questions.map((q, i) => {
            const chosen = lastAttempt.answers[i] ?? -1;
            const isCorrect = chosen === q.correct_index;
            return (
              <div key={q.id} className={`bg-surface-1 border rounded-2xl p-4 ${isCorrect ? "border-green-500/20" : "border-red-500/20"}`}>
                <div className="flex items-start gap-3 mb-3">
                  {isCorrect
                    ? <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                    : <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />}
                  <p className="text-sm text-white font-medium">{q.question}</p>
                </div>
                <div className="pl-7 space-y-1.5">
                  {q.options.map((opt, oi) => {
                    const isCorrectOpt = oi === q.correct_index;
                    const isChosen = oi === chosen;
                    return (
                      <div key={oi} className={`text-xs px-3 py-1.5 rounded-lg ${
                        isCorrectOpt ? "bg-green-500/15 text-green-400" :
                        isChosen && !isCorrectOpt ? "bg-red-500/15 text-red-400" :
                        "text-white/40"
                      }`}>
                        {isCorrectOpt && "✓ "}{isChosen && !isCorrectOpt && "✗ "}{opt}
                      </div>
                    );
                  })}
                  {q.explanation && (
                    <p className="text-xs text-white/40 italic mt-2">💡 {q.explanation}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setMode("manage")}>
            <ArrowLeft className="w-4 h-4" /> Voltar ao teste
          </Button>
          <Button className="flex-1" onClick={startTest}>
            <RotateCcw className="w-4 h-4" /> Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  // ── TAKING screen ──
  if (mode === "taking") {
    const q = questions[currentQ];
    const selected = selectedAnswers[currentQ];
    const isLast = currentQ === questions.length - 1;

    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-white/40 mb-2">
            <span>Questão {currentQ + 1} de {questions.length}</span>
            <span>{answeredCount}/{questions.length} respondidas</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/6 overflow-hidden">
            <div
              className="h-full rounded-full bg-studies transition-all duration-300"
              style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Question */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQ}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="bg-surface-1 border border-white/8 rounded-2xl p-5 mb-4">
              <p className="text-white font-medium leading-relaxed">{q.question}</p>
            </div>

            <div className="space-y-2 mb-6">
              {q.options.map((opt, oi) => (
                <button
                  key={oi}
                  onClick={() => selectAnswer(oi)}
                  className={`w-full text-left px-4 py-3.5 rounded-xl border text-sm transition-all ${
                    selected === oi
                      ? "bg-studies/15 border-studies/50 text-white"
                      : "bg-surface-1 border-white/6 text-white/60 hover:border-white/20 hover:text-white"
                  }`}
                >
                  <span className={`inline-flex w-5 h-5 rounded-full items-center justify-center text-xs font-bold mr-3 flex-shrink-0 ${
                    selected === oi ? "bg-studies text-white" : "bg-white/10 text-white/40"
                  }`}>
                    {String.fromCharCode(65 + oi)}
                  </span>
                  {opt}
                </button>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={goPrev} disabled={currentQ === 0}>
            ← Anterior
          </Button>
          <div className="flex-1 flex justify-center gap-1.5">
            {questions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentQ(i)}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === currentQ ? "bg-studies w-4" :
                  selectedAnswers[i] !== null ? "bg-studies/40" : "bg-white/15"
                }`}
              />
            ))}
          </div>
          {isLast ? (
            <Button onClick={handleSubmitTest} disabled={answeredCount < questions.length}>
              <Check className="w-4 h-4" /> Finalizar ({answeredCount}/{questions.length})
            </Button>
          ) : (
            <Button onClick={goNext}>
              Próxima <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>

        <button
          onClick={() => { if (confirm("Abandonar o teste?")) setMode("manage"); }}
          className="w-full mt-4 text-xs text-white/25 hover:text-white/50 transition-colors py-2"
        >
          Abandonar teste
        </button>
      </div>
    );
  }

  // ── MANAGE screen ──
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
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-studies/10 flex items-center justify-center">
              <FlaskConical className="w-5 h-5 text-studies" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{test.title}</h1>
              {test.description && <p className="text-sm text-white/40 mt-0.5">{test.description}</p>}
            </div>
          </div>
          {questions.length > 0 && (
            <Button onClick={startTest}>
              <FlaskConical className="w-4 h-4" /> Iniciar teste
            </Button>
          )}
        </div>

        {/* Attempt history */}
        {attempts.length > 0 && (
          <div className="mt-4 flex items-center gap-3 overflow-x-auto pb-1">
            <span className="text-xs text-white/30 flex-shrink-0">Tentativas:</span>
            {attempts.slice(0, 5).map((a) => {
              const pct = Math.round((a.score / a.total) * 100);
              return (
                <span key={a.id} className={`text-xs px-2.5 py-1 rounded-full flex-shrink-0 font-medium ${
                  pct >= 70 ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"
                }`}>
                  {a.score}/{a.total} · {pct}%
                </span>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Questions list */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-white/60">
            {questions.length} {questions.length === 1 ? "questão" : "questões"}
          </p>
          <Button size="sm" variant="secondary" onClick={() => { setShowQuestionForm(true); setDraft(emptyDraft()); setEditingQ(null); }}>
            <Plus className="w-4 h-4" /> Adicionar questão
          </Button>
        </div>

        {questions.length === 0 && !showQuestionForm && (
          <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl">
            <p className="text-white/30 text-sm mb-4">Nenhuma questão ainda. Adicione a primeira!</p>
            <Button size="sm" onClick={() => setShowQuestionForm(true)}>
              <Plus className="w-4 h-4" /> Criar questão
            </Button>
          </div>
        )}

        {questions.map((q, i) => (
          <div key={q.id} className="bg-surface-1 border border-white/6 rounded-2xl p-4 group">
            <div className="flex items-start gap-3">
              <span className="text-xs font-bold text-white/30 bg-white/5 rounded-lg px-2 py-1 flex-shrink-0 mt-0.5">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium mb-2">{q.question}</p>
                <div className="space-y-1">
                  {q.options.map((opt, oi) => (
                    <div key={oi} className={`text-xs px-2.5 py-1 rounded-lg ${
                      oi === q.correct_index ? "bg-green-500/10 text-green-400" : "text-white/40"
                    }`}>
                      {oi === q.correct_index && <span className="font-bold">✓ </span>}{opt}
                    </div>
                  ))}
                </div>
                {q.explanation && (
                  <p className="text-xs text-white/30 italic mt-2">💡 {q.explanation}</p>
                )}
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                <button onClick={() => startEditQuestion(q)} className="p-1.5 rounded-lg text-white/30 hover:text-studies hover:bg-studies/10 transition-all">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDeleteQuestion(q.id)} className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Question form */}
      <AnimatePresence>
        {showQuestionForm && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            className="bg-surface-1 border border-studies/30 rounded-2xl p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white text-sm">{editingQ ? "Editar questão" : "Nova questão"}</h3>
              <button onClick={() => { setShowQuestionForm(false); setDraft(emptyDraft()); setEditingQ(null); }} className="text-white/30 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Question text */}
              <div>
                <label className="text-xs text-white/40 font-medium block mb-1.5">Pergunta *</label>
                <textarea
                  autoFocus
                  value={draft.question}
                  onChange={(e) => setDraft((d) => ({ ...d, question: e.target.value }))}
                  placeholder="Ex: O que é closure em JavaScript?"
                  rows={3}
                  className="w-full bg-surface-3 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-studies/50 transition-colors resize-none"
                />
              </div>

              {/* Options */}
              <div>
                <label className="text-xs text-white/40 font-medium block mb-2">
                  Alternativas * <span className="text-white/20">(marque a correta)</span>
                </label>
                <div className="space-y-2">
                  {draft.options.map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <button
                        onClick={() => setDraft((d) => ({ ...d, correct_index: oi }))}
                        className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                          draft.correct_index === oi
                            ? "border-green-400 bg-green-400/20"
                            : "border-white/20 hover:border-white/40"
                        }`}
                      >
                        {draft.correct_index === oi && <div className="w-2.5 h-2.5 rounded-full bg-green-400" />}
                      </button>
                      <span className="text-xs text-white/30 font-bold w-4">{String.fromCharCode(65 + oi)}</span>
                      <input
                        value={opt}
                        onChange={(e) => setDraft((d) => {
                          const opts = [...d.options];
                          opts[oi] = e.target.value;
                          return { ...d, options: opts };
                        })}
                        placeholder={`Alternativa ${String.fromCharCode(65 + oi)}${oi < 2 ? " *" : ""}`}
                        className="flex-1 bg-surface-3 border border-white/8 rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 outline-none focus:border-studies/40 transition-colors"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Explanation */}
              <div>
                <label className="text-xs text-white/40 font-medium block mb-1.5">Explicação (opcional)</label>
                <input
                  value={draft.explanation}
                  onChange={(e) => setDraft((d) => ({ ...d, explanation: e.target.value }))}
                  placeholder="Explique por que a resposta é correta..."
                  className="w-full bg-surface-3 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-studies/50 transition-colors"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button variant="secondary" size="sm" onClick={() => { setShowQuestionForm(false); setDraft(emptyDraft()); setEditingQ(null); }}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleSaveQuestion} loading={savingQ}>
                <Save className="w-3.5 h-3.5" /> {editingQ ? "Atualizar" : "Salvar questão"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
