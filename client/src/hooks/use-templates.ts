import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api"
import type { Board, BoardTemplate } from "@/types/board"

export function useTemplates() {
  return useQuery({
    queryKey: ["templates"],
    queryFn: () => api.get<BoardTemplate[]>("/templates/"),
  })
}

export function useTemplate(id: string) {
  return useQuery({
    queryKey: ["templates", id],
    queryFn: () => api.get<BoardTemplate>(`/templates/${id}/`),
    enabled: !!id,
  })
}

export function useDeleteTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/templates/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["templates"] }),
  })
}

export function useSaveAsTemplate(boardId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { title: string; description?: string; category?: string }) =>
      api.post<BoardTemplate>(`/boards/${boardId}/save-as-template/`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["templates"] }),
  })
}

export function useUseTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      templateId: string
      workspace: string
      title: string
      background_color?: string
    }) =>
      api.post<Board>(`/templates/${data.templateId}/use/`, {
        workspace: data.workspace,
        title: data.title,
        background_color: data.background_color ?? "#e0e5ec",
      }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["boards", variables.workspace] })
    },
  })
}
