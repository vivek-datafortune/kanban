import { useInfiniteQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { Activity, PaginatedResponse } from "@/types/board"

export function useCardActivity(cardId: string) {
  return useInfiniteQuery({
    queryKey: ["activity", "card", cardId],
    queryFn: ({ pageParam = 0 }) =>
      api.get<PaginatedResponse<Activity>>(
        `/cards/${cardId}/activity/?limit=10&offset=${pageParam}`
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (!lastPage.next) return undefined
      const url = new URL(lastPage.next, window.location.origin)
      return Number(url.searchParams.get("offset"))
    },
    enabled: !!cardId,
  })
}

export function useBoardActivity(boardId: string) {
  return useInfiniteQuery({
    queryKey: ["activity", "board", boardId],
    queryFn: ({ pageParam = 0 }) =>
      api.get<PaginatedResponse<Activity>>(
        `/boards/${boardId}/activity/?limit=10&offset=${pageParam}`
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (!lastPage.next) return undefined
      const url = new URL(lastPage.next, window.location.origin)
      return Number(url.searchParams.get("offset"))
    },
    enabled: !!boardId,
  })
}
