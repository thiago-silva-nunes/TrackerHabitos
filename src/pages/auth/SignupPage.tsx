import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import toast from "react-hot-toast";

export function SignupPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }
    if (password.length < 6) {
      toast.error("A senha deve ter ao menos 6 caracteres.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Conta criada! Verifique seu e-mail se necessário.");
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-habits flex items-center justify-center shadow-xl shadow-habits/30 mb-4">
            <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none">
              <path d="M5 12.5l4.5 4.5 9.5-9.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-foreground">Tracker Hábitos</h1>
          <p className="text-sm text-foreground/40 mt-1">Seu sistema operacional pessoal</p>
        </div>

        {/* Card */}
        <div className="bg-surface-1 rounded-2xl border border-foreground/6 p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Criar conta</h2>
            <p className="text-sm text-foreground/40 mt-0.5">Comece sua jornada de hábitos</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground/50 uppercase tracking-wide">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/25" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full bg-surface-2 border border-foreground/8 rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground placeholder-foreground/20 focus:outline-none focus:border-habits/50 transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground/50 uppercase tracking-wide">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/25" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="mínimo 6 caracteres"
                  className="w-full bg-surface-2 border border-foreground/8 rounded-xl pl-10 pr-10 py-2.5 text-sm text-foreground placeholder-foreground/20 focus:outline-none focus:border-habits/50 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/25 hover:text-foreground/60 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground/50 uppercase tracking-wide">Confirmar senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/25" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="repita a senha"
                  className="w-full bg-surface-2 border border-foreground/8 rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground placeholder-foreground/20 focus:outline-none focus:border-habits/50 transition-colors"
                />
              </div>
            </div>

            <Button type="submit" loading={loading} className="w-full mt-2" size="lg">
              Criar conta
            </Button>
          </form>

          <p className="text-center text-sm text-foreground/40">
            Já tem conta?{" "}
            <Link to="/login" className="text-habits hover:text-habits-light transition-colors font-medium">
              Entrar
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
