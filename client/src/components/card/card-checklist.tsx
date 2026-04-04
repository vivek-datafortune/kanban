import { useState, useRef, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Check, Plus, Trash2, GripVertical } from "lucide-react"
import { DragDropContext, Droppable, Draggable, type DropResult, type DraggableProvided } from "@hello-pangea/dnd"
import { useCreateChecklistItem, useToggleChecklistItem, useUpdateChecklistItem, useDeleteChecklistItem, useReorderChecklistItem } from "@/hooks/use-checklist"
import { cn } from "@/lib/utils"
import type { ChecklistItem } from "@/types/board"

interface Props {
  cardId: string
  boardId: string
  items: ChecklistItem[]
}

function ProgressBar({ total, done }: { total: number; done: number }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-[10px] font-semibold tabular-nums text-muted-foreground w-7 text-right shrink-0">
        {pct}%
      </span>
      <div className="flex-1 h-1 bg-secondary rounded-full overflow-hidden">
        <motion.div
          className={cn("h-full rounded-full transition-colors duration-300", pct === 100 ? "bg-green-500" : "bg-primary")}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      </div>
    </div>
  )
}

function ItemRow({
  item,
  boardId,
  cardId,
  provided,
}: {
  item: ChecklistItem
  boardId: string
  cardId: string
  provided: DraggableProvided
}) {
  const { mutate: toggle } = useToggleChecklistItem(boardId, cardId)
  const { mutate: update } = useUpdateChecklistItem(boardId, cardId)
  const { mutate: remove } = useDeleteChecklistItem(boardId, cardId)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(item.text)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  function save() {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== item.text) update({ id: item.id, text: trimmed })
    else setDraft(item.text)
    setEditing(false)
  }

  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      className="group flex items-center gap-2.5 py-1"
    >
      {/* Drag handle */}
      <div
        {...provided.dragHandleProps}
        className="shrink-0 text-muted-foreground/30 hover:text-muted-foreground opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity"
      >
        <GripVertical className="size-3.5" />
      </div>
      {/* Checkbox */}
      <button
        type="button"
        onClick={() => toggle({ id: item.id, is_completed: !item.is_completed })}
        className={cn(
          "size-3.75 shrink-0 rounded border-2 flex items-center justify-center transition-colors duration-150 cursor-pointer",
          item.is_completed ? "bg-primary border-primary" : "border-border hover:border-primary/60",
        )}
      >
        {item.is_completed && (
          <Check className="size-2.5 text-primary-foreground" strokeWidth={3} />
        )}
      </button>

      {/* Text — expands to fill, click to edit */}
      <div className="flex-1 min-w-0 h-6 flex items-center">
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => {
              if (e.key === "Enter") save()
              if (e.key === "Escape") { setDraft(item.text); setEditing(false) }
            }}
            className="w-full h-6 text-xs bg-transparent border-b border-primary/40 text-foreground
                       focus:outline-none focus:border-primary placeholder:text-muted-foreground/40 transition-colors"
          />
        ) : (
          <span
            onClick={() => setEditing(true)}
            className={cn(
              "text-xs leading-none cursor-text w-full truncate select-none",
              item.is_completed ? "line-through text-muted-foreground/60" : "text-foreground",
            )}
          >
            {item.text}
          </span>
        )}
      </div>

      {/* Delete — only when not editing */}
      {!editing && (
        <button
          type="button"
          onClick={() => remove(item.id)}
          className="size-5 shrink-0 flex items-center justify-center rounded
                     text-muted-foreground/40 hover:text-destructive opacity-0 group-hover:opacity-100
                     hover:bg-destructive/10 transition-all duration-150 cursor-pointer"
        >
          <Trash2 className="size-3" />
        </button>
      )}
    </div>
  )
}

export default function CardChecklist({ cardId, boardId, items }: Props) {
  const { mutate: create, isPending } = useCreateChecklistItem(boardId, cardId)
  const { mutate: reorder } = useReorderChecklistItem(boardId, cardId)
  const [adding, setAdding] = useState(false)
  const [text, setText] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (adding) inputRef.current?.focus() }, [adding])

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => a.position - b.position),
    [items],
  )

  function handleDragEnd(result: DropResult) {
    const { source, destination } = result
    if (!destination || source.index === destination.index) return
    const reordered = [...sortedItems]
    const [moved] = reordered.splice(source.index, 1)
    reordered.splice(destination.index, 0, moved)
    const newIndex = destination.index
    let newPosition: number
    if (reordered.length === 1) {
      newPosition = 65536
    } else if (newIndex === 0) {
      newPosition = reordered[1].position / 2
    } else if (newIndex === reordered.length - 1) {
      newPosition = reordered[newIndex - 1].position + 65536
    } else {
      newPosition = (reordered[newIndex - 1].position + reordered[newIndex + 1].position) / 2
    }
    reorder({ id: moved.id, position: newPosition })
  }

  function submit() {
    const trimmed = text.trim()
    if (trimmed) { create(trimmed); setText("") }
    setAdding(false)
  }

  const done = sortedItems.filter((i) => i.is_completed).length

  return (
    <div className="-mx-4 -mt-2 -mb-4 px-4 pt-2 pb-3">
      {sortedItems.length > 0 && <ProgressBar total={sortedItems.length} done={done} />}

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="checklist-items">
          {(droppableProvided) => (
            <div
              ref={droppableProvided.innerRef}
              {...droppableProvided.droppableProps}
              className="space-y-0.5"
            >
              {sortedItems.map((item, index) => (
                <Draggable key={item.id} draggableId={item.id} index={index}>
                  {(draggableProvided) => (
                    <ItemRow
                      item={item}
                      boardId={boardId}
                      cardId={cardId}
                      provided={draggableProvided}
                    />
                  )}
                </Draggable>
              ))}
              {droppableProvided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Add item */}
      <AnimatePresence mode="wait">
        {adding ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className="mt-2.5 space-y-2"
          >
            <input
              ref={inputRef}
              value={text}
              placeholder="Item text…"
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit()
                if (e.key === "Escape") { setText(""); setAdding(false) }
              }}
              className="w-full text-xs bg-secondary border border-border rounded-lg px-2.5 py-1.5
                         text-foreground placeholder:text-muted-foreground/40
                         focus:outline-none focus:ring-1 focus:ring-primary/40 transition-shadow"
            />
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={submit}
                disabled={isPending || !text.trim()}
                className="text-xs font-medium bg-primary text-primary-foreground rounded-lg px-3 py-1.5
                           hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => { setText(""); setAdding(false) }}
                className="text-xs text-muted-foreground hover:text-foreground px-2.5 py-1.5
                           hover:bg-secondary/60 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="add-btn"
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setAdding(true)}
            className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground
                       hover:bg-secondary/60 rounded-lg px-2 py-1.5 w-full transition-colors cursor-pointer"
          >
            <Plus className="size-3.5" />
            Add item
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
