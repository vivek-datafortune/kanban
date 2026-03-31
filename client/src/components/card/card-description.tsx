import { useState } from "react"
import { AlignLeft } from "lucide-react"
import { cn } from "@/lib/utils"

interface CardDescriptionProps {
  description: string
  onSave: (description: string) => void
}

export default function CardDescription({ description, onSave }: CardDescriptionProps) {
  const [value, setValue] = useState(description)
  const [isEditing, setIsEditing] = useState(false)

  const handleSave = () => {
    if (value !== description) onSave(value)
    setIsEditing(false)
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <AlignLeft className="size-4 text-muted-foreground" />
        <h4 className="text-sm font-semibold text-foreground">Description</h4>
      </div>
      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full text-foreground rounded-lg px-4 py-3 text-sm bg-secondary border border-border
                       focus:outline-none resize-none min-h-30"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="bg-primary text-primary-foreground rounded-lg px-4 py-1.5 text-sm font-semibold
                         hover:bg-primary/90 transition-colors cursor-pointer"
            >
              Save
            </button>
            <button
              onClick={() => { setValue(description); setIsEditing(false) }}
              className="text-muted-foreground hover:text-foreground cursor-pointer px-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => setIsEditing(true)}
          className={cn(
            "bg-secondary border border-border rounded-lg px-4 py-3 text-sm cursor-pointer min-h-15",
            description ? "text-foreground whitespace-pre-wrap" : "text-muted-foreground"
          )}
        >
          {description || "Add a more detailed description..."}
        </div>
      )}
    </div>
  )
}
