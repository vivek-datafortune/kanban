import { useEffect, useRef, useState } from "react"
import { useNavigate, useParams, Link } from "react-router-dom"
import { motion } from "framer-motion"
import { CheckCircle2, XCircle, Loader2, Kanban, Clock, ShieldX, LinkIcon, Info } from "lucide-react"
import { useCookies } from "react-cookie"
import { useAcceptInvitation } from "@/hooks/use-invitations"
import { ApiError } from "@/lib/api"

type Status = "loading" | "success" | "error"
type ErrorKind = "invalid" | "expired" | "revoked" | "already_accepted" | "already_member" | "unknown"

function classifyError(err: unknown): { kind: ErrorKind; message: string; workspaceSlug: string | null } {
  if (err instanceof ApiError) {
    const slug = (err.data.workspace_slug as string) || null
    const msg = err.message

    if (err.status === 404)
      return { kind: "invalid", message: "This invitation link is invalid or no longer exists.", workspaceSlug: null }
    if (msg.includes("expired"))
      return { kind: "expired", message: "This invitation has expired. Ask the workspace admin to resend it.", workspaceSlug: null }
    if (msg.includes("revoked"))
      return { kind: "revoked", message: "This invitation has been revoked by the workspace admin.", workspaceSlug: null }
    if (msg.includes("already accepted"))
      return { kind: "already_accepted", message: "This invitation was already accepted.", workspaceSlug: slug }
    if (msg.includes("already a member"))
      return { kind: "already_member", message: "You're already a member of this workspace.", workspaceSlug: slug }

    return { kind: "unknown", message: msg, workspaceSlug: slug }
  }

  return {
    kind: "unknown",
    message: err instanceof Error ? err.message : "Something went wrong",
    workspaceSlug: null,
  }
}

const errorConfig: Record<ErrorKind, { icon: typeof XCircle; title: string; color: string }> = {
  invalid:          { icon: LinkIcon,     title: "Invalid Link",          color: "text-red-500" },
  expired:          { icon: Clock,        title: "Invitation Expired",    color: "text-amber-500" },
  revoked:          { icon: ShieldX,      title: "Invitation Revoked",    color: "text-red-500" },
  already_accepted: { icon: Info,         title: "Already Accepted",      color: "text-blue-500" },
  already_member:   { icon: CheckCircle2, title: "Already a Member",      color: "text-green-500" },
  unknown:          { icon: XCircle,      title: "Something Went Wrong",  color: "text-red-500" },
}

export default function InvitePage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [cookies] = useCookies(["access"])
  const { mutateAsync: accept } = useAcceptInvitation()
  const [status, setStatus] = useState<Status>("loading")
  const [message, setMessage] = useState("")
  const [workspaceSlug, setWorkspaceSlug] = useState<string | null>(null)
  const [errorKind, setErrorKind] = useState<ErrorKind>("unknown")
  const hasRun = useRef(false)

  useEffect(() => {
    if (!token) {
      navigate("/", { replace: true })
      return
    }

    // Not logged in — redirect to login with next param
    if (!cookies.access) {
      sessionStorage.setItem("invite_next", `/invite/${token}`)
      navigate(`/login?next=/invite/${token}`, { replace: true })
      return
    }

    if (hasRun.current) return
    hasRun.current = true

    accept(token)
      .then((data) => {
        setStatus("success")
        setMessage(data.detail)
        setWorkspaceSlug(data.workspace_slug ?? null)
        if (data.workspace_slug) {
          setTimeout(() => navigate(`/w/${data.workspace_slug}`, { replace: true }), 2000)
        }
      })
      .catch((err: unknown) => {
        const classified = classifyError(err)
        setStatus("error")
        setErrorKind(classified.kind)
        setMessage(classified.message)
        setWorkspaceSlug(classified.workspaceSlug)
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-glass-bg flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md glass-strong rounded-3xl p-10 text-center"
      >
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 150 }}
          className="flex items-center justify-center gap-3 mb-8"
        >
          <div className="rounded-2xl p-3 bg-primary/10">
            <Kanban className="size-8 text-primary" strokeWidth={2.5} />
          </div>
        </motion.div>

        {status === "loading" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <Loader2 className="size-10 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Accepting invitation...</p>
          </motion.div>
        )}

        {status === "success" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4"
          >
            <CheckCircle2 className="size-12 text-green-500 mx-auto" />
            <h2 className="text-xl font-bold text-foreground">{message}</h2>
            <p className="text-sm text-muted-foreground">
              Redirecting to your workspace...
            </p>
            {workspaceSlug && (
              <Link
                to={`/w/${workspaceSlug}`}
                className="inline-block mt-2 text-sm text-primary hover:underline"
              >
                Go now
              </Link>
            )}
          </motion.div>
        )}

        {status === "error" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4"
          >
            {(() => {
              const config = errorConfig[errorKind]
              const Icon = config.icon
              return (
                <>
                  <Icon className={`size-12 mx-auto ${config.color}`} />
                  <h2 className="text-xl font-bold text-foreground">{config.title}</h2>
                </>
              )
            })()}
            <p className="text-sm text-muted-foreground">{message}</p>
            <div className="flex items-center justify-center gap-3 pt-2">
              {workspaceSlug && (
                <Link
                  to={`/w/${workspaceSlug}`}
                  className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-semibold
                             hover:bg-primary/90 transition-colors"
                >
                  Go to workspace
                </Link>
              )}
              <Link
                to="/"
                className="bg-secondary text-foreground border border-border rounded-lg px-4 py-2 text-sm font-semibold
                           hover:bg-secondary/80 transition-colors"
              >
                Go home
              </Link>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
