import { useState } from "react"
import { Link, useParams } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Lock, Globe, X, Pin } from "lucide-react"
import { useWorkspace } from "@/hooks/use-workspaces"
import { useBoards, useCreateBoard, useStarBoard } from "@/hooks/use-boards"
import BackButton from "@/components/ui/back-button"
import { cn } from "@/lib/utils"

const BOARD_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316",
  "#eab308", "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
]

export default function WorkspacePage() {
  const { slug } = useParams<{ slug: string }>()
  const { data: workspace } = useWorkspace(slug!)
  const { data: boards, isLoading } = useBoards(slug!)
  const { mutate: createBoard, isPending: isCreating } = useCreateBoard(slug!)
  const { mutate: toggleStar } = useStarBoard()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newColor, setNewColor] = useState(BOARD_COLORS[0])

  const starredBoards = boards?.filter((b) => b.is_starred) ?? []

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    createBoard(
      { title: newTitle.trim(), background_color: newColor },
      {
        onSuccess: () => {
          setNewTitle("")
          setNewColor(BOARD_COLORS[0])
          setShowCreateForm(false)
        },
      }
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card/80 backdrop-blur px-6 py-3 flex items-center gap-4 border-b border-border/30"
      >
        <BackButton to="/" label="Home" />
        <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <span className="text-sm font-bold text-primary">
            {(workspace?.name?.[0] ?? "W").toUpperCase()}
          </span>
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">{workspace?.name || "Workspace"}</h2>
          {workspace?.description && (
            <p className="text-xs text-muted-foreground">{workspace.description}</p>
          )}
        </div>
        <div className="ml-auto">
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-primary text-primary-foreground rounded-lg px-4 py-2.5 text-sm font-semibold
                       hover:bg-primary/90 transition-colors cursor-pointer flex items-center gap-2"
          >
            <Plus className="size-4" />
            New Board
          </button>
        </div>
      </motion.div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto">

      {/* Starred boards — horizontal pinned row */}
      <AnimatePresence>
        {starredBoards.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="mb-8"
          >
            <p className="text-xs font-medium text-muted-foreground mb-3 px-1">Pinned</p>
            <div className="flex flex-wrap gap-2">
              {starredBoards.map((board, i) => (
                <motion.div
                  key={board.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.25, delay: 0.15 + i * 0.04 }}
                >
                  <Link
                    to={`/w/${slug}/b/${board.id}`}
                    className="group inline-flex items-center gap-2 rounded-lg bg-card border border-border
                               px-3 py-2 hover:border-primary/30 hover:shadow-sm transition-all duration-150"
                  >
                    <div
                      className="size-2 rounded-full shrink-0"
                      style={{ backgroundColor: board.background_color }}
                    />
                    <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                      {board.title}
                    </span>
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        toggleStar(board.id)
                      }}
                      className="text-primary cursor-pointer p-0.5 hover:text-primary/70 transition-colors"
                    >
                      <Pin className="size-3 fill-current" />
                    </button>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* All boards */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.15 }}
      >
        <div className="flex items-center gap-2 mb-3 px-1">
          <h3 className="text-xs font-medium text-muted-foreground">
            All boards
          </h3>
          {boards && (
            <span className="text-[11px] text-muted-foreground/60">
              {boards.length}
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1">
          {isLoading
            ? [1, 2, 3, 4, 5, 6].map((i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.4 }}
                  transition={{ duration: 0.5, delay: i * 0.06 }}
                  className="rounded-xl h-16 bg-secondary/30 animate-pulse"
                />
              ))
            : boards?.map((board, i) => (
                <BoardCard
                  key={board.id}
                  board={board}
                  slug={slug!}
                  index={i}
                  onToggleStar={toggleStar}
                />
              ))}

            {/* Create board inline */}
            <AnimatePresence>
              {showCreateForm ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  className="rounded-xl border border-border bg-card p-4"
                >
                  <form onSubmit={handleCreate} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground">New Board</span>
                      <button
                        type="button"
                        onClick={() => setShowCreateForm(false)}
                        className="text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="Board title"
                      className="w-full text-foreground rounded-lg px-3 py-2 text-sm bg-secondary border border-border
                                 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                      autoFocus
                      required
                    />
                    {/* Color picker */}
                    <div className="flex flex-wrap gap-1.5">
                      {BOARD_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setNewColor(c)}
                          className={cn(
                            "size-7 rounded-lg cursor-pointer transition-all",
                            newColor === c
                              ? "ring-2 ring-primary ring-offset-2 ring-offset-card scale-110"
                              : "hover:scale-105"
                          )}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <button
                      type="submit"
                      disabled={isCreating || !newTitle.trim()}
                      className="w-full bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-semibold
                                 hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {isCreating ? "Creating..." : "Create Board"}
                    </button>
                  </form>
                </motion.div>
              ) : !isLoading ? (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => setShowCreateForm(true)}
                  className="rounded-xl h-16 border border-dashed border-border/50 flex items-center justify-center gap-2
                             text-muted-foreground hover:text-primary hover:border-primary/30
                             transition-all duration-150 cursor-pointer"
                >
                  <Plus className="size-5" />
                  <span className="text-sm font-medium">Create Board</span>
                </motion.button>
              ) : null}
            </AnimatePresence>
          </div>
      </motion.div>
        </div>
      </div>
    </div>
  )
}

/* ── Board card sub-component ──────────────────────────────────────────────── */

interface BoardCardProps {
  board: Board
  slug: string
  index: number
  onToggleStar: (id: string) => void
}

import type { Board } from "@/types/board"

function BoardCard({ board, slug, index, onToggleStar }: BoardCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 + index * 0.04, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <Link
        to={`/w/${slug}/b/${board.id}`}
        className="group flex items-start gap-3.5 rounded-xl px-4 py-3.5 
                   bg-card/60 border border-transparent
                   hover:bg-card hover:border-border hover:shadow-sm
                   transition-all duration-150"
      >
        {/* Color dot */}
        <div
          className="size-2.5 rounded-full mt-1.5 shrink-0"
          style={{ backgroundColor: board.background_color }}
        />

        {/* Text */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
            {board.title}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            {board.visibility === "private" ? (
              <Lock className="size-3 text-muted-foreground/60" />
            ) : (
              <Globe className="size-3 text-muted-foreground/60" />
            )}
            <span className="text-[11px] text-muted-foreground capitalize">{board.visibility}</span>
          </div>
        </div>

        {/* Star / Pin */}
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onToggleStar(board.id)
          }}
          className={cn(
            "p-1 rounded-md transition-all cursor-pointer shrink-0 mt-0.5",
            board.is_starred
              ? "text-primary"
              : "opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-primary"
          )}
          title={board.is_starred ? "Unpin" : "Pin to top"}
        >
          <Pin className={cn("size-3.5", board.is_starred && "fill-current")} />
        </button>
      </Link>
    </motion.div>
  )
}
