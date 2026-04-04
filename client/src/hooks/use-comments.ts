import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { Comment, PaginatedResponse } from "@/types/board"

export function useComments(cardId: string) {
  return useInfiniteQuery({
    queryKey: ["comments", cardId],
    queryFn: ({ pageParam = 0 }) =>
      api.get<PaginatedResponse<Comment>>(
        `/cards/${cardId}/comments/?limit=20&offset=${pageParam}`
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

export function useAddComment(cardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { body: string; parent?: string }) =>
      api.post<Comment>(`/cards/${cardId}/comments/`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["comments", cardId] }),
  })
}

export function useEditComment(cardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) =>
      api.patch<Comment>(`/comments/${id}/`, { body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["comments", cardId] }),
  })
}

export function useDeleteComment(cardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/comments/${id}/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["comments", cardId] }),
  })
}
