import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { useSearchParams } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { Filter, X, ChevronDown, Bookmark, Plus, Trash2 } from "lucide-react"

import { useSavedFilters, useCreateSavedFilter, useDeleteSavedFilter } from "@/hooks/use-saved-filters"
import { cn } from "@/lib/utils"
import type { ActiveFilters, Label, SavedFilter } from "@/types/board"
import type { User } from "@/types/auth"

const DUE_OPTIONS = [
  { value: "overdue", label: "Overdue" },
  { value: "today", label: "Due Today" },
  { value: "this_week", label: "This Week" },
  { value: "no_date", label: "No Date" },
]

const PRIORITY_OPTIONS = ["P0", "P1", "P2", "P3"] as const

const EMPTY_FILTERS: ActiveFilters = {
  labels: [],
  members: [],
  due: null,
  priority: [],
  search: "",
}

function isFilterActive(filters: ActiveFilters): boolean {
  return (
    filters.labels.length > 0 ||
    filters.members.length > 0 ||
    filters.due !== null ||
    filters.priority.length > 0 ||
    filters.search.trim().length > 0
  )
}

function filtersToParams(filters: ActiveFilters): Record<string, string> {
  const params: Record<string, string> = {}
  if (filters.labels.length) params.labels = filters.labels.join(",")
  if (filters.members.length) params.members = filters.members.join(",")
  if (filters.due) params.due = filters.due
  if (filters.priority.length) params.priority = filters.priority.join(",")
  if (filters.search) params.search = filters.search
  return params
}

function paramsToFilters(params: URLSearchParams): ActiveFilters {
  return {
    labels: params.get("labels")?.split(",").filter(Boolean) ?? [],
    members: params.get("members")?.split(",").filter(Boolean) ?? [],
    due: (params.get("due") as ActiveFilters["due"]) ?? null,
    priority: (params.get("priority")?.split(",").filter(Boolean) as ActiveFilters["priority"]) ?? [],
    search: params.get("search") ?? "",
  }
}

interface DropdownProps {
  label: string
  active: boolean
  children: React.ReactNode
}

function FilterDropdown({ label, active, children }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        btnRef.current && !btnRef.current.contains(target) &&
        panelRef.current && !panelRef.current.contains(target)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setPos({ top: rect.bottom + 4, left: rect.left })
    }
    setOpen((v) => !v)
  }

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={handleToggle}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors cursor-pointer whitespace-nowrap",
          active
            ? "bg-primary/10 border-primary/30 text-primary"
            : "bg-secondary/60 border-border text-foreground hover:bg-secondary/80",
        )}
      >
        {label}
        <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
      </button>
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.12 }}
              style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9999 }}
              className="bg-card border border-border rounded-xl shadow-lg p-2 min-w-45"
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  )
}

interface FilterBarProps {
  boardId: string
  labels: Label[]
  members: User[]
  onFilterChange: (filters: ActiveFilters) => void
}

