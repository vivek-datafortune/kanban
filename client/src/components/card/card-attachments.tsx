import { useCallback, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Paperclip,
  Upload,
  Trash2,
  Download,
  FileText,
  FileImage,
  FileArchive,
  File,
  FileSpreadsheet,
  FileVideo,
  X,
  Loader2,
  ZoomIn,
  AlertCircle,
} from "lucide-react"
import { useAttachments, useUploadAttachment, useDeleteAttachment } from "@/hooks/use-attachments"
import { useStore } from "@/store/app.store"
import { cn } from "@/lib/utils"
import type { Attachment } from "@/types/board"

//  File type config 

type FileCategory = "image" | "pdf" | "spreadsheet" | "video" | "archive" | "document" | "default"

const FILE_TYPE_CONFIG: Record<
  FileCategory,
  { icon: React.ElementType; color: string; bg: string; label: string }
> = {
  image:       { icon: FileImage,       color: "text-sky-500",    bg: "bg-sky-500/10",    label: "Image"       },
  pdf:         { icon: FileText,        color: "text-red-500",    bg: "bg-red-500/10",    label: "PDF"         },
  spreadsheet: { icon: FileSpreadsheet, color: "text-emerald-500",bg: "bg-emerald-500/10",label: "Spreadsheet" },
  video:       { icon: FileVideo,       color: "text-violet-500", bg: "bg-violet-500/10", label: "Video"       },
  archive:     { icon: FileArchive,     color: "text-amber-500",  bg: "bg-amber-500/10",  label: "Archive"     },
  document:    { icon: FileText,        color: "text-blue-500",   bg: "bg-blue-500/10",   label: "Document"    },
  default:     { icon: File,            color: "text-muted-foreground", bg: "bg-secondary", label: "File"     },
}

function getFileCategory(contentType: string): FileCategory {
  if (contentType.startsWith("image/"))                                                                           return "image"
  if (contentType === "application/pdf")                                                                          return "pdf"
  if (contentType.includes("spreadsheet") || contentType.includes("excel") || contentType === "text/csv")        return "spreadsheet"
  if (contentType.startsWith("video/"))                                                                           return "video"
  if (contentType.includes("zip") || contentType.includes("rar") || contentType.includes("7z") || contentType.includes("tar")) return "archive"
  if (contentType.includes("word") || contentType.includes("document") || contentType.includes("text/"))         return "document"
  return "default"
}

//  Helpers 

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60)  return "just now"
  const m = Math.floor(s / 60)
  if (m < 60)  return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30)  return `${d}d ago`
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function displayName(user: Attachment["uploaded_by"]): string {
  if (!user) return "Unknown"
  const name = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim()
  return name || user.email.split("@")[0]
}

//  Image lightbox 

