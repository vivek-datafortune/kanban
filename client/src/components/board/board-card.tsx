import { createPortal } from "react-dom"
import { Draggable } from "@hello-pangea/dnd"
import { Clock, CheckCircle2, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Card } from "@/types/board"

interface BoardCardProps {
  card: Card
  index: number
  onClick?: () => void
}

export default function BoardCard({ card, index, onClick }: BoardCardProps) {
  const hasDescription = !!card.description?.trim()
  const truncatedDesc = card.description?.trim().length > 80
    ? card.description.trim().slice(0, 80) + "…"
    : card.description?.trim()

  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => {
        const child = (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            onClick={onClick}
            className={cn(
              "group/card bg-card border border-transparent rounded-xl px-3.5 py-3 cursor-pointer space-y-2",
              "hover:border-border hover:bg-card/90 transition-all duration-150",
              snapshot.isDragging && "border-primary/30 shadow-xl shadow-black/15 bg-card ring-1 ring-primary/20"
            )}
          >
      {/* Title */}
      <p className="text-sm text-foreground font-medium leading-snug">{card.title}</p>

      {/* Description preview */}
      {hasDescription && (
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
          {truncatedDesc}
        </p>
      )}

      {/* Metadata row — labels + date on same line */}
      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
        {card.labels && card.labels.length > 0 && (
          <>
            {card.labels.map((label) => (
              <span
                key={label.id}
                className="text-[10px] font-semibold text-white px-1.5 py-px rounded"
                style={{ backgroundColor: label.color }}
              >
                {label.name}
              </span>
            ))}
          </>
        )}

        <div className="flex items-center gap-2 ml-auto">
          {card.due_date && (
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[11px] font-medium rounded-md px-1.5 py-0.5",
                card.is_completed
                  ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                  : new Date(card.due_date) < new Date()
                    ? "text-red-500 dark:text-red-400 bg-red-500/10"
                    : "text-muted-foreground bg-secondary"
              )}
            >
              {card.is_completed ? <CheckCircle2 className="size-3" /> : <Clock className="size-3" />}
              {new Date(card.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          )}

          {!card.due_date && card.created_at && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/60">
              <Calendar className="size-3" />
              {new Date(card.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          )}
        </div>
      </div>

      {/* Members */}
      {card.members && card.members.length > 0 && (
            <div className="flex -space-x-1.5 ml-auto">
              {card.members.slice(0, 3).map((member) => (
                <div
                  key={member.pk}
                  className="size-6 rounded-full bg-primary/15 flex items-center justify-center ring-2 ring-card"
                  title={member.first_name || member.email}
                >
                  <span className="text-[10px] font-bold text-primary">
                    {(member.first_name?.[0] || member.email[0]).toUpperCase()}
                  </span>
                </div>
              ))}
              {card.members.length > 3 && (
                <div className="size-6 rounded-full bg-secondary flex items-center justify-center ring-2 ring-card">
                  <span className="text-[10px] font-medium text-muted-foreground">
                    +{card.members.length - 3}
                  </span>
                </div>
              )}
            </div>
      )}
          </div>
        )

        return snapshot.isDragging ? createPortal(child, document.body) : child
      }}
    </Draggable>
  )
}
