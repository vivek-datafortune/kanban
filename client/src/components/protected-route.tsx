import { Navigate } from "react-router-dom"
import { useCookies } from "react-cookie"

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [cookies] = useCookies(["access"])

  if (!cookies.access) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
