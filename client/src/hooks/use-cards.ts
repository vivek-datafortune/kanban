import { useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { Card } from "@/types/board"

export function useCreateCard(boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ listId, ...data }: { listId: string; title: string; description?: string }) =>
      api.post<Card>(`/lists/${listId}/cards/`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["board", boardId] }),
  })
}

export function useUpdateCard(boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: {
      id: string
      title?: string
      description?: string
      due_date?: string | null
      start_date?: string | null
      is_completed?: boolean
    }) => api.patch<Card>(`/cards/${id}/`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["board", boardId] }),
  })
}

export function useMoveCard(boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, list, position }: { id: string; list: string; position: number }) =>
      api.patch<Card>(`/cards/${id}/move/`, { list, position }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["board", boardId] }),
  })
}

export function useDeleteCard(boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/cards/${id}/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["board", boardId] }),
  })
}

export function useAddCardLabel(boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ cardId, labelId }: { cardId: string; labelId: string }) =>
      api.post(`/cards/${cardId}/labels/`, { label_id: labelId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["board", boardId] }),
  })
}

export function useRemoveCardLabel(boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ cardId, labelId }: { cardId: string; labelId: string }) =>
      api.delete(`/cards/${cardId}/labels/${labelId}/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["board", boardId] }),
  })
}

export function useAddCardMember(boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ cardId, userId }: { cardId: string; userId: number }) =>
      api.post(`/cards/${cardId}/members/`, { user_id: userId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["board", boardId] }),
  })
}

export function useRemoveCardMember(boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ cardId, userId }: { cardId: string; userId: number }) =>
      api.delete(`/cards/${cardId}/members/${userId}/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["board", boardId] }),
  })
}
