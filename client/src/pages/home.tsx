import { motion } from "framer-motion"
import { Layers, ArrowRight } from "lucide-react"
import { Link } from "react-router-dom"
import { useWorkspaces } from "@/hooks/use-workspaces"

export default function HomePage() {
  const { data: workspaces, isLoading } = useWorkspaces()

  return (
    <div className="p-8">
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="text-2xl font-bold text-foreground mb-6"
      >
        Your Workspaces
      </motion.h2>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="rounded-2xl glass-sm p-6 h-32 animate-pulse"
            />
          ))}
        </div>
      ) : workspaces && workspaces.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workspaces.map((ws, i) => (
            <motion.div
              key={ws.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.1 + i * 0.06, ease: [0.25, 0.46, 0.45, 0.94] }}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
            >
              <Link
                to={`/w/${ws.slug}`}
                className="block rounded-2xl glass-sm p-6 transition-shadow duration-200 group hover:shadow-md"
              >
                  <div className="flex items-start justify-between">
                    <div className="rounded-xl p-3 bg-primary/10">
                      <Layers className="size-5 text-primary" strokeWidth={2} />
                    </div>
                    <ArrowRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-2" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mt-4">{ws.name}</h3>
                  {ws.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {ws.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                    <span className="capitalize rounded-lg px-2 py-1 bg-secondary text-xs">
                      {ws.role}
                    </span>
                    <span>{ws.member_count} member{ws.member_count !== 1 ? "s" : ""}</span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="glass-strong rounded-3xl p-10 text-center"
          >
            <div className="rounded-2xl p-4 bg-primary/10 inline-block mb-4">
              <Layers className="size-8 text-primary" strokeWidth={2} />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">No workspaces yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first workspace to start organizing your projects.
            </p>
            <Link
              to="/create-workspace"
              className="inline-flex bg-primary text-primary-foreground rounded-lg px-6 py-3 font-semibold
                         hover:bg-primary/90 transition-colors cursor-pointer"
            >
              Create Workspace
            </Link>
          </motion.div>
        )}
    </div>
  )
}
