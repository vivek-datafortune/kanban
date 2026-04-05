import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ChevronDown,
  Tag,
  Calendar,
  CheckSquare,
  History,
  UserPlus,
  Check,
  Settings2,
  Layers,
  Plus,
  Pencil,
  ArrowLeft,
  Trash2,
  Clock,
} from "lucide-react"
import { useUpdateCard, useAddCardLabel, useRemoveCardLabel, useMoveCard, useAddCardMember, useRemoveCardMember } from "@/hooks/use-cards"
import { useCreateLabel, useUpdateLabel, useDeleteLabel } from "@/hooks/use-labels"
import { useWorkspaceMembers } from "@/hooks/use-workspaces"
import { cn } from "@/lib/utils"
import CardActivity from "@/components/card/card-activity"
import CardChecklist from "@/components/card/card-checklist"
import CardTimeTracking from "@/components/card/card-time-tracking"
import { DatePicker } from "@/components/ui/date-picker"
import type { Card, Label, List } from "@/types/board"
import type { User } from "@/types/auth"

const LABEL_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316",
  "#eab308", "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
]

// ── Custom animated dropdown ──────────────────────────────────────────────────
interface DropdownOption { value: string; label: string }

function CustomDropdown({
  value,
  options,
  onChange,
}: {
  value: string
  options: DropdownOption[]
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.find((o) => o.value === value)

  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [open])

  return (
    <div ref={ref} className="relative flex-1 min-w-0">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between gap-2 bg-secondary border border-border
                   rounded-lg px-2.5 py-1.5 text-xs text-foreground hover:bg-secondary/80
                   focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors cursor-pointer"
      >
        <span className="truncate">{selected?.label ?? "—"}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="shrink-0 text-muted-foreground"
        >
          <ChevronDown className="size-3.5" />
        </motion.span>
      </button>

      {/* Menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="dropdown"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute z-50 left-0 right-0 top-[calc(100%+4px)] bg-popover border border-border
                       rounded-xl shadow-lg shadow-black/20 overflow-hidden py-1"
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value)
                  setOpen(false)
                }}
                className={cn(
                  "w-full flex items-center justify-between gap-2 px-3 py-2 text-xs text-left",
                  "hover:bg-secondary/60 transition-colors cursor-pointer",
                  opt.value === value ? "text-primary font-medium" : "text-foreground",
                )}
              >
                <span className="truncate">{opt.label}</span>
                {opt.value === value && (
                  <Check className="size-3 shrink-0 text-primary" />
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
// ─────────────────────────────────────────────────────────────────────────────

interface CardRightPanelProps {
  card: Card
  boardId: string
  lists: List[]
  labels: Label[]
  workspaceSlug: string
  workspaceRole: string
}

function AccordionSection({
  title,
  icon: Icon,
  badge,
  defaultOpen = true,
  children,
}: {
  title: string
  icon: typeof Tag
  badge?: number
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/40 transition-colors cursor-pointer"
      >
        <Icon className="size-4 text-muted-foreground shrink-0" />
        <span className="text-sm font-semibold text-foreground flex-1 text-left">{title}</span>
        {badge !== undefined && badge > 0 && (
          <span className="text-[10px] font-bold text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full">
            {badge}
          </span>
        )}
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0"
        >
          <ChevronDown className="size-4 text-muted-foreground" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{ overflow: "hidden" }}
          >
            <div className="px-4 pt-2 pb-4 border-t border-border/50 space-y-3">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}


// ── Assignee picker ──────────────────────────────────────────────────────────
function AssigneePicker({
  card,
  boardId,
  workspaceSlug,
}: {
  card: Card
  boardId: string
  workspaceSlug: string
}) {
  const { data: wsMembers = [] } = useWorkspaceMembers(workspaceSlug)
  const { mutate: addMember } = useAddCardMember(boardId)
  const { mutate: removeMember } = useRemoveCardMember(boardId)
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  const assignedIds = new Set(card.members.map((m) => m.pk))

  // Reposition on open — use fixed coords (no scroll offset needed)
  useEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setMenuPos({ top: rect.bottom + 4, left: rect.left })
  }, [open])

  // Reposition on scroll while open
  useEffect(() => {
    if (!open) return
    function updatePos() {
      if (!triggerRef.current) return
      const rect = triggerRef.current.getBoundingClientRect()
      setMenuPos({ top: rect.bottom + 4, left: rect.left })
    }
    window.addEventListener("scroll", updatePos, true)
    return () => window.removeEventListener("scroll", updatePos, true)
  }, [open])

  // Click-outside closes
  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      const t = e.target as Node
      if (
        triggerRef.current && !triggerRef.current.contains(t) &&
        menuRef.current && !menuRef.current.contains(t)
      ) setOpen(false)
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [open])

  function toggle(user: User) {
    if (assignedIds.has(user.pk)) {
      removeMember({ cardId: card.id, userId: user.pk })
    } else {
      addMember({ cardId: card.id, userId: user.pk, user })
    }
  }

  const menu = (
    <motion.div
      ref={menuRef}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      style={{ position: "fixed", top: menuPos.top, left: menuPos.left, width: 208, zIndex: 9999 }}
      className="bg-popover border border-border rounded-xl shadow-xl shadow-black/25 overflow-hidden py-1"
    >
      <div className="px-3 py-1.5 border-b border-border/50">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Workspace members
        </p>
      </div>
      {wsMembers.length === 0 && (
        <p className="px-3 py-3 text-xs text-muted-foreground">No members found</p>
      )}
      {wsMembers.map(({ user }) => {
        const assigned = assignedIds.has(user.pk)
        const name = user.first_name ? `${user.first_name} ${user.last_name}`.trim() : user.email.split("@")[0]
        const initial = (user.first_name?.[0] || user.email[0]).toUpperCase()
        return (
          <button
            key={user.pk}
            type="button"
            onClick={() => toggle(user)}
            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-secondary/60 transition-colors cursor-pointer"
          >
            <div className="size-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-primary">{initial}</span>
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-medium text-foreground truncate">{name}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
            </div>
            <div className={cn(
              "size-4 shrink-0 rounded border-2 flex items-center justify-center transition-colors",
              assigned ? "bg-primary border-primary" : "border-border",
            )}>
              {assigned && <Check className="size-2.5 text-primary-foreground" strokeWidth={3} />}
            </div>
          </button>
        )
      })}
    </motion.div>
  )

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80
                   hover:bg-primary/10 rounded-md px-1.5 py-0.5 transition-colors cursor-pointer"
      >
        <UserPlus className="size-3" />
        Assign
      </button>
      <AnimatePresence>
        {open && menu}
      </AnimatePresence>
    </>
  )
}
// ─────────────────────────────────────────────────────────────────────────────

export default function CardRightPanel({ card, boardId, lists, labels, workspaceSlug, workspaceRole }: CardRightPanelProps) {
  const { mutate: updateCard } = useUpdateCard(boardId)
  const { mutate: moveCard } = useMoveCard(boardId)
  const { mutate: addLabel } = useAddCardLabel(boardId)
  const { mutate: removeLabel } = useRemoveCardLabel(boardId)

  const cardLabelIds = new Set(card.labels.map((l) => l.id))

  return (
    <div className="w-64 shrink-0 space-y-2">
      {/* ── General ── */}
      <AccordionSection title="General" icon={Settings2} defaultOpen={true}>
        {/* Property rows */}
        <div className="divide-y divide-border/40 -mx-4 -mt-2 -mb-4">

          {/* Status */}
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex items-center gap-2 w-24 shrink-0">
              <Layers className="size-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs font-medium text-muted-foreground">Status</span>
            </div>
            <CustomDropdown
              value={card.list}
              options={lists.map((l) => ({ value: l.id, label: l.title }))}
              onChange={(val) => {
                if (val !== card.list) {
                  moveCard({ id: card.id, list: val, position: 65536 })
                }
              }}
            />
          </div>

          {/* Assignees */}
          <div className="flex items-start gap-3 px-4 py-3">
            <div className="flex items-center gap-2 w-24 shrink-0 pt-0.5">
              <UserPlus className="size-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs font-medium text-muted-foreground">Assignees</span>
            </div>
            <div className="flex-1 min-w-0">
              {card.members.length === 0 ? (
                <span className="text-xs text-muted-foreground/60 italic">None</span>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {card.members.map((m) => {
                    const name = m.first_name || m.email.split("@")[0]
                    const initial = (m.first_name?.[0] || m.email[0]).toUpperCase()
                    return (
                      <div
                        key={m.pk}
                        title={m.first_name ? `${m.first_name} ${m.last_name}` : m.email}
                        className="flex items-center gap-1.5 bg-secondary border border-border rounded-full pl-0.5 pr-2 py-0.5"
                      >
                        <div className="size-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                          <span className="text-[9px] font-bold text-primary">{initial}</span>
                        </div>
                        <span className="text-[11px] text-foreground truncate max-w-15">{name}</span>
                      </div>
                    )
                  })}
                </div>
              )}
              {(workspaceRole === "owner" || workspaceRole === "admin") && (
                <div className="mt-1.5">
                  <AssigneePicker card={card} boardId={boardId} workspaceSlug={workspaceSlug} />
                </div>
              )}
            </div>
          </div>

          {/* Due Date */}
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex items-center gap-2 w-24 shrink-0">
              <Calendar className="size-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs font-medium text-muted-foreground">Due date</span>
            </div>
            <DatePicker
              value={card.due_date ?? null}
              onChange={(iso) => updateCard({ id: card.id, due_date: iso })}
              placeholder="Pick a date"
            />
          </div>

        </div>
      </AccordionSection>

      {/* ── Labels ── */}
      <AccordionSection title="Labels" icon={Tag} badge={card.labels.length} defaultOpen={true}>
        <InlineLabelManager
          boardId={boardId}
          allLabels={labels}
          activeIds={cardLabelIds}
          cardId={card.id}
          onAdd={(labelId) => addLabel({ cardId: card.id, labelId })}
          onRemove={(labelId) => removeLabel({ cardId: card.id, labelId })}
        />
      </AccordionSection>

      {/* ── Checklist ── */}
      <AccordionSection
        title="Checklist"
        icon={CheckSquare}
        badge={card.checklist_items?.length ?? 0}
        defaultOpen={(card.checklist_items?.length ?? 0) > 0}
      >
        <CardChecklist
          cardId={card.id}
          boardId={boardId}
          items={card.checklist_items ?? []}
        />
      </AccordionSection>

      {/* ── Time Tracking ── */}
      <AccordionSection title="Time Tracking" icon={Clock} defaultOpen={false}>
        <CardTimeTracking
          cardId={card.id}
          boardId={boardId}
          cardTitle={card.title}
          estimatedHours={card.estimated_hours ?? null}
          totalTimeSeconds={card.total_time_seconds ?? 0}
        />
      </AccordionSection>

      {/* ── Activity ── */}
      <AccordionSection title="Activity" icon={History} defaultOpen={false}>
        <div className="-mx-4 -mt-2 -mb-4 max-h-72 overflow-y-auto scrollbar-hide px-4 pt-2 pb-3">
          <CardActivity cardId={card.id} />
        </div>
      </AccordionSection>
    </div>
  )
}

