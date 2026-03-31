import { motion } from "framer-motion"
import { Kanban, LogOut, User as UserIcon, Sun, Moon, Monitor } from "lucide-react"
import { useStore } from "@/store/app.store"
import { useLogout, useCurrentUser } from "@/hooks/use-auth"
import { useTheme, type Theme } from "@/hooks/use-theme"

export default function DashboardPage() {
  const { user } = useStore()
  const { mutate: logout, isPending } = useLogout()
  const { theme, setTheme } = useTheme()

  // Keep user data fresh
  useCurrentUser()

  const themeOptions: { value: Theme; icon: typeof Sun }[] = [
    { value: "light", icon: Sun },
    { value: "system", icon: Monitor },
    { value: "dark", icon: Moon },
  ]

  return (
    <div className="min-h-screen bg-glass-bg p-6">
      {/* Top bar */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="glass-sm rounded-2xl
                   px-6 py-4 flex items-center justify-between mb-8"
      >
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 rounded-xl p-2">
            <Kanban className="size-5 text-primary" strokeWidth={2.5} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Trello</h1>
        </div>

        <div className="flex items-center gap-4">
          {/* Theme toggle */}
          <div className="flex items-center bg-secondary/60 border border-border rounded-xl p-1 gap-1">
            {themeOptions.map(({ value, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={`rounded-lg p-2 transition-all duration-200 cursor-pointer ${
                  theme === value
                    ? "bg-background shadow-sm text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="size-4" strokeWidth={2.5} />
              </button>
            ))}
          </div>

          {/* User info */}
          <div className="flex items-center gap-2 bg-secondary/40 border border-border rounded-xl
                          px-4 py-2">
            <UserIcon className="size-4 text-muted-foreground" strokeWidth={2.5} />
            <span className="font-medium text-sm text-foreground truncate max-w-[200px]">
              {user?.first_name || user?.email || "User"}
            </span>
          </div>

          {/* Logout */}
          <button
            onClick={() => logout()}
            disabled={isPending}
            className="bg-secondary hover:bg-secondary/80 text-destructive rounded-lg
                       border border-border
                       px-4 py-2 font-semibold text-sm
                       flex items-center gap-2 cursor-pointer transition-colors"
          >
            <LogOut className="size-4" strokeWidth={2.5} />
            Logout
          </button>
        </div>
      </motion.header>

      {/* Main content area */}
      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="glass-strong rounded-3xl
                        p-10 text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            Welcome{user?.first_name ? `, ${user.first_name}` : ""}!
          </h2>
          <p className="font-medium text-muted-foreground text-lg">
            Your boards will appear here.
          </p>
        </div>
      </motion.main>
    </div>
  )
}