export default function FilterBar({ boardId, labels, members, onFilterChange }: FilterBarProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [filters, setFilters] = useState<ActiveFilters>(() => paramsToFilters(searchParams))
  const [showSaveInput, setShowSaveInput] = useState(false)
  const [saveName, setSaveName] = useState("")

  const { data: savedFilters } = useSavedFilters(boardId)
  const { mutate: createFilter } = useCreateSavedFilter(boardId)
  const { mutate: deleteFilter } = useDeleteSavedFilter(boardId)

  // Apply default saved filter on mount
  useEffect(() => {
    if (savedFilters && !searchParams.toString()) {
      const defaultFilter = savedFilters.find((f) => f.is_default)
      if (defaultFilter) {
        const applied: ActiveFilters = {
          labels: defaultFilter.filters.labels ?? [],
          members: defaultFilter.filters.members ?? [],
          due: defaultFilter.filters.due ?? null,
          priority: defaultFilter.filters.priority ?? [],
          search: defaultFilter.filters.search ?? "",
        }
        setFilters(applied)
        onFilterChange(applied)
      }
    }
  }, [savedFilters]) // eslint-disable-line react-hooks/exhaustive-deps

  const updateFilters = (updated: ActiveFilters) => {
    setFilters(updated)
    onFilterChange(updated)
    // Sync to URL
    const params = filtersToParams(updated)
    setSearchParams(params, { replace: true })
  }

  const toggleLabel = (id: string) => {
    const labels = filters.labels.includes(id)
      ? filters.labels.filter((l) => l !== id)
      : [...filters.labels, id]
    updateFilters({ ...filters, labels })
  }

  const toggleMember = (pk: string) => {
    const members = filters.members.includes(pk)
      ? filters.members.filter((m) => m !== pk)
      : [...filters.members, pk]
    updateFilters({ ...filters, members })
  }

  const togglePriority = (p: "P0" | "P1" | "P2" | "P3") => {
    const priority = filters.priority.includes(p)
      ? filters.priority.filter((x) => x !== p)
      : ([...filters.priority, p] as ("P0" | "P1" | "P2" | "P3")[])
    updateFilters({ ...filters, priority })
  }

  const clearAll = () => updateFilters(EMPTY_FILTERS)

  const applySavedFilter = (sf: SavedFilter) => {
    const applied: ActiveFilters = {
      labels: sf.filters.labels ?? [],
      members: sf.filters.members ?? [],
      due: sf.filters.due ?? null,
      priority: sf.filters.priority ?? [],
      search: sf.filters.search ?? "",
    }
    updateFilters(applied)
  }

  const saveCurrentFilter = () => {
    if (!saveName.trim()) return
    createFilter(
      { name: saveName.trim(), filters: filters as SavedFilter["filters"], is_default: false },
      { onSuccess: () => { setSaveName(""); setShowSaveInput(false) } },
    )
  }

  const active = isFilterActive(filters)

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-border/30 bg-card/40 overflow-x-auto">
      <Filter className={cn("size-4 shrink-0", active ? "text-primary" : "text-muted-foreground")} />

      {/* Labels filter */}
      {labels.length > 0 && (
        <FilterDropdown label="Labels" active={filters.labels.length > 0}>
          <div className="space-y-0.5">
            {labels.map((label) => (
              <button
                key={label.id}
                onClick={() => toggleLabel(label.id)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors cursor-pointer",
                  filters.labels.includes(label.id)
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-secondary/60",
                )}
              >
                <span
                  className="size-3 rounded-sm shrink-0"
                  style={{ backgroundColor: label.color }}
                />
                {label.name}
              </button>
            ))}
          </div>
        </FilterDropdown>
      )}

      {/* Members filter */}
      {members.length > 0 && (
        <FilterDropdown label="Members" active={filters.members.length > 0}>
          <div className="space-y-0.5">
            {members.map((member) => (
              <button
                key={member.pk}
                onClick={() => toggleMember(String(member.pk))}
                className={cn(
                  "w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors cursor-pointer",
                  filters.members.includes(String(member.pk))
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-secondary/60",
                )}
              >
                <div className="size-6 rounded-md bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                  {(member.first_name?.[0] || member.email[0]).toUpperCase()}
                </div>
                {member.first_name || member.email}
              </button>
            ))}
          </div>
        </FilterDropdown>
      )}

      {/* Due date filter */}
      <FilterDropdown label="Due Date" active={filters.due !== null}>
        <div className="space-y-0.5">
          {DUE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() =>
                updateFilters({
                  ...filters,
                  due: filters.due === opt.value ? null : (opt.value as ActiveFilters["due"]),
                })
              }
              className={cn(
                "w-full text-left px-2 py-2 rounded-lg text-sm transition-colors cursor-pointer",
                filters.due === opt.value
                  ? "bg-primary/10 text-primary"
                  : "text-foreground hover:bg-secondary/60",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </FilterDropdown>

      {/* Priority filter */}
      <FilterDropdown label="Priority" active={filters.priority.length > 0}>
        <div className="space-y-0.5">
          {PRIORITY_OPTIONS.map((p) => (
            <button
              key={p}
              onClick={() => togglePriority(p)}
              className={cn(
                "w-full text-left px-2 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                filters.priority.includes(p)
                  ? "bg-primary/10 text-primary"
                  : "text-foreground hover:bg-secondary/60",
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </FilterDropdown>

      {/* Search input */}
      <input
        type="text"
        value={filters.search}
        onChange={(e) => updateFilters({ ...filters, search: e.target.value })}
        placeholder="Search cards..."
        className="bg-secondary/60 border border-border rounded-lg px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 transition-colors w-36"
      />

      {/* Saved filters dropdown */}
      <FilterDropdown label="Saved" active={false}>
        <div className="space-y-0.5 min-w-[200px]">
          {savedFilters?.length === 0 && (
            <p className="text-xs text-muted-foreground px-2 py-2">No saved filters</p>
          )}
          {savedFilters?.map((sf) => (
            <div key={sf.id} className="flex items-center gap-1">
              <button
                onClick={() => applySavedFilter(sf)}
                className="flex-1 text-left px-2 py-2 rounded-lg text-sm text-foreground hover:bg-secondary/60 transition-colors cursor-pointer flex items-center gap-2"
              >
                {sf.is_default && <Bookmark className="size-3 text-primary shrink-0" />}
                {sf.name}
              </button>
              <button
                onClick={() => deleteFilter(sf.id)}
                className="p-1.5 text-muted-foreground hover:text-destructive transition-colors cursor-pointer rounded-md hover:bg-secondary/60"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
          <div className="border-t border-border pt-1 mt-1">
            {showSaveInput ? (
              <div className="flex gap-1 px-1">
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="Filter name..."
                  className="flex-1 bg-secondary border border-border rounded-md px-2 py-1 text-xs outline-none"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveCurrentFilter()
                    if (e.key === "Escape") setShowSaveInput(false)
                  }}
                />
                <button
                  onClick={saveCurrentFilter}
                  disabled={!saveName.trim()}
                  className="text-xs text-primary font-medium px-2 py-1 rounded-md hover:bg-primary/10 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowSaveInput(true)}
                disabled={!active}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="size-3.5" />
                Save current filter
              </button>
            )}
          </div>
        </div>
      </FilterDropdown>

      {/* Clear all */}
      {active && (
        <button
          onClick={clearAll}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground border border-border hover:bg-secondary/60 transition-colors cursor-pointer shrink-0"
        >
          <X className="size-3.5" />
          Clear
        </button>
      )}
    </div>
  )
}
