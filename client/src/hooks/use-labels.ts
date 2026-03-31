import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { Label } from "@/types/board"

export function useLabels(boardId: string) {
  return useQuery({
    queryKey: ["labels", boardId],
    queryFn: () => api.get<Label[]>(`/boards/${boardId}/labels/`),
    enabled: !!boardId,
  })
}

export function useCreateLabel(boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; color: string }) =>
      api.post<Label>(`/boards/${boardId}/labels/`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labels", boardId] })
      queryClient.invalidateQueries({ queryKey: ["board", boardId] })
    },
  })
}

export function useUpdateLabel(boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; color?: string }) =>
      api.patch<Label>(`/boards/${boardId}/labels/${id}/`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labels", boardId] })
      queryClient.invalidateQueries({ queryKey: ["board", boardId] })
    },
  })
}

export function useDeleteLabel(boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/boards/${boardId}/labels/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labels", boardId] })
      queryClient.invalidateQueries({ queryKey: ["board", boardId] })
    },
  })
}
