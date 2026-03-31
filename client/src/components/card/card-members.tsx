import { Users } from "lucide-react"
import type { User } from "@/types/auth"

interface CardMembersProps {
  members: User[]
}

export default function CardMembers({ members }: CardMembersProps) {
  if (members.length === 0) return null

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Users className="size-4 text-muted-foreground" />
        <h4 className="text-sm font-semibold text-foreground">Members</h4>
      </div>
      <div className="flex flex-wrap gap-2">
        {members.map((member) => (
          <div
            key={member.pk}
            className="flex items-center gap-2 rounded-lg px-3 py-2 bg-secondary border border-border"
          >
            <div className="size-6 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-xs font-bold text-primary">
                {(member.first_name?.[0] || member.email[0]).toUpperCase()}
              </span>
            </div>
            <span className="text-sm text-foreground">
              {member.first_name || member.email}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
