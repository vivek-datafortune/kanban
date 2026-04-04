export type NotificationType = "assigned" | "comment_reply" | "mentioned"

export interface Notification {
  id: string
  type: NotificationType
  title: string
  body: string
  card_id: string | null
  board_id: string | null
  workspace_slug: string | null
  is_read: boolean
  created_at: string
}
