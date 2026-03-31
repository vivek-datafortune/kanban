import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { Board } from "@/types/board"

export function useBoards(slug: string) {
  return useQuery({
    queryKey: ["boards", slug],
    queryFn: () => api.get<Board[]>(`/workspaces/${slug}/boards/`),
    enabled: !!slug,
  })
}

export function useBoard(id: string) {
  return useQuery({
    queryKey: ["board", id],
    queryFn: () => api.get<Board>(`/boards/${id}/`),
    enabled: !!id,
  })
}

export function useCreateBoard(slug: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { title: string; background_color?: string; visibility?: string }) =>
      api.post<Board>(`/workspaces/${slug}/boards/`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["boards", slug] }),
  })
}

export function useUpdateBoard() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; title?: string; background_color?: string; visibility?: string }) =>
      api.patch<Board>(`/boards/${id}/`, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["board", data.id] })
      queryClient.invalidateQueries({ queryKey: ["boards"] })
    },
  })
}

export function useDeleteBoard() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/boards/${id}/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["boards"] }),
  })
}

export function useStarBoard() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post<{ is_starred: boolean }>(`/boards/${id}/star/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["boards"] }),
  })
}
