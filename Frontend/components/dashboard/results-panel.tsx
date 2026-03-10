"use client"

import { motion, AnimatePresence } from "framer-motion"
import {
  Shield,
  ShieldAlert,
  Droplets,
  Target,
  Award,
  AlertTriangle,
  Download,
  ChevronDown,
  ChevronUp,
  PieChart,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
} from "lucide-react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MetricCard } from "./metric-card"
import type { VerifyResponse } from "@/lib/types"
import { cn } from "@/lib/utils"

interface ResultsPanelProps {
  result: VerifyResponse
}

const CHART_COLORS = [
  "hsl(160, 84%, 40%)",
  "hsl(199, 89%, 48%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 72%, 51%)",
]

export function ResultsPanel({ result }: ResultsPanelProps) {
  const [showFailures, setShowFailures] = useState(true)
  const [showCashFlow, setShowCashFlow] = useState(true)

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(result, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `stablerisk-report-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Map backend response to component expectations
  const failures = result.summary?.failureReasons || []
  const metrics = {
    backingRatio: {
      value: result.summary?.backing?.average || 0,
      threshold: result.summary?.backing?.threshold || 100,
      pass: result.summary?.backing?.status === 'PASS',
    },
    liquidityRatio: {
      value: result.summary?.liquidity?.average || 0,
      threshold: result.summary?.liquidity?.threshold || 20,
      pass: result.summary?.liquidity?.status === 'PASS',
    },
    concentrationRisk: {
      value: result.summary?.concentration?.maximum || 0,
      threshold: result.summary?.concentration?.limit || 40,
      pass: result.summary?.concentration?.status === 'PASS',
    },
    assetQuality: {
      value: result.summary?.quality?.score || 0,
      threshold: result.summary?.quality?.threshold || 80,
      pass: result.summary?.quality?.status === 'PASS',
    },
  }

  // Generate period metrics from riskMetrics arrays
  const periodMetrics = result.riskMetrics?.backingRatios?.map((_, idx) => ({
    period: `Period ${idx + 1}`,
    backingRatio: result.riskMetrics.backingRatios[idx] || 0,
    liquidityRatio: result.riskMetrics.liquidityRatios[idx] || 0,
    concentrationRisk: result.riskMetrics.concentrationRisks[idx] || 0,
    assetQuality: result.riskMetrics.assetQualityScores[idx] || 0,
  })) || []

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col gap-6"
    >
      {/* Compliance Banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className={cn(
          "flex items-center justify-between rounded-lg border p-5",
          result.compliant
            ? "border-success/30 bg-success/5"
            : "border-destructive/30 bg-destructive/5"
        )}
      >
        <div className="flex items-center gap-3">
          {result.compliant ? (
            <Shield className="h-8 w-8 text-success" />
          ) : (
            <ShieldAlert className="h-8 w-8 text-destructive" />
          )}
          <div>
            <h3 className="text-lg font-bold text-foreground">
              {result.compliant ? "COMPLIANT" : "NON-COMPLIANT"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {result.compliant
                ? "All regulatory metrics within acceptable thresholds"
                : `${failures.length} metric(s) failed verification`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {result.jurisdiction && (
            <Badge variant="outline" className="border-border text-foreground">
              {result.jurisdiction === "eu-mica"
                ? "EU MiCA"
                : result.jurisdiction === "us-genius"
                  ? "US GENIUS"
                  : "Custom"}
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportJSON}
            className="bg-transparent border-border text-foreground hover:bg-secondary"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export JSON
          </Button>
        </div>
      </motion.div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <MetricCard
          title="Backing Ratio"
          metric={metrics.backingRatio}
          icon={<Shield className="h-4 w-4" />}
          index={0}
          unit="%"
        />
        <MetricCard
          title="Liquidity Ratio"
          metric={metrics.liquidityRatio}
          icon={<Droplets className="h-4 w-4" />}
          index={1}
          unit="%"
        />
        <MetricCard
          title="Concentration Risk"
          metric={metrics.concentrationRisk}
          icon={<Target className="h-4 w-4" />}
          unit="%"
          index={2}
        />
        <MetricCard
          title="Asset Quality"
          metric={metrics.assetQuality}
          icon={<Award className="h-4 w-4" />}
          unit=""
          index={3}
        />
      </div>

      {/* Failures Section */}
      <AnimatePresence>
        {failures.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden rounded-lg border border-destructive/20 bg-destructive/5"
          >
            <button
              type="button"
              onClick={() => setShowFailures(!showFailures)}
              className="flex w-full items-center justify-between p-4"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span className="text-sm font-semibold text-foreground">
                  Failure Details ({failures.length})
                </span>
              </div>
              {showFailures ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            <AnimatePresence>
              {showFailures && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="border-t border-destructive/20 px-4 pb-4"
                >
                  <ul className="mt-3 flex flex-col gap-2">
                    {failures.map((failure, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
                        {failure}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Charts */}
      {periodMetrics.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground">
              Metrics Over Time
            </h4>
          </div>

          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={periodMetrics}>
                <defs>
                  <linearGradient id="backingGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(160, 84%, 40%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(160, 84%, 40%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="liquidityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 20%, 16%)" />
                <XAxis
                  dataKey="period"
                  stroke="hsl(215, 20%, 55%)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="hsl(215, 20%, 55%)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(222, 44%, 8%)",
                    border: "1px solid hsl(222, 20%, 16%)",
                    borderRadius: "8px",
                    color: "hsl(210, 40%, 96%)",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="backingRatio"
                  stroke="hsl(160, 84%, 40%)"
                  fill="url(#backingGrad)"
                  strokeWidth={2}
                  name="Backing Ratio"
                />
                <Area
                  type="monotone"
                  dataKey="liquidityRatio"
                  stroke="hsl(199, 89%, 48%)"
                  fill="url(#liquidityGrad)"
                  strokeWidth={2}
                  name="Liquidity Ratio"
                />
                <Area
                  type="monotone"
                  dataKey="concentrationRisk"
                  stroke="hsl(38, 92%, 50%)"
                  fill="transparent"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Concentration Risk"
                />
                <Area
                  type="monotone"
                  dataKey="assetQuality"
                  stroke="hsl(262, 83%, 58%)"
                  fill="transparent"
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  name="Asset Quality"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Cash Flow Schedule */}
      {periodMetrics.length > 0 && (
        <div className="rounded-lg border border-border bg-card">
          <button
            type="button"
            onClick={() => setShowCashFlow(!showCashFlow)}
            className="flex w-full items-center justify-between p-4 border-b border-border"
          >
            <div className="flex items-center gap-2">
              <Droplets className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">
                Cash Flow Schedule
              </span>
            </div>
            {showCashFlow ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          <AnimatePresence>
            {showCashFlow && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4">
                  {/* Next Drips Alert */}
                  <div className="mb-4 rounded-lg bg-primary/5 border border-primary/20 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <h5 className="text-xs font-semibold text-foreground">Next Period Events</h5>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-3.5 w-3.5 text-success" />
                        <div>
                          <p className="text-xs text-muted-foreground">Backing Ratio</p>
                          <p className="text-sm font-bold text-foreground">
                            {periodMetrics[0]?.backingRatio?.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Droplets className="h-3.5 w-3.5 text-info" />
                        <div>
                          <p className="text-xs text-muted-foreground">Liquidity Available</p>
                          <p className="text-sm font-bold text-foreground">
                            {periodMetrics[0]?.liquidityRatio?.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Target className="h-3.5 w-3.5 text-warning" />
                        <div>
                          <p className="text-xs text-muted-foreground">Concentration</p>
                          <p className="text-sm font-bold text-foreground">
                            {periodMetrics[0]?.concentrationRisk?.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Cash Flow Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="pb-2 text-left text-xs font-medium text-muted-foreground">Period</th>
                          <th className="pb-2 text-right text-xs font-medium text-muted-foreground">Backing</th>
                          <th className="pb-2 text-right text-xs font-medium text-muted-foreground">Liquidity</th>
                          <th className="pb-2 text-right text-xs font-medium text-muted-foreground">Concentration</th>
                          <th className="pb-2 text-right text-xs font-medium text-muted-foreground">Quality</th>
                          <th className="pb-2 text-center text-xs font-medium text-muted-foreground">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {periodMetrics.map((period, idx) => {
                          const allPass = 
                            period.backingRatio >= metrics.backingRatio.threshold &&
                            period.liquidityRatio >= metrics.liquidityRatio.threshold &&
                            period.concentrationRisk <= metrics.concentrationRisk.threshold &&
                            period.assetQuality >= metrics.assetQuality.threshold
                          
                          return (
                            <tr key={idx} className="border-b border-border/50 hover:bg-secondary/50">
                              <td className="py-2 font-mono text-xs text-foreground">{period.period}</td>
                              <td className="py-2 text-right font-mono text-xs">
                                <span className={cn(
                                  period.backingRatio >= metrics.backingRatio.threshold
                                    ? "text-success"
                                    : "text-destructive"
                                )}>
                                  {period.backingRatio.toFixed(1)}%
                                </span>
                              </td>
                              <td className="py-2 text-right font-mono text-xs">
                                <span className={cn(
                                  period.liquidityRatio >= metrics.liquidityRatio.threshold
                                    ? "text-success"
                                    : "text-destructive"
                                )}>
                                  {period.liquidityRatio.toFixed(1)}%
                                </span>
                              </td>
                              <td className="py-2 text-right font-mono text-xs">
                                <span className={cn(
                                  period.concentrationRisk <= metrics.concentrationRisk.threshold
                                    ? "text-success"
                                    : "text-destructive"
                                )}>
                                  {period.concentrationRisk.toFixed(1)}%
                                </span>
                              </td>
                              <td className="py-2 text-right font-mono text-xs">
                                <span className={cn(
                                  period.assetQuality >= metrics.assetQuality.threshold
                                    ? "text-success"
                                    : "text-destructive"
                                )}>
                                  {period.assetQuality.toFixed(1)}
                                </span>
                              </td>
                              <td className="py-2 text-center">
                                {allPass ? (
                                  <span className="inline-flex items-center justify-center rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                                    ✓
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center justify-center rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                                    ✗
                                  </span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary Row */}
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg bg-secondary/50">
                    <div>
                      <p className="text-xs text-muted-foreground">Avg Backing</p>
                      <p className="text-sm font-bold text-foreground">
                        {metrics.backingRatio.value.toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Avg Liquidity</p>
                      <p className="text-sm font-bold text-foreground">
                        {metrics.liquidityRatio.value.toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Max Concentration</p>
                      <p className="text-sm font-bold text-foreground">
                        {metrics.concentrationRisk.value.toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Avg Quality</p>
                      <p className="text-sm font-bold text-foreground">
                        {metrics.assetQuality.value.toFixed(1)}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Summary Stats */}
      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border p-4">
          <h4 className="text-sm font-semibold text-foreground">
            Verification Summary
          </h4>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Portfolio ID</p>
              <p className="mt-1 font-mono text-sm font-medium text-foreground">
                {result.summary?.portfolioId || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Periods Analyzed</p>
              <p className="mt-1 font-mono text-sm font-medium text-foreground">
                {result.summary?.periodsAnalyzed || periodMetrics.length}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Timestamp</p>
              <p className="mt-1 font-mono text-sm font-medium text-foreground">
                {new Date(result.timestamp).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Overall Status</p>
              <p className={cn(
                "mt-1 text-sm font-bold",
                result.compliant ? "text-success" : "text-destructive"
              )}>
                {result.summary?.overallStatus || (result.compliant ? 'COMPLIANT' : 'NON-COMPLIANT')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
