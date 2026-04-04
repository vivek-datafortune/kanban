import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { User } from "@/types/auth"

type Theme = "light" | "dark" | "system"

export interface ActiveTimer {
  entryId: string
  cardId: string
  cardTitle: string
  boardId: string
  startedAt: string // ISO string
}

interface AppState {
  theme: Theme
  setTheme: (theme: Theme) => void
  user: User | null
  setUser: (user: User | null) => void
  isAuthenticated: boolean
  logout: () => void
  activeTimer: ActiveTimer | null
  setActiveTimer: (timer: ActiveTimer | null) => void
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      theme: "system" as Theme,
      setTheme: (theme) => set({ theme }),
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      logout: () => set({ user: null, isAuthenticated: false }),
      activeTimer: null,
      setActiveTimer: (timer) => set({ activeTimer: timer }),
    }),
    {
      name: "app-store",
      partialize: (state) => ({ theme: state.theme, activeTimer: state.activeTimer }),
    },
  ),
)