// ── Inline label manager (list + create/edit/delete in one place) ────────────
interface InlineLabelManagerProps {
  boardId: string
  allLabels: Label[]
  activeIds: Set<string>
  cardId: string
  onAdd: (labelId: string) => void
  onRemove: (labelId: string) => void
}

function InlineLabelManager({ boardId, allLabels, activeIds, onAdd, onRemove }: InlineLabelManagerProps) {
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
        {/* Back + title */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView("list")}
            className="text-muted-foreground hover:text-foreground cursor-pointer p-0.5 rounded"
          >
            <ArrowLeft className="size-4" />
          </button>
          <p className="text-xs font-semibold text-muted-foreground">
            {view === "create" ? "New label" : "Edit label"}
          </p>
        </div>

        {/* Preview */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary border border-border">
          <span
            className="size-3 rounded-sm shrink-0"
            style={{ backgroundColor: color }}
          />
          <span className="text-sm text-foreground font-medium">{name || "Label name"}</span>
        </div>

        {/* Name input */}
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Label name"
          className="w-full text-foreground rounded-lg px-3 py-2 text-sm bg-secondary border border-border
                     placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
          autoFocus
          onKeyDown={(e) => { if (e.key === "Enter") handleSave() }}
        />

        {/* Color swatches */}
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

        {/* Actions */}
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
    <div className="space-y-1">
      {allLabels.length === 0 && (
        <p className="text-xs text-muted-foreground mb-2">No labels yet. Create one below.</p>
      )}

      {allLabels.map((label) => {
        const isActive = activeIds.has(label.id)
        return (
          <div key={label.id} className="flex items-center gap-1.5 group">
            {/* Toggle row */}
            <button
              onClick={() => isActive ? onRemove(label.id) : onAdd(label.id)}
              className={cn(
                "flex-1 flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm cursor-pointer transition-all",
                isActive
                  ? "bg-secondary border border-border text-foreground"
                  : "hover:bg-secondary/60 text-muted-foreground hover:text-foreground"
              )}
            >
              {/* Color swatch */}
              <span
                className={cn("size-3 rounded-sm shrink-0 transition-opacity", !isActive && "opacity-50")}
                style={{ backgroundColor: label.color }}
              />
              <span className="flex-1 text-left text-xs font-medium truncate">{label.name}</span>
              {isActive && <Check className="size-3.5 shrink-0 text-primary" />}
            </button>

            {/* Edit */}
            <button
              onClick={() => openEdit(label)}
              className="shrink-0 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary
                         cursor-pointer opacity-0 group-hover:opacity-100 transition-all"
              title="Edit label"
            >
              <Pencil className="size-3" />
            </button>
          </div>
        )
      })}

      {/* Add new label */}
      <button
        onClick={openCreate}
        className="w-full flex items-center gap-2 mt-2 px-2.5 py-1.5 rounded-lg text-xs font-medium
                   text-muted-foreground hover:text-foreground hover:bg-secondary/60 border border-dashed border-border
                   cursor-pointer transition-all"
      >
        <Plus className="size-3.5" />
        New label
      </button>
    </div>
  )
}
