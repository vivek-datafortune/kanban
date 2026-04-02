import { useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { Board, Card } from "@/types/board"

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
    onMutate: async ({ cardId, labelId }) => {
      await queryClient.cancelQueries({ queryKey: ["board", boardId] })
      const previous = queryClient.getQueryData(["board", boardId])
      queryClient.setQueryData(["board", boardId], (old: Board | undefined) => {
        if (!old?.lists) return old
        const label = old.labels?.find((l) => l.id === labelId)
        if (!label) return old
        return {
          ...old,
          lists: old.lists.map((list) => ({
            ...list,
            cards: list.cards.map((card) =>
              card.id === cardId && !card.labels.some((l) => l.id === labelId)
                ? { ...card, labels: [...card.labels, label] }
                : card
            ),
          })),
        }
      })
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(["board", boardId], context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["board", boardId] }),
  })
}

export function useRemoveCardLabel(boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ cardId, labelId }: { cardId: string; labelId: string }) =>
      api.delete(`/cards/${cardId}/labels/${labelId}/`),
    onMutate: async ({ cardId, labelId }) => {
      await queryClient.cancelQueries({ queryKey: ["board", boardId] })
      const previous = queryClient.getQueryData(["board", boardId])
      queryClient.setQueryData(["board", boardId], (old: Board | undefined) => {
        if (!old?.lists) return old
        return {
          ...old,
          lists: old.lists.map((list) => ({
            ...list,
            cards: list.cards.map((card) =>
              card.id === cardId
                ? { ...card, labels: card.labels.filter((l) => l.id !== labelId) }
                : card
            ),
          })),
        }
      })
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(["board", boardId], context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["board", boardId] }),
  })
}

export function useAddCardMember(boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ cardId, userId }: { cardId: string; userId: number; user: import("@/types/auth").User }) =>
      api.post(`/cards/${cardId}/members/`, { user_id: userId }),
    onMutate: async ({ cardId, user }) => {
      await queryClient.cancelQueries({ queryKey: ["board", boardId] })
      const previous = queryClient.getQueryData(["board", boardId])
      queryClient.setQueryData(["board", boardId], (old: Board | undefined) => {
        if (!old?.lists) return old
        return {
          ...old,
          lists: old.lists.map((list) => ({
            ...list,
            cards: list.cards.map((card) =>
              card.id === cardId && !card.members.some((m) => m.pk === user.pk)
                ? { ...card, members: [...card.members, user] }
                : card
            ),
          })),
        }
      })
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      queryClient.setQueryData(["board", boardId], ctx?.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["board", boardId] }),
  })
}

export function useRemoveCardMember(boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ cardId, userId }: { cardId: string; userId: number }) =>
      api.delete(`/cards/${cardId}/members/${userId}/`),
    onMutate: async ({ cardId, userId }) => {
      await queryClient.cancelQueries({ queryKey: ["board", boardId] })
      const previous = queryClient.getQueryData(["board", boardId])
      queryClient.setQueryData(["board", boardId], (old: Board | undefined) => {
        if (!old?.lists) return old
        return {
          ...old,
          lists: old.lists.map((list) => ({
            ...list,
            cards: list.cards.map((card) =>
              card.id === cardId
                ? { ...card, members: card.members.filter((m) => m.pk !== userId) }
                : card
            ),
          })),
        }
      })
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      queryClient.setQueryData(["board", boardId], ctx?.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["board", boardId] }),
  })
}
