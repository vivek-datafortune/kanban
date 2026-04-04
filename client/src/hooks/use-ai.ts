import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { AISuggestion } from "@/types/board"

export function useAISuggestions(cardId: string) {
  return useQuery<AISuggestion | null>({
    queryKey: ["ai-suggestions", cardId],
    queryFn: () => api.get<AISuggestion | null>(`/cards/${cardId}/ai-suggestions/`),
    enabled: !!cardId,
    staleTime: 1000 * 60 * 5,
  })
}

export function useGenerateSuggestions(cardId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      api.post<AISuggestion>(`/ai/suggest/`, { card_id: cardId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-suggestions", cardId] })
    },
  })
}

export function useAcceptSuggestions(cardId: string, boardId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      suggestionId,
      ...payload
    }: {
      suggestionId: string
      subtasks?: string[]
      accept_description?: boolean
      label_ids?: string[]
      accept_priority?: boolean
    }) =>
      api.post(`/ai-suggestions/${suggestionId}/accept/`, {
        subtasks: payload.subtasks,
        accept_description: payload.accept_description,
        label_ids: payload.label_ids,
        accept_priority: payload.accept_priority,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-suggestions", cardId] })
      qc.invalidateQueries({ queryKey: ["board", boardId] })
    },
  })
}

export function useDismissSuggestions(cardId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (suggestionId: string) =>
      api.post(`/ai-suggestions/${suggestionId}/dismiss/`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-suggestions", cardId] })
    },
  })
}

export function useGenerateChecklist(cardId: string, boardId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (prompt?: string) =>
      api.post<{ items: string[] }>(`/ai/checklist/`, { card_id: cardId, prompt }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["board", boardId] })
    },
  })
}
