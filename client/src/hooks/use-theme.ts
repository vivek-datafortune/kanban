import { useEffect } from "react"
import { useStore } from "@/store/app.store"

export type Theme = "light" | "dark" | "system"

export function useTheme() {
  const { theme, setTheme } = useStore()

  useEffect(() => {
    const root = document.documentElement

    const apply = (t: Theme) => {
      if (t === "system") {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
        root.classList.toggle("dark", prefersDark)
      } else {
        root.classList.toggle("dark", t === "dark")
      }
    }

    apply(theme)

    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)")
      const handler = (e: MediaQueryListEvent) => root.classList.toggle("dark", e.matches)
      mq.addEventListener("change", handler)
      return () => mq.removeEventListener("change", handler)
    }
  }, [theme])

  return { theme, setTheme }
}
