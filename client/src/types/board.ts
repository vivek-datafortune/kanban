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
  created_by: User
  created_at: string
  updated_at: string
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
