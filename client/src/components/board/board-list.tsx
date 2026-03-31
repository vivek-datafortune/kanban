import { useState } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { Draggable, Droppable } from "@hello-pangea/dnd"
import { GripVertical, MoreHorizontal, Plus, Trash2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useCreateCard } from "@/hooks/use-cards"
import { useUpdateList, useDeleteList } from "@/hooks/use-lists"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import type { List } from "@/types/board"
import BoardCard from "./board-card"

interface BoardListProps {
  list: List
  index: number
  boardId: string
  onCardClick: (cardId: string) => void
}

export default function BoardList({ list, index, boardId, onCardClick }: BoardListProps) {
  const { mutate: createCard, isPending: isCreating } = useCreateCard(boardId)
  const { mutate: updateList } = useUpdateList(boardId)
  const { mutate: deleteList } = useDeleteList(boardId)

  const [showAddCard, setShowAddCard] = useState(false)
  const [newCardTitle, setNewCardTitle] = useState("")
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editTitle, setEditTitle] = useState(list.title)

  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCardTitle.trim()) return
    createCard(
      { listId: list.id, title: newCardTitle.trim() },
      {
        onSuccess: () => {
          setNewCardTitle("")
          setShowAddCard(false)
        },
      }
    )
  }

  const handleTitleSave = () => {
    if (editTitle.trim() && editTitle.trim() !== list.title) {
      updateList({ id: list.id, title: editTitle.trim() })
    }
    setIsEditingTitle(false)
  }

  return (
    <Draggable draggableId={list.id} index={index}>
      {(provided, snapshot) => {
        const child = (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            className={cn(
              "w-72 shrink-0 glass-strong rounded-2xl flex flex-col max-h-[calc(100vh-140px)]",
              snapshot.isDragging && "shadow-xl shadow-black/20 ring-1 ring-primary/20"
            )}
          >
          {/* List header */}
          <div className="px-4 pt-4 pb-2 flex items-center gap-2">
            <button
              {...provided.dragHandleProps}
              className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing p-0.5 -ml-1 shrink-0"
            >
              <GripVertical className="size-4" />
            </button>
            {isEditingTitle ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleTitleSave()
                  if (e.key === "Escape") {
                    setEditTitle(list.title)
                    setIsEditingTitle(false)
                  }
                }}
                className="flex-1 text-foreground rounded-lg px-2 py-1 text-sm font-bold bg-secondary border border-border focus:outline-none"
                autoFocus
              />
            ) : (
              <h3
                className="flex-1 text-sm font-bold text-foreground cursor-pointer px-1"
                onClick={() => setIsEditingTitle(true)}
              >
                {list.title}
              </h3>
            )}
            <span className="text-xs text-muted-foreground rounded-lg px-2 py-1 bg-secondary/60">
              {list.cards.length}
            </span>
            <DropdownMenu size="sm">
              <DropdownMenuTrigger className="text-muted-foreground hover:text-foreground p-1">
                <MoreHorizontal className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => deleteList(list.id)}
                >
                  <Trash2 className="size-3.5" />
                  Delete List
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Cards */}
          <Droppable droppableId={list.id} type="CARD">
            {(dropProvided, dropSnapshot) => (
              <div
                ref={dropProvided.innerRef}
                {...dropProvided.droppableProps}
                className={cn(
                  "flex-1 overflow-y-auto px-3 pb-2 space-y-2.5 min-h-10 transition-colors",
                  dropSnapshot.isDraggingOver && "bg-primary/5 rounded-lg"
                )}
              >
                {list.cards.map((card, cardIndex) => (
                  <BoardCard
                    key={card.id}
                    card={card}
                    index={cardIndex}
                    onClick={() => onCardClick(card.id)}
                  />
                ))}
                {dropProvided.placeholder}
              </div>
            )}
          </Droppable>

          {/* Add card */}
          <div className="px-3 pb-3">
            <AnimatePresence mode="wait">
              {showAddCard ? (
                <motion.form
                  key="add-card-form"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                  onSubmit={handleAddCard}
                  className="space-y-2 overflow-hidden"
                >
                  <textarea
                    value={newCardTitle}
                    onChange={(e) => setNewCardTitle(e.target.value)}
                    placeholder="Enter a title for this card..."
                    className="w-full text-foreground rounded-lg px-3 py-2 text-sm bg-secondary border border-border
                               placeholder:text-muted-foreground focus:outline-none resize-none"
                    rows={2}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleAddCard(e)
                      }
                    }}
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={isCreating || !newCardTitle.trim()}
                      className="bg-primary text-primary-foreground rounded-lg px-3 py-1.5 text-xs font-semibold
                                 hover:bg-primary/90 transition-colors
                                 disabled:opacity-50 cursor-pointer"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddCard(false)
                        setNewCardTitle("")
                      }}
                      className="text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </motion.form>
              ) : (
                <motion.button
                  key="add-card-btn"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => setShowAddCard(true)}
                  className="w-full flex items-center gap-2 text-muted-foreground hover:text-foreground
                             rounded-lg px-3 py-2 text-sm hover:bg-secondary/60 transition-all cursor-pointer"
                >
                  <Plus className="size-4" />
                  <span>Add a card</span>
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
        )

        return snapshot.isDragging ? createPortal(child, document.body) : child
      }}
    </Draggable>
  )
}
