import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { useStore } from "@/store/app.store"
import type { TimeEntry } from "@/types/board"

export function useTimeEntries(cardId: string) {
  return useQuery({
    queryKey: ["time-entries", cardId],
    queryFn: () => api.get<TimeEntry[]>(`/cards/${cardId}/time/`),
    enabled: !!cardId,
  })
}

export function useStartTimer(cardId: string, boardId: string, cardTitle: string) {
  const queryClient = useQueryClient()
  const setActiveTimer = useStore((s) => s.setActiveTimer)

  return useMutation({
    mutationFn: () => api.post<TimeEntry>(`/cards/${cardId}/time/start/`, {}),
    onSuccess: (entry) => {
      setActiveTimer({
        entryId: entry.id,
        cardId,
        cardTitle,
        boardId,
        startedAt: entry.started_at,
      })
      queryClient.invalidateQueries({ queryKey: ["time-entries", cardId] })
      queryClient.invalidateQueries({ queryKey: ["board", boardId] })
    },
  })
}

export function useStopTimer(cardId: string, boardId: string) {
  const queryClient = useQueryClient()
  const setActiveTimer = useStore((s) => s.setActiveTimer)

  return useMutation({
    mutationFn: () => api.post<TimeEntry>(`/cards/${cardId}/time/stop/`, {}),
    onSuccess: () => {
      setActiveTimer(null)
      queryClient.invalidateQueries({ queryKey: ["time-entries", cardId] })
      queryClient.invalidateQueries({ queryKey: ["board", boardId] })
      queryClient.invalidateQueries({ queryKey: ["analytics"] })
    },
  })
}

export function useAddManualTime(cardId: string, boardId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { duration_seconds: number; note?: string }) =>
      api.post<TimeEntry>(`/cards/${cardId}/time/manual/`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-entries", cardId] })
      queryClient.invalidateQueries({ queryKey: ["board", boardId] })
      queryClient.invalidateQueries({ queryKey: ["analytics"] })
    },
  })
}

export function useDeleteTimeEntry(cardId: string, boardId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (entryId: string) => api.delete(`/time-entries/${entryId}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-entries", cardId] })
      queryClient.invalidateQueries({ queryKey: ["board", boardId] })
      queryClient.invalidateQueries({ queryKey: ["analytics"] })
    },
  })
}

export function useUpdateEstimate(cardId: string, boardId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (estimated_hours: number | null) =>
      api.patch(`/cards/${cardId}/estimate/`, { estimated_hours }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] })
    },
  })
}

export function useElapsedSeconds(startedAt: string | null): number {
  const [elapsed, setElapsed] = useState(() =>
    startedAt ? Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000) : 0,
  )
  useEffect(() => {
    if (!startedAt) return
    function tick() {
      setElapsed(Math.floor((Date.now() - new Date(startedAt!).getTime()) / 1000))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [startedAt])
  return elapsed
}
