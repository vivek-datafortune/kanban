import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api"
import type { SearchResponse } from "@/types/board"

export function useSearch(
  slug: string,
  query: string,
  type?: "card" | "board" | "comment",
  boardId?: string,
) {
  const params = new URLSearchParams({ q: query })
  if (type) params.set("type", type)
  if (boardId) params.set("board_id", boardId)

  return useQuery({
    queryKey: ["search", slug, query, type ?? "all", boardId ?? "all"],
    queryFn: () =>
      api.get<SearchResponse>(`/workspaces/${slug}/search/?${params.toString()}`),
    enabled: !!slug && query.trim().length >= 2,
    staleTime: 1000 * 30, // 30 seconds
  })
}
