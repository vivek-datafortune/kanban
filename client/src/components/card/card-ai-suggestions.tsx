import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Sparkles,
  Loader2,
  CheckSquare,
  Square,
  AlertTriangle,
  Check,
  X,
  RefreshCw,
  FileText,
  Tag,
  Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  useAISuggestions,
  useGenerateSuggestions,
  useAcceptSuggestions,
  useDismissSuggestions,
} from "@/hooks/use-ai"
import type { Label } from "@/types/board"

// ── Priority config ────────────────────────────────────────────────────────────
const PRIORITY_CONFIG = {
  P0: {
    label: "P0 · Critical",
    className: "bg-red-500/15 text-red-500 border-red-500/30",
  },
  P1: {
    label: "P1 · High",
    className: "bg-orange-500/15 text-orange-500 border-orange-500/30",
  },
  P2: {
    label: "P2 · Medium",
    className: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30",
  },
  P3: {
    label: "P3 · Low",
    className: "bg-green-500/15 text-green-500 border-green-500/30",
  },
} as const

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  cardId: string
  boardId: string
  boardLabels: Label[]
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      <div className="h-3 w-3/4 bg-secondary rounded" />
      <div className="h-3 w-1/2 bg-secondary rounded" />
      <div className="h-3 w-2/3 bg-secondary rounded" />
    </div>
  )
}

