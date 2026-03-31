import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { useCreateWorkspace } from "@/hooks/use-workspaces"

export default function CreateWorkspacePage() {
  const navigate = useNavigate()
  const { mutate: create, isPending } = useCreateWorkspace()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    create(
      { name: name.trim(), description: description.trim() },
      { onSuccess: (ws) => navigate(`/w/${ws.slug}`) }
    )
  }

  return (
    <div className="p-8 max-w-lg mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-2xl font-bold text-foreground mb-6">Create Workspace</h2>

        <form onSubmit={handleSubmit} className="glass-strong rounded-2xl p-6 space-y-5">
          <div>
            <label htmlFor="ws-name" className="block text-sm font-semibold text-foreground mb-2">
              Workspace Name
            </label>
            <input
              id="ws-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Team"
              className="w-full text-foreground rounded-lg px-4 py-3 bg-secondary border border-border
                         placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              autoFocus
              required
            />
          </div>

          <div>
            <label htmlFor="ws-desc" className="block text-sm font-semibold text-foreground mb-2">
              Description <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <textarea
              id="ws-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this workspace for?"
              rows={3}
              className="w-full text-foreground rounded-lg px-4 py-3 bg-secondary border border-border
                         placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isPending || !name.trim()}
              className="bg-primary text-primary-foreground rounded-lg px-6 py-3 font-semibold
                         hover:bg-primary/90 transition-colors
                         disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              {isPending ? "Creating..." : "Create Workspace"}
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="text-foreground rounded-lg px-6 py-3 font-semibold bg-secondary hover:bg-secondary/80
                         border border-border transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
