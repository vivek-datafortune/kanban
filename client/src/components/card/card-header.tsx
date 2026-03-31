import { useState } from "react"

interface CardHeaderProps {
  title: string
  listTitle: string
  onSave: (title: string) => void
}

export default function CardHeader({ title: initialTitle, listTitle, onSave }: CardHeaderProps) {
  const [title, setTitle] = useState(initialTitle)

  const handleBlur = () => {
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
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur()
        }}
        className="text-lg font-bold text-foreground bg-transparent w-full focus:outline-none
                   focus:bg-secondary focus:rounded-lg focus:px-2 focus:py-1 focus:border focus:border-border transition-all"
      />
      <p className="text-xs text-muted-foreground mt-0.5">
        in list <span className="font-semibold">{listTitle}</span>
      </p>
    </div>
  )
}
