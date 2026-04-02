import { useState, useMemo, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { DragDropContext, Droppable, type DropResult } from "@hello-pangea/dnd"
import { Pin, MoreHorizontal, Plus } from "lucide-react"
import { useBoard } from "@/hooks/use-boards"
import { useMoveCard } from "@/hooks/use-cards"
import { useCreateList, useUpdateList } from "@/hooks/use-lists"
import { useBoardSocket, type PresenceUser } from "@/hooks/use-board-socket"
import type { List } from "@/types/board"
import { cn } from "@/lib/utils"
import BackButton from "@/components/ui/back-button"
import BoardList from "@/components/board/board-list"
import BoardPresence from "@/components/board/board-presence"

export default function BoardPage() {
  const { slug, boardId } = useParams<{ slug: string; boardId: string }>()
  const navigate = useNavigate()
  const { data: board, isLoading } = useBoard(boardId!)
  const { mutate: moveCard } = useMoveCard(boardId!)
  const { mutate: createList, isPending: isCreatingList } = useCreateList(boardId!)
  const { mutate: updateList } = useUpdateList(boardId!)

  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([])
  useBoardSocket(
    boardId,
    setPresenceUsers,
    () => navigate(slug ? `/w/${slug}` : "/"),
  )

  const [showAddList, setShowAddList] = useState(false)
  const [newListTitle, setNewListTitle] = useState("")

  // Local override for lists — set on drag, cleared when server syncs
  const [localLists, setLocalLists] = useState<List[] | null>(null)

  const serverLists = useMemo(
    () =>
      (board?.lists?.filter((l) => !l.is_archived) ?? []).sort(
        (a, b) => a.position - b.position
      ),
    [board?.lists]
  )

  // Use local override while it exists, otherwise use server data
  const lists = localLists ?? serverLists

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { source, destination, type } = result
      if (!destination) return
      if (source.droppableId === destination.droppableId && source.index === destination.index) return

      if (type === "LIST") {
        const reordered = [...lists]
        const [moved] = reordered.splice(source.index, 1)
        reordered.splice(destination.index, 0, moved)

        const newIndex = destination.index
        let newPosition: number
        if (reordered.length === 1) {
          newPosition = 1024
        } else if (newIndex === 0) {
          newPosition = reordered[1].position / 2
        } else if (newIndex === reordered.length - 1) {
          newPosition = reordered[newIndex - 1].position + 1024
        } else {
          const before = reordered[newIndex - 1].position
          const after = reordered[newIndex + 1].position
          newPosition = (before + after) / 2
        }

        // Update local state immediately — no flicker
        moved.position = newPosition
        setLocalLists(reordered)

        updateList(
          { id: moved.id, position: newPosition },
          { onSettled: () => { setLocalLists(null) } }
        )
        return
      }

      // Card drag
      const sourceList = lists.find((l) => l.id === source.droppableId)
      const destList = lists.find((l) => l.id === destination.droppableId)
      if (!sourceList || !destList) return

      const card = sourceList.cards[source.index]
      if (!card) return

      const destCards = sourceList.id === destList.id
        ? [...destList.cards]
        : [...destList.cards]

      if (sourceList.id === destList.id) {
        destCards.splice(source.index, 1)
        destCards.splice(destination.index, 0, card)
      } else {
        destCards.splice(destination.index, 0, card)
      }

      const newIndex = destination.index
      let newPosition: number
      if (destCards.length === 1) {
        newPosition = 1024
      } else if (newIndex === 0) {
        newPosition = destCards[1].position / 2
      } else if (newIndex === destCards.length - 1) {
        newPosition = destCards[newIndex - 1].position + 1024
      } else {
        const before = destCards[newIndex - 1].position
        const after = destCards[newIndex + 1].position
        newPosition = (before + after) / 2
      }

      // Update local state immediately
      setLocalLists(
        lists.map((l) => {
          if (l.id === sourceList.id && l.id === destList.id) {
            const cards = l.cards.filter((c) => c.id !== card.id)
            cards.splice(destination.index, 0, { ...card, position: newPosition })
            return { ...l, cards }
          }
          if (l.id === sourceList.id) {
            return { ...l, cards: l.cards.filter((c) => c.id !== card.id) }
          }
          if (l.id === destList.id) {
            const cards = [...l.cards]
            cards.splice(destination.index, 0, { ...card, list: destList.id, position: newPosition })
            return { ...l, cards }
          }
          return l
        })
      )

      moveCard(
        { id: card.id, list: destList.id, position: newPosition },
        { onSettled: () => { setLocalLists(null) } }
      )
    },
    [lists, moveCard, updateList]
  )

  const handleAddList = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newListTitle.trim()) return
    createList(
      { title: newListTitle.trim() },
      {
        onSuccess: () => {
          setNewListTitle("")
          setShowAddList(false)
        },
      }
    )
  }

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="glass-sm rounded-2xl p-8 text-center">
          <div className="animate-spin size-8 border-3 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">Loading board...</p>
        </div>
      </div>
    )
  }

  if (!board) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="glass-sm rounded-2xl p-8 text-center">
          <p className="text-foreground font-bold text-lg">Board not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Board header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card/80 backdrop-blur px-6 py-3 flex items-center gap-4 border-b border-border/30"
      >
        <BackButton to={slug ? `/w/${slug}` : "/"} label="Board" />
        <h2 className="text-lg font-bold text-foreground">{board.title}</h2>
        <button className="text-muted-foreground hover:text-primary transition-colors cursor-pointer">
          <Pin className={cn("size-4", board.is_starred && "fill-primary text-primary")} />
        </button>
        <BoardPresence users={presenceUsers} />
        <div className="ml-auto">
          <button className="text-muted-foreground hover:text-foreground cursor-pointer p-2">
            <MoreHorizontal className="size-5" />
          </button>
        </div>
      </motion.div>

      {/* Board content */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="board" type="LIST" direction="horizontal">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="flex gap-5 items-start h-full"
              >
                {lists.map((list, index) => (
                  <BoardList
                    key={list.id}
                    list={list}
                    index={index}
                    boardId={boardId!}
                    onCardClick={(cardId) => navigate(`/w/${slug}/b/${boardId}/c/${cardId}`)}
                  />
                ))}
                {provided.placeholder}

                {/* Add list */}
                {showAddList ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-72 shrink-0 glass-sm rounded-2xl p-4"
                  >
                    <form onSubmit={handleAddList} className="space-y-3">
                      <input
                        type="text"
                        value={newListTitle}
                        onChange={(e) => setNewListTitle(e.target.value)}
                        placeholder="List title..."
                        className="w-full text-foreground rounded-lg px-3 py-2 text-sm bg-secondary border border-border
                                   placeholder:text-muted-foreground focus:outline-none"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={isCreatingList || !newListTitle.trim()}
                          className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-semibold
                                     hover:bg-primary/90 transition-colors
                                     disabled:opacity-50 cursor-pointer"
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddList(false)
                            setNewListTitle("")
                          }}
                          className="text-muted-foreground hover:text-foreground cursor-pointer px-2"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </motion.div>
                ) : (
                  <button
                    onClick={() => setShowAddList(true)}
                    className="w-72 shrink-0 glass-sm rounded-xl p-4 flex items-center gap-2
                               text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                  >
                    <Plus className="size-4" />
                    <span className="text-sm font-medium">Add List</span>
                  </button>
                )}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

    </div>
  )
}
