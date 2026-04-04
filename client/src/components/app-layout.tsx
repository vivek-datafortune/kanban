import { NavLink, Outlet, useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { Kanban, LogOut, Sun, Moon, Monitor, Plus, Layers, Square } from "lucide-react"
import { useStore } from "@/store/app.store"
import { useLogout, useCurrentUser } from "@/hooks/use-auth"
import { useTheme, type Theme } from "@/hooks/use-theme"
import { useWorkspaces } from "@/hooks/use-workspaces"
import NotificationBell from "@/components/notification-bell"
import { cn } from "@/lib/utils"
import { useElapsedSeconds, useStopTimer } from "@/hooks/use-time-tracking"

function formatElapsed(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`
}

function ActiveTimerPill() {
  const activeTimer = useStore((s) => s.activeTimer)
  const navigate = useNavigate()
  const elapsed = useElapsedSeconds(activeTimer?.startedAt ?? null)
  const { mutate: stop, isPending } = useStopTimer(
    activeTimer?.cardId ?? "",
    activeTimer?.boardId ?? "",
  )

  return (
    <AnimatePresence>
      {activeTimer && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          className="mx-3 rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2.5 space-y-1.5"
        >
          <div className="flex items-center gap-1.5">
            <span className="relative flex size-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full size-2 bg-red-500" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-500">Recording</span>
            <span className="ml-auto text-xs font-bold tabular-nums text-red-500">{formatElapsed(elapsed)}</span>
          </div>
          <button
            onClick={() => navigate(`/w/${activeTimer.boardId?.split("-")[0]}/b/${activeTimer.boardId}`)}
            className="text-[11px] text-foreground/80 truncate w-full text-left hover:text-foreground transition-colors cursor-pointer"
          >
            {activeTimer.cardTitle}
          </button>
          <button
            onClick={() => stop()}
            disabled={isPending}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-colors cursor-pointer disabled:opacity-60"
          >
            <Square className="w-3 h-3 fill-white" />
            Stop Timer
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default function AppLayout() {
  const { user } = useStore()
  const { mutate: logout, isPending } = useLogout()
  const { theme, setTheme } = useTheme()
  const { data: workspaces } = useWorkspaces()

  useCurrentUser()

  const themeOptions: { value: Theme; icon: typeof Sun }[] = [
    { value: "light", icon: Sun },
    { value: "system", icon: Monitor },
    { value: "dark", icon: Moon },
  ]

  return (
    <div className="h-full bg-glass-bg flex">
      {/* Sidebar */}
      <motion.aside
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-64 shrink-0 glass-strong flex flex-col h-screen sticky top-0"
      >
        {/* Logo */}
        <div className="px-5 py-5 flex items-center gap-3">
          <div className="rounded-xl p-2 bg-primary/10">
            <Kanban className="size-5 text-primary" strokeWidth={2.5} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Trello</h1>
        </div>

        {/* Divider */}
        <div className="mx-5 h-px bg-linear-to-r from-transparent via-border to-transparent" />

        {/* Workspaces nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Workspaces
          </p>
          {workspaces?.map((ws) => (
            <NavLink
              key={ws.id}
              to={`/w/${ws.slug}`}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-secondary/60"
                )
              }
            >
              <Layers className="size-4 shrink-0" strokeWidth={2} />
              <span className="truncate">{ws.name}</span>
            </NavLink>
          ))}
          <NavLink
            to="/create-workspace"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all duration-200"
          >
            <Plus className="size-4 shrink-0" strokeWidth={2} />
            <span>New Workspace</span>
          </NavLink>
        </nav>

        {/* Bottom section */}
        <div className="px-3 pb-4 space-y-3">
          {/* Active timer */}
          <ActiveTimerPill />

          {/* Theme toggle */}
          <div className="flex items-center justify-center rounded-xl bg-secondary/60 border border-border p-1 gap-1">
            {themeOptions.map(({ value, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={cn(
                  "rounded-lg p-2 transition-all duration-200 cursor-pointer flex-1 flex items-center justify-center",
                  theme === value
                    ? "bg-background shadow-sm text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="size-4" strokeWidth={2.5} />
              </button>
            ))}
          </div>

          {/* User + logout */}
          <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 bg-secondary/40 border border-border">
            <div className="size-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
              <span className="text-primary font-bold text-sm">
                {(user?.first_name?.[0] || user?.email?.[0] || "?").toUpperCase()}
              </span>
            </div>
            <span className="font-medium text-sm text-foreground truncate flex-1">
              {user?.first_name || user?.email || "User"}
            </span>
            <NotificationBell />
            <button
              onClick={() => logout()}
              disabled={isPending}
              className="text-muted-foreground hover:text-destructive transition-colors cursor-pointer p-1"
              title="Logout"
            >
              <LogOut className="size-4" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Main content */}
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  )
}
