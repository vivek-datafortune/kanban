import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api"
import type { AnalyticsData } from "@/types/board"

export function useAnalytics(
  slug: string,
  period: "7d" | "30d" | "90d" = "30d",
  boardId?: string,
) {
  const params = new URLSearchParams({ period })
  if (boardId) params.set("board_id", boardId)

  return useQuery({
    queryKey: ["analytics", slug, period, boardId ?? "all"],
    queryFn: () =>
      api.get<AnalyticsData>(`/workspaces/${slug}/analytics/?${params.toString()}`),
    enabled: !!slug,
    staleTime: 0, // always refetch — server-side cache handles the heavy lifting
  })
}
