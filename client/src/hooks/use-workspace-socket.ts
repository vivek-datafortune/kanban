import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useCookies } from "react-cookie"
import type { Board } from "@/types/board"

export function useWorkspaceSocket(slug: string | undefined) {
  const queryClient = useQueryClient()
  const [cookies] = useCookies(["access"])

  useEffect(() => {
    if (!slug || !cookies.access) return

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    const url = `${protocol}//${window.location.host}/ws/workspace/${slug}/?token=${cookies.access}`
    const ws = new WebSocket(url)

    ws.onmessage = (event) => {
      const { type, payload } = JSON.parse(event.data) as {
        type: string
        payload: Record<string, unknown>
      }

      switch (type) {
        case "board.created": {
          const board = payload.board as Board
          queryClient.setQueryData<Board[]>(["boards", slug], (old) => {
            if (!old) return [board]
            if (old.some((b) => b.id === board.id)) return old
            return [...old, board]
          })
          break
        }

        case "board.updated": {
          queryClient.setQueryData<Board[]>(["boards", slug], (old) =>
            old?.map((b) =>
              b.id === payload.id
                ? {
                    ...b,
                    title: payload.title as string,
                    background_color: payload.background_color as string,
                    visibility: payload.visibility as Board["visibility"],
                  }
                : b
            )
          )
          break
        }

        case "board.deleted": {
          queryClient.setQueryData<Board[]>(["boards", slug], (old) =>
            old?.filter((b) => b.id !== payload.board_id)
          )
          break
        }
      }
    }

    return () => ws.close()
  }, [slug, cookies.access, queryClient])
}
