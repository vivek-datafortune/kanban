import { useState, useRef, forwardRef, useImperativeHandle, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { MessageSquare, Send, Pencil, Trash2, CornerDownRight, Loader2, AtSign } from "lucide-react"
import { useComments, useAddComment, useEditComment, useDeleteComment } from "@/hooks/use-comments"
import { useWorkspaceMembers } from "@/hooks/use-workspaces"
import { useStore } from "@/store/app.store"
import { cn } from "@/lib/utils"
import type { Comment } from "@/types/board"
import type { WorkspaceMember } from "@/types/workspace"

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderBody(text: string) {
  const parts = text.split(/(@[.\w!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    part.startsWith("@") && part.slice(1).includes("@") ? (
      <span
        key={i}
        className="inline-flex items-center gap-0.5 bg-primary/10 text-primary text-[0.8em]
                   font-medium rounded-full px-1.5 py-0.5 mx-0.5 align-middle"
      >
        <AtSign className="size-2.5 shrink-0" />
        {part.slice(1)}
      </span>
    ) : (
      part
    ),
  )
}

function MentionDropdown({
  members,
  query,
  currentUserEmail,
  onSelect,
}: {
  members: WorkspaceMember[]
  query: string
  currentUserEmail?: string
  onSelect: (email: string) => void
}) {
  const filtered = members
    .filter(({ user }) =>
      user.email.toLowerCase() !== currentUserEmail?.toLowerCase() &&
      (
        user.email.toLowerCase().includes(query.toLowerCase()) ||
        `${user.first_name} ${user.last_name}`.toLowerCase().includes(query.toLowerCase())
      ),
    )
    .slice(0, 5)
  if (filtered.length === 0) return null
  return (
    <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-popover border border-border rounded-xl shadow-lg overflow-hidden py-1">
      {filtered.map(({ user }) => {
        const name = user.first_name ? `${user.first_name} ${user.last_name}`.trim() : user.email.split("@")[0]
        return (
          <button
            key={user.pk}
            type="button"
            onMouseDown={(e) => { e.preventDefault(); onSelect(user.email) }}
            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-secondary/60 transition-colors cursor-pointer text-left"
          >
            <div className="size-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-primary">
                {(user.first_name?.[0] || user.email[0]).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{name}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
            </div>
            <AtSign className="size-3 text-muted-foreground shrink-0" />
          </button>
        )
      })}
    </div>
  )
}

// ── contentEditable mention input ────────────────────────────────────────────
interface MentionInputHandle {
  clear: () => void
  focus: () => void
  getText: () => string
}

function serializeEditor(el: Node): string {
  let text = ""
  for (const node of el.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent ?? ""
    } else if (node instanceof HTMLElement) {
      const mention = node.getAttribute("data-mention")
      if (mention) {
        text += `@${mention}`
      } else if (node.tagName === "BR") {
        text += "\n"
      } else if (node.tagName === "DIV" || node.tagName === "P") {
        text += "\n" + serializeEditor(node)
      } else {
        text += serializeEditor(node)
      }
    }
  }
  return text
}

const MentionInput = forwardRef<
  MentionInputHandle,
  {
    placeholder: string
    onSubmit: (text: string) => void
    onChange: (isEmpty: boolean) => void
    members: WorkspaceMember[]
    currentUserEmail?: string
    autoFocus?: boolean
    minHeight?: string
  }
>(function MentionInput(
  { placeholder, onSubmit, onChange, members, currentUserEmail, autoFocus, minHeight = "4.5rem" },
  ref,
) {
  const divRef = useRef<HTMLDivElement>(null)
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [showPlaceholder, setShowPlaceholder] = useState(true)

  useImperativeHandle(ref, () => ({
    clear() {
      if (divRef.current) {
        divRef.current.innerHTML = ""
        setShowPlaceholder(true)
        setMentionQuery(null)
        onChange(true)
      }
    },
    focus() { divRef.current?.focus() },
    getText() { return serializeEditor(divRef.current!) },
  }))

  useEffect(() => {
    if (autoFocus) divRef.current?.focus()
  }, [autoFocus])

  function detectMention() {
    const sel = window.getSelection()
    if (!sel?.rangeCount || !divRef.current) { setMentionQuery(null); return }
    const range = sel.getRangeAt(0)
    const pre = range.cloneRange()
    pre.selectNodeContents(divRef.current)
    pre.setEnd(range.startContainer, range.startOffset)
    const match = pre.toString().match(/@(\S*)$/)
    setMentionQuery(match ? match[1] : null)
  }

  function handleInput() {
    const empty = !serializeEditor(divRef.current!).trim()
    setShowPlaceholder(empty)
    onChange(empty)
    detectMention()
  }

  function insertMention(email: string) {
    if (!divRef.current) return
    divRef.current.focus()
    const sel = window.getSelection()
    if (!sel?.rangeCount) return
    const range = sel.getRangeAt(0)
    // Delete the typed @partial text from current text node
    if (range.startContainer.nodeType === Node.TEXT_NODE) {
      const tn = range.startContainer as Text
      const end = range.startOffset
      const qLen = (mentionQuery?.length ?? 0) + 1
      const start = Math.max(0, end - qLen)
      tn.textContent = (tn.textContent ?? "").slice(0, start) + (tn.textContent ?? "").slice(end)
      sel.removeAllRanges()
      const r = document.createRange()
      r.setStart(tn, start)
      r.collapse(true)
      sel.addRange(r)
    }
    // Build chip
    const chip = document.createElement("span")
    chip.setAttribute("contenteditable", "false")
    chip.setAttribute("data-mention", email)
    chip.className = "mention-chip"
    chip.textContent = `@${email}`
    const btn = document.createElement("button")
    btn.type = "button"
    btn.tabIndex = -1
    btn.className = "mention-chip-remove"
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`
    btn.addEventListener("mousedown", (e) => {
      e.preventDefault()
      chip.remove()
      const empty = !serializeEditor(divRef.current!).trim()
      setShowPlaceholder(empty)
      onChange(empty)
    })
    chip.appendChild(btn)
    // Insert chip at cursor then place cursor after trailing space
    const ir = sel.getRangeAt(0)
    ir.insertNode(chip)
    const space = document.createTextNode("\u00A0")
    chip.after(space)
    const cursorRange = document.createRange()
    cursorRange.setStart(space, 1)
    cursorRange.collapse(true)
    sel.removeAllRanges()
    sel.addRange(cursorRange)
    setMentionQuery(null)
    const empty = !serializeEditor(divRef.current!).trim()
    setShowPlaceholder(empty)
    onChange(empty)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape" && mentionQuery !== null) { setMentionQuery(null); e.preventDefault(); return }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      const text = serializeEditor(divRef.current!).trim()
      if (text) onSubmit(text)
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    document.execCommand("insertText", false, e.clipboardData.getData("text/plain"))
  }

  return (
    <div className="relative">
      {showPlaceholder && (
        <span className="absolute top-2.5 left-3 text-sm text-muted-foreground pointer-events-none select-none">
          {placeholder}
        </span>
      )}
      <div
        ref={divRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        style={{ minHeight }}
        className="w-full text-sm text-foreground bg-secondary border border-border rounded-xl
                   px-3 py-2.5 focus:outline-none focus:border-primary/50 transition-colors
                   [word-break:break-word] leading-relaxed"
      />
      {mentionQuery !== null && (
        <MentionDropdown
          members={members}
          query={mentionQuery}
          currentUserEmail={currentUserEmail}
          onSelect={insertMention}
        />
      )}
    </div>
  )
})

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return "just now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(dateStr).toLocaleDateString()
}

function displayName(author: Comment["author"]) {
  return author.first_name ? `${author.first_name} ${author.last_name}`.trim() : author.email
}

function Avatar({ author, size = "md" }: { author: Comment["author"]; size?: "sm" | "md" }) {
  const initial = (author.first_name?.[0] || author.email[0]).toUpperCase()
  return (
    <div className={cn("rounded-full bg-primary/20 flex items-center justify-center shrink-0", size === "sm" ? "size-6" : "size-8")}>
      <span className={cn("font-bold text-primary", size === "sm" ? "text-[10px]" : "text-xs")}>{initial}</span>
    </div>
  )
}

// ── Single comment body (shared by top-level + reply) ─────────────────────────

interface CommentItemProps {
  comment: Comment
  cardId: string
  currentUserPk: number | undefined
  currentUserEmail: string | undefined
  wsMembers: WorkspaceMember[]
  isReply?: boolean
}

function CommentItem({ comment, cardId, currentUserPk, currentUserEmail, wsMembers, isReply = false }: CommentItemProps) {
  const [editing, setEditing] = useState(false)
  const [editBody, setEditBody] = useState(comment.body)
  const [showReplyBox, setShowReplyBox] = useState(false)
  const [replyHasContent, setReplyHasContent] = useState(false)
  const replyRef = useRef<MentionInputHandle>(null)

  const { mutate: editComment, isPending: isEditing } = useEditComment(cardId)
  const { mutate: deleteComment, isPending: isDeleting } = useDeleteComment(cardId)
  const { mutate: addComment, isPending: isReplying } = useAddComment(cardId)

  const isOwn = currentUserPk === comment.author.pk
  const edited = comment.updated_at !== comment.created_at

  const handleEditSave = () => {
    if (!editBody.trim() || editBody === comment.body) { setEditing(false); return }
    editComment({ id: comment.id, body: editBody.trim() }, { onSuccess: () => setEditing(false) })
  }

  const handleReplySubmit = (text: string) => {
    if (!text.trim()) return
    addComment(
      { body: text.trim(), parent: comment.id },
      { onSuccess: () => { replyRef.current?.clear(); setShowReplyBox(false) } }
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("group/comment flex gap-2.5", isReply && "ml-10 mt-2")}
    >
      <Avatar author={comment.author} size={isReply ? "sm" : "md"} />

      <div className="flex-1 min-w-0 relative">
        {/* Bubble */}
        <div className="bg-secondary rounded-xl rounded-tl-sm px-3 py-2.5">
        {/* Header */}
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-sm font-semibold text-foreground">{displayName(comment.author)}</span>
          <span className="text-[11px] text-muted-foreground">{timeAgo(comment.created_at)}</span>
          {edited && <span className="text-[10px] text-muted-foreground/70 italic">edited</span>}
        </div>

        {/* Body / edit form */}
        {editing ? (
          <div className="space-y-2">
            <textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleEditSave() }
                if (e.key === "Escape") { setEditing(false); setEditBody(comment.body) }
              }}
              rows={3}
              autoFocus
              className="w-full text-sm text-foreground bg-background border border-border rounded-lg
                         px-3 py-2 resize-none focus:outline-none focus:border-primary/50 transition-colors"
            />
            <div className="flex gap-2">
              <button
                onClick={handleEditSave}
                disabled={isEditing}
                className="bg-primary text-primary-foreground text-xs font-semibold rounded-lg px-3 py-1.5
                           hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Save
              </button>
              <button
                onClick={() => { setEditing(false); setEditBody(comment.body) }}
                className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap wrap-break-word">
            {renderBody(comment.body)}
          </p>
        )}
        </div>

        {/* Floating actions */}
        {!editing && (
          <div className="absolute -top-3 right-3 z-10 opacity-0 group-hover/comment:opacity-100
                          transition-opacity flex items-center gap-px
                          bg-background/70 backdrop-blur-[10px] border border-border/60
                          shadow-md rounded-xl px-1 py-1">
            {!isReply && (
              <button
                onClick={() => setShowReplyBox((p) => !p)}
                title="Reply"
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground
                           hover:bg-secondary/70 transition-colors cursor-pointer"
              >
                <CornerDownRight className="size-3.5" />
              </button>
            )}
            {isOwn && (
              <button
                onClick={() => { setEditing(true); setEditBody(comment.body) }}
                title="Edit"
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground
                           hover:bg-secondary/70 transition-colors cursor-pointer"
              >
                <Pencil className="size-3.5" />
              </button>
            )}
            {isOwn && (
              <button
                onClick={() => deleteComment(comment.id)}
                disabled={isDeleting}
                title="Delete"
                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive
                           hover:bg-destructive/10 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Reply box */}
        <AnimatePresence>
          {showReplyBox && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 space-y-2 overflow-hidden"
            >
              <MentionInput
                ref={replyRef}
                placeholder="Write a reply… (@ to mention)"
                onSubmit={handleReplySubmit}
                onChange={(isEmpty) => setReplyHasContent(!isEmpty)}
                members={wsMembers}
                currentUserEmail={currentUserEmail}
                autoFocus
                minHeight="3.5rem"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isReplying || !replyHasContent}
                  onClick={() => {
                    const text = replyRef.current?.getText().trim()
                    if (text) handleReplySubmit(text)
                  }}
                  className="bg-primary text-primary-foreground text-xs font-semibold rounded-lg px-3 py-1.5
                             hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {isReplying && <Loader2 className="size-3 animate-spin" />}
                  Reply
                </button>
                <button
                  type="button"
                  onClick={() => setShowReplyBox(false)}
                  className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Replies */}
        {!isReply && comment.replies.length > 0 && (
          <div className="mt-3 space-y-3 border-l-2 border-primary/20 pl-3">
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                cardId={cardId}
                currentUserPk={currentUserPk}
                currentUserEmail={currentUserEmail}
                wsMembers={wsMembers}
                isReply
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ── Main section ──────────────────────────────────────────────────────────────

interface CardCommentsProps {
  cardId: string
  workspaceSlug: string
}

export default function CardComments({ cardId, workspaceSlug }: CardCommentsProps) {
  const { user } = useStore()
  const { data: membersData = [] } = useWorkspaceMembers(workspaceSlug)
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useComments(cardId)
  const { mutate: addComment, isPending: isPosting } = useAddComment(cardId)
  const composeRef = useRef<MentionInputHandle>(null)
  const [composeHasContent, setComposeHasContent] = useState(false)

  const allComments = data?.pages.flatMap((p) => p.results) ?? []
  const totalCount = data?.pages[0]?.count ?? 0

  const handleCompose = (text: string) => {
    if (!text.trim()) return
    addComment(
      { body: text.trim() },
      { onSuccess: () => { composeRef.current?.clear(); composeRef.current?.focus() } }
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="size-4 text-muted-foreground" />
        <h4 className="text-sm font-semibold text-foreground">Comments</h4>
        {totalCount > 0 && (
          <span className="text-[10px] font-bold text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full">
            {totalCount}
          </span>
        )}
      </div>

      {/* Compose box */}
      <div className="flex gap-2.5 mb-6">
        {user && (
          <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-xs font-bold text-primary">
              {(user.first_name?.[0] || user.email[0]).toUpperCase()}
            </span>
          </div>
        )}
        <div className="flex-1 space-y-2">
          <MentionInput
            ref={composeRef}
            placeholder="Add a comment… (@ to mention)"
            onSubmit={handleCompose}
            onChange={(isEmpty) => setComposeHasContent(!isEmpty)}
            members={membersData}
            currentUserEmail={user?.email}
          />
          <AnimatePresence>
            {composeHasContent && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    disabled={isPosting}
                    onClick={() => {
                      const text = composeRef.current?.getText().trim()
                      if (text) handleCompose(text)
                    }}
                    className="bg-primary text-primary-foreground text-xs font-semibold rounded-lg px-3 py-1.5
                               hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer
                               flex items-center gap-1.5"
                  >
                    {isPosting ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />}
                    Post
                  </button>
                  <span className="text-[11px] text-muted-foreground">Enter to submit · Shift+Enter for new line</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Comments list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="size-5 text-muted-foreground animate-spin" />
        </div>
      ) : allComments.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
          <MessageSquare className="size-8 opacity-30" />
          <p className="text-sm">No comments yet. Be the first.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {allComments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                cardId={cardId}
                currentUserPk={user?.pk}
                currentUserEmail={user?.email}
                wsMembers={membersData}
              />
            ))}
          </AnimatePresence>

          {hasNextPage && (
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors
                         py-2 rounded-lg hover:bg-secondary/60 cursor-pointer flex items-center justify-center gap-2"
            >
              {isFetchingNextPage && <Loader2 className="size-3.5 animate-spin" />}
              Load more
            </button>
          )}
        </div>
      )}
    </div>
  )
}