function Lightbox({ url, filename, onClose }: { url: string; filename: string; onClose: () => void }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.92, opacity: 0 }}
          transition={{ duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="relative max-w-4xl max-h-[90vh] w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={url}
            alt={filename}
            className="w-full h-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
          />
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 bg-linear-to-b from-black/60 to-transparent rounded-t-xl">
            <span className="text-sm font-medium text-white/90 truncate">{filename}</span>
            <div className="flex items-center gap-2">
              <a
                href={url}
                download={filename}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Download className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

//  Upload queue item (in-progress / error) 

function UploadingRow({ filename, error }: { filename: string; error?: string }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl border",
        error
          ? "border-red-500/20 bg-red-500/5"
          : "border-border bg-secondary/30",
      )}
    >
      <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-secondary shrink-0">
        {error ? (
          <AlertCircle className="w-4 h-4 text-red-500" />
        ) : (
          <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate text-foreground/70">{filename}</p>
        {error ? (
          <p className="text-xs text-red-500 mt-0.5">{error}</p>
        ) : (
          <div className="mt-1.5 h-1 bg-border rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary/60 rounded-full"
              animate={{ width: ["20%", "80%", "60%", "90%"] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        )}
      </div>
    </motion.div>
  )
}

//  Loading skeleton 

function AttachmentSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-border animate-pulse">
      <div className="w-10 h-10 rounded-lg bg-secondary shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-3 bg-secondary rounded-full w-3/5" />
        <div className="h-2.5 bg-secondary rounded-full w-2/5" />
      </div>
    </div>
  )
}

//  Single attachment row 

function AttachmentRow({
  attachment,
  cardId,
  boardId,
  onLightbox,
}: {
  attachment: Attachment
  cardId: string
  boardId: string
  onLightbox: (url: string, filename: string) => void
}) {
  const currentUser = useStore((s) => s.user)
  const { mutate: remove, isPending } = useDeleteAttachment(cardId, boardId)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const canDelete = currentUser?.pk === attachment.uploaded_by?.pk
  const category = getFileCategory(attachment.content_type)
  const { icon: Icon, color, bg, label } = FILE_TYPE_CONFIG[category]
  const isImage = category === "image"
  const name = displayName(attachment.uploaded_by)

  function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    remove(attachment.id)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className={cn(
        "group flex items-start gap-3 p-3 rounded-xl border transition-colors duration-150",
        confirmDelete
          ? "border-red-500/30 bg-red-500/5"
          : "border-border hover:border-border/80 hover:bg-secondary/30 bg-transparent",
      )}
      onMouseLeave={() => setConfirmDelete(false)}
    >
      {/* Thumbnail / Icon */}
      {isImage && attachment.url ? (
        <button
          onClick={() => onLightbox(attachment.url!, attachment.filename)}
          className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-border relative cursor-zoom-in group/thumb"
        >
          <img
            src={attachment.url}
            alt={attachment.filename}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/0 group-hover/thumb:bg-black/30 transition-colors flex items-center justify-center">
            <ZoomIn className="w-4 h-4 text-white opacity-0 group-hover/thumb:opacity-100 transition-opacity" />
          </div>
        </button>
      ) : (
        <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center shrink-0", bg)}>
          <Icon className={cn("w-5 h-5", color)} />
        </div>
      )}

      {/* Metadata */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate leading-snug">
          {attachment.filename}
        </p>
        <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mt-1">
          <span className={cn("text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-md", bg, color)}>
            {label}
          </span>
          <span className="text-xs text-muted-foreground">{formatSize(attachment.size)}</span>
          <span className="text-xs text-muted-foreground/50"></span>
          <span className="text-xs text-muted-foreground truncate">{name}</span>
          <span className="text-xs text-muted-foreground/50"></span>
          <span className="text-xs text-muted-foreground">{relativeTime(attachment.created_at)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0 pt-0.5">
        {confirmDelete ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-1"
          >
            <span className="text-xs text-red-500 font-medium">Delete?</span>
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="px-2 py-1 rounded-lg text-xs font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Yes"}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-2 py-1 rounded-lg text-xs font-medium bg-secondary hover:bg-secondary/80 text-foreground transition-colors cursor-pointer"
            >
              No
            </button>
          </motion.div>
        ) : (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {attachment.url && (
              <a
                href={attachment.url}
                download={attachment.filename}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                title="Download"
              >
                <Download className="w-3.5 h-3.5" />
              </a>
            )}
            {canDelete && (
              <button
                onClick={handleDelete}
                className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors cursor-pointer"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}

//  Upload queue state 

interface QueueItem {
  id: string
  filename: string
  error?: string
}

//  Main component 

interface Props {
  cardId: string
  boardId: string
}

export default function CardAttachments({ cardId, boardId }: Props) {
  const { data: attachments = [], isLoading } = useAttachments(cardId)
  const { mutate: upload } = useUploadAttachment(cardId, boardId)
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [lightbox, setLightbox] = useState<{ url: string; filename: string } | null>(null)
  const [draggingOver, setDraggingOver] = useState(false)

  const handleFiles = useCallback((files: File[]) => {
    files.forEach((file) => {
      const itemId = `${Date.now()}-${Math.random()}`
      setQueue((q) => [...q, { id: itemId, filename: file.name }])

      upload(file, {
        onSuccess: () => {
          setQueue((q) => q.filter((i) => i.id !== itemId))
        },
        onError: (err: unknown) => {
          const msg =
            (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
            "Upload failed."
          setQueue((q) => q.map((i) => i.id === itemId ? { ...i, error: msg } : i))
        },
      })
    })
  }, [upload])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDraggingOver(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length) handleFiles(files)
  }, [handleFiles])

  function dismissError(id: string) {
    setQueue((q) => q.filter((i) => i.id !== id))
  }

  const hasContent = attachments.length > 0 || queue.length > 0

  return (
    <>
      {lightbox && (
        <Lightbox
          url={lightbox.url}
          filename={lightbox.filename}
          onClose={() => setLightbox(null)}
        />
      )}

      <div
        className={cn(
          "space-y-3 rounded-xl transition-colors duration-150",
          draggingOver && "ring-2 ring-primary/30 ring-offset-1 bg-primary/2",
        )}
        onDragOver={(e) => { e.preventDefault(); setDraggingOver(true) }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDraggingOver(false) }}
        onDrop={handleDrop}
      >
        {/* Header + inline upload button */}
        <div className="flex items-center gap-2">
          <Paperclip className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Attachments</span>
          {attachments.length > 0 && (
            <span className="text-[10px] font-bold text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full">
              {attachments.length}
            </span>
          )}
          <div className="flex-1" />
        </div>

        {/* Drop zone — always visible */}
        <div
          className={cn(
            "flex flex-col items-center justify-center gap-2 py-5 px-4 rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer",
            draggingOver
              ? "border-primary bg-primary/5 scale-[1.01] shadow-sm shadow-primary/10"
              : "border-border hover:border-primary/40 hover:bg-secondary/30",
          )}
          onClick={() => document.getElementById("attachment-file-input")?.click()}
        >
          <motion.div
            animate={draggingOver ? { scale: 1.15, rotate: -8 } : { scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className={cn(
              "size-9 rounded-xl flex items-center justify-center transition-colors",
              draggingOver ? "bg-primary/15" : "bg-secondary",
            )}
          >
            <Upload className={cn("w-4 h-4 transition-colors", draggingOver ? "text-primary" : "text-muted-foreground")} />
          </motion.div>
          <div className="text-center pointer-events-none">
            <p className="text-xs text-foreground font-medium">
              {draggingOver ? "Release to attach" : <>Drop files or <span className="text-primary">browse</span></>}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Images, PDFs, docs up to 25 MB</p>
          </div>
          <input
            id="attachment-file-input"
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) handleFiles(Array.from(e.target.files))
              e.target.value = ""
            }}
          />
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <AttachmentSkeleton />
            <AttachmentSkeleton />
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {queue.map((item) => (
              <div key={item.id} className="relative">
                <UploadingRow filename={item.filename} error={item.error} />
                {item.error && (
                  <button
                    onClick={() => dismissError(item.id)}
                    className="absolute top-3 right-3 p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}

            {attachments.map((a) => (
              <AttachmentRow
                key={a.id}
                attachment={a}
                cardId={cardId}
                boardId={boardId}
                onLightbox={(url, filename) => setLightbox({ url, filename })}
              />
            ))}
          </AnimatePresence>
        )}

        {!isLoading && !hasContent && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-xs text-muted-foreground py-1"
          >
            No attachments yet
          </motion.p>
        )}
      </div>
    </>
  )
}
