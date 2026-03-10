"use client"

import React, { useState, useCallback, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Upload,
  FileJson,
  X,
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronDown,
  Download,
  Clock,
  Zap,
  TrendingDown,
  DollarSign,
  Activity,
  BarChart3,
  Server,
} from "lucide-react"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type {
  StimulationListItem,
  StimulationResult,
  SimulationEvent,
  StimulationStepResult,
} from "@/lib/types"
import {
  getStimulations,
  runStimulation,
  runStimulationFromJson,
  getActusEnvironment,
} from "@/lib/api"
import { cn } from "@/lib/utils"

// ---- Helpers ----

function formatUSD(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1e9) return `$${(value / 1e9).toFixed(2)}B`
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(2)}M`
  if (abs >= 1e3) return `$${(value / 1e3).toFixed(1)}K`
  return `$${value.toFixed(0)}`
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function extractScenarioLabel(name: string): string {
  return name
    .replace("StableCoin-", "")
    .replace("-30d", "")
    .replace(/-/g, " ")
}

// ---- Main Component ----

export function ModeSimulation() {
  // State
  const [scenarios, setScenarios] = useState<StimulationListItem[]>([])
  const [selectedId, setSelectedId] = useState<string>("")
  const [uploadedJson, setUploadedJson] = useState<any>(null)
  const [uploadedName, setUploadedName] = useState("")
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<StimulationResult | null>(null)
  const [error, setError] = useState("")
  const [loadingScenarios, setLoadingScenarios] = useState(true)
  const [showRawJson, setShowRawJson] = useState(false)
  const [showSteps, setShowSteps] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const environment = getActusEnvironment()

  // Load scenarios on mount
  useEffect(() => {
    setLoadingScenarios(true)
    getStimulations()
      .then((data) => {
        setScenarios(data)
        setLoadingScenarios(false)
      })
      .catch(() => {
        setScenarios([])
        setLoadingScenarios(false)
      })
  }, [])

  // File upload handler
  const handleFile = useCallback((file: File) => {
    setError("")
    if (!file.name.endsWith(".json")) {
      setError("Please upload a Postman collection JSON file")
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string)
        if (parsed.info && parsed.item && Array.isArray(parsed.item)) {
          setUploadedJson(parsed)
          setUploadedName(file.name)
          setSelectedId("")
          setResult(null)
        } else {
          setError(
            "Invalid format. Expected a Postman collection with info and item[]."
          )
        }
      } catch {
        setError("Failed to parse JSON file")
      }
    }
    reader.readAsText(file)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0])
    },
    [handleFile]
  )

  const selectScenario = (id: string) => {
    setSelectedId(id)
    setUploadedJson(null)
    setUploadedName("")
    setResult(null)
    setError("")
  }

  const clearSelection = () => {
    setSelectedId("")
    setUploadedJson(null)
    setUploadedName("")
    setResult(null)
    setError("")
  }

  // Run simulation
  const handleRun = async () => {
    if (!selectedId && !uploadedJson) return
    setIsRunning(true)
    setError("")
    setResult(null)
    try {
      let res: StimulationResult
      if (uploadedJson) {
        // Uploaded collection — send raw JSON directly to backend
        res = await runStimulationFromJson(uploadedJson, environment)
      } else {
        // Preset scenario — send ID, backend loads from disk
        res = await runStimulation(selectedId, environment)
      }
      setResult(res)
    } catch (err: any) {
      setError(
        err?.message ||
          "Simulation failed. Is the backend running on localhost:4000?"
      )
    } finally {
      setIsRunning(false)
    }
  }

  // Export
  const handleExport = () => {
    if (!result) return
    const blob = new Blob([JSON.stringify(result, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `simulation-${result.scenarioName}-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Extract events for charts
  const events: SimulationEvent[] =
    result?.simulation?.[0]?.events || []

  const hasSelection = !!selectedId || !!uploadedJson
  const selectedScenario = scenarios.find((s) => s.id === selectedId)

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* ============ LEFT PANEL ============ */}
      <div className="flex w-full flex-col gap-4 lg:w-80 lg:shrink-0">
        {/* Environment Badge */}
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3">
          <Server className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Environment</span>
          <Badge
            variant="outline"
            className={cn(
              "ml-auto font-mono text-xs",
              environment === "localhost"
                ? "border-primary/40 text-primary"
                : "border-accent/40 text-accent"
            )}
          >
            {environment}
          </Badge>
        </div>

        {/* Scenario Picker */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            Stress Scenarios
          </h3>
          {loadingScenarios ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : scenarios.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              No scenarios found. Is the backend running?
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {scenarios.map((sc) => (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => selectScenario(sc.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-all",
                    selectedId === sc.id
                      ? "border-primary/50 bg-primary/10"
                      : "border-transparent hover:border-border hover:bg-secondary/50"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                      selectedId === sc.id
                        ? "bg-primary/20 text-primary"
                        : "bg-secondary text-muted-foreground"
                    )}
                  >
                    <Zap className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {extractScenarioLabel(sc.name)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {sc.stepsCount} steps
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* File Upload */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            Or Upload Collection
          </h3>
          <div
            role="button"
            tabIndex={0}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ")
                fileInputRef.current?.click()
            }}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-5 transition-colors",
              uploadedJson
                ? "border-primary/30 bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-secondary/50"
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handleFile(e.target.files[0])
              }}
            />
            {uploadedJson ? (
              <div className="flex flex-col items-center gap-1.5 text-center">
                <FileJson className="h-6 w-6 text-primary" />
                <p className="text-xs font-medium text-foreground">
                  {uploadedName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {uploadedJson.item?.length || 0} steps
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    clearSelection()
                  }}
                  className="mt-1 text-xs text-muted-foreground hover:text-destructive"
                >
                  <X className="inline h-3 w-3" /> Clear
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5 text-center">
                <Upload className="h-6 w-6 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  Drop Postman JSON
                </p>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}

        {/* Run Button */}
        <Button
          size="lg"
          onClick={handleRun}
          disabled={!hasSelection || isRunning}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {isRunning ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Running Simulation...
            </>
          ) : (
            <>
              <Play className="mr-2 h-5 w-5" />
              Run Simulation
            </>
          )}
        </Button>
      </div>

      {/* ============ MAIN AREA ============ */}
      <div className="flex min-w-0 flex-1 flex-col gap-5">
        {/* Empty state */}
        {!result && !isRunning && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20">
            <Activity className="mb-4 h-12 w-12 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">
              Select a scenario and click Run
            </p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              Behavioral risk simulation results will appear here
            </p>
          </div>
        )}

        {/* Running state */}
        {isRunning && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-primary/20 bg-primary/5 py-20">
            <Loader2 className="mb-4 h-10 w-10 animate-spin text-primary" />
            <p className="text-sm font-medium text-foreground">
              Executing pipeline...
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Loading risk factors → Running ACTUS simulation
            </p>
          </div>
        )}

        {/* ====== RESULTS ====== */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col gap-5"
            >
              {/* Success / Fail Banner */}
              <div
                className={cn(
                  "flex items-center justify-between rounded-lg border p-4",
                  result.success
                    ? "border-primary/30 bg-primary/5"
                    : "border-destructive/30 bg-destructive/5"
                )}
              >
                <div className="flex items-center gap-3">
                  {result.success ? (
                    <CheckCircle2 className="h-7 w-7 text-primary" />
                  ) : (
                    <XCircle className="h-7 w-7 text-destructive" />
                  )}
                  <div>
                    <h3 className="text-base font-bold text-foreground">
                      {result.scenarioName
                        ? extractScenarioLabel(result.scenarioName)
                        : "Simulation"}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {result.success
                        ? `Completed in ${result.totalDurationMs}ms • ${events.length} events generated`
                        : "Simulation failed — check pipeline steps below"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="font-mono text-xs border-border text-muted-foreground"
                  >
                    {result.environment}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExport}
                    className="bg-transparent border-border text-foreground hover:bg-secondary"
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                    Export
                  </Button>
                </div>
              </div>

              {/* Summary Cards */}
              {events.length > 0 && <SummaryCards events={events} />}

              {/* Chart 1: Nominal Value Over Time */}
              {events.length > 0 && (
                <NominalValueChart events={events} />
              )}

              {/* Chart 2: Daily Payoffs */}
              {events.length > 0 && <PayoffBarChart events={events} />}

              {/* Chart 3: Cumulative Redemptions */}
              {events.length > 0 && (
                <CumulativeRedemptionChart events={events} />
              )}

              {/* Pipeline Steps */}
              <PipelineSteps
                steps={result.steps}
                show={showSteps}
                onToggle={() => setShowSteps(!showSteps)}
              />

              {/* Raw JSON */}
              <div className="rounded-lg border border-border bg-card">
                <button
                  type="button"
                  onClick={() => setShowRawJson(!showRawJson)}
                  className="flex w-full items-center justify-between p-4"
                >
                  <span className="text-sm font-semibold text-foreground">
                    Raw JSON Response
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform",
                      showRawJson && "rotate-180"
                    )}
                  />
                </button>
                <AnimatePresence>
                  {showRawJson && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden border-t border-border"
                    >
                      <pre className="scrollbar-thin max-h-96 overflow-auto p-4 font-mono text-xs text-muted-foreground">
                        {JSON.stringify(result, null, 2)}
                      </pre>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ---- Summary Cards ----

function SummaryCards({ events }: { events: SimulationEvent[] }) {
  const firstEvent = events[0]
  const lastEvent = events[events.length - 1]
  const startingSupply = firstEvent?.nominalValue || 0
  const endingSupply =
    lastEvent?.type === "MD"
      ? events[events.length - 2]?.nominalValue || 0
      : lastEvent?.nominalValue || 0
  const totalRedeemed = startingSupply - endingSupply
  const reductionPct =
    startingSupply > 0 ? (totalRedeemed / startingSupply) * 100 : 0

  const negativePayoffs = events.filter((e) => e.payoff < 0)
  const peakDailyRedemption =
    negativePayoffs.length > 0
      ? Math.min(...negativePayoffs.map((e) => e.payoff))
      : 0

  const cards = [
    {
      label: "Starting Supply",
      value: formatUSD(startingSupply),
      icon: DollarSign,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Ending Supply",
      value: formatUSD(endingSupply),
      icon: TrendingDown,
      color: "text-accent",
      bg: "bg-accent/10",
    },
    {
      label: "Total Redeemed",
      value: formatUSD(totalRedeemed),
      sub: `${reductionPct.toFixed(1)}% supply reduction`,
      icon: BarChart3,
      color: "text-destructive",
      bg: "bg-destructive/10",
    },
    {
      label: "Peak Daily Redemption",
      value: formatUSD(Math.abs(peakDailyRedemption)),
      icon: Zap,
      color: "text-warning",
      bg: "bg-warning/10",
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((c, i) => (
        <motion.div
          key={c.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08, duration: 0.3 }}
          className="rounded-lg border border-border bg-card p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className={cn("flex h-7 w-7 items-center justify-center rounded-md", c.bg)}>
              <c.icon className={cn("h-3.5 w-3.5", c.color)} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{c.label}</p>
          <p className="mt-0.5 text-lg font-bold tracking-tight text-foreground">
            {c.value}
          </p>
          {c.sub && (
            <p className="mt-0.5 text-xs text-destructive">{c.sub}</p>
          )}
        </motion.div>
      ))}
    </div>
  )
}

