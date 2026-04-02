import { useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { Board, ChecklistItem } from "@/types/board"

function updateItemInCache(
  old: Board | undefined,
  cardId: string,
  transform: (items: ChecklistItem[]) => ChecklistItem[],
): Board | undefined {
  if (!old?.lists) return old
  return {
    ...old,
    lists: old.lists.map((list) => ({
      ...list,
      cards: list.cards.map((card) =>
        card.id === cardId
          ? { ...card, checklist_items: transform(card.checklist_items ?? []) }
          : card,
      ),
    })),
  }
}

export function useCreateChecklistItem(boardId: string, cardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (text: string) =>
      api.post<ChecklistItem>(`/cards/${cardId}/checklist/`, { text }),
    onSuccess: (item) => {
      queryClient.setQueryData(["board", boardId], (old: Board | undefined) =>
        updateItemInCache(old, cardId, (items) => [...items, item]),
      )
    },
  })
}

export function useToggleChecklistItem(boardId: string, cardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, is_completed }: { id: string; is_completed: boolean }) =>
      api.patch<ChecklistItem>(`/checklist/${id}/`, { is_completed }),
    onMutate: async ({ id, is_completed }) => {
      await queryClient.cancelQueries({ queryKey: ["board", boardId] })
      const previous = queryClient.getQueryData(["board", boardId])
      queryClient.setQueryData(["board", boardId], (old: Board | undefined) =>
        updateItemInCache(old, cardId, (items) =>
          items.map((i) => (i.id === id ? { ...i, is_completed } : i)),
        ),
      )
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      queryClient.setQueryData(["board", boardId], ctx?.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["board", boardId] }),
  })
}

export function useUpdateChecklistItem(boardId: string, cardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) =>
      api.patch<ChecklistItem>(`/checklist/${id}/`, { text }),
    onSuccess: (item) => {
      queryClient.setQueryData(["board", boardId], (old: Board | undefined) =>
        updateItemInCache(old, cardId, (items) =>
          items.map((i) => (i.id === item.id ? item : i)),
        ),
      )
    },
  })
}

export function useDeleteChecklistItem(boardId: string, cardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/checklist/${id}/`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["board", boardId] })
      const previous = queryClient.getQueryData(["board", boardId])
      queryClient.setQueryData(["board", boardId], (old: Board | undefined) =>
        updateItemInCache(old, cardId, (items) => items.filter((i) => i.id !== id)),
      )
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      queryClient.setQueryData(["board", boardId], ctx?.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["board", boardId] }),
  })
}
