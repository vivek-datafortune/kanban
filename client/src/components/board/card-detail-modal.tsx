import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  X, AlignLeft, Tag, Users, Calendar, Trash2, CheckCircle2,
  Plus, Pencil, ArrowLeft,
} from "lucide-react"
import { useUpdateCard, useDeleteCard, useAddCardLabel, useRemoveCardLabel } from "@/hooks/use-cards"
import { useCreateLabel, useUpdateLabel, useDeleteLabel } from "@/hooks/use-labels"
import { cn } from "@/lib/utils"
import type { Card, Label, List } from "@/types/board"

interface CardDetailModalProps {
  card: Card
  boardId: string
  lists: List[]
  labels: Label[]
  onClose: () => void
}

export default function CardDetailModal({
  card,
  boardId,
  lists,
  labels,
  onClose,
}: CardDetailModalProps) {
  const { mutate: updateCard } = useUpdateCard(boardId)
  const { mutate: deleteCard } = useDeleteCard(boardId)
  const { mutate: addLabel } = useAddCardLabel(boardId)
  const { mutate: removeLabel } = useRemoveCardLabel(boardId)
  const { mutate: createLabel, isPending: isCreatingLabel } = useCreateLabel(boardId)
  const { mutate: updateLabel } = useUpdateLabel(boardId)
  const { mutate: deleteLabel } = useDeleteLabel(boardId)

  const [title, setTitle] = useState(card.title)
  const [description, setDescription] = useState(card.description)
  const [isEditingDesc, setIsEditingDesc] = useState(false)
  const [showLabels, setShowLabels] = useState(false)
  const [labelView, setLabelView] = useState<"list" | "create" | "edit">("list")
  const [editingLabel, setEditingLabel] = useState<Label | null>(null)
  const [labelName, setLabelName] = useState("")
  const [labelColor, setLabelColor] = useState("#6366f1")
  const [dueDate, setDueDate] = useState(card.due_date?.slice(0, 16) ?? "")

  const currentList = lists.find((l) => l.cards.some((c) => c.id === card.id))
  const cardLabelIds = new Set(card.labels.map((l) => l.id))

  const handleTitleBlur = () => {
    if (title.trim() && title.trim() !== card.title) {
      updateCard({ id: card.id, title: title.trim() })
    }
  }

  const handleDescSave = () => {
    if (description !== card.description) {
      updateCard({ id: card.id, description })
    }
    setIsEditingDesc(false)
  }

  const handleDueDateChange = (value: string) => {
    setDueDate(value)
    updateCard({
      id: card.id,
      due_date: value ? new Date(value).toISOString() : null,
    })
  }

  const handleToggleComplete = () => {
    updateCard({ id: card.id, is_completed: !card.is_completed })
  }

  const handleDelete = () => {
    deleteCard(card.id)
    onClose()
  }

  const handleLabelToggle = (labelId: string) => {
    if (cardLabelIds.has(labelId)) {
      removeLabel({ cardId: card.id, labelId })
    } else {
      addLabel({ cardId: card.id, labelId })
    }
  }

  const LABEL_COLORS = [
    "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316",
    "#eab308", "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
  ]

  const openCreateLabel = () => {
    setLabelName("")
    setLabelColor(LABEL_COLORS[0])
    setEditingLabel(null)
    setLabelView("create")
  }

  const openEditLabel = (label: Label) => {
    setEditingLabel(label)
    setLabelName(label.name)
    setLabelColor(label.color)
    setLabelView("edit")
  }

  const handleSaveLabel = () => {
    if (!labelName.trim()) return
    if (labelView === "edit" && editingLabel) {
      updateLabel({ id: editingLabel.id, name: labelName.trim(), color: labelColor })
    } else {
      createLabel({ name: labelName.trim(), color: labelColor })
    }
    setLabelView("list")
  }

  const handleDeleteLabel = () => {
    if (!editingLabel) return
    deleteLabel(editingLabel.id)
    setLabelView("list")
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-start justify-center pt-16 px-4 overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose()
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.97 }}
          className="glass-strong rounded-2xl w-full max-w-2xl mb-16"
        >
          {/* Header */}
          <div className="px-6 pt-6 pb-2 flex items-start gap-3">
            <div className="flex-1">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleBlur}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur()
                }}
                className="text-lg font-bold text-foreground bg-transparent w-full focus:outline-none
                           focus:bg-secondary focus:rounded-lg focus:px-2 focus:py-1 focus:border focus:border-border transition-all"
              />
              <p className="text-xs text-muted-foreground mt-1">
                in list <span className="font-semibold">{currentList?.title ?? "..."}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground cursor-pointer p-1"
            >
              <X className="size-5" />
            </button>
          </div>

          <div className="flex gap-4 px-6 pb-6">
            {/* Main content */}
            <div className="flex-1 space-y-5">
              {/* Labels */}
              {card.labels.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {card.labels.map((label) => (
                    <span
                      key={label.id}
                      className="text-xs font-semibold text-white px-3 py-1 rounded-lg"
                      style={{ backgroundColor: label.color }}
                    >
                      {label.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Description */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlignLeft className="size-4 text-muted-foreground" />
                  <h4 className="text-sm font-semibold text-foreground">Description</h4>
                </div>
                {isEditingDesc ? (
                  <div className="space-y-2">
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full text-foreground rounded-lg px-4 py-3 text-sm bg-secondary border border-border
                                 focus:outline-none resize-none min-h-[120px]"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleDescSave}
                        className="bg-primary text-primary-foreground rounded-lg px-4 py-1.5 text-sm font-semibold
                                   hover:bg-primary/90 transition-colors cursor-pointer"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setDescription(card.description)
                          setIsEditingDesc(false)
                        }}
                        className="text-muted-foreground hover:text-foreground cursor-pointer px-2 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => setIsEditingDesc(true)}
                    className={cn(
                      "bg-secondary border border-border rounded-lg px-4 py-3 text-sm cursor-pointer min-h-[60px]",
                      description ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {description || "Add a more detailed description..."}
                  </div>
                )}
              </div>

              {/* Members */}
              {card.members.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="size-4 text-muted-foreground" />
                    <h4 className="text-sm font-semibold text-foreground">Members</h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {card.members.map((member) => (
                      <div
                        key={member.pk}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 bg-secondary border border-border"
                      >
                        <div className="size-6 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="text-xs font-bold text-primary">
                            {(member.first_name?.[0] || member.email[0]).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-sm text-foreground">
                          {member.first_name || member.email}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar actions */}
            <div className="w-40 space-y-2 shrink-0">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Actions
              </p>

              {/* Labels toggle */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowLabels(!showLabels)
                    setLabelView("list")
                  }}
                  className="w-full flex items-center gap-2 bg-secondary border border-border rounded-lg px-3 py-2 text-sm font-medium
                             text-foreground hover:bg-secondary/80 transition-all cursor-pointer"
                >
                  <Tag className="size-4" />
                  Labels
                </button>
                {showLabels && (
                  <div className="absolute right-0 top-10 glass-strong rounded-lg p-3 z-10 w-56">
                    {labelView === "list" && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold text-muted-foreground mb-2">Labels</p>
                        {labels.map((label) => (
                          <div key={label.id} className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleLabelToggle(label.id)}
                              className={cn(
                                "flex-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-left cursor-pointer transition-all",
                                cardLabelIds.has(label.id)
                                  ? "ring-2 ring-primary"
                                  : "hover:opacity-80"
                              )}
                              style={{ backgroundColor: label.color, color: "white" }}
                            >
                              {label.name}
                            </button>
                            <button
                              onClick={() => openEditLabel(label)}
                              className="text-muted-foreground hover:text-foreground cursor-pointer p-1 shrink-0"
                            >
                              <Pencil className="size-3" />
                            </button>
                          </div>
                        ))}
                        {labels.length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-2">
                            No labels yet
                          </p>
                        )}
                        <button
                          onClick={openCreateLabel}
                          className="w-full flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium
                                     bg-secondary border border-border text-foreground hover:bg-secondary/80
                                     transition-all cursor-pointer mt-2"
                        >
                          <Plus className="size-3.5" />
                          Create label
                        </button>
                      </div>
                    )}

                    {(labelView === "create" || labelView === "edit") && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setLabelView("list")}
                            className="text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
                          >
                            <ArrowLeft className="size-4" />
                          </button>
                          <p className="text-xs font-semibold text-muted-foreground">
                            {labelView === "create" ? "Create label" : "Edit label"}
                          </p>
                        </div>

                        {/* Preview */}
                        <div
                          className="rounded-lg px-3 py-2 text-sm text-white font-medium"
                          style={{ backgroundColor: labelColor }}
                        >
                          {labelName || "Label preview"}
                        </div>

                        {/* Name input */}
                        <input
                          type="text"
                          value={labelName}
                          onChange={(e) => setLabelName(e.target.value)}
                          placeholder="Label name"
                          className="w-full text-foreground rounded-lg px-3 py-2 text-sm bg-secondary border border-border
                                     placeholder:text-muted-foreground focus:outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveLabel()
                          }}
                        />

                        {/* Color picker */}
                        <div className="flex flex-wrap gap-1.5">
                          {LABEL_COLORS.map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setLabelColor(c)}
                              className={cn(
                                "size-6 rounded-md cursor-pointer transition-all",
                                labelColor === c
                                  ? "ring-2 ring-primary ring-offset-2 ring-offset-card scale-110"
                                  : "hover:scale-105"
                              )}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleSaveLabel}
                            disabled={!labelName.trim() || isCreatingLabel}
                            className="flex-1 bg-primary text-primary-foreground rounded-lg px-3 py-1.5 text-sm font-semibold
                                       hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            {labelView === "create" ? "Create" : "Save"}
                          </button>
                          {labelView === "edit" && (
                            <button
                              onClick={handleDeleteLabel}
                              className="text-destructive hover:bg-destructive/10 rounded-lg p-1.5 cursor-pointer transition-colors"
                              title="Delete label"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
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
                onClick={handleToggleComplete}
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
                onClick={handleDelete}
                className="w-full flex items-center gap-2 bg-secondary border border-border rounded-lg px-3 py-2 text-sm font-medium
                           text-destructive hover:bg-destructive/10 transition-all cursor-pointer"
              >
                <Trash2 className="size-4" />
                Delete
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
