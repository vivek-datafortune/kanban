import { useEffect, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { motion } from "framer-motion"
import { Loader2 } from "lucide-react"
import { api } from "@/lib/api"
import { useStore } from "@/store/app.store"
import { useCookies } from "react-cookie"
import type { LoginResponse, OAuthProvider } from "@/types/auth"

export default function AuthCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { setUser } = useStore()
  const [, setCookie] = useCookies(["access", "refresh"])
  const [status, setStatus] = useState<"loading" | "error">("loading")
  const [errorMsg, setErrorMsg] = useState("")
  const hasRun = useRef(false)

  useEffect(() => {
    const code = searchParams.get("code")
    const provider = (searchParams.get("provider") || "google") as OAuthProvider

    if (!code) {
      navigate("/login", { replace: true })
      return
    }

    if (hasRun.current) return
    hasRun.current = true

    api
      .post<LoginResponse>(`/auth/${provider}/`, { code })
      .then((data) => {
        setCookie("access", data.access, { path: "/", maxAge: 3600, sameSite: "lax" })
        setCookie("refresh", data.refresh, { path: "/", maxAge: 604800, sameSite: "lax" })
        setUser(data.user)
        // Check for a pending redirect (e.g. invitation accept)
        const next = sessionStorage.getItem("invite_next")
        if (next) {
          sessionStorage.removeItem("invite_next")
          navigate(next, { replace: true })
        } else {
          navigate("/", { replace: true })
        }
      })
      .catch((err) => {
        setStatus("error")
        setErrorMsg(err?.message || "Something went wrong")
        setTimeout(() => navigate("/login", { replace: true }), 3000)
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-glass-bg flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-strong rounded-3xl p-10
                   text-center max-w-sm w-full"
      >
        {status === "error" ? (
          <>
            <div className="rounded-2xl w-16 h-16 bg-destructive/10 border border-destructive/20
                            flex items-center justify-center mx-auto mb-6">
              <span className="text-destructive text-3xl font-bold">!</span>
            </div>
            <h2 className="text-xl font-bold text-foreground mb-3">Login Failed</h2>
            <p className="font-medium text-muted-foreground">{errorMsg}</p>
            <p className="text-sm font-medium text-muted-foreground/60 mt-4">
              Redirecting to login...
            </p>
          </>
        ) : (
          <>
            <Loader2 className="size-10 animate-spin mx-auto mb-6 text-primary" strokeWidth={2.5} />
            <h2 className="text-xl font-bold text-foreground">Signing you in...</h2>
            <p className="font-medium text-muted-foreground mt-2">Hold tight!</p>
          </>
        )}
      </motion.div>
    </div>
  )
}

