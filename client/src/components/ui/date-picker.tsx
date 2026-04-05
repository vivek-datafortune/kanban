import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { DayPicker } from "react-day-picker"
import { motion, AnimatePresence } from "framer-motion"
import { CalendarDays, X, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface DatePickerProps {
  value: string | null       // ISO string or null
  onChange: (iso: string | null) => void
  placeholder?: string
}

function formatDisplay(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export function DatePicker({ value, onChange, placeholder = "Pick a date" }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const selected = value ? new Date(value) : undefined

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const t = e.target as Node
      if (!btnRef.current?.contains(t) && !panelRef.current?.contains(t)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  const handleOpen = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      const panelWidth = 288   // w-72
      const panelHeight = 340
      const spaceBelow = window.innerHeight - rect.bottom
      const top = spaceBelow >= panelHeight ? rect.bottom + 4 : rect.top - panelHeight - 4
      const rawLeft = rect.left
      const left = rawLeft + panelWidth > window.innerWidth
        ? Math.max(8, window.innerWidth - panelWidth - 8)
        : rawLeft
      setPos({ top, left })
    }
    setOpen((v) => !v)
  }

  const handleSelect = (day: Date | undefined) => {
    if (!day) return
    // Preserve existing time if there was one, otherwise use noon to avoid timezone drift
    const existing = value ? new Date(value) : null
    day.setHours(existing?.getHours() ?? 12, existing?.getMinutes() ?? 0, 0, 0)
    onChange(day.toISOString())
    setOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(null)
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={handleOpen}
        className={cn(
          "flex-1 min-w-0 flex items-center gap-2 bg-secondary border border-border rounded-lg px-2.5 py-1.5",
          "text-xs transition-colors hover:bg-secondary/80 focus:outline-none focus:ring-1 focus:ring-primary/30 cursor-pointer",
          open && "ring-1 ring-primary/30",
        )}
      >
        <CalendarDays className="size-3.5 text-muted-foreground shrink-0" />
        <span className={cn("flex-1 text-left truncate", value ? "text-foreground" : "text-muted-foreground")}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        {value && (
          <span
            role="button"
            onClick={handleClear}
            className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="size-3" />
          </span>
        )}
      </button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, scale: 0.96, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -4 }}
              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
              style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9999 }}
              className="bg-card border border-border rounded-2xl shadow-xl shadow-black/20 p-3 w-72"
            >
              <DayPicker
                mode="single"
                selected={selected}
                onSelect={handleSelect}
                showOutsideDays
                classNames={{
                  months: "flex flex-col",
                  month: "space-y-3",
                  month_caption: "flex items-center justify-between px-1 py-1",
                  caption_label: "text-sm font-semibold text-foreground",
                  nav: "flex items-center gap-1",
                  button_previous: cn(
                    "size-7 flex items-center justify-center rounded-lg text-muted-foreground",
                    "hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
                  ),
                  button_next: cn(
                    "size-7 flex items-center justify-center rounded-lg text-muted-foreground",
                    "hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
                  ),
                  month_grid: "w-full border-collapse",
                  weekdays: "flex",
                  weekday: "flex-1 text-center text-[11px] font-medium text-muted-foreground py-1",
                  week: "flex mt-1",
                  day: "flex-1 text-center",
                  day_button: cn(
                    "w-full aspect-square flex items-center justify-center rounded-lg text-xs",
                    "hover:bg-secondary transition-colors cursor-pointer text-foreground"
                  ),
                  selected: "bg-primary! rounded-lg",
                  today: "font-bold text-primary",
                  outside: "text-muted-foreground/40",
                  disabled: "text-muted-foreground/30 cursor-not-allowed",
                }}
                components={{
                  Chevron: ({ orientation }) =>
                    orientation === "left"
                      ? <ChevronLeft className="size-4" />
                      : <ChevronRight className="size-4" />,
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}
