import { useState } from "react"
import { AlignLeft, Pencil } from "lucide-react"
import TiptapEditor from "./tiptap-editor"

interface CardDescriptionProps {
  description: string
  onSave: (description: string) => void
  cardId?: string
}

export default function CardDescription({ description, onSave, cardId }: CardDescriptionProps) {
  const [isEditing, setIsEditing] = useState(false)

  const handleSave = (html: string) => {
    if (html !== description) onSave(html)
    setIsEditing(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <AlignLeft className="size-4 text-muted-foreground" />
          <h4 className="text-sm font-semibold text-foreground">Description</h4>
        </div>
        {!isEditing && description && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground
                       cursor-pointer px-2 py-1 rounded-md hover:bg-secondary transition-colors"
          >
            <Pencil className="size-3" />
            Edit
          </button>
        )}
      </div>
      {isEditing ? (
        <TiptapEditor
          content={description}
          onSave={handleSave}
          onCancel={() => setIsEditing(false)}
          cardId={cardId}
        />
      ) : (
        <div
          onClick={() => setIsEditing(true)}
          className="bg-secondary border border-border rounded-lg px-4 py-3 text-sm cursor-pointer min-h-15
                     hover:bg-secondary/80 transition-colors group"
        >
          {description ? (
            <div
              className="prose prose-sm dark:prose-invert max-w-none text-foreground
                         [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_blockquote]:my-1"
              dangerouslySetInnerHTML={{ __html: description }}
            />
          ) : (
            <p className="text-muted-foreground group-hover:text-muted-foreground/80">
              Add a more detailed description...
            </p>
          )}
        </div>
      )}
    </div>
  )
}
