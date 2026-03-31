import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  X,
  Users,
  Mail,
  Send,
  RotateCw,
  Ban,
  Trash2,
  ChevronDown,
  Crown,
  Shield,
  User as UserIcon,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useWorkspaceMembers, useRemoveMember, useChangeMemberRole } from "@/hooks/use-workspaces"
import {
  useInvitations,
  useCreateInvitation,
  useResendInvitation,
  useRevokeInvitation,
  useDeleteInvitation,
} from "@/hooks/use-invitations"
import { useStore } from "@/store/app.store"
import type { Role, InvitationStatus } from "@/types/workspace"

interface MembersModalProps {
  slug: string
  open: boolean
  onClose: () => void
}

type Tab = "members" | "invitations"

export default function MembersModal({ slug, open, onClose }: MembersModalProps) {
  const [tab, setTab] = useState<Tab>("members")

  if (!open) return null

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg bg-card border-l border-border shadow-xl
                       flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="size-4 text-primary" />
                </div>
                <h2 className="text-lg font-bold text-foreground">Members</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary
                           transition-colors cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border/50 px-6">
              {(["members", "invitations"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "px-4 py-3 text-sm font-medium transition-colors cursor-pointer relative",
                    tab === t
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t === "members" ? "Members" : "Invitations"}
                  {tab === t && (
                    <motion.div
                      layoutId="tab-indicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {tab === "members" ? (
                <MembersTab slug={slug} />
              ) : (
                <InvitationsTab slug={slug} />
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

/* ── Members Tab ───────────────────────────────────────────────────────────── */

function MembersTab({ slug }: { slug: string }) {
  const { data: members, isLoading } = useWorkspaceMembers(slug)
  const { mutate: removeMember, isPending: isRemoving } = useRemoveMember(slug)
  const { mutate: changeRole } = useChangeMemberRole(slug)
  const currentUser = useStore((s) => s.user)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-4 space-y-1">
      {members?.map((member) => {
        const isOwner = member.role === "owner"
        const isSelf = member.user.pk === currentUser?.pk

        return (
          <div
            key={member.id}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/50 transition-colors group"
          >
            {/* Avatar */}
            <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-sm font-semibold text-primary">
                {(member.user.first_name?.[0] || member.user.email[0]).toUpperCase()}
              </span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {member.user.first_name
                  ? `${member.user.first_name} ${member.user.last_name}`
                  : member.user.email}
                {isSelf && (
                  <span className="text-xs text-muted-foreground ml-1.5">(you)</span>
                )}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {member.user.email}
              </p>
            </div>

            {/* Role badge + actions */}
            <div className="flex items-center gap-2 shrink-0">
              {isOwner || isSelf ? (
                <RoleBadge role={member.role} />
              ) : (
                <RoleDropdown
                  role={member.role}
                  onChange={(role) =>
                    changeRole({ memberId: member.id, role })
                  }
                />
              )}

              {!isOwner && !isSelf && (
                <button
                  onClick={() => removeMember(member.id)}
                  disabled={isRemoving}
                  className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10
                             transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                  title="Remove member"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ── Invitations Tab ───────────────────────────────────────────────────────── */

function InvitationsTab({ slug }: { slug: string }) {
  const { data: invitations, isLoading } = useInvitations(slug)
  const { mutate: createInvitation, isPending: isCreating, error: createError } = useCreateInvitation(slug)
  const { mutate: resend, isPending: isResending } = useResendInvitation(slug)
  const { mutate: revoke } = useRevokeInvitation(slug)
  const { mutate: deleteInvitation } = useDeleteInvitation(slug)

  const [email, setEmail] = useState("")
  const [role, setRole] = useState<"admin" | "member">("member")

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    createInvitation(
      { email: email.trim(), role },
      { onSuccess: () => { setEmail(""); setRole("member") } }
    )
  }

  return (
    <div className="p-4 space-y-5">
      {/* Invite form */}
      <form onSubmit={handleInvite} className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="w-full rounded-lg pl-9 pr-3 py-2.5 text-sm bg-secondary border border-border
                         placeholder:text-muted-foreground text-foreground
                         focus:outline-none focus:ring-2 focus:ring-primary/40"
              required
            />
          </div>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "admin" | "member")}
            className="rounded-lg px-3 py-2.5 text-sm bg-secondary border border-border text-foreground
                       cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
          <button
            type="submit"
            disabled={isCreating || !email.trim()}
            className="bg-primary text-primary-foreground rounded-lg px-4 py-2.5 text-sm font-semibold
                       hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer
                       flex items-center gap-2"
          >
            {isCreating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            Invite
          </button>
        </div>
        {createError && (
          <p className="text-xs text-destructive px-1">
            {createError.message}
          </p>
        )}
      </form>

      {/* Divider */}
      <div className="h-px bg-linear-to-r from-transparent via-border to-transparent" />

      {/* Invitation list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : !invitations?.length ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No pending invitations
        </p>
      ) : (
        <div className="space-y-1">
          {invitations.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/50 transition-colors group"
            >
              {/* Icon */}
              <div className="size-9 rounded-full bg-secondary flex items-center justify-center shrink-0">
                <Mail className="size-4 text-muted-foreground" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {inv.email}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <StatusBadge status={inv.status} />
                  <span className="text-[11px] text-muted-foreground">
                    {timeAgo(inv.created_at)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                {inv.status === "pending" && (
                  <>
                    <button
                      onClick={() => resend(inv.id)}
                      disabled={isResending}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10
                                 transition-colors cursor-pointer"
                      title="Resend invitation"
                    >
                      <RotateCw className="size-3.5" />
                    </button>
                    <button
                      onClick={() => revoke(inv.id)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10
                                 transition-colors cursor-pointer"
                      title="Revoke invitation"
                    >
                      <Ban className="size-3.5" />
                    </button>
                  </>
                )}
                {(inv.status === "expired" || inv.status === "revoked") && (
                  <button
                    onClick={() => resend(inv.id)}
                    disabled={isResending}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10
                               transition-colors cursor-pointer"
                    title="Resend invitation"
                  >
                    <RotateCw className="size-3.5" />
                  </button>
                )}
                <button
                  onClick={() => deleteInvitation(inv.id)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10
                             transition-colors cursor-pointer"
                  title="Delete invitation"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Shared components ─────────────────────────────────────────────────────── */

const roleConfig: Record<Role, { icon: typeof Crown; label: string; color: string }> = {
  owner: { icon: Crown, label: "Owner", color: "text-amber-500 bg-amber-500/10" },
  admin: { icon: Shield, label: "Admin", color: "text-blue-500 bg-blue-500/10" },
  member: { icon: UserIcon, label: "Member", color: "text-muted-foreground bg-secondary" },
}

function RoleBadge({ role }: { role: Role }) {
  const config = roleConfig[role]
  const Icon = config.icon
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium",
        config.color
      )}
    >
      <Icon className="size-3" />
      {config.label}
    </span>
  )
}

function RoleDropdown({ role, onChange }: { role: Role; onChange: (role: string) => void }) {
  const [open, setOpen] = useState(false)
  const config = roleConfig[role]
  const Icon = config.icon

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer",
          "hover:ring-1 hover:ring-border transition-all",
          config.color
        )}
      >
        <Icon className="size-3" />
        {config.label}
        <ChevronDown className="size-3" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 w-36 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
            {(["admin", "member"] as const).map((r) => (
              <button
                key={r}
                onClick={() => {
                  onChange(r)
                  setOpen(false)
                }}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-xs font-medium cursor-pointer",
                  "hover:bg-secondary transition-colors",
                  role === r && "bg-secondary/50"
                )}
              >
                {(() => {
                  const c = roleConfig[r]
                  const I = c.icon
                  return <I className={cn("size-3", c.color.split(" ")[0])} />
                })()}
                {roleConfig[r].label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

const statusConfig: Record<InvitationStatus, { label: string; color: string }> = {
  pending: { label: "Pending", color: "text-amber-500 bg-amber-500/10" },
  accepted: { label: "Accepted", color: "text-green-500 bg-green-500/10" },
  expired: { label: "Expired", color: "text-red-500 bg-red-500/10" },
  revoked: { label: "Revoked", color: "text-muted-foreground bg-secondary" },
}

function StatusBadge({ status }: { status: InvitationStatus }) {
  const config = statusConfig[status]
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium",
        config.color
      )}
    >
      {config.label}
    </span>
  )
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const date = new Date(dateStr).getTime()
  const diff = Math.floor((now - date) / 1000)

  if (diff < 60) return "just now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}
