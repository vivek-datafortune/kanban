import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"

interface BackButtonProps {
  to: string
  label?: string
  className?: string
}

export default function BackButton({ to, label = "Back", className }: BackButtonProps) {
  const navigate = useNavigate()

  return (
    <motion.button
      onClick={() => navigate(to)}
      className={cn(
        "group/back flex items-center gap-1.5 text-muted-foreground hover:text-foreground",
        "cursor-pointer rounded-lg px-2.5 py-1.5 -ml-2.5 hover:bg-secondary/60 transition-colors",
        className
      )}
      whileHover="hover"
      whileTap="tap"
    >
      <motion.span
        variants={{
          hover: { x: -3 },
          tap: { x: -5, scale: 0.95 },
        }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
      >
        <ArrowLeft className="size-[18px]" />
      </motion.span>
      <motion.span
        className="text-sm font-medium overflow-hidden"
        initial={{ width: 0, opacity: 0 }}
        variants={{
          hover: { width: "auto", opacity: 1 },
          tap: { width: "auto", opacity: 1 },
        }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        {label}
      </motion.span>
    </motion.button>
  )
}
