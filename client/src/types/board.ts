import type { User } from "./auth"

export interface Board {
  id: string
  workspace: string
  title: string
  background_color: string
  visibility: "workspace" | "private"
  is_starred: boolean
  lists?: List[]
  labels?: Label[]
  created_by?: User
  created_at: string
  updated_at: string
}

export interface Label {
  id: string
  name: string
  color: string
  board: string
}

export interface List {
  id: string
  board: string
  title: string
  position: number
  is_archived: boolean
  cards: Card[]
  created_at: string
}

export interface ChecklistItem {
  id: string
  card: string
  text: string
  is_completed: boolean
  position: number
  created_at: string
}

export interface Card {
  id: string
  list: string
  title: string
  description: string
  position: number
  due_date: string | null
  start_date: string | null
  labels: Label[]
  members: User[]
  checklist_items: ChecklistItem[]
  attachment_count: number
  estimated_hours: number | null
  total_time_seconds: number
  priority: "P0" | "P1" | "P2" | "P3" | ""
  created_by: User
  created_at: string
  updated_at: string
}

export interface TimeEntry {
  id: string
  card: string
  user: User
  started_at: string
  ended_at: string | null
  duration: string | null
  duration_seconds: number | null
  note: string
  is_manual: boolean
  created_at: string
}

export interface AISuggestion {
  id: string
  card: string
  subtasks: string[]
  description: string
  suggested_labels: string[]  // label UUIDs
  priority: "P0" | "P1" | "P2" | "P3"
  duplicates: Array<{
    id: string
    title: string
    list_title: string
    similarity: number
  }>
  is_accepted: boolean
  is_dismissed: boolean
  created_at: string
}

export type ActivityAction =
  | "card.created"
  | "card.updated"
  | "card.moved"
  | "card.deleted"
  | "label.added"
  | "label.removed"
  | "member.added"
  | "member.removed"
  | "comment.added"
  | "comment.edited"
  | "comment.deleted"

export interface Activity {
  id: string
  board: string
  card: string | null
  card_title: string | null
  actor: User
  action: ActivityAction
  details: Record<string, unknown>
  created_at: string
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface Attachment {
  id: string
  card: string
  filename: string
  size: number
  content_type: string
  url: string
  uploaded_by: User
  created_at: string
}

export interface Comment {
  id: string
  card: string
  author: User
  body: string
  parent: string | null
  replies: Comment[]
  created_at: string
  updated_at: string
}
