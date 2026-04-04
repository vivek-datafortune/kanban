import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from "@tanstack/react-query"
import { useEffect, useRef } from "react"
import { useCookies } from "react-cookie"
import { api } from "@/lib/api"
import type { Notification } from "@/types/notification"

interface PaginatedNotifications {
  count: number
  next: string | null
  previous: string | null
  results: Notification[]
}

export function useNotifications() {
  return useInfiniteQuery({
    queryKey: ["notifications"],
    queryFn: ({ pageParam = 0 }) =>
      api.get<PaginatedNotifications>(`/notifications/?limit=20&offset=${pageParam}`),
    initialPageParam: 0,
    getNextPageParam: (page, _, lastPageParam) =>
      page.next ? (lastPageParam as number) + 20 : undefined,
  })
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: () => api.get<{ count: number }>("/notifications/unread-count/"),
    refetchInterval: 60_000, // poll every minute as fallback
  })
}

export function useMarkRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.patch<Notification>(`/notifications/${id}/read/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
  })
}

export function useMarkAllRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.post("/notifications/read-all/"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
  })
}

/** Opens a persistent WS connection and pushes new notifications into the cache. */
export function useNotificationSocket() {
  const queryClient = useQueryClient()
  const [cookies] = useCookies(["access"])
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!cookies.access) return

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    const url = `${protocol}//${window.location.host}/ws/notifications/?token=${cookies.access}`
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onmessage = (event) => {
      const { type, payload } = JSON.parse(event.data) as {
        type: string
        payload: Notification
      }
      if (type !== "notification.new") return

      // Prepend to first page of the notifications list
      queryClient.setQueryData<ReturnType<typeof useNotifications>["data"]>(
        ["notifications"],
        (old) => {
          if (!old) return old
          const firstPage = old.pages[0]
          return {
            ...old,
            pages: [
              {
                ...firstPage,
                count: firstPage.count + 1,
                results: [payload, ...firstPage.results],
              },
              ...old.pages.slice(1),
            ],
          }
        }
      )
      // Bump unread count
      queryClient.setQueryData<{ count: number }>(
        ["notifications", "unread-count"],
        (old) => ({ count: (old?.count ?? 0) + 1 })
      )
    }

    return () => {
      ws.close()
      wsRef.current = null
    }
  }, [cookies.access, queryClient])
}
