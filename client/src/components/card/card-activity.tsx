import { motion } from "framer-motion"
import {
  Plus,
  ArrowRight,
  Pencil,
  Trash2,
  Tag,
  UserPlus,
  UserMinus,
  Loader2,
} from "lucide-react"
import { useCardActivity } from "@/hooks/use-activity"
import type { Activity, ActivityAction } from "@/types/board"

interface CardActivityProps {
  cardId: string
}

const actionConfig: Record<
  ActivityAction,
  { icon: typeof Plus; verb: (d: Record<string, unknown>) => string; color: string }
> = {
  "card.created": {
    icon: Plus,
    verb: (d) => `created this card in **${d.list || "a list"}**`,
    color: "text-green-500 bg-green-500/10",
  },
  "card.moved": {
    icon: ArrowRight,
    verb: (d) => `moved this card from **${d.from_list}** to **${d.to_list}**`,
    color: "text-blue-500 bg-blue-500/10",
  },
  "card.updated": {
    icon: Pencil,
    verb: (d) => {
      const parts: string[] = []
      if (d.title) parts.push("title")
      if (d.description) parts.push("description")
      if (d.due_date) parts.push("due date")
      return `updated the ${parts.join(" and ") || "card"}`
    },
    color: "text-amber-500 bg-amber-500/10",
  },
  "card.deleted": {
    icon: Trash2,
    verb: (d) => `deleted card **${d.title}**`,
    color: "text-red-500 bg-red-500/10",
  },
  "label.added": {
    icon: Tag,
    verb: (d) => `added label **${d.label_name}**`,
    color: "text-purple-500 bg-purple-500/10",
  },
  "label.removed": {
    icon: Tag,
    verb: (d) => `removed label **${d.label_name}**`,
    color: "text-muted-foreground bg-secondary",
  },
  "member.added": {
    icon: UserPlus,
    verb: (d) => `added **${d.member_name || d.member_email}** as assignee`,
    color: "text-indigo-500 bg-indigo-500/10",
  },
  "member.removed": {
    icon: UserMinus,
    verb: (d) => `removed **${d.member_name || d.member_email}** as assignee`,
    color: "text-muted-foreground bg-secondary",
  },
}

function formatVerb(text: string) {
  // Convert **bold** markers to spans
  const parts = text.split(/\*\*(.*?)\*\*/)
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} className="font-semibold text-foreground">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    )
  )
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const date = new Date(dateStr).getTime()
  const diff = Math.floor((now - date) / 1000)

  if (diff < 60) return "just now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(dateStr).toLocaleDateString()
}

function ActivityEntry({ activity }: { activity: Activity }) {
  const config = actionConfig[activity.action] || actionConfig["card.updated"]
  const Icon = config.icon
  const actorName =
    activity.actor.first_name
      ? `${activity.actor.first_name} ${activity.actor.last_name}`
      : activity.actor.email

  return (
    <div className="flex gap-3 py-2">
      {/* Icon */}
      <div
        className={`size-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${config.color}`}
      >
        <Icon className="size-3.5" />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground">{actorName}</span>{" "}
          {formatVerb(config.verb(activity.details))}
        </p>
        <p className="text-[11px] text-muted-foreground/60 mt-0.5">
          {timeAgo(activity.created_at)}
        </p>
      </div>
    </div>
  )
}

export default function CardActivity({ cardId }: CardActivityProps) {
  const {
    data,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useCardActivity(cardId)

  const activities = data?.pages.flatMap((p) => p.results) ?? []

  return (
    <div>

      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </div>
      ) : activities.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">No activity yet</p>
      ) : (
        <div className="space-y-0.5">
          {activities.map((activity, i) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.2,
                delay: i < 10 ? i * 0.03 : 0,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
            >
              <ActivityEntry activity={activity} />
            </motion.div>
          ))}

          {hasNextPage && (
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="text-sm text-primary hover:underline cursor-pointer mt-2 flex items-center gap-1.5"
            >
              {isFetchingNextPage ? (
                <Loader2 className="size-3 animate-spin" />
              ) : null}
              Load more
            </button>
          )}
        </div>
      )}
    </div>
  )
}
