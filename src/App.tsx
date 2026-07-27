import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ModuleProvider } from "@/contexts/ModuleContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoginPage } from "@/pages/auth/LoginPage";
import { SignupPage } from "@/pages/auth/SignupPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { ModulesPage } from "@/pages/ModulesPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { ComingSoonPage } from "@/pages/ComingSoonPage";
import { StudiesPage } from "@/pages/estudos/StudiesPage";
import { StudyProjectPage } from "@/pages/estudos/StudyProjectPage";
import { StudyTopicPage } from "@/pages/estudos/StudyTopicPage";

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

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (session) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "rgb(var(--color-surface-2))",
                color: "rgb(var(--color-foreground))",
                border: "1px solid rgb(var(--color-foreground) / 0.08)",
                borderRadius: "12px",
                fontSize: "14px",
              },
              success: { iconTheme: { primary: "#22c55e", secondary: "#fff" } },
              error: { iconTheme: { primary: "#ef4444", secondary: "#fff" } },
            }}
          />

          <Routes>
            {/* ── Public ── */}
            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/cadastro" element={<PublicRoute><SignupPage /></PublicRoute>} />

            {/* ── Protected ── */}
            <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            {/* Legacy path kept for bookmarks; personalization now lives in the profile. */}
            <Route path="/modulos" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/perfil" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

            {/* Module routes */}
            <Route path="/tarefas" element={<ProtectedRoute><ComingSoonPage moduleName="Módulo Tarefas" /></ProtectedRoute>} />
            <Route path="/eventos" element={<ProtectedRoute><ComingSoonPage moduleName="Módulo Eventos" /></ProtectedRoute>} />
            <Route path="/estudos" element={<ProtectedRoute><StudiesPage /></ProtectedRoute>} />
            <Route path="/estudos/:projectId" element={<ProtectedRoute><StudyProjectPage /></ProtectedRoute>} />
            <Route path="/estudos/:projectId/topico/:topicId" element={<ProtectedRoute><StudyTopicPage /></ProtectedRoute>} />
            <Route path="/treinos" element={<ProtectedRoute><ComingSoonPage moduleName="Módulo Treinos" /></ProtectedRoute>} />
            <Route path="/habitos" element={<ProtectedRoute><ComingSoonPage moduleName="Módulo Hábitos" /></ProtectedRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
