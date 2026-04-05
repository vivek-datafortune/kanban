import { useState, useEffect, useRef } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandRoot,
} from "cmdk"
import { Search, FileText, Kanban, MessageSquare, Clock, X } from "lucide-react"

import { useSearch } from "@/hooks/use-search"
import { useStore } from "@/store/app.store"
import { cn } from "@/lib/utils"

const TYPE_ICONS = {
  card: FileText,
  board: Kanban,
  comment: MessageSquare,
}

interface SearchCommandProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function SearchCommand({ open, onOpenChange }: SearchCommandProps) {
  const navigate = useNavigate()
  const { slug } = useParams<{ slug?: string }>()
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const { recentSearches, addRecentSearch, clearRecentSearches } = useStore()
  const inputRef = useRef<HTMLInputElement>(null)

  // Debounce query 250ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 250)
    return () => clearTimeout(timer)
  }, [query])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setQuery("")
      setDebouncedQuery("")
    }
  }, [open])

  const { data: results, isFetching } = useSearch(slug ?? "", debouncedQuery)

  const handleSelect = (result: { type: string; id: string; board: { id: string }; list: { id: string } | null }) => {
    if (!slug) return
    addRecentSearch(debouncedQuery)
    onOpenChange(false)
    if (result.type === "board") {
      navigate(`/w/${slug}/b/${result.id}`)
    } else {
      navigate(`/w/${slug}/b/${result.board.id}/c/${result.id}`)
    }
  }

  const handleRecentSelect = (q: string) => {
    setQuery(q)
    setDebouncedQuery(q)
  }

  const grouped = results
    ? {
        card: results.results.filter((r) => r.type === "card"),
        board: results.results.filter((r) => r.type === "board"),
        comment: results.results.filter((r) => r.type === "comment"),
      }
    : null

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] px-4 bg-black/50 backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-xl bg-card rounded-2xl shadow-2xl border border-border overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <CommandRoot shouldFilter={false}>
              {/* Input */}
              <div className="flex items-center gap-3 px-4 border-b border-border">
                <Search className="size-4 text-muted-foreground shrink-0" />
                <CommandInput
                  ref={inputRef}
                  value={query}
                  onValueChange={setQuery}
                  placeholder="Search cards, boards, comments..."
                  className="flex-1 bg-transparent py-4 text-sm text-foreground placeholder:text-muted-foreground outline-none"
                />
                {isFetching && (
                  <Clock className="size-4 text-muted-foreground animate-spin shrink-0" />
                )}
                {query && (
                  <button
                    onClick={() => { setQuery(""); setDebouncedQuery("") }}
                    className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer p-1 shrink-0"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>

              <CommandList className="max-h-[400px] overflow-y-auto p-2">
                <CommandEmpty className="py-8 text-center text-sm text-muted-foreground">
                  {debouncedQuery.length >= 2 ? "No results found." : "Type at least 2 characters to search."}
                </CommandEmpty>

                {/* Recent searches when query is empty */}
                {!query && recentSearches.length > 0 && (
                  <CommandGroup
                    heading={
                      <div className="flex items-center justify-between px-2 py-1">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Recent
                        </span>
                        <button
                          onClick={clearRecentSearches}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    }
                  >
                    {recentSearches.map((q) => (
                      <CommandItem
                        key={q}
                        value={q}
                        onSelect={() => handleRecentSelect(q)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer",
                          "text-foreground hover:bg-secondary/60 aria-selected:bg-secondary/60",
                        )}
                      >
                        <Clock className="size-3.5 text-muted-foreground shrink-0" />
                        {q}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {/* Live results */}
                {grouped && (
                  <>
                    {grouped.card.length > 0 && (
                      <CommandGroup heading={
                        <span className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Cards
                        </span>
                      }>
                        {grouped.card.map((result) => {
                          const Icon = TYPE_ICONS[result.type]
                          return (
                            <CommandItem
                              key={result.id}
                              value={result.id}
                              onSelect={() => handleSelect(result)}
                              className={cn(
                                "flex items-start gap-3 px-3 py-2.5 rounded-lg cursor-pointer",
                                "text-foreground hover:bg-secondary/60 aria-selected:bg-secondary/60",
                              )}
                            >
                              <Icon className="size-4 text-primary shrink-0 mt-0.5" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{result.title}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {result.board.title}
                                  {result.list && ` › ${result.list.title}`}
                                </p>
                                {result.highlight && (
                                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                    {result.highlight}
                                  </p>
                                )}
                              </div>
                            </CommandItem>
                          )
                        })}
                      </CommandGroup>
                    )}

                    {grouped.board.length > 0 && (
                      <CommandGroup heading={
                        <span className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Boards
                        </span>
                      }>
                        {grouped.board.map((result) => {
                          const Icon = TYPE_ICONS[result.type]
                          return (
                            <CommandItem
                              key={result.id}
                              value={result.id}
                              onSelect={() => handleSelect(result)}
                              className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer",
                                "text-foreground hover:bg-secondary/60 aria-selected:bg-secondary/60",
                              )}
                            >
                              <Icon className="size-4 text-primary shrink-0" />
                              <span className="text-sm font-medium">{result.title}</span>
                            </CommandItem>
                          )
                        })}
                      </CommandGroup>
                    )}

                    {grouped.comment.length > 0 && (
                      <CommandGroup heading={
                        <span className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Comments
                        </span>
                      }>
                        {grouped.comment.map((result) => {
                          const Icon = TYPE_ICONS[result.type]
                          return (
                            <CommandItem
                              key={result.id}
                              value={result.id}
                              onSelect={() => handleSelect(result)}
                              className={cn(
                                "flex items-start gap-3 px-3 py-2.5 rounded-lg cursor-pointer",
                                "text-foreground hover:bg-secondary/60 aria-selected:bg-secondary/60",
                              )}
                            >
                              <Icon className="size-4 text-primary shrink-0 mt-0.5" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{result.title}</p>
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                  {result.highlight}
                                </p>
                              </div>
                            </CommandItem>
                          )
                        })}
                      </CommandGroup>
                    )}
                  </>
                )}
              </CommandList>

              {/* Footer hint */}
              <div className="px-4 py-2 border-t border-border flex items-center gap-3 text-xs text-muted-foreground">
                <span>↑↓ navigate</span>
                <span>↵ select</span>
                <span>esc close</span>
              </div>
            </CommandRoot>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