// ── Selectable checkbox row ────────────────────────────────────────────────────
function CheckRow({
  checked,
  onToggle,
  children,
}: {
  checked: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-start gap-2 w-full text-left group"
    >
      <span className="mt-0.5 shrink-0 text-muted-foreground group-hover:text-primary transition-colors">
        {checked ? (
          <CheckSquare className="size-4 text-primary" />
        ) : (
          <Square className="size-4" />
        )}
      </span>
      <span
        className={cn(
          "text-sm leading-snug transition-colors",
          checked ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {children}
      </span>
    </button>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function CardAISuggestions({
  cardId,
  boardId,
  boardLabels,
}: Props) {
  const { data: suggestion, isLoading } = useAISuggestions(cardId)
  const { mutate: generate, isPending: isGenerating } =
    useGenerateSuggestions(cardId)
  const { mutate: accept, isPending: isAccepting } = useAcceptSuggestions(
    cardId,
    boardId
  )
  const { mutate: dismiss } = useDismissSuggestions(cardId)

  // Selection state — reset whenever a new suggestion (different id) arrives.
  // Using the "store previous props in state" pattern (React docs) avoids useEffect.
  const [initSuggestionId, setInitSuggestionId] = useState<string | null>(null)
  const [selectedSubtasks, setSelectedSubtasks] = useState<string[]>([])
  const [acceptDescription, setAcceptDescription] = useState(false)
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([])
  const [acceptPriority, setAcceptPriority] = useState(false)

  if (
    suggestion &&
    !suggestion.is_accepted &&
    !suggestion.is_dismissed &&
    suggestion.id !== initSuggestionId
  ) {
    setInitSuggestionId(suggestion.id)
    setSelectedSubtasks([...suggestion.subtasks])
    setSelectedLabelIds([...suggestion.suggested_labels])
    setAcceptDescription(false)
    setAcceptPriority(false)
  }

  const toggleSubtask = (text: string) =>
    setSelectedSubtasks((prev) =>
      prev.includes(text) ? prev.filter((t) => t !== text) : [...prev, text]
    )

  const toggleLabel = (id: string) =>
    setSelectedLabelIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )

  const handleApply = () => {
    if (!suggestion) return
    accept({
      suggestionId: suggestion.id,
      subtasks: selectedSubtasks,
      accept_description: acceptDescription,
      label_ids: selectedLabelIds,
      accept_priority: acceptPriority,
    })
  }

  // ── Loading (initial fetch) ────────────────────────────────────────────────
  if (isLoading) return <Skeleton />

  // ── AI Generating state ────────────────────────────────────────────────────
  if (isGenerating) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center gap-3 py-4"
      >
        <div className="relative">
          <Loader2 className="size-6 text-primary animate-spin" />
          <Sparkles className="size-3 text-primary absolute -top-1 -right-1" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">AI is thinking…</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Analysing your card and generating suggestions
          </p>
        </div>
      </motion.div>
    )
  }

  // ── Accepted state ─────────────────────────────────────────────────────────
  if (suggestion?.is_accepted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        <div className="flex items-center gap-2 text-green-500">
          <Check className="size-4" />
          <span className="text-sm font-medium">Suggestions applied</span>
        </div>
        <button
          type="button"
          onClick={() => generate()}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className="size-3" />
          Generate new suggestions
        </button>
      </motion.div>
    )
  }

  // ── No suggestion / dismissed → idle state ────────────────────────────────
  if (!suggestion || suggestion.is_dismissed) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <button
          type="button"
          onClick={() => generate()}
          disabled={isGenerating}
          className={cn(
            "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium",
            "bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20",
            "transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          <Sparkles className="size-4" />
          Generate AI Suggestions
        </button>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Powered by Groq · {PRIORITY_CONFIG.P2.label}
        </p>
      </motion.div>
    )
  }

  // ── Results panel ─────────────────────────────────────────────────────────
  const priorityConf =
    PRIORITY_CONFIG[suggestion.priority as keyof typeof PRIORITY_CONFIG] ??
    PRIORITY_CONFIG.P2

  const labelMap = new Map(boardLabels.map((l) => [l.id, l]))

  const anySelected =
    selectedSubtasks.length > 0 ||
    acceptDescription ||
    selectedLabelIds.length > 0 ||
    acceptPriority

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={suggestion.id}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.2 }}
        className="space-y-4"
      >
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wide">
              AI Suggestions
            </span>
          </div>
          <button
            type="button"
            onClick={() => dismiss(suggestion.id)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Dismiss suggestions"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {/* ── Priority ── */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Zap className="size-3 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Priority
            </span>
          </div>
          <CheckRow
            checked={acceptPriority}
            onToggle={() => setAcceptPriority((p) => !p)}
          >
            <span
              className={cn(
                "inline-flex px-2 py-0.5 rounded-md text-xs font-semibold border",
                priorityConf.className
              )}
            >
              {priorityConf.label}
            </span>
          </CheckRow>
        </div>

        {/* ── Subtasks ── */}
        {suggestion.subtasks.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <CheckSquare className="size-3 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Subtasks
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  setSelectedSubtasks(
                    selectedSubtasks.length === suggestion.subtasks.length
                      ? []
                      : [...suggestion.subtasks]
                  )
                }
                className="text-[11px] text-primary hover:underline"
              >
                {selectedSubtasks.length === suggestion.subtasks.length
                  ? "Deselect all"
                  : "Select all"}
              </button>
            </div>
            <div className="space-y-2 pl-0.5">
              {suggestion.subtasks.map((task) => (
                <CheckRow
                  key={task}
                  checked={selectedSubtasks.includes(task)}
                  onToggle={() => toggleSubtask(task)}
                >
                  {task}
                </CheckRow>
              ))}
            </div>
          </div>
        )}

        {/* ── Description ── */}
        {suggestion.description && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <FileText className="size-3 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Description
              </span>
            </div>
            <div
              className={cn(
                "rounded-lg border p-3 space-y-2 cursor-pointer transition-colors",
                acceptDescription
                  ? "bg-primary/5 border-primary/30"
                  : "bg-secondary/40 border-border hover:border-border/80"
              )}
              onClick={() => setAcceptDescription((p) => !p)}
            >
              <div className="flex items-center gap-2">
                {acceptDescription ? (
                  <CheckSquare className="size-3.5 text-primary shrink-0" />
                ) : (
                  <Square className="size-3.5 text-muted-foreground shrink-0" />
                )}
                <span className="text-xs font-medium text-muted-foreground">
                  Replace card description
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 pl-5">
                {suggestion.description}
              </p>
            </div>
          </div>
        )}

        {/* ── Labels ── */}
        {suggestion.suggested_labels.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Tag className="size-3 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Suggested Labels
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {suggestion.suggested_labels.map((labelId) => {
                const label = labelMap.get(labelId)
                if (!label) return null
                const selected = selectedLabelIds.includes(labelId)
                return (
                  <button
                    key={labelId}
                    type="button"
                    onClick={() => toggleLabel(labelId)}
                    className={cn(
                      "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                      "border transition-all duration-150",
                      selected
                        ? "opacity-100 ring-2 ring-white/20 scale-105"
                        : "opacity-60 hover:opacity-80"
                    )}
                    style={{
                      backgroundColor: label.color + "33",
                      borderColor: label.color + "66",
                      color: label.color,
                    }}
                  >
                    {selected && <Check className="size-2.5" />}
                    {label.name}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Duplicates warning ── */}
        {suggestion.duplicates.length > 0 && (
          <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3 space-y-1.5">
            <div className="flex items-center gap-1.5 text-yellow-500">
              <AlertTriangle className="size-3.5 shrink-0" />
              <span className="text-xs font-semibold">Possible Duplicates</span>
            </div>
            {suggestion.duplicates.map((dup) => (
              <div key={dup.id} className="flex items-start gap-2 pl-5">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">
                    {dup.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    in {dup.list_title} · {Math.round(dup.similarity * 100)}%
                    match
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Actions ── */}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={handleApply}
            disabled={!anySelected || isAccepting}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg",
              "text-sm font-medium bg-primary hover:bg-primary/90 text-primary-foreground",
              "transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            )}
          >
            {isAccepting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Check className="size-3.5" />
            )}
            Apply Selected
          </button>
          <button
            type="button"
            onClick={() => generate()}
            title="Regenerate suggestions"
            className="px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <RefreshCw className="size-3.5" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
