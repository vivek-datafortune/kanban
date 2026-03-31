import { useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { motion } from "framer-motion"
import { Kanban, Loader2 } from "lucide-react"
import { useAuthUrl } from "@/hooks/use-auth"

export default function LoginPage() {
  const { data: msData, isLoading: msLoading } = useAuthUrl("microsoft")
  const { data: gData, isLoading: gLoading } = useAuthUrl("google")
  const [searchParams] = useSearchParams()

  // Store the redirect-after-login URL so auth-callback can use it
  useEffect(() => {
    const next = searchParams.get("next")
    if (next) {
      sessionStorage.setItem("invite_next", next)
    }
  }, [searchParams])

  return (
    <div className="min-h-screen bg-glass-bg flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md glass-strong rounded-3xl p-10"
      >
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 150 }}
          className="flex items-center justify-center gap-3 mb-8"
        >
          <div className="rounded-2xl p-3 bg-primary/10">
            <Kanban className="size-8 text-primary" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Trello
          </h1>
        </motion.div>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center text-base font-medium mb-10 text-muted-foreground"
        >
          Organize anything, together.
        </motion.p>

        {/* Divider */}
        <div className="h-px bg-linear-to-r from-transparent via-border to-transparent mb-8" />

        {/* Social Login Buttons */}
        <div className="flex flex-col gap-5">
          {/* Google */}
          <button
            onClick={() => gData && (window.location.href = gData.authorization_url)}
            disabled={gLoading}
            className="w-full rounded-lg bg-secondary hover:bg-secondary/80
                       px-6 py-4 font-semibold text-foreground text-base
                       disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center justify-center gap-3 cursor-pointer
                       border border-border transition-colors duration-150"
          >
            {gLoading ? (
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            ) : (
              <>
                <GoogleLogo />
                Sign in with Google
              </>
            )}
          </button>

          {/* Microsoft */}
          <button
            onClick={() => msData && (window.location.href = msData.authorization_url)}
            disabled={msLoading}
            className="w-full rounded-lg bg-secondary hover:bg-secondary/80
                       px-6 py-4 font-semibold text-foreground text-base
                       disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center justify-center gap-3 cursor-pointer
                       border border-border transition-colors duration-150"
          >
            {msLoading ? (
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            ) : (
              <>
                <MicrosoftLogo />
                Sign in with Microsoft
              </>
            )}
          </button>
        </div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-xs font-medium mt-8 text-muted-foreground/60 tracking-wider"
        >
          Secure  ·  Fast  ·  Simple
        </motion.p>
      </motion.div>
    </div>
  )
}

function GoogleLogo() {
  return (
    <svg width="21" height="21" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#34A853" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#FBBC05" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  )
}

function MicrosoftLogo() {
  return (
    <svg width="21" height="21" viewBox="0 0 21 21" fill="none">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  )
}

