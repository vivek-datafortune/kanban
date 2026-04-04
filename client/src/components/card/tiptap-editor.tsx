import { useState, useRef } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import TaskList from "@tiptap/extension-task-list"
import TaskItem from "@tiptap/extension-task-item"
import {
  Bold, Italic, Strikethrough, List, ListOrdered, Quote, Minus,
  Undo, Redo, Code, CheckSquare, Sparkles, Check, Loader2,
  Undo2, ChevronDown, ArrowRight,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface TiptapEditorProps {
  content: string
  onSave: (html: string) => void
  onCancel: () => void
  cardId?: string
}

export default function TiptapEditor({ content, onSave, onCancel, cardId }: TiptapEditorProps) {
  const [aiPhase, setAiPhase] = useState<"idle" | "loading" | "applied">("idle")
  const [savedContent, setSavedContent] = useState<string>("")
  const [promptOpen, setPromptOpen] = useState(false)
  const [promptValue, setPromptValue] = useState("")
  const [editorFlash, setEditorFlash] = useState(false)
  const typingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "Add a more detailed description... or click AI to generate" }),
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: content || "",
    editorProps: {
      attributes: {
        class: "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[120px] px-4 py-3 text-sm text-foreground [&_ul[data-type=taskList]]:list-none [&_ul[data-type=taskList]]:pl-0 [&_li[data-type=taskItem]]:flex [&_li[data-type=taskItem]]:gap-2 [&_li[data-type=taskItem]>label]:flex [&_li[data-type=taskItem]>label]:items-center [&_li[data-type=taskItem]>label>input]:mr-1",
      },
    },
  })

  if (!editor) return null

  const handleSave = () => {
    const html = editor.getHTML()
    onSave(html === "<p></p>" ? "" : html)
  }

  const getToken = () =>
    document.cookie.split("; ").find((r) => r.startsWith("access="))?.split("=")[1]

  const escHtml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

  const runAI = async (customPrompt?: string) => {
    if (!cardId || !editor) return
    if (aiPhase !== "applied") setSavedContent(editor.getHTML())
    setAiPhase("loading")
    setPromptOpen(false)
    if (typingRef.current) clearInterval(typingRef.current)

    try {
      const res = await fetch("/api/ai/describe/", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(getToken() ? { Authorization: "Bearer " + getToken() } : {}),
        },
        body: JSON.stringify({ card_id: cardId, prompt: customPrompt }),
      })
      if (!res.ok) throw new Error("AI request failed")
      const data = await res.json()
      const description: string = data.description || ""

      const tmp = document.createElement("div")
      tmp.innerHTML = description
      const plain = (tmp.textContent ?? "").trim()

      editor.commands.clearContent()

      let i = 0
      await new Promise<void>((resolve) => {
        typingRef.current = setInterval(() => {
          i = Math.min(i + 5, plain.length)
          const slice = escHtml(plain.slice(0, i))
          editor.commands.setContent(
            "<p>" + slice + "<span style=\"display:inline-block;width:2px;height:0.85em;background:currentColor;opacity:0.7;margin-left:1px;vertical-align:middle;border-radius:1px\"></span></p>"
          )
          if (i >= plain.length) {
            if (typingRef.current) clearInterval(typingRef.current)
            resolve()
          }
        }, 14)
      })

      setEditorFlash(true)
      editor.commands.setContent(description)
      setTimeout(() => setEditorFlash(false), 700)
      setAiPhase("applied")
      setPromptValue("")
    } catch {
      setAiPhase(savedContent ? "applied" : "idle")
    }
  }

  const handleRevert = () => {
    if (typingRef.current) clearInterval(typingRef.current)
    editor.commands.setContent(savedContent || "")
    setAiPhase("idle")
    setPromptOpen(false)
    setPromptValue("")
    setSavedContent("")
  }

  const handleKeep = () => {
    setAiPhase("idle")
    setPromptOpen(false)
    setPromptValue("")
    setSavedContent("")
  }

  const isLoading = aiPhase === "loading"

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 flex-wrap bg-secondary/50 rounded-lg p-1 border border-border">
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold"><Bold className="size-3.5" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic"><Italic className="size-3.5" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Strikethrough"><Strikethrough className="size-3.5" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} title="Inline code"><Code className="size-3.5" /></ToolbarButton>
        <div className="w-px h-4 bg-border mx-1" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet list"><List className="size-3.5" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Ordered list"><ListOrdered className="size-3.5" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive("taskList")} title="Task / checklist"><CheckSquare className="size-3.5" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Quote"><Quote className="size-3.5" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider"><Minus className="size-3.5" /></ToolbarButton>
        <div className="w-px h-4 bg-border mx-1" />
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo"><Undo className="size-3.5" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo"><Redo className="size-3.5" /></ToolbarButton>
        {cardId && (
          <>
            <div className="w-px h-4 bg-border mx-1" />
            <button
              type="button"
              onClick={() => aiPhase === "idle" && runAI()}
              disabled={aiPhase === "loading"}
              title="Improve with AI"
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all cursor-pointer select-none",
                aiPhase === "applied" ? "bg-primary/15 text-primary" : "text-primary hover:bg-primary/10",
                aiPhase === "loading" && "opacity-50 cursor-not-allowed"
              )}
            >
              {aiPhase === "loading" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <motion.div animate={aiPhase === "applied" ? { scale: [1, 1.25, 1], rotate: [0, 12, -12, 0] } : {}} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
                  <Sparkles className="size-3.5" />
                </motion.div>
              )}
              {aiPhase === "loading" ? "Generating..." : "AI"}
            </button>
          </>
        )}
      </div>

      {/* Floating AI action bar */}
      <AnimatePresence>
        {aiPhase === "applied" && (
          <motion.div
            key="ai-bar"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="rounded-xl border border-primary/40 bg-primary/5 overflow-hidden ai-preview-glow"
          >
            <div className="flex items-center gap-2 px-3 py-2">
              <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, 15, -15, 0] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }} className="shrink-0">
                <Sparkles className="size-3.5 text-primary" />
              </motion.div>
              <span className="text-xs font-medium ai-typing-text flex-1 min-w-0">Description improved by AI</span>
              <div className="flex items-center gap-1 shrink-0">
                <button type="button" onClick={handleRevert} className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer">
                  <Undo2 className="size-3" /> Revert
                </button>
                <button type="button" onClick={handleKeep} className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer">
                  <Check className="size-3" /> Keep
                </button>
                <button
                  type="button"
                  onClick={() => setPromptOpen((p) => !p)}
                  className={cn("flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer", promptOpen ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary")}
                >
                  <Sparkles className="size-3" />
                  Improve
                  <motion.div animate={{ rotate: promptOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown className="size-3" />
                  </motion.div>
                </button>
              </div>
            </div>

            <AnimatePresence>
              {promptOpen && (
                <motion.div
                  key="prompt"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  style={{ overflow: "hidden" }}
                >
                  <div className="px-3 pb-3 flex gap-2 border-t border-primary/20 pt-2">
                    <input
                      autoFocus
                      value={promptValue}
                      onChange={(e) => setPromptValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && promptValue.trim()) runAI(promptValue.trim()) }}
                      placeholder="e.g. make it shorter, add technical details, use bullet points..."
                      className="flex-1 bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30 placeholder:text-muted-foreground/50"
                    />
                    <button
                      type="button"
                      onClick={() => promptValue.trim() && runAI(promptValue.trim())}
                      disabled={!promptValue.trim() || isLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                    >
                      {isLoading ? <Loader2 className="size-3.5 animate-spin" /> : <ArrowRight className="size-3.5" />}
                      Apply
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Editor */}
      <div className={cn("bg-secondary border border-border rounded-lg overflow-hidden focus-within:ring-1 focus-within:ring-primary/30 transition-all duration-300", editorFlash && "ai-flash-reveal")}>
        <EditorContent editor={editor} />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button onClick={handleSave} className="bg-primary text-primary-foreground rounded-lg px-4 py-1.5 text-sm font-semibold hover:bg-primary/90 transition-colors cursor-pointer">Save</button>
        <button onClick={onCancel} className="text-muted-foreground hover:text-foreground cursor-pointer px-3 py-1.5 text-sm rounded-lg hover:bg-secondary transition-colors">Cancel</button>
      </div>
    </div>
  )
}

function ToolbarButton({ onClick, active, disabled, title, children }: { onClick: () => void; active?: boolean; disabled?: boolean; title: string; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title} className={cn("p-1.5 rounded-md cursor-pointer transition-colors", active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary", disabled && "opacity-30 cursor-not-allowed")}>
      {children}
    </button>
  )
}