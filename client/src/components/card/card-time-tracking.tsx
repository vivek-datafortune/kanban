import { useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Play,
  Square,
  Plus,
  Trash2,
  Pencil,
  Check,
  Loader2,
} from "lucide-react"
import {
  useTimeEntries,
  useStartTimer,
  useStopTimer,
  useAddManualTime,
  useDeleteTimeEntry,
  useUpdateEstimate,
  useElapsedSeconds,
} from "@/hooks/use-time-tracking"
import { useStore } from "@/store/app.store"
import { cn } from "@/lib/utils"
import type { TimeEntry } from "@/types/board"

// ── Format helpers ────────────────────────────────────────────────────────────

function formatSeconds(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`
  if (m > 0) return `${m}m ${sec.toString().padStart(2, "0")}s`
  return `${sec}s`
}

function formatHours(h: number): string {
  if (h === Math.floor(h)) return `${h}h`
  return `${h}h`
}

function relativeDate(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  const hrs = Math.floor(m / 60)
  if (hrs < 24) return `${hrs}h ago`
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function displayName(user: TimeEntry["user"]): string {
  const name = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim()
  return name || user.email.split("@")[0]
}

// ── Live elapsed ticker (shared with app header) — re-exported from hook ─────

function useElapsed(startedAt: string | null): number {
  return useElapsedSeconds(startedAt)
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ trackedSeconds, estimatedHours }: { trackedSeconds: number; estimatedHours: number | null }) {
  const totalEstimated = (estimatedHours ?? 0) * 3600
  const pct = totalEstimated > 0 ? Math.min(100, Math.round((trackedSeconds / totalEstimated) * 100)) : 0
  const over = totalEstimated > 0 && trackedSeconds > totalEstimated

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{formatSeconds(trackedSeconds)}</span>
        {estimatedHours
          ? <span>of {formatHours(estimatedHours)} estimated</span>
          : <span>no estimate set</span>
        }
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        {estimatedHours ? (
          <motion.div
            className={cn("h-full rounded-full transition-colors duration-300", over ? "bg-red-500" : "bg-primary")}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        ) : (
          <div className="h-full w-0" />
        )}
      </div>
    </div>
  )
}

// ── Estimate editor ───────────────────────────────────────────────────────────

function EstimateEditor({
  cardId,
  boardId,
  estimatedHours,
}: {
  cardId: string
  boardId: string
  estimatedHours: number | null
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const { mutate: updateEstimate, isPending } = useUpdateEstimate(cardId, boardId)

  function startEdit() {
    setDraft(estimatedHours ? String(estimatedHours) : "")
    setEditing(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function save() {
    const val = parseFloat(draft)
    updateEstimate(isNaN(val) || val <= 0 ? null : val)
    setEditing(false)
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground shrink-0">Estimate</span>
      {editing ? (
        <div className="flex items-center gap-1.5">
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false) }}
            onBlur={save}
            placeholder="hours"
            className="w-16 h-6 text-xs bg-secondary border border-border rounded-lg px-2 focus:outline-none focus:ring-1 focus:ring-primary/40 text-foreground"
          />
          <span className="text-xs text-muted-foreground">h</span>
          {isPending && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
        </div>
      ) : (
        <button
          onClick={startEdit}
          className="flex items-center gap-1 text-xs hover:text-primary transition-colors cursor-pointer group"
        >
          <span className={estimatedHours ? "font-semibold text-foreground" : "text-muted-foreground"}>
            {estimatedHours ? formatHours(estimatedHours) : "Set"}
          </span>
          <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
        </button>
      )}
    </div>
  )
}

// ── Manual entry form ─────────────────────────────────────────────────────────

function ManualEntryForm({
  cardId,
  boardId,
  onClose,
}: {
  cardId: string
  boardId: string
  onClose: () => void
}) {
  const [hours, setHours] = useState("")
  const [minutes, setMinutes] = useState("")
  const [note, setNote] = useState("")
  const { mutate: addManual, isPending } = useAddManualTime(cardId, boardId)

  function submit() {
    const h = parseFloat(hours) || 0
    const m = parseFloat(minutes) || 0
    const totalSeconds = Math.round(h * 3600 + m * 60)
    if (totalSeconds <= 0) return
    addManual({ duration_seconds: totalSeconds, note }, { onSuccess: onClose })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className="p-3 rounded-xl border border-border bg-secondary/30 space-y-3"
    >
      <p className="text-xs font-semibold text-foreground">Log time manually</p>
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="text-xs text-muted-foreground">Hours</label>
          <input
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder="0"
            type="number"
            min="0"
            className="w-full mt-1 h-8 text-sm bg-secondary border border-border rounded-lg px-2.5 focus:outline-none focus:ring-1 focus:ring-primary/40 text-foreground"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-muted-foreground">Minutes</label>
          <input
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            placeholder="0"
            type="number"
            min="0"
            max="59"
            className="w-full mt-1 h-8 text-sm bg-secondary border border-border rounded-lg px-2.5 focus:outline-none focus:ring-1 focus:ring-primary/40 text-foreground"
          />
        </div>
      </div>
      <div>
        <label className="text-xs text-muted-foreground">Note (optional)</label>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What did you work on?"
          onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") onClose() }}
          className="w-full mt-1 h-8 text-sm bg-secondary border border-border rounded-lg px-2.5 focus:outline-none focus:ring-1 focus:ring-primary/40 text-foreground placeholder:text-muted-foreground/50"
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={submit}
          disabled={isPending || (parseFloat(hours) || 0) + (parseFloat(minutes) || 0) <= 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
        >
          {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
          Log time
        </button>
        <button
          onClick={onClose}
          className="px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 border border-border text-xs font-medium text-foreground transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </motion.div>
  )
}

// ── Time entry row ────────────────────────────────────────────────────────────

function TimeEntryRow({
  entry,
  cardId,
  boardId,
}: {
  entry: TimeEntry
  cardId: string
  boardId: string
}) {
  const currentUser = useStore((s) => s.user)
  const { mutate: remove, isPending } = useDeleteTimeEntry(cardId, boardId)
  const [confirm, setConfirm] = useState(false)

  const canDelete = currentUser?.pk === entry.user?.pk
  const seconds = entry.duration_seconds ?? 0

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="group flex items-start gap-2.5 py-2 border-b border-border/40 last:border-0"
      onMouseLeave={() => setConfirm(false)}
    >
      <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
        <span className="text-[11px] font-bold text-primary">
          {(entry.user.first_name?.[0] || entry.user.email[0]).toUpperCase()}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={cn(
            "text-sm font-semibold tabular-nums",
            entry.is_manual ? "text-blue-500" : "text-foreground",
          )}>
            {formatSeconds(seconds)}
          </span>
          {entry.is_manual && (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded-md">
              manual
            </span>
          )}
        </div>
        {entry.note && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{entry.note}</p>
        )}
        <p className="text-xs text-muted-foreground/70 mt-0.5">
          {displayName(entry.user)} · {relativeDate(entry.created_at)}
        </p>
      </div>

      {canDelete && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {confirm ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => remove(entry.id)}
                disabled={isPending}
                className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors cursor-pointer"
              >
                {isPending ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : "Del"}
              </button>
              <button
                onClick={() => setConfirm(false)}
                className="px-1.5 py-0.5 rounded text-[10px] bg-secondary hover:bg-secondary/80 text-foreground transition-colors cursor-pointer"
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirm(true)}
              className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
    </motion.div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  cardId: string
  boardId: string
  cardTitle: string
  estimatedHours: number | null
  totalTimeSeconds: number
}

export default function CardTimeTracking({
  cardId,
  boardId,
  cardTitle,
  estimatedHours,
  totalTimeSeconds,
}: Props) {
  const activeTimer = useStore((s) => s.activeTimer)
  const { data: entries = [], isLoading } = useTimeEntries(cardId)
  const { mutate: startTimer, isPending: starting } = useStartTimer(cardId, boardId, cardTitle)
  const { mutate: stopTimer, isPending: stopping } = useStopTimer(cardId, boardId)
  const [showManual, setShowManual] = useState(false)

  const isTimerRunningHere = activeTimer?.cardId === cardId
  const elapsed = useElapsed(isTimerRunningHere ? activeTimer!.startedAt : null)
  const liveTracked = totalTimeSeconds + (isTimerRunningHere ? elapsed : 0)

  return (
    <div className="space-y-3">
      {/* Estimate + progress */}
      <div className="flex items-center justify-between">
        <EstimateEditor cardId={cardId} boardId={boardId} estimatedHours={estimatedHours} />
      </div>

      {/* Progress bar */}
      <ProgressBar trackedSeconds={liveTracked} estimatedHours={estimatedHours} />

      {/* Timer button */}
      <div className="flex items-center gap-2">
        {isTimerRunningHere ? (
          <button
            onClick={() => stopTimer()}
            disabled={stopping}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/15 transition-colors text-xs font-semibold cursor-pointer disabled:opacity-50 flex-1"
          >
            {stopping ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Square className="w-3.5 h-3.5 fill-red-500" />
            )}
            <span className="tabular-nums">{formatSeconds(elapsed)}</span>
            <span className="ml-auto text-red-400 font-medium">Stop</span>
          </button>
        ) : (
          <button
            onClick={() => startTimer()}
            disabled={starting || !!activeTimer}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary/15 transition-colors text-xs font-semibold cursor-pointer disabled:opacity-50 flex-1"
            title={activeTimer ? `Timer running on "${activeTimer.cardTitle}"` : undefined}
          >
            {starting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-primary" />
            )}
            {activeTimer && !isTimerRunningHere ? "Timer active elsewhere" : "Start Timer"}
          </button>
        )}

        <button
          onClick={() => setShowManual((v) => !v)}
          className="p-2 rounded-xl border border-border hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title="Log time manually"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Manual entry form */}
      <AnimatePresence>
        {showManual && (
          <ManualEntryForm
            cardId={cardId}
            boardId={boardId}
            onClose={() => setShowManual(false)}
          />
        )}
      </AnimatePresence>

      {/* Time log */}
      {isLoading ? (
        <div className="space-y-2 animate-pulse">
          {[0, 1].map((i) => (
            <div key={i} className="flex items-center gap-2 py-1">
              <div className="size-6 rounded-full bg-secondary shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-2.5 bg-secondary rounded-full w-1/3" />
                <div className="h-2 bg-secondary rounded-full w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : entries.length > 0 ? (
        <div className="border border-border rounded-xl px-3 py-1">
          <AnimatePresence initial={false}>
            {entries.map((entry) => (
              <TimeEntryRow key={entry.id} entry={entry} cardId={cardId} boardId={boardId} />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <p className="text-center text-xs text-muted-foreground py-1">No time logged yet</p>
      )}
    </div>
  )
}
