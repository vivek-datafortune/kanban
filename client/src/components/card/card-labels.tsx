import type { Label } from "@/types/board"

interface CardLabelsProps {
  labels: Label[]
}

export default function CardLabels({ labels }: CardLabelsProps) {
  if (labels.length === 0) return null

  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground mb-2">Labels</p>
      <div className="flex flex-wrap gap-1.5">
        {labels.map((label) => (
          <span
            key={label.id}
            className="text-xs font-semibold text-white px-3 py-1 rounded-lg"
            style={{ backgroundColor: label.color }}
          >
            {label.name}
          </span>
        ))}
      </div>
    </div>
  )
}
