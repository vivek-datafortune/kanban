import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { Attachment } from "@/types/board"

export function useAttachments(cardId: string) {
  return useQuery({
    queryKey: ["attachments", cardId],
    queryFn: () => api.get<Attachment[]>(`/cards/${cardId}/attachments/`),
    enabled: !!cardId,
  })
}

export function useUploadAttachment(cardId: string, boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append("file", file)
      return api.post<Attachment>(`/cards/${cardId}/attachments/`, form)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attachments", cardId] })
      queryClient.invalidateQueries({ queryKey: ["board", boardId] })
    },
  })
}

export function useDeleteAttachment(cardId: string, boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (attachmentId: string) =>
      api.delete(`/attachments/${attachmentId}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attachments", cardId] })
      queryClient.invalidateQueries({ queryKey: ["board", boardId] })
    },
  })
}
