import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api"
import type { SavedFilter } from "@/types/board"

export function useSavedFilters(boardId: string) {
  return useQuery({
    queryKey: ["boards", boardId, "filters"],
    queryFn: () => api.get<SavedFilter[]>(`/boards/${boardId}/filters/`),
    enabled: !!boardId,
  })
}

export function useCreateSavedFilter(boardId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<SavedFilter, "id" | "user" | "board" | "created_at">) =>
      api.post<SavedFilter>(`/boards/${boardId}/filters/`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["boards", boardId, "filters"] }),
  })
}

export function useUpdateSavedFilter(boardId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<SavedFilter> & { id: string }) =>
      api.patch<SavedFilter>(`/boards/${boardId}/filters/${id}/`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["boards", boardId, "filters"] }),
  })
}

export function useDeleteSavedFilter(boardId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (filterId: string) =>
      api.delete(`/boards/${boardId}/filters/${filterId}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["boards", boardId, "filters"] }),
  })
}
