"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Zap,
  Play,
  Loader2,
  Shield,
  ShieldAlert,
  Droplets,
  Target,
  Award,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Gauge,
} from "lucide-react"
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  PolarAngleAxis,
} from "recharts"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import type { Jurisdiction, VerifyResponse } from "@/lib/types"
import { presetPortfolios, defaultThresholds } from "@/lib/sample-data"
import { verifyPortfolio } from "@/lib/api"
import { cn } from "@/lib/utils"

export function ModeQuickCheck() {
  const [selectedPreset, setSelectedPreset] = useState(
    presetPortfolios[0].id
  )
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction>("us-genius")
  const [isChecking, setIsChecking] = useState(false)
  const [result, setResult] = useState<VerifyResponse | null>(null)
  const [totalSupply, setTotalSupply] = useState("1000000")
  const [error, setError] = useState<string>("")

  const handleCheck = async () => {
    setIsChecking(true)
    setResult(null)
    setError("")
    const preset = presetPortfolios.find((p) => p.id === selectedPreset)
    if (!preset) return

    const thresholds = defaultThresholds[jurisdiction]

    try {
      const res = await verifyPortfolio(preset.portfolio, thresholds)
      setResult(res)
    } catch (err: any) {
      setResult(null)
      setError(`Verification failed: ${err?.message || "Unknown error"}. Please ensure the backend server is running on localhost:4000 and ACTUS server is accessible.`)
    } finally {
      setIsChecking(false)
    }
  }

  const handleReset = () => {
    setResult(null)
    setError("")
    setSelectedPreset(presetPortfolios[0].id)
    setJurisdiction("us-genius")
    setTotalSupply("1000000")
  }

  const riskLevel = result
    ? result.compliant
      ? "LOW"
      : Object.values(result.metrics).filter((m) => !m.pass).length >= 3
        ? "CRITICAL"
        : Object.values(result.metrics).filter((m) => !m.pass).length >= 2
          ? "HIGH"
          : "MEDIUM"
    : null

  const riskColors: Record<string, { text: string; bg: string }> = {
    LOW: { text: "text-success", bg: "bg-success" },
    MEDIUM: { text: "text-accent", bg: "bg-accent" },
    HIGH: { text: "text-destructive", bg: "bg-destructive" },
    CRITICAL: { text: "text-destructive", bg: "bg-destructive" },
  }

  return (
    <div className="mx-auto max-w-4xl">
      <AnimatePresence mode="wait">
        {!result ? (
          <motion.div
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col gap-6"
          >
            {/* Header */}
            <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Quick Compliance Check
                </h3>
                <p className="text-sm text-muted-foreground">
                  Instant verification against regulatory thresholds with
                  one-click analysis
                </p>
              </div>
            </div>

            {/* Configuration */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Portfolio Selection */}
              <div className="rounded-lg border border-border bg-card p-5">
                <h4 className="mb-4 text-sm font-semibold text-foreground">
                  Select Portfolio
                </h4>
                <div className="flex flex-col gap-2">
                  {presetPortfolios.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setSelectedPreset(preset.id)}
                      className={cn(
                        "flex items-center justify-between rounded-md border p-3 transition-colors",
                        selectedPreset === preset.id
                          ? "border-primary/50 bg-primary/10"
                          : "border-border hover:border-primary/30 hover:bg-secondary/50"
                      )}
                    >
                      <div className="text-left">
                        <p className="text-sm font-medium text-foreground">
                          {preset.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {preset.description}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "shrink-0 border-border font-mono",
                          selectedPreset === preset.id
                            ? "text-primary"
                            : "text-muted-foreground"
                        )}
                      >
                        {preset.totalValue}
                      </Badge>
                    </button>
                  ))}
                </div>
              </div>

              {/* Parameters */}
              <div className="flex flex-col gap-4">
                <div className="rounded-lg border border-border bg-card p-5">
                  <h4 className="mb-4 text-sm font-semibold text-foreground">
                    Parameters
                  </h4>

                  {/* Jurisdiction */}
                  <div className="mb-4">
                    <label className="mb-2 block text-xs text-muted-foreground">
                      Jurisdiction
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(
                        [
                          { key: "eu-mica" as const, label: "EU MiCA" },
                          { key: "us-genius" as const, label: "US GENIUS" },
                        ] as const
                      ).map((j) => (
                        <button
                          key={j.key}
                          type="button"
                          onClick={() => setJurisdiction(j.key)}
                          className={cn(
                            "rounded-md border py-2 text-sm font-medium transition-colors",
                            jurisdiction === j.key
                              ? "border-primary/50 bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {j.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Supply Input */}
                  <div>
                    <label className="mb-2 block text-xs text-muted-foreground">
                      Total Stablecoin Supply (USD)
                    </label>
                    <Input
                      value={totalSupply}
                      onChange={(e) =>
                        setTotalSupply(
                          e.target.value.replace(/[^0-9]/g, "")
                        )
                      }
                      className="bg-secondary font-mono text-sm text-foreground"
                      placeholder="1000000"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      $
                      {Number(totalSupply || 0).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Quick Thresholds View */}
                <div className="rounded-lg border border-border bg-card p-5">
                  <h4 className="mb-3 text-xs font-semibold text-muted-foreground">
                    Active Thresholds ({jurisdiction === "eu-mica" ? "EU MiCA" : "US GENIUS"})
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(defaultThresholds[jurisdiction]).map(
                      ([key, value]) => (
                        <div
                          key={key}
                          className="flex items-center justify-between rounded-md bg-secondary px-3 py-2"
                        >
                          <span className="text-xs capitalize text-muted-foreground">
                            {key.replace(/([A-Z])/g, " $1").trim()}
                          </span>
                          <span className="font-mono text-sm font-medium text-foreground">
                            {value}
                            {key !== "assetQuality" ? "%" : ""}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Run Button */}
            <Button
              size="lg"
              onClick={handleCheck}
              disabled={isChecking}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isChecking ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-5 w-5" />
                  Run Quick Check
                </>
              )}
            </Button>

            {/* Error Display */}
            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-6"
          >
            {/* Result Header */}
            <div
              className={cn(
                "relative overflow-hidden rounded-lg border p-6",
                result.compliant
                  ? "border-success/30 bg-success/5"
                  : "border-destructive/30 bg-destructive/5"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {result.compliant ? (
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/20">
                      <Shield className="h-7 w-7 text-success" />
                    </div>
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/20">
                      <ShieldAlert className="h-7 w-7 text-destructive" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-2xl font-bold text-foreground">
                      {result.compliant
                        ? "COMPLIANT"
                        : "NON-COMPLIANT"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Quick check completed at{" "}
                      {new Date(result.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {riskLevel && (
                    <Badge
                      className={cn(
                        "text-xs font-bold",
                        riskColors[riskLevel].bg,
                        riskLevel === "LOW"
                          ? "text-success-foreground"
                          : riskLevel === "MEDIUM"
                            ? "text-warning-foreground"
                            : "text-destructive-foreground"
                      )}
                    >
                      <Gauge className="mr-1 h-3 w-3" />
                      {riskLevel} RISK
                    </Badge>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReset}
                    className="border-border text-foreground bg-transparent"
                  >
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                    New Check
                  </Button>
                </div>
              </div>
            </div>

            {/* Quick Metric Gauges */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[
                {
                  key: "backingRatio" as const,
                  label: "Backing",
                  icon: Shield,
                  color: "hsl(160, 84%, 40%)",
                },
                {
                  key: "liquidityRatio" as const,
                  label: "Liquidity",
                  icon: Droplets,
                  color: "hsl(199, 89%, 48%)",
                },
                {
                  key: "concentrationRisk" as const,
                  label: "Concentration",
                  icon: Target,
                  color: "hsl(38, 92%, 50%)",
                },
                {
                  key: "assetQuality" as const,
                  label: "Quality",
                  icon: Award,
                  color: "hsl(262, 83%, 58%)",
                },
              ].map((item, i) => {
                const metric = result.metrics[item.key]
                return (
                  <motion.div
                    key={item.key}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="rounded-lg border border-border bg-card p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {item.label}
                      </span>
                      {metric.pass ? (
                        <TrendingUp className="h-3.5 w-3.5 text-success" />
                      ) : (
                        <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                      )}
                    </div>
                    <div className="flex h-28 items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadialBarChart
                          cx="50%"
                          cy="50%"
                          innerRadius="60%"
                          outerRadius="85%"
                          data={[
                            {
                              value: Math.min(
                                (metric.value / (metric.threshold * 1.5)) *
                                  100,
                                100
                              ),
                              fill: metric.pass
                                ? "hsl(160, 84%, 40%)"
                                : "hsl(0, 72%, 51%)",
                            },
                          ]}
                          startAngle={180}
                          endAngle={0}
                          barSize={8}
                        >
                          <PolarAngleAxis
                            type="number"
                            domain={[0, 100]}
                            tick={false}
                          />
                          <RadialBar
                            dataKey="value"
                            cornerRadius={10}
                            background={{ fill: "hsl(222, 30%, 14%)" }}
                          />
                        </RadialBarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-foreground">
                        {metric.value.toFixed(1)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        / {metric.threshold}
                      </p>
                    </div>
                  </motion.div>
                )
              })}
            </div>

            {/* Failures */}
            {result.failures.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-lg border border-destructive/20 bg-destructive/5 p-4"
              >
                <h4 className="mb-3 text-sm font-semibold text-foreground">
                  Issues Found
                </h4>
                <ul className="flex flex-col gap-2">
                  {result.failures.map((f, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
                      {f}
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
