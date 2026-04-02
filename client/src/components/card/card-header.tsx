import { useState, useEffect } from "react"

interface CardHeaderProps {
  title: string
  listTitle: string
  onSave: (title: string) => void
}

export default function CardHeader({ title: initialTitle, onSave }: CardHeaderProps) {
  const [title, setTitle] = useState(initialTitle)
  const [isFocused, setIsFocused] = useState(false)

  // Sync title from external updates (e.g. real-time WebSocket) when not editing
  useEffect(() => {
    if (!isFocused) {
      setTitle(initialTitle)
    }
  }, [initialTitle, isFocused])

  const handleBlur = () => {
    setIsFocused(false)
    if (title.trim() && title.trim() !== initialTitle) {
      onSave(title.trim())
    }
  }

  return (
    <div className="flex-1 min-w-0">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur()
        }}
        className="text-lg font-bold text-foreground bg-transparent w-full focus:outline-none
                   focus:bg-secondary focus:rounded-lg focus:px-2 focus:py-1 focus:border focus:border-border transition-all"
      />
    </div>
  )
}
