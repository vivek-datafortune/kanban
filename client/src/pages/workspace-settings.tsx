import { useState } from "react"
import { useNavigate, useParams, Link, useSearchParams } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  Settings, Users, Mail, Trash2, ChevronDown, RotateCcw,
  X, Shield, Crown, User, AlertTriangle, Loader2, Check,
  ArrowLeft, ChevronRight, Send,
} from "lucide-react"
import {
  useWorkspace, useUpdateWorkspace, useDeleteWorkspace,
  useWorkspaceMembers, useRemoveMember, useChangeMemberRole,
} from "@/hooks/use-workspaces"
import {
  useInvitations, useCreateInvitation,
  useResendInvitation, useRevokeInvitation,
} from "@/hooks/use-invitations"
import { useStore } from "@/store/app.store"
import { cn } from "@/lib/utils"
import type { Role } from "@/types/workspace"

// -- Shared helpers ------------------------------------------------------------

const ROLE_CONFIG: Record<Role, { label: string; icon: React.ElementType; ring: string; pill: string }> = {
  owner: {
    label: "Owner",
    icon: Crown,
    ring: "ring-amber-400/40",
    pill: "text-amber-500 bg-amber-500/10 border-amber-400/30",
  },
  admin: {
    label: "Admin",
    icon: Shield,
    ring: "ring-primary/40",
    pill: "text-primary bg-primary/10 border-primary/30",
  },
  member: {
    label: "Member",
    icon: User,
    ring: "ring-border",
    pill: "text-muted-foreground bg-secondary border-border",
  },
}

function RolePill({ role }: { role: Role }) {
  const { label, icon: Icon, pill } = ROLE_CONFIG[role]
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border", pill)}>
      <Icon className="size-3" />{label}
    </span>
  )
}

function MemberAvatar({ name, email, role, size = "md" }: { name?: string; email: string; role?: Role; size?: "sm" | "md" | "lg" }) {
  const initial = (name?.[0] || email[0]).toUpperCase()
  const ring = role ? ROLE_CONFIG[role].ring : "ring-border"
  const sizeMap = { sm: "size-7 text-xs", md: "size-9 text-sm", lg: "size-12 text-base" }
  return (
    <div className={cn("rounded-full bg-primary/15 flex items-center justify-center shrink-0 ring-2", sizeMap[size], ring)}>
      <span className="font-bold text-primary">{initial}</span>
    </div>
  )
}

function FieldLabel({ children, htmlFor, hint }: { children: React.ReactNode; htmlFor?: string; hint?: string }) {
  return (
    <div className="flex items-center justify-between mb-1.5">
      <label htmlFor={htmlFor} className="text-xs font-semibold text-foreground">{children}</label>
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </div>
  )
}

// -- General ------------------------------------------------------------------

