import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { LayoutTemplate, X, Zap, Users, Palette, Megaphone, Cpu, Star, Sparkles } from "lucide-react"

import BackButton from "@/components/ui/back-button"
import { useTemplates, useUseTemplate } from "@/hooks/use-templates"
import { useGenerateTemplate } from "@/hooks/use-ai"
import { cn } from "@/lib/utils"
import type { BoardTemplate } from "@/types/board"

const BOARD_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316",
  "#eab308", "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
]

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "engineering", label: "Engineering", icon: Cpu },
  { value: "product", label: "Product", icon: Zap },
  { value: "design", label: "Design", icon: Palette },
  { value: "marketing", label: "Marketing", icon: Megaphone },
  { value: "hr", label: "HR", icon: Users },
  { value: "general", label: "General", icon: Star },
]

const CATEGORY_COLORS: Record<string, string> = {
  engineering: "bg-blue-500/10 text-blue-500",
  product: "bg-purple-500/10 text-purple-500",
  design: "bg-pink-500/10 text-pink-500",
  marketing: "bg-orange-500/10 text-orange-500",
  hr: "bg-green-500/10 text-green-500",
  general: "bg-muted text-muted-foreground",
}

function UseTemplateModal({
  template,
  slug,
  onClose,
}: {
  template: BoardTemplate
  slug: string
  onClose: () => void
}) {
  const navigate = useNavigate()
  const [title, setTitle] = useState(template.title)
  const [color, setColor] = useState(BOARD_COLORS[0])
  const { mutate: useTemplate, isPending } = useUseTemplate()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    useTemplate(
      { templateId: template.id, workspace: slug, title: title.trim(), background_color: color },
      {
        onSuccess: (board) => {
          navigate(`/w/${slug}/b/${board.id}`)
        },
      },
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-foreground">Use Template</h3>
            <p className="text-sm text-muted-foreground mt-0.5">{template.title}</p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Board Name
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter board name..."
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 transition-colors"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {BOARD_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "size-8 rounded-lg transition-all cursor-pointer",
                    color === c && "ring-2 ring-offset-2 ring-offset-card ring-foreground/30 scale-110",
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-secondary text-foreground border border-border rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-secondary/80 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !title.trim()}
              className="flex-1 bg-primary text-primary-foreground rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-60"
            >
              {isPending ? "Creating..." : "Create Board"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

export default function TemplatesPage() {
  const { slug } = useParams<{ slug: string }>()
  const { data: templates, isLoading } = useTemplates()
  const [activeCategory, setActiveCategory] = useState("all")
  const [selectedTemplate, setSelectedTemplate] = useState<BoardTemplate | null>(null)
  const [aiPrompt, setAiPrompt] = useState("")
  const [generatedTemplate, setGeneratedTemplate] = useState<BoardTemplate | null>(null)
  const { mutate: generateTemplate, isPending: isGenerating } = useGenerateTemplate()

  const handleGenerate = () => {
    if (!aiPrompt.trim() || !slug) return
    generateTemplate(
      { prompt: aiPrompt.trim(), workspace_slug: slug },
      {
        onSuccess: (template) => {
          setGeneratedTemplate(template)
          setSelectedTemplate(template)
          setAiPrompt("")
        },
      },
    )
  }

  const filtered =
    activeCategory === "all"
      ? templates
      : templates?.filter((t) => t.category === activeCategory)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card/80 backdrop-blur px-6 py-3 flex items-center gap-4 border-b border-border/30"
      >
        <BackButton to={`/w/${slug}`} label="Workspace" />
        <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <LayoutTemplate className="size-4 text-primary" />
        </div>
        <h2 className="text-lg font-bold text-foreground">Templates</h2>
      </motion.div>

      {/* Category tabs */}
      <div className="border-b border-border/30 bg-card/60 px-6 py-2 flex items-center gap-1 overflow-x-auto">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setActiveCategory(cat.value)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors cursor-pointer",
              activeCategory === cat.value
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
            )}
          >
            {cat.icon && <cat.icon className="size-3.5" />}
            {cat.label}
          </button>
        ))}
      </div>

      {/* AI Generation Panel */}
      <div className="border-b border-border/30 bg-card/40 px-6 py-4">
        <div className="max-w-2xl flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Generate with AI</span>
            <span className="text-xs text-muted-foreground">Describe your project and AI will build a template</span>
          </div>
          <div className="flex gap-2">
            <input
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              placeholder="e.g. Bug tracker for a mobile app team..."
              className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 transition-colors"
            />
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !aiPrompt.trim()}
              className="flex items-center gap-2 bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-semibold hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-60 shrink-0"
            >
              {isGenerating ? (
                <>
                  <div className="size-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="size-3.5" />
                  Generate
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-40 rounded-2xl bg-secondary/40 animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {generatedTemplate && (
              <motion.div
                key="ai-generated"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-card border-2 border-primary/50 rounded-2xl p-5 flex flex-col gap-3 shadow-lg shadow-primary/10"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Sparkles className="size-3.5 text-primary shrink-0" />
                    <h3 className="font-semibold text-foreground leading-snug truncate">{generatedTemplate.title}</h3>
                  </div>
                  <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    AI
                  </span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed flex-1 line-clamp-3">
                  {generatedTemplate.description}
                </p>
                <button
                  onClick={() => setSelectedTemplate(generatedTemplate)}
                  className="ml-auto bg-primary text-primary-foreground rounded-lg px-3 py-1.5 text-xs font-semibold hover:bg-primary/90 transition-colors cursor-pointer"
                >
                  Use Template
                </button>
              </motion.div>
            )}
            {filtered?.map((template, idx) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-3 hover:border-primary/30 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-foreground leading-snug">{template.title}</h3>
                  <span
                    className={cn(
                      "shrink-0 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full",
                      CATEGORY_COLORS[template.category],
                    )}
                  >
                    {template.category}
                  </span>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed flex-1 line-clamp-3">
                  {template.description}
                </p>

                <div className="flex items-center justify-between gap-2">
                  {template.is_system && (
                    <span className="text-xs text-muted-foreground">
                      {template.use_count} uses
                    </span>
                  )}
                  <button
                    onClick={() => setSelectedTemplate(template)}
                    className="ml-auto bg-primary text-primary-foreground rounded-lg px-3 py-1.5 text-xs font-semibold hover:bg-primary/90 transition-colors cursor-pointer"
                  >
                    Use Template
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {!isLoading && filtered?.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <LayoutTemplate className="size-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">No templates in this category.</p>
          </div>
        )}
      </div>

      {/* Use Template Modal */}
      <AnimatePresence>
        {selectedTemplate && slug && (
          <UseTemplateModal
            template={selectedTemplate}
            slug={slug}
            onClose={() => setSelectedTemplate(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
