import { useState } from "react"
import { Tag, Calendar, CheckCircle2, Trash2 } from "lucide-react"
import { useUpdateCard, useAddCardLabel, useRemoveCardLabel } from "@/hooks/use-cards"
import { cn } from "@/lib/utils"
import LabelPicker from "./label-picker"
import type { Card, Label } from "@/types/board"

interface CardSidebarProps {
  card: Card
  boardId: string
  labels: Label[]
  onDelete: () => void
}

export default function CardSidebar({ card, boardId, labels, onDelete }: CardSidebarProps) {
  const { mutate: updateCard } = useUpdateCard(boardId)
  const { mutate: addLabel } = useAddCardLabel(boardId)
  const { mutate: removeLabel } = useRemoveCardLabel(boardId)

  const [showLabels, setShowLabels] = useState(false)
  const [dueDate, setDueDate] = useState(card.due_date?.slice(0, 16) ?? "")

  const cardLabelIds = new Set(card.labels.map((l) => l.id))

  const handleDueDateChange = (value: string) => {
    setDueDate(value)
    updateCard({ id: card.id, due_date: value ? new Date(value).toISOString() : null })
  }

  const handleLabelToggle = (labelId: string) => {
    if (cardLabelIds.has(labelId)) {
      removeLabel({ cardId: card.id, labelId })
    } else {
      addLabel({ cardId: card.id, labelId })
    }
  }

  return (
    <div className="w-48 space-y-2 shrink-0">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Actions</p>

      {/* Labels */}
      <div className="relative">
        <button
          onClick={() => setShowLabels(!showLabels)}
          className="w-full flex items-center gap-2 bg-secondary border border-border rounded-lg px-3 py-2 text-sm font-medium
                     text-foreground hover:bg-secondary/80 transition-all cursor-pointer"
        >
          <Tag className="size-4" />
          Labels
        </button>
        {showLabels && (
          <div className="absolute right-0 top-10 glass-strong rounded-xl p-3 z-10 w-56">
            <LabelPicker boardId={boardId} labels={labels} activeIds={cardLabelIds} onToggle={handleLabelToggle} />
          </div>
        )}
      </div>

      {/* Due date */}
      <div className="w-full flex items-center gap-2 bg-secondary border border-border rounded-lg px-3 py-2 text-sm font-medium text-foreground">
        <Calendar className="size-4 shrink-0" />
        <input
          type="datetime-local"
          value={dueDate}
          onChange={(e) => handleDueDateChange(e.target.value)}
          className="bg-transparent text-foreground text-xs focus:outline-none w-full cursor-pointer"
        />
      </div>

      {/* Complete toggle */}
      <button
        onClick={() => updateCard({ id: card.id, is_completed: !card.is_completed })}
        className={cn(
          "w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all cursor-pointer",
          card.is_completed
            ? "bg-green-500/20 text-green-700 dark:text-green-400"
            : "bg-secondary border border-border text-foreground hover:bg-secondary/80"
        )}
      >
        <CheckCircle2 className="size-4" />
        {card.is_completed ? "Completed" : "Mark Complete"}
      </button>

      {/* Delete */}
      <button
        onClick={onDelete}
        className="w-full flex items-center gap-2 bg-secondary border border-border rounded-lg px-3 py-2 text-sm font-medium
                   text-destructive hover:bg-destructive/10 transition-all cursor-pointer"
      >
        <Trash2 className="size-4" />
        Delete
      </button>
    </div>
  )
}
