import { useState } from "react"
import { useParams } from "react-router-dom"
import { motion } from "framer-motion"
import { BarChart2, Clock, Users, Tag, ChevronDown, Check } from "lucide-react"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts"

import BackButton from "@/components/ui/back-button"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { useAnalytics } from "@/hooks/use-analytics"
import { useBoards } from "@/hooks/use-boards"
import { cn } from "@/lib/utils"

type Period = "7d" | "30d" | "90d"

function formatSeconds(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function formatWeek(isoString: string): string {
  const d = new Date(isoString)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export default function AnalyticsPage() {
  const { slug } = useParams<{ slug: string }>()
  const [period, setPeriod] = useState<Period>("30d")
  const [boardId, setBoardId] = useState<string | undefined>()

  const { data: boards } = useBoards(slug!)
  const { data: analytics, isLoading } = useAnalytics(slug!, period, boardId)

  // Merge velocity created + completed into unified dataset by week
  const velocityData = (() => {
    if (!analytics) return []
    const map = new Map<string, { week: string; created: number; completed: number }>()
    for (const pt of analytics.velocity.created) {
      map.set(pt.week, { week: formatWeek(pt.week), created: pt.count, completed: 0 })
    }
    for (const pt of analytics.velocity.completed) {
      const existing = map.get(pt.week)
      if (existing) {
        existing.completed = pt.count
      } else {
        map.set(pt.week, { week: formatWeek(pt.week), created: 0, completed: pt.count })
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(a.week).getTime() - new Date(b.week).getTime(),
    )
  })()

  const labelData = analytics?.label_distribution.map((l) => ({
    name: l.label__name,
    count: l.count,
    color: l.label__color,
  }))

  const workload = [...(analytics?.workload ?? [])].sort((a, b) => b.assigned - a.assigned)

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
          <BarChart2 className="size-4 text-primary" />
        </div>
        <h2 className="text-lg font-bold text-foreground">Analytics</h2>

        <div className="ml-auto flex items-center gap-3">
          {/* Board filter */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground hover:bg-secondary/80 transition-colors">
              <span>{boards?.find((b) => b.id === boardId)?.title ?? "All Boards"}</span>
              <ChevronDown className="size-3.5 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setBoardId(undefined)}>
                <Check className={cn("size-3.5 shrink-0", boardId === undefined ? "opacity-100" : "opacity-0")} />
                All Boards
              </DropdownMenuItem>
              {boards?.map((b) => (
                <DropdownMenuItem key={b.id} onClick={() => setBoardId(b.id)}>
                  <Check className={cn("size-3.5 shrink-0", boardId === b.id ? "opacity-100" : "opacity-0")} />
                  {b.title}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Period selector */}
          <div className="flex items-center bg-secondary/60 border border-border rounded-lg p-1 gap-1">
            {(["7d", "30d", "90d"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer",
                  period === p
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-64 rounded-2xl bg-secondary/40 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Velocity Chart — full width */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-2xl p-5"
            >
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 className="size-4 text-primary" />
                <h3 className="font-semibold text-foreground">Velocity</h3>
                <span className="text-xs text-muted-foreground ml-1">Cards created vs completed per week</span>
              </div>
              {velocityData.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                  No data for this period
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={velocityData}>
                    <XAxis
                      dataKey="week"
                      tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--color-card)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="created"
                      stroke="#6366f1"
                      strokeWidth={2}
                      dot={false}
                      name="Created"
                    />
                    <Line
                      type="monotone"
                      dataKey="completed"
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={false}
                      name="Completed"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Workload Table */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="bg-card border border-border rounded-2xl p-5"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Users className="size-4 text-primary" />
                  <h3 className="font-semibold text-foreground">Workload</h3>
                </div>
                {workload.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                    No assigned cards
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-muted-foreground border-b border-border">
                          <th className="pb-2 font-medium">Member</th>
                          <th className="pb-2 font-medium text-right">Assigned</th>
                          <th className="pb-2 font-medium text-right">Done</th>
                          <th className="pb-2 font-medium text-right">Overdue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {workload.map((m) => (
                          <tr key={m.user_id} className="border-b border-border/40 last:border-0">
                            <td className="py-2.5 text-foreground">
                              <div className="flex items-center gap-2">
                                <div className="size-6 rounded-md bg-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                                  {(m.first_name?.[0] || m.email[0]).toUpperCase()}
                                </div>
                                <span className="truncate max-w-[120px]">
                                  {m.first_name || m.email}
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5 text-right font-medium">{m.assigned}</td>
                            <td className="py-2.5 text-right text-green-500">{m.completed}</td>
                            <td className="py-2.5 text-right text-red-500">{m.overdue}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </motion.div>

              {/* Label Distribution */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-card border border-border rounded-2xl p-5"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Tag className="size-4 text-primary" />
                  <h3 className="font-semibold text-foreground">Label Distribution</h3>
                </div>
                {!labelData || labelData.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                    No labels used
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={labelData} layout="vertical">
                      <XAxis
                        type="number"
                        tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
                        axisLine={false}
                        tickLine={false}
                        width={80}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--color-card)",
                          border: "1px solid var(--color-border)",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]} name="Cards">
                        {labelData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </motion.div>
            </div>

            {/* Time Summary */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-card border border-border rounded-2xl p-5 flex items-center gap-5"
            >
              <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Clock className="size-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Time Logged</p>
                <p className="text-3xl font-bold text-foreground mt-0.5">
                  {formatSeconds(analytics?.time_summary.total_seconds ?? 0)}
                </p>
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  )
}
