import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ModuleProvider } from "@/contexts/ModuleContext";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoginPage } from "@/pages/auth/LoginPage";
import { SignupPage } from "@/pages/auth/SignupPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { ModulesPage } from "@/pages/ModulesPage";
import { ComingSoonPage } from "@/pages/ComingSoonPage";

/**
 * ProtectedRoute — redirects unauthenticated users to /login.
 * Wraps the authenticated app shell with the module system context.
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" replace />;
  return (
    <ModuleProvider>
      <AppLayout>{children}</AppLayout>
    </ModuleProvider>
  );
}

/**
 * PublicRoute — redirects authenticated users away from auth pages.
 */
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (session) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        {/* Global toast notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#1c1c26",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "12px",
              fontSize: "14px",
            },
            success: {
              iconTheme: { primary: "#22c55e", secondary: "#fff" },
            },
            error: {
              iconTheme: { primary: "#ef4444", secondary: "#fff" },
            },
          }}
        />

        <Routes>
          {/* ── Public routes ──────────────────────────── */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />
          <Route
            path="/cadastro"
            element={
              <PublicRoute>
                <SignupPage />
              </PublicRoute>
            }
          />

          {/* ── Protected routes ───────────────────────── */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/modulos"
            element={
              <ProtectedRoute>
                <ModulesPage />
              </ProtectedRoute>
            }
          />

          {/* Module routes — placeholders until Etapas 2–6 */}
          <Route
            path="/tarefas"
            element={
              <ProtectedRoute>
                <ComingSoonPage moduleName="Módulo Tarefas" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/eventos"
            element={
              <ProtectedRoute>
                <ComingSoonPage moduleName="Módulo Eventos" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/estudos"
            element={
              <ProtectedRoute>
                <ComingSoonPage moduleName="Módulo Estudos" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/treinos"
            element={
              <ProtectedRoute>
                <ComingSoonPage moduleName="Módulo Treinos" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/habitos"
            element={
              <ProtectedRoute>
                <ComingSoonPage moduleName="Módulo Hábitos" />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
