import { useState, useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { Bell, CheckCheck, UserPlus, MessageSquare, AtSign, Loader2 } from "lucide-react"
import { useUnreadCount, useNotifications, useMarkRead, useMarkAllRead, useNotificationSocket } from "@/hooks/use-notifications"
import { cn } from "@/lib/utils"
import type { Notification } from "@/types/notification"

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return "just now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

const TYPE_ICON: Record<Notification["type"], React.ElementType> = {
  assigned: UserPlus,
  comment_reply: MessageSquare,
  mentioned: AtSign,
}

const TYPE_COLOR: Record<Notification["type"], string> = {
  assigned: "bg-primary/10 text-primary",
  comment_reply: "bg-violet-500/10 text-violet-500",
  mentioned: "bg-amber-500/10 text-amber-500",
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const { data: unreadData } = useUnreadCount()
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useNotifications()
  const { mutate: markRead } = useMarkRead()
  const { mutate: markAllRead, isPending: isMarkingAll } = useMarkAllRead()

  // Connect to WS for real-time delivery
  useNotificationSocket()

  const unreadCount = unreadData?.count ?? 0
  const allNotifications = data?.pages.flatMap((p) => p.results) ?? []

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  const handleNotificationClick = (n: Notification) => {
    if (!n.is_read) markRead(n.id)
    setOpen(false)
    if (n.card_id && n.workspace_slug && n.board_id) {
      navigate(`/w/${n.workspace_slug}/b/${n.board_id}/c/${n.card_id}`)
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((p) => !p)}
        className={cn(
          "relative p-2 rounded-xl transition-colors cursor-pointer",
          open
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
        )}
        title="Notifications"
      >
        <Bell className="size-4" strokeWidth={2.5} />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-0.5 -right-0.5 size-4 rounded-full bg-primary text-primary-foreground
                         text-[10px] font-bold flex items-center justify-center leading-none"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 bottom-full mb-2 w-80 bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
              <div className="flex items-center gap-2">
                <Bell className="size-3.5 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">Notifications</span>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllRead()}
                  disabled={isMarkingAll}
                  className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  {isMarkingAll ? <Loader2 className="size-3 animate-spin" /> : <CheckCheck className="size-3" />}
                  Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                </div>
              ) : allNotifications.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
                  <Bell className="size-8 opacity-20" />
                  <p className="text-sm">No notifications yet.</p>
                </div>
              ) : (
                <>
                  {allNotifications.map((n) => {
                    const Icon = TYPE_ICON[n.type] ?? Bell
                    return (
                      <button
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className={cn(
                          "w-full flex items-start gap-3 px-4 py-3 text-left transition-colors cursor-pointer",
                          "hover:bg-secondary/40 border-b border-border/30 last:border-0",
                          !n.is_read && "bg-primary/5"
                        )}
                      >
                        <div className={cn("size-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5", TYPE_COLOR[n.type])}>
                          <Icon className="size-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-xs leading-snug", n.is_read ? "text-muted-foreground" : "text-foreground font-medium")}>
                            {n.title}
                          </p>
                          {n.body && (
                            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{n.body}</p>
                          )}
                          <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo(n.created_at)}</p>
                        </div>
                        {!n.is_read && (
                          <div className="size-2 rounded-full bg-primary shrink-0 mt-1.5" />
                        )}
                      </button>
                    )
                  })}
                  {hasNextPage && (
                    <button
                      onClick={() => fetchNextPage()}
                      disabled={isFetchingNextPage}
                      className="w-full py-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      {isFetchingNextPage && <Loader2 className="size-3 animate-spin" />}
                      Load more
                    </button>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
