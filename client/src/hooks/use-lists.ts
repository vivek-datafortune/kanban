import { useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { List } from "@/types/board"

export function useCreateList(boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { title: string; position?: number }) =>
      api.post<List>(`/boards/${boardId}/lists/`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["board", boardId] }),
  })
}

export function useUpdateList(boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; title?: string; position?: number }) =>
      api.patch<List>(`/lists/${id}/`, data),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["board", boardId] }),
  })
}

export function useDeleteList(boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/lists/${id}/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["board", boardId] }),
  })
}
