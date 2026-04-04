import { useParams, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { Calendar, User as UserIcon, LayoutList } from "lucide-react"
import { useBoard } from "@/hooks/use-boards"
import { useUpdateCard } from "@/hooks/use-cards"
import { useWorkspace } from "@/hooks/use-workspaces"
import { useBoardSocket } from "@/hooks/use-board-socket"
import BackButton from "@/components/ui/back-button"
import CardHeader from "@/components/card/card-header"
import CardDescription from "@/components/card/card-description"
import CardRightPanel from "@/components/card/card-sidebar"
import CardComments from "@/components/card/card-comments"
import CardAttachments from "@/components/card/card-attachments"
import type { Card, List } from "@/types/board"

function findCard(lists: List[] | undefined, cardId: string): { card: Card | null; currentList: List | null } {
  if (!lists) return { card: null, currentList: null }
  for (const list of lists) {
    const found = list.cards.find((c) => c.id === cardId)
    if (found) return { card: found, currentList: list }
  }
  return { card: null, currentList: null }
}

function Section({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="bg-card border border-border rounded-xl p-5"
    >
      {children}
    </motion.div>
  )
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export default function CardPage() {
  const { slug, boardId, cardId } = useParams<{ slug: string; boardId: string; cardId: string }>()
  const navigate = useNavigate()
  const { data: board, isLoading } = useBoard(boardId!)
  const { data: workspace } = useWorkspace(slug!)
  const { mutate: updateCard } = useUpdateCard(boardId!)

  // Keep the board WebSocket alive on the card detail page too
  useBoardSocket(
    boardId,
    undefined,
    () => navigate(slug ? `/w/${slug}` : "/"),
  )

  const { card, currentList } = findCard(board?.lists, cardId!)

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
          <button onClick={() => navigate(`/w/${slug}/b/${boardId}`)} className="mt-4 text-sm text-primary hover:underline cursor-pointer">
            Back to board
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card/80 backdrop-blur-sm px-6 py-3 flex items-center gap-4 border-b border-border/30"
      >
        <BackButton to={`/w/${slug}/b/${boardId}`} label={board?.title ?? "Board"} />
        <CardHeader
          title={card.title}
          listTitle={currentList.title}
          onSave={(title) => updateCard({ id: card.id, title })}
        />
      </motion.div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto h-full">
        <div className="h-full max-w-6xl mx-auto p-6 lg:p-8 flex gap-6 lg:gap-8 items-start">

            {/* ── Main column ── */}
            <div className="flex-1 min-w-0 space-y-4 overflow-y-auto h-full scrollbar-hide">
              {/* Metadata bar */}
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.05, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground"
              >
                <div className="flex items-center gap-1.5">
                  <LayoutList className="size-3.5" />
                  <span>in <span className="font-semibold text-foreground">{currentList.title}</span></span>
                </div>
                {card.created_by && (
                  <div className="flex items-center gap-1.5">
                    <UserIcon className="size-3.5" />
                    <span>
                      by <span className="font-semibold text-foreground">
                        {card.created_by.first_name || card.created_by.email}
                      </span>
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Calendar className="size-3.5" />
                  <span>{formatDate(card.created_at)}</span>
                </div>
              </motion.div>

              {/* Description */}
              <Section delay={0.1}>
                <CardDescription
                  description={card.description}
                  onSave={(description) => updateCard({ id: card.id, description })}
                  cardId={card.id}
                />
              </Section>

              {/* Attachments */}
              <Section delay={0.15}>
                <CardAttachments cardId={card.id} boardId={boardId!} />
              </Section>

              {/* Comments */}
              <Section delay={0.2}>
                <CardComments cardId={card.id} workspaceSlug={slug!} />
              </Section>
            </div>

            {/* ── Right panel (accordion) ── */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="overflow-y-auto h-full scrollbar-hide"
            >
              <CardRightPanel
                card={card}
                boardId={boardId!}
                lists={board?.lists ?? []}
                labels={board?.labels ?? []}
                workspaceSlug={slug!}
                workspaceRole={workspace?.role ?? "member"}
              />
            </motion.div>

        </div>
      </div>
    </div>
  )
}

