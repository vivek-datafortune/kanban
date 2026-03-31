import { useParams, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { useBoard } from "@/hooks/use-boards"
import { useUpdateCard, useDeleteCard } from "@/hooks/use-cards"
import BackButton from "@/components/ui/back-button"
import CardHeader from "@/components/card/card-header"
import CardDescription from "@/components/card/card-description"
import CardLabels from "@/components/card/card-labels"
import CardMembers from "@/components/card/card-members"
import CardSidebar from "@/components/card/card-sidebar"
import type { Card, List } from "@/types/board"

function findCard(lists: List[] | undefined, cardId: string): { card: Card | null; currentList: List | null } {
  if (!lists) return { card: null, currentList: null }
  for (const list of lists) {
    const found = list.cards.find((c) => c.id === cardId)
    if (found) return { card: found, currentList: list }
  }
  return { card: null, currentList: null }
}

export default function CardPage() {
  const { slug, boardId, cardId } = useParams<{ slug: string; boardId: string; cardId: string }>()
  const navigate = useNavigate()
  const { data: board, isLoading } = useBoard(boardId!)
  const { mutate: updateCard } = useUpdateCard(boardId!)
  const { mutate: deleteCard } = useDeleteCard(boardId!)

  const { card, currentList } = findCard(board?.lists, cardId!)

  const handleDelete = () => {
    deleteCard(cardId!)
    navigate(`/w/${slug}/b/${boardId}`)
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="glass-sm rounded-2xl p-8 text-center">
          <div className="animate-spin size-8 border-3 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">Loading card...</p>
        </div>
      </div>
    )
  }

  if (!card || !currentList) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="glass-sm rounded-2xl p-8 text-center">
          <p className="text-foreground font-bold text-lg">Card not found</p>
          <button
            onClick={() => navigate(`/w/${slug}/b/${boardId}`)}
            className="mt-4 text-sm text-primary hover:underline cursor-pointer"
          >
            Back to board
          </button>
        </div>
      </div>
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
        <BackButton to={`/w/${slug}/b/${boardId}`} label={board?.title ?? "Board"} />
        <CardHeader
          title={card.title}
          listTitle={currentList.title}
          onSave={(title) => updateCard({ id: card.id, title })}
        />
      </motion.div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto flex gap-8">
          {/* Main */}
          <motion.div
            key={cardId}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="flex-1 space-y-6 min-w-0"
          >
            <CardLabels labels={card.labels} />
            <CardDescription
              description={card.description}
              onSave={(description) => updateCard({ id: card.id, description })}
            />
            <CardMembers members={card.members} />
          </motion.div>

          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="sticky top-0 self-start"
          >
            <CardSidebar
              card={card}
              boardId={boardId!}
              labels={board?.labels ?? []}
              onDelete={handleDelete}
            />
          </motion.div>
        </div>
      </div>
    </div>
  )
}
