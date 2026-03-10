"use client"

import React from "react"

import { motion } from "framer-motion"
import { CheckCircle2, XCircle, TrendingUp, TrendingDown } from "lucide-react"
import type { MetricResult } from "@/lib/types"
import { cn } from "@/lib/utils"

interface MetricCardProps {
  title: string
  metric: MetricResult
  unit?: string
  icon: React.ReactNode
  index?: number
}

export function MetricCard({
  title,
  metric,
  unit = "%",
  icon,
  index = 0,
}: MetricCardProps) {
  const percentage = Math.min((metric.value / metric.threshold) * 100, 150)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className={cn(
        "relative overflow-hidden rounded-lg border p-5",
        "bg-card",
        metric.pass
          ? "border-success/30"
          : "border-destructive/30"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-md",
              metric.pass
                ? "bg-success/10 text-success"
                : "bg-destructive/10 text-destructive"
            )}
          >
            {icon}
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              {title}
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {metric.value.toFixed(1)}
              </span>
              <span className="text-sm text-muted-foreground">{unit}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {metric.pass ? (
            <span className="flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
              <CheckCircle2 className="h-3.5 w-3.5" />
              PASS
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive">
              <XCircle className="h-3.5 w-3.5" />
              FAIL
            </span>
          )}
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Threshold: {metric.threshold}
            {unit}
          </span>
          <span className="flex items-center gap-1">
            {metric.pass ? (
              <TrendingUp className="h-3 w-3 text-success" />
            ) : (
              <TrendingDown className="h-3 w-3 text-destructive" />
            )}
            {(metric.value - metric.threshold).toFixed(1)}
            {unit}
          </span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(percentage, 100)}%` }}
            transition={{ delay: index * 0.1 + 0.3, duration: 0.8, ease: "easeOut" }}
            className={cn(
              "h-full rounded-full",
              metric.pass ? "bg-success" : "bg-destructive"
            )}
          />
        </div>
      </div>

      {metric.details && (
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          {metric.details}
        </p>
      )}
    </motion.div>
  )
}