// ---- Chart 1: Nominal Value Area Chart ----

function NominalValueChart({ events }: { events: SimulationEvent[] }) {
  const data = events
    .filter((e) => e.nominalValue !== undefined)
    .map((e) => ({
      date: formatDate(e.time),
      nominalValue: e.nominalValue,
      type: e.type,
    }))

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-lg border border-border bg-card p-5"
    >
      <h4 className="mb-1 text-sm font-semibold text-foreground">
        Outstanding Supply Over Time
      </h4>
      <p className="mb-4 text-xs text-muted-foreground">
        Stablecoin nominal value declining under behavioral stress
      </p>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="nomGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(160, 84%, 40%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(160, 84%, 40%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 20%, 16%)" />
            <XAxis
              dataKey="date"
              stroke="hsl(215, 20%, 55%)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="hsl(215, 20%, 55%)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => formatUSD(v)}
              width={70}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(222, 44%, 8%)",
                border: "1px solid hsl(222, 20%, 16%)",
                borderRadius: "8px",
                color: "hsl(210, 40%, 96%)",
                fontSize: "12px",
              }}
              formatter={(value: any) => [formatUSD(Number(value)), "Nominal Value"]}
              labelFormatter={(label: any) => String(label)}
            />
            <Area
              type="monotone"
              dataKey="nominalValue"
              stroke="hsl(160, 84%, 40%)"
              fill="url(#nomGrad)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  )
}

