import { useState, useRef, useEffect, useCallback, createContext, useContext } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

/* ─── Context ─── */
interface DropdownContextValue {
  open: boolean
  toggle: () => void
  close: () => void
  size: "sm" | "md"
}

const DropdownContext = createContext<DropdownContextValue>({
  open: false,
  toggle: () => {},
  close: () => {},
  size: "md",
})

/* ─── Root ─── */
interface DropdownMenuProps {
  children: React.ReactNode
  size?: "sm" | "md"
}

export function DropdownMenu({ children, size = "md" }: DropdownMenuProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const close = useCallback(() => setOpen(false), [])
  const toggle = useCallback(() => setOpen((v) => !v), [])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close()
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open, close])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close()
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [open, close])

  return (
    <DropdownContext.Provider value={{ open, toggle, close, size }}>
      <div ref={containerRef} className="relative">
        {children}
      </div>
    </DropdownContext.Provider>
  )
}

/* ─── Trigger ─── */
interface DropdownMenuTriggerProps {
  children: React.ReactNode
  className?: string
  asChild?: boolean
}

export function DropdownMenuTrigger({ children, className }: DropdownMenuTriggerProps) {
  const { toggle } = useContext(DropdownContext)

  return (
    <button type="button" onClick={toggle} className={cn("cursor-pointer", className)}>
      {children}
    </button>
  )
}

/* ─── Content ─── */
interface DropdownMenuContentProps {
  children: React.ReactNode
  className?: string
  align?: "start" | "center" | "end"
  side?: "bottom" | "top"
  sideOffset?: number
}

export function DropdownMenuContent({
  children,
  className,
  align = "end",
  side = "bottom",
}: DropdownMenuContentProps) {
  const { open, size } = useContext(DropdownContext)

  const alignClass = {
    start: "left-0",
    center: "left-1/2 -translate-x-1/2",
    end: "right-0",
  }[align]

  const sideClass = side === "bottom" ? "top-full mt-1.5" : "bottom-full mb-1.5"
  const originClass = side === "bottom" ? "origin-top" : "origin-bottom"
  const sizeClass = size === "sm" ? "min-w-32 py-1 rounded-lg" : "min-w-40 py-1.5 rounded-xl"

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: side === "bottom" ? -4 : 4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: side === "bottom" ? -4 : 4 }}
          transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            "absolute z-50",
            "bg-popover border border-border shadow-lg shadow-black/10",
            sizeClass,
            originClass,
            alignClass,
            sideClass,
            className
          )}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ─── Item ─── */
interface DropdownMenuItemProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  variant?: "default" | "destructive"
  disabled?: boolean
}

export function DropdownMenuItem({
  children,
  className,
  onClick,
  variant = "default",
  disabled = false,
}: DropdownMenuItemProps) {
  const { close, size } = useContext(DropdownContext)

  const variantClass = {
    default: "text-foreground hover:bg-secondary",
    destructive: "text-destructive hover:bg-destructive/10",
  }[variant]

  const sizeClass = size === "sm" ? "gap-2 px-2.5 py-1.5 text-xs" : "gap-2.5 px-3 py-2 text-sm"

  return (
    <button
      onClick={() => {
        if (disabled) return
        onClick?.()
        close()
      }}
      disabled={disabled}
      className={cn(
        "w-full text-left flex items-center transition-colors cursor-pointer",
        "focus:outline-none focus-visible:bg-secondary",
        sizeClass,
        variantClass,
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {children}
    </button>
  )
}

/* ─── Separator ─── */
export function DropdownMenuSeparator({ className }: { className?: string }) {
  return (
    <div className={cn("my-1 h-px bg-border", className)} />
  )
}

/* ─── Label ─── */
export function DropdownMenuLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("px-3 py-1.5 text-xs font-semibold text-muted-foreground", className)}>
      {children}
    </div>
  )
}