function GeneralSection({ slug }: { slug: string }) {
  const { data: workspace } = useWorkspace(slug)
  const { mutate: update, isPending } = useUpdateWorkspace(slug)
  const [name, setName] = useState(() => "")
  const [description, setDescription] = useState(() => "")
  const [saved, setSaved] = useState(false)
  const [initialized, setInitialized] = useState(false)

  if (workspace && !initialized) {
    setName(workspace.name)
    setDescription(workspace.description ?? "")
    setInitialized(true)
  }

  const isDirty = name !== workspace?.name || description !== (workspace?.description ?? "")

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !isDirty) return
    update(
      { name: name.trim(), description: description.trim() },
      { onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 2500) } }
    )
  }

  return (
    <div className="bg-card/60 border border-border/60 rounded-2xl p-6">
      <h3 className="text-sm font-semibold text-foreground mb-4">Workspace identity</h3>
      <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border/40">
        <div className="size-16 rounded-2xl bg-primary/15 ring-2 ring-primary/20 flex items-center justify-center shrink-0">
          <span className="text-2xl font-bold text-primary">
            {(workspace?.name?.[0] ?? "W").toUpperCase()}
          </span>
        </div>
        <div>
          <p className="text-base font-bold text-foreground">{workspace?.name ?? ""}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {workspace?.member_count ?? 0} member{(workspace?.member_count ?? 0) !== 1 ? "s" : ""}
            {workspace?.created_at && (
              <>  Created {new Date(workspace.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</>
            )}
          </p>
        </div>
      </div>
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <FieldLabel htmlFor="ws-name" hint={`${name.length}/100`}>Workspace name</FieldLabel>
          <input
            id="ws-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            placeholder="e.g. Marketing Team"
            className="w-full text-sm bg-secondary border border-border rounded-xl px-3 py-2.5
                       focus:outline-none focus:border-primary/50 transition-colors text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <div>
          <FieldLabel htmlFor="ws-desc" hint={`${description.length}/500`}>Description</FieldLabel>
          <textarea
            id="ws-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="What is this workspace for?"
            className="w-full text-sm bg-secondary border border-border rounded-xl px-3 py-2.5
                       focus:outline-none focus:border-primary/50 transition-colors text-foreground
                       resize-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex items-center gap-3 pt-1">
          <motion.button
            type="submit"
            disabled={isPending || !isDirty || !name.trim()}
            whileTap={{ scale: 0.97 }}
            className={cn(
              "text-sm font-semibold rounded-xl px-5 py-2 transition-all cursor-pointer flex items-center gap-2",
              saved
                ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
                : "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
            )}
          >
            {isPending ? <Loader2 className="size-3.5 animate-spin" /> : saved ? <Check className="size-3.5" /> : null}
            {saved ? "Saved!" : "Save changes"}
          </motion.button>
          {isDirty && !saved && (
            <span className="text-xs text-muted-foreground">Unsaved changes</span>
          )}
        </div>
      </form>
    </div>
  )
}

// -- Danger Zone --------------------------------------------------------------

function DangerZone({ slug, workspaceName }: { slug: string; workspaceName: string }) {
  const navigate = useNavigate()
  const { mutate: deleteWorkspace, isPending } = useDeleteWorkspace(slug)
  const [expanded, setExpanded] = useState(false)
  const [confirm, setConfirm] = useState("")

  const handleDelete = () => {
    if (confirm !== workspaceName) return
    deleteWorkspace(undefined, { onSuccess: () => navigate("/") })
  }

  return (
    <div className="border border-destructive/25 rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-destructive/5 transition-colors cursor-pointer"
      >
        <div className="size-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
          <AlertTriangle className="size-4 text-destructive" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">Danger Zone</p>
          <p className="text-xs text-muted-foreground">Irreversible actions</p>
        </div>
        <motion.div animate={{ rotate: expanded ? 90 : 0 }} transition={{ duration: 0.15 }}>
          <ChevronRight className="size-4 text-muted-foreground" />
        </motion.div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-destructive/25"
          >
            <div className="px-6 py-5 space-y-4 bg-destructive/5">
              <div>
                <p className="text-sm font-semibold text-foreground">Delete this workspace</p>
                <p className="text-xs text-muted-foreground mt-1">
                  All boards, cards, members and data will be permanently deleted. This cannot be undone.
                </p>
              </div>
              <div>
                <FieldLabel>
                  Type <span className="font-mono font-bold text-foreground">{workspaceName}</span> to confirm
                </FieldLabel>
                <input
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder={workspaceName}
                  className="w-full text-sm bg-background border border-destructive/30 rounded-xl px-3 py-2.5 mb-3
                             focus:outline-none focus:border-destructive/60 transition-colors text-foreground
                             placeholder:text-muted-foreground/50"
                />
                <button
                  onClick={handleDelete}
                  disabled={isPending || confirm !== workspaceName}
                  className="bg-destructive text-destructive-foreground text-sm font-semibold rounded-xl px-4 py-2
                             hover:bg-destructive/90 transition-colors disabled:opacity-40 cursor-pointer
                             flex items-center gap-2"
                >
                  {isPending && <Loader2 className="size-3.5 animate-spin" />}
                  <Trash2 className="size-3.5" />
                  Delete permanently
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// -- Members ------------------------------------------------------------------

function MembersSection({ slug, myRole }: { slug: string; myRole: Role }) {
  const { data: members, isLoading } = useWorkspaceMembers(slug)
  const { mutate: removeMember, isPending: isRemoving } = useRemoveMember(slug)
  const { mutate: changeRole } = useChangeMemberRole(slug)
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)
  const { user } = useStore()
  const canManage = myRole === "owner" || myRole === "admin"

  return (
    <div className="bg-card/60 border border-border/60 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/40">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Team members</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isLoading ? "Loading" : `${members?.length ?? 0} member${(members?.length ?? 0) !== 1 ? "s" : ""}`}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div>
          {members?.map((m, i) => {
            const isMe = m.user.pk === user?.pk
            const isOwner = m.role === "owner"
            const fullName = m.user.first_name ? `${m.user.first_name} ${m.user.last_name}`.trim() : null
            return (
              <div
                key={m.id}
                className={cn(
                  "flex items-center gap-4 px-6 py-3.5 group transition-colors hover:bg-secondary/30",
                  i !== 0 && "border-t border-border/30"
                )}
              >
                <MemberAvatar name={fullName ?? undefined} email={m.user.email} role={m.role} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground truncate">
                      {fullName ?? m.user.email}
                    </p>
                    {isMe && (
                      <span className="text-[10px] font-semibold text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded-full">
                        You
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {fullName ? m.user.email : ""}
                    {fullName && "  "}
                    Joined {new Date(m.joined_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>

                {canManage && !isOwner && !isMe ? (
                  <div className="relative shrink-0">
                    <select
                      value={m.role}
                      onChange={(e) => changeRole({ memberId: m.id, role: e.target.value })}
                      className={cn(
                        "text-xs font-semibold rounded-full border px-3 py-1 pr-7 cursor-pointer appearance-none",
                        "focus:outline-none transition-colors",
                        ROLE_CONFIG[m.role as Role].pill,
                      )}
                    >
                      <option value="admin">Admin</option>
                      <option value="member">Member</option>
                    </select>
                    <ChevronDown className="size-3 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                  </div>
                ) : (
                  <RolePill role={m.role} />
                )}

                {canManage && !isOwner && !isMe && (
                  <div className="shrink-0">
                    {confirmRemove === m.id ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => removeMember(m.id, { onSuccess: () => setConfirmRemove(null) })}
                          disabled={isRemoving}
                          className="text-xs font-semibold text-destructive hover:underline cursor-pointer"
                        >
                          Remove
                        </button>
                        <span className="text-border"></span>
                        <button onClick={() => setConfirmRemove(null)} className="text-xs text-muted-foreground hover:text-foreground cursor-pointer">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmRemove(m.id)}
                        title="Remove member"
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg
                                   text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                      >
                        <X className="size-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// -- Invitations --------------------------------------------------------------

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending:  { label: "Pending",  className: "text-amber-500 bg-amber-500/10 border-amber-400/30" },
  accepted: { label: "Accepted", className: "text-emerald-500 bg-emerald-500/10 border-emerald-400/30" },
  revoked:  { label: "Revoked",  className: "text-muted-foreground bg-secondary border-border" },
  expired:  { label: "Expired",  className: "text-muted-foreground bg-secondary border-border" },
}

function InvitationsSection({ slug }: { slug: string }) {
  const { data: invitations, isLoading } = useInvitations(slug)
  const { mutate: createInvitation, isPending: isSending } = useCreateInvitation(slug)
  const { mutate: resend, isPending: isResending } = useResendInvitation(slug)
  const { mutate: revoke } = useRevokeInvitation(slug)
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<"admin" | "member">("member")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    const sentEmail = email.trim()
    setError(""); setSuccess("")
    createInvitation(
      { email: sentEmail, role },
      {
        onSuccess: () => { setEmail(""); setSuccess(`Invitation sent to ${sentEmail}`) },
        onError: (err: unknown) => setError(err instanceof Error ? err.message : "Failed to send invitation"),
      }
    )
  }

  const pendingCount = invitations?.filter((i) => i.status === "pending").length ?? 0

  return (
    <div className="space-y-4">
      <div className="bg-card/60 border border-border/60 rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-foreground mb-1">Invite someone</h3>
        <p className="text-xs text-muted-foreground mb-4">They'll receive an email with a link to join this workspace.</p>
        <form onSubmit={handleInvite} className="space-y-3">
          <div className="flex gap-2.5">
            <input
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); setSuccess("") }}
              type="email"
              placeholder="colleague@email.com"
              className="flex-1 text-sm bg-secondary border border-border rounded-xl px-3 py-2.5
                         focus:outline-none focus:border-primary/50 transition-colors text-foreground
                         placeholder:text-muted-foreground"
            />
            <div className="relative shrink-0">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as "admin" | "member")}
                className="text-sm bg-secondary border border-border rounded-xl px-3 py-2.5 pr-8
                           appearance-none cursor-pointer text-foreground focus:outline-none
                           focus:border-primary/50 transition-colors"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <ChevronDown className="size-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
            <button
              type="submit"
              disabled={isSending || !email.trim()}
              className="bg-primary text-primary-foreground text-sm font-semibold rounded-xl px-4 py-2.5
                         hover:bg-primary/90 transition-colors disabled:opacity-40 cursor-pointer
                         flex items-center gap-2 shrink-0"
            >
              {isSending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
              Send
            </button>
          </div>
          <AnimatePresence>
            {(error || success) && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={cn("text-xs flex items-center gap-1.5", error ? "text-destructive" : "text-emerald-500")}
              >
                {error ? <AlertTriangle className="size-3.5" /> : <Check className="size-3.5" />}
                {error || success}
              </motion.p>
            )}
          </AnimatePresence>
        </form>
      </div>

      <div className="bg-card/60 border border-border/60 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/40">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Sent invitations</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {pendingCount > 0 ? `${pendingCount} pending` : "No pending invitations"}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        ) : !invitations?.length ? (
          <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
            <Mail className="size-8 opacity-20" />
            <p className="text-sm">No invitations sent yet.</p>
          </div>
        ) : (
          <div>
            {invitations.map((inv, i) => {
              const { label, className: statusClass } = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG.expired
              const inviterName = inv.invited_by.first_name || inv.invited_by.email
              return (
                <div
                  key={inv.id}
                  className={cn(
                    "flex items-center gap-4 px-6 py-3.5 group hover:bg-secondary/30 transition-colors",
                    i !== 0 && "border-t border-border/30"
                  )}
                >
                  <div className="size-9 rounded-full bg-secondary border border-border flex items-center justify-center shrink-0">
                    <Mail className="size-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{inv.email}</p>
                    <p className="text-[11px] text-muted-foreground">
                      by {inviterName}  expires {new Date(inv.expires_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                  <RolePill role={inv.role} />
                  <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full border", statusClass)}>
                    {label}
                  </span>
                  {inv.status === "pending" && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={() => resend(inv.id)}
                        disabled={isResending}
                        title="Resend invitation"
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer transition-colors"
                      >
                        <RotateCcw className="size-3.5" />
                      </button>
                      <button
                        onClick={() => revoke(inv.id)}
                        title="Revoke invitation"
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer transition-colors"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// -- Sidebar nav --------------------------------------------------------------

const NAV = [
  { id: "general",     label: "General",     icon: Settings },
  { id: "members",     label: "Members",     icon: Users },
  { id: "invitations", label: "Invitations", icon: Mail },
] as const

type Tab = typeof NAV[number]["id"]

// -- Page ---------------------------------------------------------------------

export default function WorkspaceSettingsPage() {
  const { slug } = useParams<{ slug: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: workspace } = useWorkspace(slug!)

  const myRole = workspace?.role ?? "member"
  const isOwner = myRole === "owner"
  const canManage = myRole === "owner" || myRole === "admin"

  const initialTab = (searchParams.get("tab") as Tab) ?? "general"
  const [tab, setTab] = useState<Tab>(initialTab)

  const switchTab = (id: Tab) => {
    setTab(id)
    setSearchParams({ tab: id }, { replace: true })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Breadcrumb */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card/80 backdrop-blur px-6 py-3 flex items-center gap-2 border-b border-border/30 shrink-0"
      >
        <Link
          to={`/w/${slug}`}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          <span className="font-medium">{workspace?.name ?? "Workspace"}</span>
        </Link>
        <ChevronRight className="size-3.5 text-border" />
        <span className="text-sm font-semibold text-foreground">Settings</span>
      </motion.div>

      {/* Two-column layout */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <motion.aside
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.05 }}
          className="w-56 shrink-0 border-r border-border/30 bg-card/40 flex flex-col gap-1 p-3 overflow-y-auto"
        >
          {/* Workspace mini profile */}
          <div className="flex items-center gap-3 px-2 py-3 mb-1">
            <div className="size-9 rounded-xl bg-primary/15 ring-2 ring-primary/20 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-primary">
                {(workspace?.name?.[0] ?? "W").toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{workspace?.name ?? ""}</p>
              <p className="text-[11px] text-muted-foreground">{workspace?.member_count ?? 0} members</p>
            </div>
          </div>

          <div className="h-px bg-border/40 mx-2 mb-2" />

          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => switchTab(id)}
              className={cn(
                "flex items-center gap-2.5 text-sm font-medium px-3 py-2.5 rounded-xl transition-colors cursor-pointer text-left w-full",
                tab === id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              )}
            >
              <Icon className="size-4 shrink-0" />
              {label}
              {tab === id && <div className="ml-auto size-1.5 rounded-full bg-primary" />}
            </button>
          ))}
        </motion.aside>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-8 py-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                {tab === "general" && (
                  <>
                    <GeneralSection slug={slug!} />
                    {isOwner && <DangerZone slug={slug!} workspaceName={workspace?.name ?? ""} />}
                  </>
                )}
                {tab === "members" && <MembersSection slug={slug!} myRole={myRole} />}
                {tab === "invitations" && (
                  canManage
                    ? <InvitationsSection slug={slug!} />
                    : (
                      <div className="bg-card/60 border border-border/60 rounded-2xl p-8 text-center">
                        <Shield className="size-8 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Only admins and owners can manage invitations.</p>
                      </div>
                    )
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}