// ---- Chart 2: Payoff Bar Chart ----

function PayoffBarChart({ events }: { events: SimulationEvent[] }) {
  const data = events.map((e) => ({
    date: formatDate(e.time),
    payoff: e.payoff,
    type: e.type,
  }))

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="rounded-lg border border-border bg-card p-5"
    >
      <h4 className="mb-1 text-sm font-semibold text-foreground">
        Daily Cash Flows (Payoffs)
      </h4>
      <p className="mb-4 text-xs text-muted-foreground">
        Positive = inflows, Negative = redemption outflows
      </p>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 20%, 16%)" />
            <XAxis
              dataKey="date"
              stroke="hsl(215, 20%, 55%)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="hsl(215, 20%, 55%)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => formatUSD(v)}
              width={70}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(222, 44%, 8%)",
                border: "1px solid hsl(222, 20%, 16%)",
                borderRadius: "8px",
                color: "hsl(210, 40%, 96%)",
                fontSize: "12px",
              }}
              formatter={(value: any) => [formatUSD(Number(value)), "Payoff"]}
            />
            <ReferenceLine y={0} stroke="hsl(215, 20%, 35%)" />
            <Bar dataKey="payoff" radius={[2, 2, 0, 0]}>
              {data.map((entry, idx) => (
                <Cell
                  key={idx}
                  fill={
                    entry.payoff >= 0
                      ? "hsl(160, 84%, 40%)"
                      : "hsl(0, 72%, 51%)"
                  }
                  fillOpacity={0.8}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  )
}

// ---- Chart 3: Cumulative Redemptions Line ----

function CumulativeRedemptionChart({ events }: { events: SimulationEvent[] }) {
  let cumulative = 0
  const data = events
    .filter((e) => e.payoff < 0)
    .map((e) => {
      cumulative += Math.abs(e.payoff)
      return {
        date: formatDate(e.time),
        cumulative,
        type: e.type,
      }
    })

  if (data.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="rounded-lg border border-border bg-card p-5"
    >
      <h4 className="mb-1 text-sm font-semibold text-foreground">
        Cumulative Redemptions
      </h4>
      <p className="mb-4 text-xs text-muted-foreground">
        Total outflows accumulating over the stress period — steep = panic,
        gentle = orderly
      </p>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 20%, 16%)" />
            <XAxis
              dataKey="date"
              stroke="hsl(215, 20%, 55%)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="hsl(215, 20%, 55%)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => formatUSD(v)}
              width={70}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(222, 44%, 8%)",
                border: "1px solid hsl(222, 20%, 16%)",
                borderRadius: "8px",
                color: "hsl(210, 40%, 96%)",
                fontSize: "12px",
              }}
              formatter={(value: any) => [
                formatUSD(Number(value)),
                "Total Redeemed",
              ]}
            />
            <Line
              type="monotone"
              dataKey="cumulative"
              stroke="hsl(0, 72%, 51%)"
              strokeWidth={2.5}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  )
}

