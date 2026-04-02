import { Users, UserPlus } from "lucide-react"
import type { User } from "@/types/auth"

interface CardMembersProps {
  members: User[]
}

export default function CardMembers({ members }: CardMembersProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-muted-foreground" />
          <h4 className="text-sm font-semibold text-foreground">Assignees</h4>
          {members.length > 0 && (
            <span className="text-[10px] font-bold text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full">
              {members.length}
            </span>
          )}
        </div>
      </div>
      {members.length === 0 ? (
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <UserPlus className="size-3.5" />
          No assignees yet. Use sidebar to add.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {members.map((member) => (
            <div
              key={member.pk}
              className="flex items-center gap-2 rounded-lg px-3 py-2 bg-secondary border border-border"
            >
              <div className="size-7 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-xs font-bold text-primary">
                  {(member.first_name?.[0] || member.email[0]).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {member.first_name ? `${member.first_name} ${member.last_name}` : member.email}
                </p>
                {member.first_name && (
                  <p className="text-[11px] text-muted-foreground truncate">{member.email}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
