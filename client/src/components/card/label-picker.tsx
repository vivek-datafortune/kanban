import { useState } from "react"
import { Plus, Pencil, ArrowLeft, Trash2 } from "lucide-react"
import { useCreateLabel, useUpdateLabel, useDeleteLabel } from "@/hooks/use-labels"
import { cn } from "@/lib/utils"
import type { Label } from "@/types/board"

const LABEL_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316",
  "#eab308", "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
]

interface LabelPickerProps {
  boardId: string
  labels: Label[]
  activeIds: Set<string>
  onToggle: (labelId: string) => void
}

export default function LabelPicker({ boardId, labels, activeIds, onToggle }: LabelPickerProps) {
  const { mutate: createLabel, isPending: isCreating } = useCreateLabel(boardId)
  const { mutate: updateLabel } = useUpdateLabel(boardId)
  const { mutate: deleteLabel } = useDeleteLabel(boardId)

  const [view, setView] = useState<"list" | "create" | "edit">("list")
  const [editingLabel, setEditingLabel] = useState<Label | null>(null)
  const [name, setName] = useState("")
  const [color, setColor] = useState(LABEL_COLORS[0])

  const openCreate = () => {
    setName("")
    setColor(LABEL_COLORS[0])
    setEditingLabel(null)
    setView("create")
  }

  const openEdit = (label: Label) => {
    setEditingLabel(label)
    setName(label.name)
    setColor(label.color)
    setView("edit")
  }

  const handleSave = () => {
    if (!name.trim()) return
    if (view === "edit" && editingLabel) {
      updateLabel({ id: editingLabel.id, name: name.trim(), color })
    } else {
      createLabel({ name: name.trim(), color })
    }
    setView("list")
  }

  const handleDelete = () => {
    if (!editingLabel) return
    deleteLabel(editingLabel.id)
    setView("list")
  }

  if (view === "create" || view === "edit") {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setView("list")} className="text-muted-foreground hover:text-foreground cursor-pointer p-0.5">
            <ArrowLeft className="size-4" />
          </button>
          <p className="text-xs font-semibold text-muted-foreground">
            {view === "create" ? "Create label" : "Edit label"}
          </p>
        </div>

        <div className="rounded-lg px-3 py-2 text-sm text-white font-medium" style={{ backgroundColor: color }}>
          {name || "Label preview"}
        </div>

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Label name"
          className="w-full text-foreground rounded-lg px-3 py-2 text-sm bg-secondary border border-border
                     placeholder:text-muted-foreground focus:outline-none"
          autoFocus
          onKeyDown={(e) => { if (e.key === "Enter") handleSave() }}
        />

        <div className="flex flex-wrap gap-1.5">
          {LABEL_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={cn(
                "size-6 rounded-md cursor-pointer transition-all",
                color === c ? "ring-2 ring-primary ring-offset-2 ring-offset-card scale-110" : "hover:scale-105"
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={!name.trim() || isCreating}
            className="flex-1 bg-primary text-primary-foreground rounded-lg px-3 py-1.5 text-sm font-semibold
                       hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {view === "create" ? "Create" : "Save"}
          </button>
          {view === "edit" && (
            <button
              onClick={handleDelete}
              className="text-destructive hover:bg-destructive/10 rounded-lg p-1.5 cursor-pointer transition-colors"
              title="Delete label"
            >
              <Trash2 className="size-4" />
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {labels.map((label) => (
        <div key={label.id} className="flex items-center gap-1.5">
          <button
            onClick={() => onToggle(label.id)}
            className={cn(
              "flex-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-left cursor-pointer transition-all",
              activeIds.has(label.id) ? "ring-2 ring-primary" : "hover:opacity-80"
            )}
            style={{ backgroundColor: label.color, color: "white" }}
          >
            {label.name}
          </button>
          <button onClick={() => openEdit(label)} className="text-muted-foreground hover:text-foreground cursor-pointer p-1 shrink-0">
            <Pencil className="size-3" />
          </button>
        </div>
      ))}
      {labels.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">No labels yet</p>
      )}
      <button
        onClick={openCreate}
        className="w-full flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium
                   bg-secondary border border-border text-foreground hover:bg-secondary/80 transition-all cursor-pointer mt-2"
      >
        <Plus className="size-3.5" />
        Create label
      </button>
    </div>
  )
}
