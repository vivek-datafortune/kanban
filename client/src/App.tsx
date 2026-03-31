import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import LoginPage from "@/pages/login"
import AuthCallbackPage from "@/pages/auth-callback"
import HomePage from "@/pages/home"
import CreateWorkspacePage from "@/pages/create-workspace"
import WorkspacePage from "@/pages/workspace"
import BoardPage from "@/pages/board"
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
          <Route path="/w/:slug/b/:boardId" element={<BoardPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