// ---- Pipeline Steps ----

function PipelineSteps({
  steps,
  show,
  onToggle,
}: {
  steps: StimulationStepResult[]
  show: boolean
  onToggle: () => void
}) {
  const successCount = steps.filter((s) => s.status === "success").length

  return (
    <div className="rounded-lg border border-border bg-card">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between p-4"
      >
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">
            Pipeline Steps
          </span>
          <Badge
            variant="outline"
            className="font-mono text-xs border-border text-muted-foreground"
          >
            {successCount}/{steps.length} passed
          </Badge>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            show && "rotate-180"
          )}
        />
      </button>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t border-border"
          >
            <div className="p-4 space-y-2">
              {steps.map((step) => (
                <div
                  key={step.step}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm",
                    step.status === "success"
                      ? "bg-primary/5"
                      : "bg-destructive/5"
                  )}
                >
                  {step.status === "success" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                  ) : (
                    <XCircle className="h-4 w-4 shrink-0 text-destructive" />
                  )}
                  <span className="flex-1 truncate font-medium text-foreground">
                    {step.name}
                  </span>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">
                    {step.durationMs}ms
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "shrink-0 font-mono text-xs",
                      step.status === "success"
                        ? "border-primary/30 text-primary"
                        : "border-destructive/30 text-destructive"
                    )}
                  >
                    {step.httpStatus || "ERR"}
                  </Badge>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
