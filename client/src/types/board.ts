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

// ── Board Templates ────────────────────────────────────────────────────────

export interface BoardTemplateCard {
  title: string
  description?: string
  labels?: string[]
  checklist?: { text: string }[]
}

export interface BoardTemplateList {
  title: string
  position: number
  cards: BoardTemplateCard[]
}

export interface BoardTemplateData {
  lists: BoardTemplateList[]
  labels: { name: string; color: string }[]
}

export interface BoardTemplate {
  id: string
  title: string
  description: string
  category: "engineering" | "product" | "design" | "marketing" | "hr" | "general"
  is_system: boolean
  use_count: number
  data?: BoardTemplateData
  created_by?: User | null
  created_at: string
}

// ── Saved Filters ──────────────────────────────────────────────────────────

export interface SavedFilter {
  id: string
  user: string
  board: string | null
  name: string
  filters: {
    labels?: string[]
    members?: string[]
    due?: "overdue" | "today" | "this_week" | "no_date"
    priority?: ("P0" | "P1" | "P2" | "P3")[]
    search?: string
  }
  is_default: boolean
  created_at: string
}

export interface ActiveFilters {
  labels: string[]
  members: string[]
  due: "overdue" | "today" | "this_week" | "no_date" | null
  priority: ("P0" | "P1" | "P2" | "P3")[]
  search: string
}

// ── Analytics ─────────────────────────────────────────────────────────────

export interface VelocityPoint {
  week: string
  count: number
}

export interface WorkloadMember {
  user_id: number
  email: string
  first_name: string
  last_name: string
  assigned: number
  completed: number
  overdue: number
}

export interface LabelDistribution {
  label__name: string
  label__color: string
  count: number
}

export interface AnalyticsData {
  velocity: {
    created: VelocityPoint[]
    completed: VelocityPoint[]
  }
  workload: WorkloadMember[]
  label_distribution: LabelDistribution[]
  time_summary: { total_seconds: number }
}

// ── Search ────────────────────────────────────────────────────────────────

export interface SearchResultBoard {
  id: string
  title: string
}

export interface SearchResult {
  type: "card" | "board" | "comment"
  id: string
  title: string
  highlight: string
  board: SearchResultBoard
  list: SearchResultBoard | null
  rank: number
}

export interface SearchResponse {
  results: SearchResult[]
  total: number
  facets: { card: number; board: number; comment: number }
}
