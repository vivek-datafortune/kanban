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

export interface Card {
  id: string
  list: string
  title: string
  description: string
  position: number
  due_date: string | null
  start_date: string | null
  is_completed: boolean
  labels: Label[]
  members: User[]
  created_by: User
  created_at: string
  updated_at: string
}
