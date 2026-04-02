import { useEffect, useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useCookies } from "react-cookie"
import type { Board, Card, List } from "@/types/board"

export type PresenceUser = {
  user_id: string
  email: string
  name: string
}

export function useBoardSocket(
  boardId: string | undefined,
  onPresenceChange?: (users: PresenceUser[]) => void,
  onBoardDeleted?: () => void,
) {
  const queryClient = useQueryClient()
  const [cookies] = useCookies(["access"])

  // Keep callbacks in refs so they never trigger a reconnect
  const presenceCallbackRef = useRef(onPresenceChange)
  const boardDeletedCallbackRef = useRef(onBoardDeleted)
  useEffect(() => {
    presenceCallbackRef.current = onPresenceChange
    boardDeletedCallbackRef.current = onBoardDeleted
  })

  const presenceRef = useRef<Map<string, PresenceUser>>(new Map())

  useEffect(() => {
    if (!boardId || !cookies.access) return

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    const url = `${protocol}//${window.location.host}/ws/board/${boardId}/?token=${cookies.access}`
    const ws = new WebSocket(url)

    ws.onmessage = (event) => {
      const { type, payload } = JSON.parse(event.data) as { type: string; payload: Record<string, unknown> }

      switch (type) {
        case "card.created": {
          queryClient.setQueryData<Board>(["board", boardId], (old) => {
            if (!old) return old
            const alreadyExists = old.lists?.some((l) =>
              l.cards.some((c) => c.id === (payload.card as Card).id)
            )
            if (alreadyExists) return old
            return {
              ...old,
              lists: old.lists?.map((l) =>
                l.id === payload.list_id
                  ? { ...l, cards: [...l.cards, payload.card as Card] }
                  : l
              ),
            }
          })
          break
        }

        case "card.updated": {
          queryClient.setQueryData<Board>(["board", boardId], (old) => {
            if (!old) return old
            return {
              ...old,
              lists: old.lists?.map((l) => ({
                ...l,
                cards: l.cards.map((c) =>
                  c.id === (payload.card as Card).id ? { ...c, ...(payload.card as Card) } : c
                ),
              })),
            }
          })
          break
        }

        case "card.deleted": {
          queryClient.setQueryData<Board>(["board", boardId], (old) => {
            if (!old) return old
            return {
              ...old,
              lists: old.lists?.map((l) => ({
                ...l,
                cards: l.cards.filter((c) => c.id !== payload.card_id),
              })),
            }
          })
          break
        }

        case "card.moved": {
          queryClient.setQueryData<Board>(["board", boardId], (old) => {
            if (!old) return old
            let movedCard: Card | undefined
            const withoutCard = old.lists?.map((l) => {
              const card = l.cards.find((c) => c.id === payload.card_id)
              if (card) movedCard = card
              return { ...l, cards: l.cards.filter((c) => c.id !== payload.card_id) }
            })
            if (!movedCard || !withoutCard) return old
            movedCard = {
              ...movedCard,
              list: payload.to_list_id as string,
              position: payload.position as number,
            }
            return {
              ...old,
              lists: withoutCard.map((l) =>
                l.id === payload.to_list_id
                  ? {
                      ...l,
                      cards: [...l.cards, movedCard!].sort((a, b) => a.position - b.position),
                    }
                  : l
              ),
            }
          })
          break
        }

        case "list.created": {
          queryClient.setQueryData<Board>(["board", boardId], (old) => {
            if (!old) return old
            const exists = old.lists?.some((l) => l.id === (payload.list as { id: string }).id)
            if (exists) return old
            return { ...old, lists: [...(old.lists ?? []), payload.list as List] }
          })
          break
        }

        case "list.updated": {
          queryClient.setQueryData<Board>(["board", boardId], (old) => {
            if (!old) return old
            return {
              ...old,
              lists: old.lists?.map((l) =>
                l.id === (payload.list as { id: string }).id
                  ? { ...l, ...(payload.list as object) }
                  : l
              ),
            }
          })
          break
        }

        case "list.deleted": {
          queryClient.setQueryData<Board>(["board", boardId], (old) => {
            if (!old) return old
            return {
              ...old,
              lists: old.lists?.filter((l) => l.id !== payload.list_id),
            }
          })
          break
        }

        case "board.updated": {
          queryClient.setQueryData<Board>(["board", boardId], (old) => {
            if (!old) return old
            return {
              ...old,
              title: payload.title as string,
              background_color: payload.background_color as string,
              visibility: payload.visibility as Board["visibility"],
            }
          })
          // Also invalidate board list queries so workspace/dashboard pages refresh
          queryClient.invalidateQueries({ queryKey: ["boards"] })
          break
        }

        case "board.deleted": {
          queryClient.removeQueries({ queryKey: ["board", boardId] })
          queryClient.invalidateQueries({ queryKey: ["boards"] })
          boardDeletedCallbackRef.current?.()
          break
        }

        case "checklist.toggled": {
          queryClient.setQueryData<Board>(["board", boardId], (old) => {
            if (!old) return old
            return {
              ...old,
              lists: old.lists?.map((l) => ({
                ...l,
                cards: l.cards.map((c) =>
                  c.id === payload.card_id
                    ? {
                        ...c,
                        checklist_items: c.checklist_items.map((item) =>
                          item.id === payload.item_id
                            ? { ...item, is_completed: payload.is_completed as boolean }
                            : item
                        ),
                      }
                    : c
                ),
              })),
            }
          })
          break
        }

        case "user.joined": {
          const user = payload as PresenceUser
          presenceRef.current.set(user.user_id, user)
          presenceCallbackRef.current?.([...presenceRef.current.values()])
          break
        }

        case "user.left": {
          presenceRef.current.delete(payload.user_id as string)
          presenceCallbackRef.current?.([...presenceRef.current.values()])
          break
        }
      }
    }

    ws.onclose = () => {
      presenceRef.current.clear()
      presenceCallbackRef.current?.([])
    }

    return () => {
      ws.close()
    }
  }, [boardId, cookies.access, queryClient])
}
