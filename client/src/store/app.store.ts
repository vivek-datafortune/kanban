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
  // Search
  recentSearches: string[]
  addRecentSearch: (q: string) => void
  clearRecentSearches: () => void
  searchOpen: boolean
  setSearchOpen: (open: boolean) => void
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
      // Search state
      recentSearches: [],
      addRecentSearch: (q) =>
        set((s) => ({
          recentSearches: [q, ...s.recentSearches.filter((x) => x !== q)].slice(0, 8),
        })),
      clearRecentSearches: () => set({ recentSearches: [] }),
      searchOpen: false,
      setSearchOpen: (open) => set({ searchOpen: open }),
    }),
    {
      name: "app-store",
      partialize: (state) => ({
        theme: state.theme,
        activeTimer: state.activeTimer,
        recentSearches: state.recentSearches,
      }),
    },
  ),
)
