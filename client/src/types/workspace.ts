import type { User } from "./auth"

export type Role = "owner" | "admin" | "member"

export interface Workspace {
  id: string
  name: string
  slug: string
  description: string
  role: Role
  member_count: number
  created_at: string
  updated_at: string
}

export interface WorkspaceMember {
  id: string
  user: User
  role: Role
  joined_at: string
}
