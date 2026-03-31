import { createPortal } from "react-dom"
import { Draggable } from "@hello-pangea/dnd"
import { Clock, CheckCircle2, AlignLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Card } from "@/types/board"

interface BoardCardProps {
  card: Card
  index: number
  onClick?: () => void
}

export default function BoardCard({ card, index, onClick }: BoardCardProps) {
  const hasDescription = !!card.description?.trim()

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
              "group/card bg-card border border-transparent rounded-lg px-3 py-2.5 cursor-pointer",
              "hover:border-border hover:bg-card/90 transition-all duration-150",
              snapshot.isDragging && "border-primary/30 shadow-xl shadow-black/15 bg-card ring-1 ring-primary/20"
            )}
          >
      {/* Labels */}
      {card.labels && card.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {card.labels.map((label) => (
            <span
              key={label.id}
              className="h-1.5 w-8 rounded-full"
              style={{ backgroundColor: label.color }}
              title={label.name}
            />
          ))}
        </div>
      )}

      {/* Title */}
      <p className="text-[13px] text-foreground leading-snug">{card.title}</p>

      {/* Metadata row */}
      {(card.due_date || hasDescription || (card.members && card.members.length > 0)) && (
        <div className="flex items-center gap-1.5 mt-2">
          {card.due_date && (
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[11px] rounded px-1.5 py-0.5",
                card.is_completed
                  ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                  : new Date(card.due_date) < new Date()
                    ? "text-red-500 dark:text-red-400 bg-red-500/10"
                    : "text-muted-foreground"
              )}
            >
              {card.is_completed ? <CheckCircle2 className="size-3" /> : <Clock className="size-3" />}
              {new Date(card.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          )}

          {hasDescription && (
            <AlignLeft className="size-3 text-muted-foreground/50" />
          )}

          {card.members && card.members.length > 0 && (
            <div className="flex -space-x-1 ml-auto">
              {card.members.slice(0, 3).map((member) => (
                <div
                  key={member.pk}
                  className="size-5 rounded-full bg-secondary flex items-center justify-center ring-1 ring-card"
                  title={member.email}
                >
                  <span className="text-[9px] font-medium text-muted-foreground">
                    {(member.first_name?.[0] || member.email[0]).toUpperCase()}
                  </span>
                </div>
              ))}
              {card.members.length > 3 && (
                <div className="size-5 rounded-full bg-secondary flex items-center justify-center ring-1 ring-card">
                  <span className="text-[9px] font-medium text-muted-foreground">
                    +{card.members.length - 3}
                  </span>
                </div>
              )}
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
