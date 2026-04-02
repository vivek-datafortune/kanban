import type { PresenceUser } from "@/hooks/use-board-socket"

const MAX_SHOWN = 5

interface BoardPresenceProps {
  users: PresenceUser[]
}

export default function BoardPresence({ users }: BoardPresenceProps) {
  if (users.length === 0) return null

  const shown = users.slice(0, MAX_SHOWN)
  const extra = users.length - MAX_SHOWN

  return (
    <div className="flex items-center">
      {shown.map((u, i) => (
        <div
          key={u.user_id}
          title={u.name || u.email}
          style={{ zIndex: shown.length - i }}
          className="-ml-2 first:ml-0 size-8 rounded-full bg-primary/20 border-2 border-background flex items-center justify-center text-xs font-bold text-primary select-none"
        >
          {(u.name || u.email).charAt(0).toUpperCase()}
        </div>
      ))}
      {extra > 0 && (
        <div className="-ml-2 size-8 rounded-full bg-secondary border-2 border-background flex items-center justify-center text-xs font-medium text-muted-foreground">
          +{extra}
        </div>
      )}
    </div>
  )
}
