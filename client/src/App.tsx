import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import LoginPage from "@/pages/login"
import AuthCallbackPage from "@/pages/auth-callback"
import InvitePage from "@/pages/invite"
import HomePage from "@/pages/home"
import CreateWorkspacePage from "@/pages/create-workspace"
import WorkspacePage from "@/pages/workspace"
import WorkspaceSettingsPage from "@/pages/workspace-settings"
import BoardPage from "@/pages/board"
import CardPage from "@/pages/card"
import TemplatesPage from "@/pages/templates"
import AnalyticsPage from "@/pages/analytics"
import AppLayout from "@/components/app-layout"
import ProtectedRoute from "@/components/protected-route"
import { useTheme } from "@/hooks/use-theme"

function App() {
  useTheme()

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/invite/:token" element={<InvitePage />} />
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<HomePage />} />
          <Route path="/create-workspace" element={<CreateWorkspacePage />} />
          <Route path="/w/:slug" element={<WorkspacePage />} />
          <Route path="/w/:slug/settings" element={<WorkspaceSettingsPage />} />
          <Route path="/w/:slug/b/:boardId" element={<BoardPage />} />
          <Route path="/w/:slug/b/:boardId/c/:cardId" element={<CardPage />} />
          <Route path="/w/:slug/templates" element={<TemplatesPage />} />
          <Route path="/w/:slug/analytics" element={<AnalyticsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

