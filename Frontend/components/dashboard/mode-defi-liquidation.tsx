"use client"

/**
 * ModeDefiLiquidation
 * ===================
 * DeFi Liquidation & Collateral Risk simulation tab.
 *
 * Connects to the SAME backend endpoint as mode-simulation:
 *   POST /api/stimulation/run  { collectionJson | stimulationId, environment }
 *
 * Filters scenarios to only `defi-liquidity-collateral*` categories.
 *
 * DeFi-specific charts rendered from ACTUS simulation events:
 *   1. Outstanding Loan (nominal value declining via PP + PR events)
 *   2. Behavioral Prepayments (PP events — HF / velocity-triggered)
 *   3. Borrow Rate Evolution (RR events — floating rate over time)
 *   4. Cumulative Principal Repaid (running sum of |PP| + |PR| payoffs)
 *   5. Event Type Distribution (count per type)
 *
 * No mocks, no fallbacks. Real server responses only.
 */

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
  Activity,
  Server,
  Zap,
  AlertTriangle,
  TrendingDown,
  DollarSign,
  Percent,
  BarChart3,
  Shield,
  Waves,
  FlameKindling,
  Clock,
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
  PieChart,
  Pie,
  Legend,
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatUSD(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1e9) return `$${(value / 1e9).toFixed(2)}B`
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(2)}M`
  if (abs >= 1e3) return `$${(value / 1e3).toFixed(1)}K`
  return `$${value.toFixed(2)}`
}

function formatPct(v: number): string {
  return `${(v * 100).toFixed(2)}%`
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function defiLabel(name: string): string {
  return name
    .replace(/^(defi-liquidity-collateral-\d+\/)?/, "")
    .replace(/\.json$/, "")
    .replace(/DeFi-|ETH-Liq-Coll\d+-/, "")
    .replace(/-/g, " ")
}

// DeFi category filter — only show defi-liquidity-collateral-* categories
const DEFI_CATEGORY_PREFIX = "defi-liquidity-collateral"

// ─── Event classification ─────────────────────────────────────────────────────

const EVENT_META: Record<string, { label: string; color: string; hex: string }> = {
  AD:   { label: "Status Update",     color: "text-muted-foreground",        hex: "hsl(215,20%,55%)" },
  IED:  { label: "Initial Exchange",  color: "text-sky-400",                  hex: "hsl(199,89%,48%)" },
  PR:   { label: "Principal Payment", color: "text-amber-400",                hex: "hsl(38,92%,50%)"  },
  PP:   { label: "Behavioral Repay",  color: "text-orange-400",               hex: "hsl(24,95%,53%)"  },
  RR:   { label: "Rate Reset",        color: "text-violet-400",               hex: "hsl(262,83%,58%)" },
  IP:   { label: "Interest Payment",  color: "text-sky-300",                  hex: "hsl(199,89%,60%)" },
  MD:   { label: "Maturity",          color: "text-emerald-400",              hex: "hsl(160,84%,40%)" },
  TD:   { label: "Termination",       color: "text-destructive",              hex: "hsl(0,72%,51%)"   },
  IPCI: { label: "Interest Compound", color: "text-violet-300",               hex: "hsl(262,83%,68%)" },
  PRF:  { label: "Principal Fixed",   color: "text-amber-300",                hex: "hsl(38,92%,60%)"  },
}

const RISK_COLORS = {
  safe:     "hsl(160,84%,40%)",   // green
  warning:  "hsl(38,92%,50%)",    // amber
  danger:   "hsl(24,95%,53%)",    // orange
  critical: "hsl(0,72%,51%)",     // red
}

const TOOLTIP_STYLE = {
  backgroundColor: "hsl(222,44%,8%)",
  border: "1px solid hsl(222,20%,16%)",
  borderRadius: "8px",
  color: "hsl(210,40%,96%)",
  fontSize: "12px",
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ModeDefiLiquidation() {
  const [allScenarios, setAllScenarios] = useState<StimulationListItem[]>([])
  const [selectedId, setSelectedId]   = useState("")
  const [uploadedJson, setUploadedJson] = useState<any>(null)
  const [uploadedName, setUploadedName] = useState("")
  const [isRunning, setIsRunning]      = useState(false)
  const [result, setResult]            = useState<StimulationResult | null>(null)
  const [error, setError]              = useState("")
  const [loading, setLoading]          = useState(true)
  const [showSteps, setShowSteps]      = useState(false)
  const [showRaw, setShowRaw]          = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const environment = getActusEnvironment()

  // Load and filter DeFi scenarios
  useEffect(() => {
    setLoading(true)
    getStimulations()
      .then((data) => {
        const defi = data.filter((s) =>
          s.category.startsWith(DEFI_CATEGORY_PREFIX)
        )
        setAllScenarios(defi)
        setLoading(false)
      })
      .catch(() => {
        setAllScenarios([])
        setLoading(false)
      })
  }, [])

  // File upload handler — accepts Postman DeFi collection JSONs
  const handleFile = useCallback((file: File) => {
    setError("")
    if (!file.name.endsWith(".json")) {
      setError("Please upload a Postman collection JSON file (.json)")
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
          setError("Invalid Postman collection: must have info and item[] fields")
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

  const clearAll = () => {
    setSelectedId("")
    setUploadedJson(null)
    setUploadedName("")
    setResult(null)
    setError("")
  }

  // Run DeFi simulation via backend
  const handleRun = async () => {
    if (!selectedId && !uploadedJson) return
    setIsRunning(true)
    setError("")
    setResult(null)
    try {
      let res: StimulationResult
      if (uploadedJson) {
        res = await runStimulationFromJson(uploadedJson, environment)
      } else {
        res = await runStimulation(selectedId, environment)
      }
      setResult(res)
    } catch (err: any) {
      setError(
        err?.message || "Simulation failed. Is the backend running on localhost:4000?"
      )
    } finally {
      setIsRunning(false)
    }
  }

  // Export results
  const handleExport = () => {
    if (!result) return
    const blob = new Blob([JSON.stringify(result, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `defi-liquidation-${result.scenarioName.replace(/\s+/g, "-")}-${
      new Date().toISOString().slice(0, 10)
    }.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Extract events from the first contract in simulation array
  const events: SimulationEvent[] =
    result?.simulation?.[0]?.events || []

  const hasSelection = !!selectedId || !!uploadedJson

  // Group scenarios by sub-category for display
  const scenariosByCategory = allScenarios.reduce<Record<string, StimulationListItem[]>>(
    (acc, sc) => {
      const cat = sc.category
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(sc)
      return acc
    },
    {}
  )

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* ═══════════════ LEFT PANEL ═══════════════ */}
      <div className="flex w-full flex-col gap-4 lg:w-[300px] lg:shrink-0">

        {/* Environment */}
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3">
          <Server className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Environment</span>
          <Badge
            variant="outline"
            className={cn(
              "ml-auto font-mono text-xs",
              environment === "localhost"
                ? "border-amber-500/40 text-amber-400"
                : "border-sky-500/40 text-sky-400"
            )}
          >
            {environment}
          </Badge>
        </div>

        {/* DeFi Scenario Picker */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <FlameKindling className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-foreground">
              DeFi Liquidation Scenarios
            </h3>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : allScenarios.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              No DeFi scenarios found. Is the backend running?
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {Object.entries(scenariosByCategory).map(([cat, items]) => (
                <div key={cat}>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                    {cat.replace("defi-liquidity-collateral-", "Set ")}
                  </p>
                  <div className="flex flex-col gap-1">
                    {items.map((sc) => (
                      <button
                        key={sc.id}
                        type="button"
                        onClick={() => selectScenario(sc.id)}
                        className={cn(
                          "flex items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-all",
                          selectedId === sc.id
                            ? "border-amber-500/50 bg-amber-500/10"
                            : "border-transparent hover:border-border hover:bg-secondary/50"
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-bold",
                            selectedId === sc.id
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-secondary text-muted-foreground"
                          )}
                        >
                          <Zap className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-foreground">
                            {defiLabel(sc.name)}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {sc.stepsCount} steps
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* File Upload */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            Or Upload DeFi Collection
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
                ? "border-amber-500/30 bg-amber-500/5"
                : "border-border hover:border-amber-500/40 hover:bg-secondary/50"
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
                <FileJson className="h-6 w-6 text-amber-400" />
                <p className="text-xs font-medium text-foreground">{uploadedName}</p>
                <p className="text-[10px] text-muted-foreground">
                  {uploadedJson.item?.length || 0} steps
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    clearAll()
                  }}
                  className="mt-1 text-[10px] text-muted-foreground hover:text-destructive"
                >
                  <X className="inline h-3 w-3" /> Clear
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5 text-center">
                <Upload className="h-6 w-6 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  Drop DeFi Postman JSON
                </p>
                <p className="text-[10px] text-muted-foreground/60">
                  ETH-Liq-Coll, DeFi-HealthFactor, etc.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}

        {/* Run Button */}
        <Button
          size="lg"
          onClick={handleRun}
          disabled={!hasSelection || isRunning}
          className="w-full bg-amber-500 text-amber-950 hover:bg-amber-400 disabled:opacity-40"
        >
          {isRunning ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Running DeFi Simulation...
            </>
          ) : (
            <>
              <Play className="mr-2 h-5 w-5" />
              Run DeFi Simulation
            </>
          )}
        </Button>

        {/* Legend */}
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Event Types
          </p>
          <div className="flex flex-col gap-1.5">
            {(["PP", "RR", "PR", "IP", "MD"] as const).map((type) => {
              const meta = EVENT_META[type]
              return (
                <div key={type} className="flex items-center gap-2">
                  <div
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: meta.hex }}
                  />
                  <span className="font-mono text-[10px] font-bold text-muted-foreground">
                    {type}
                  </span>
                  <span className="text-[10px] text-muted-foreground/70">
                    {meta.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ═══════════════ MAIN AREA ═══════════════ */}
      <div className="flex min-w-0 flex-1 flex-col gap-5">

        {/* Empty state */}
        {!result && !isRunning && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-24">
            <Shield
              className="mb-4 h-14 w-14 text-muted-foreground/20"
              strokeWidth={1}
            />
            <p className="text-sm font-semibold text-muted-foreground">
              DeFi Liquidation Risk Engine
            </p>
            <p className="mt-1 max-w-xs text-center text-xs text-muted-foreground/60">
              Select a DeFi scenario from the left panel or upload a Postman
              collection, then click Run to execute ACTUS behavioral simulation
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {["HealthFactor", "CollateralVelocity", "ETH-Liq", "Rate Resets"].map(
                (label) => (
                  <span
                    key={label}
                    className="rounded-full border border-amber-500/20 bg-amber-500/5 px-2.5 py-0.5 text-[10px] text-amber-400/80"
                  >
                    {label}
                  </span>
                )
              )}
            </div>
          </div>
        )}

        {/* Running state */}
        {isRunning && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/5 py-24">
            <Loader2 className="mb-4 h-10 w-10 animate-spin text-amber-400" />
            <p className="text-sm font-semibold text-foreground">
              Executing DeFi Pipeline...
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Loading risk factors → Adding DeFi models → Running ACTUS simulation
            </p>
          </div>
        )}

        {/* ═══════════════ RESULTS ═══════════════ */}
        <AnimatePresence>
          {result && (
            <motion.div
              key="defi-results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="flex flex-col gap-5"
            >
              {/* ── Result Banner ── */}
              <ResultBanner result={result} events={events} onExport={handleExport} />

              {/* ── Summary KPI Cards ── */}
              {events.length > 0 && <DefiKpiCards events={events} />}

              {/* ── Chart 1: Outstanding Loan (nominal value) ── */}
              {events.length > 0 && <OutstandingLoanChart events={events} />}

              {/* ── Chart 2: Behavioral Prepayments (PP events) ── */}
              {events.filter((e) => e.type === "PP").length > 0 && (
                <PrepaymentChart events={events} />
              )}

              {/* ── Chart 3: Borrow Rate Evolution (RR events) ── */}
              {events.filter((e) => e.type === "RR").length > 0 && (
                <BorrowRateChart events={events} />
              )}

              {/* ── Chart 4: Cumulative Principal Repaid ── */}
              {events.length > 0 && <CumulativePrincipalChart events={events} />}

              {/* ── Chart 5: Event Type Distribution ── */}
              {events.length > 0 && <EventDistributionChart events={events} />}

              {/* ── Pipeline Steps ── */}
              <PipelineSteps
                steps={result.steps}
                show={showSteps}
                onToggle={() => setShowSteps(!showSteps)}
              />

              {/* ── Raw JSON ── */}
              <RawJsonPanel
                result={result}
                show={showRaw}
                onToggle={() => setShowRaw(!showRaw)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ─── Result Banner ────────────────────────────────────────────────────────────

function ResultBanner({
  result,
  events,
  onExport,
}: {
  result: StimulationResult
  events: SimulationEvent[]
  onExport: () => void
}) {
  const ppCount = events.filter((e) => e.type === "PP").length
  const rrCount = events.filter((e) => e.type === "RR").length
  const hasBehavioral = ppCount > 0

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border p-5 sm:flex-row sm:items-center sm:justify-between",
        result.success
          ? "border-amber-500/30 bg-amber-500/5"
          : "border-destructive/30 bg-destructive/5"
      )}
    >
      <div className="flex items-start gap-3">
        {result.success ? (
          <CheckCircle2 className="mt-0.5 h-7 w-7 shrink-0 text-amber-400" />
        ) : (
          <XCircle className="mt-0.5 h-7 w-7 shrink-0 text-destructive" />
        )}
        <div>
          <h3 className="text-base font-bold text-foreground">
            {defiLabel(result.scenarioName)}
          </h3>
          <div className="mt-1 flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground">
              {result.totalDurationMs}ms
            </span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">
              {events.length} events
            </span>
            {hasBehavioral && (
              <>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-xs font-semibold text-orange-400">
                  {ppCount} behavioral PP
                </span>
              </>
            )}
            {rrCount > 0 && (
              <>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-xs font-semibold text-violet-400">
                  {rrCount} rate resets
                </span>
              </>
            )}
          </div>
          {result.description && (
            <p className="mt-1.5 max-w-xl text-xs text-muted-foreground/70 line-clamp-2">
              {typeof result.description === "string"
                ? result.description.split("\n")[0]
                : ""}
            </p>
          )}
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
          onClick={onExport}
          className="bg-transparent border-border text-foreground hover:bg-secondary"
        >
          <Download className="mr-1.5 h-3.5 w-3.5" />
          Export
        </Button>
      </div>
    </div>
  )
}

// ─── DeFi KPI Cards ───────────────────────────────────────────────────────────

function DefiKpiCards({ events }: { events: SimulationEvent[] }) {
  const nominals = events.filter((e) => e.nominalValue !== undefined && e.nominalValue > 0)
  const startingNotional = nominals[0]?.nominalValue ?? 0

  // Find last meaningful nominal (before MD/TD)
  const relevantNominals = events.filter(
    (e) => e.nominalValue !== undefined && !["MD", "TD"].includes(e.type)
  )
  const endingNotional =
    relevantNominals.length > 0
      ? relevantNominals[relevantNominals.length - 1].nominalValue
      : 0

  // PP events = behavioral prepayments (HF or velocity triggered)
  const ppEvents = events.filter((e) => e.type === "PP")
  const totalBehavioralRepaid = ppEvents.reduce(
    (sum, e) => sum + Math.abs(e.payoff),
    0
  )

  // Rate resets
  const rrEvents = events.filter((e) => e.type === "RR" && e.nominalInterestRate !== undefined)
  const peakBorrowRate =
    rrEvents.length > 0
      ? Math.max(...rrEvents.map((e) => e.nominalInterestRate ?? 0))
      : 0

  // Reduction %
  const reduction =
    startingNotional > 0
      ? ((startingNotional - endingNotional) / startingNotional) * 100
      : 0

  const cards = [
    {
      label: "Starting Principal",
      value: formatUSD(startingNotional),
      sub: "Initial notional",
      icon: DollarSign,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
    },
    {
      label: "Remaining Principal",
      value: formatUSD(endingNotional),
      sub: `${reduction.toFixed(1)}% reduction`,
      icon: TrendingDown,
      color: "text-orange-400",
      bg: "bg-orange-500/10",
    },
    {
      label: "Behavioral Repaid",
      value: formatUSD(totalBehavioralRepaid),
      sub: `${ppEvents.length} PP events`,
      icon: Shield,
      color: "text-sky-400",
      bg: "bg-sky-500/10",
    },
    {
      label: "Peak Borrow Rate",
      value: peakBorrowRate > 0 ? formatPct(peakBorrowRate) : "—",
      sub: `${rrEvents.length} rate resets`,
      icon: Percent,
      color: "text-violet-400",
      bg: "bg-violet-500/10",
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((c, i) => (
        <motion.div
          key={c.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07, duration: 0.28 }}
          className="rounded-xl border border-border bg-card p-4"
        >
          <div className={cn("mb-2 flex h-7 w-7 items-center justify-center rounded-lg", c.bg)}>
            <c.icon className={cn("h-3.5 w-3.5", c.color)} />
          </div>
          <p className="text-xs text-muted-foreground">{c.label}</p>
          <p className="mt-0.5 text-lg font-bold tracking-tight text-foreground">
            {c.value}
          </p>
          {c.sub && (
            <p className="mt-0.5 text-[10px] text-muted-foreground/70">{c.sub}</p>
          )}
        </motion.div>
      ))}
    </div>
  )
}

// ─── Chart 1: Outstanding Loan (nominal value over time) ─────────────────────

function OutstandingLoanChart({ events }: { events: SimulationEvent[] }) {
  const data = events
    .filter((e) => e.nominalValue !== undefined && !["AD"].includes(e.type))
    .map((e) => ({
      date: formatDate(e.time),
      datetime: e.time,
      nominal: e.nominalValue,
      type: e.type,
      isPP: e.type === "PP",
    }))

  if (data.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="rounded-xl border border-border bg-card p-5"
    >
      <div className="mb-1 flex items-center gap-2">
        <Waves className="h-4 w-4 text-amber-400" />
        <h4 className="text-sm font-semibold text-foreground">
          Outstanding Loan Principal
        </h4>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Notional value declining as behavioral repayments (PP) and scheduled
        principal redemptions (PR) occur
      </p>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="defiLoanGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="hsl(38,92%,50%)"  stopOpacity={0.25} />
                <stop offset="95%" stopColor="hsl(38,92%,50%)"  stopOpacity={0}    />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,20%,16%)" />
            <XAxis
              dataKey="date"
              stroke="hsl(215,20%,55%)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="hsl(215,20%,55%)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => formatUSD(v)}
              width={72}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(value: any, name: any, props: any) => [
                formatUSD(Number(value)),
                `Outstanding (${props.payload?.type ?? ""})`,
              ]}
              labelFormatter={(label: any) => String(label)}
            />
            <Area
              type="stepAfter"
              dataKey="nominal"
              stroke="hsl(38,92%,50%)"
              fill="url(#defiLoanGrad)"
              strokeWidth={2}
              dot={(props: any) => {
                if (props.payload?.isPP) {
                  return (
                    <circle
                      key={`dot-${props.index}`}
                      cx={props.cx}
                      cy={props.cy}
                      r={3.5}
                      fill="hsl(24,95%,53%)"
                      stroke="hsl(222,44%,8%)"
                      strokeWidth={1}
                    />
                  )
                }
                return <g key={`dot-${props.index}`} />
              }}
            />
            <ReferenceLine
              y={0}
              stroke="hsl(215,20%,30%)"
              strokeDasharray="4 4"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground/60">
        Orange dots = behavioral PP repayment events (HealthFactor / CollateralVelocity triggered)
      </p>
    </motion.div>
  )
}

// ─── Chart 2: Behavioral Prepayments (PP events) ─────────────────────────────

function PrepaymentChart({ events }: { events: SimulationEvent[] }) {
  const ppEvents = events.filter((e) => e.type === "PP")
  if (ppEvents.length === 0) return null

  const data = ppEvents.map((e) => ({
    date: formatDate(e.time),
    datetime: e.time,
    amount: Math.abs(e.payoff),
    remaining: e.nominalValue,
  }))

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.22 }}
      className="rounded-xl border border-border bg-card p-5"
    >
      <div className="mb-1 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-orange-400" />
        <h4 className="text-sm font-semibold text-foreground">
          Behavioral Prepayments (PP Events)
        </h4>
        <Badge
          variant="outline"
          className="ml-auto border-orange-500/30 text-xs text-orange-400"
        >
          {ppEvents.length} events
        </Badge>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Each bar = a defensive prepayment triggered by HealthFactor falling below
        threshold or CollateralVelocity signaling imminent liquidation
      </p>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,20%,16%)" />
            <XAxis
              dataKey="date"
              stroke="hsl(215,20%,55%)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="hsl(215,20%,55%)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => formatUSD(v)}
              width={72}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(value: any) => [formatUSD(Number(value)), "Repaid Amount"]}
            />
            <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
              {data.map((_, idx) => (
                <Cell
                  key={idx}
                  fill="hsl(24,95%,53%)"
                  fillOpacity={0.85}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  )
}

// ─── Chart 3: Borrow Rate Evolution (RR events) ───────────────────────────────

function BorrowRateChart({ events }: { events: SimulationEvent[] }) {
  const rrEvents = events.filter(
    (e) => e.type === "RR" && e.nominalInterestRate !== undefined
  )
  if (rrEvents.length === 0) return null

  const data = rrEvents.map((e) => ({
    date: formatDate(e.time),
    datetime: e.time,
    rate: (e.nominalInterestRate ?? 0) * 100, // convert to percentage
  }))

  const maxRate = Math.max(...data.map((d) => d.rate))
  const minRate = Math.min(...data.map((d) => d.rate))

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="rounded-xl border border-border bg-card p-5"
    >
      <div className="mb-1 flex items-center gap-2">
        <Percent className="h-4 w-4 text-violet-400" />
        <h4 className="text-sm font-semibold text-foreground">
          Borrow Rate Evolution (RR Events)
        </h4>
        <Badge
          variant="outline"
          className="ml-auto border-violet-500/30 text-xs text-violet-400"
        >
          {rrEvents.length} rate resets
        </Badge>
      </div>
      <p className="mb-1 text-xs text-muted-foreground">
        Variable borrow rate changes at each hourly/daily reset cycle
      </p>
      <div className="mb-4 flex gap-4 text-xs">
        <span className="text-muted-foreground">
          Min:{" "}
          <span className="font-semibold text-emerald-400">{minRate.toFixed(2)}%</span>
        </span>
        <span className="text-muted-foreground">
          Peak:{" "}
          <span className="font-semibold text-destructive">{maxRate.toFixed(2)}%</span>
        </span>
        <span className="text-muted-foreground">
          Δ:{" "}
          <span className="font-semibold text-amber-400">
            {(maxRate - minRate).toFixed(2)}pp
          </span>
        </span>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <defs>
              <linearGradient id="rateGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="hsl(262,83%,58%)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="hsl(262,83%,58%)" stopOpacity={0}   />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,20%,16%)" />
            <XAxis
              dataKey="date"
              stroke="hsl(215,20%,55%)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="hsl(215,20%,55%)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `${v.toFixed(1)}%`}
              width={55}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(value: any) => [`${Number(value).toFixed(3)}%`, "Borrow Rate"]}
            />
            <Line
              type="monotone"
              dataKey="rate"
              stroke="hsl(262,83%,58%)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  )
}

// ─── Chart 4: Cumulative Principal Repaid ─────────────────────────────────────

function CumulativePrincipalChart({ events }: { events: SimulationEvent[] }) {
  // Include PP (behavioral) + PR (scheduled) repayments
  const repayEvents = events.filter(
    (e) => ["PP", "PR", "PRF"].includes(e.type) && e.payoff !== 0
  )
  if (repayEvents.length === 0) return null

  let cumulBehavioral = 0
  let cumulScheduled  = 0

  const data = repayEvents.map((e) => {
    const amt = Math.abs(e.payoff)
    if (e.type === "PP") cumulBehavioral += amt
    else cumulScheduled += amt
    return {
      date: formatDate(e.time),
      behavioral: cumulBehavioral,
      scheduled: cumulScheduled,
      total: cumulBehavioral + cumulScheduled,
      type: e.type,
    }
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.37 }}
      className="rounded-xl border border-border bg-card p-5"
    >
      <div className="mb-1 flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-sky-400" />
        <h4 className="text-sm font-semibold text-foreground">
          Cumulative Principal Repaid
        </h4>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Running total of principal repaid — behavioral (orange) vs scheduled (sky)
      </p>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="behavioralGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="hsl(24,95%,53%)"  stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(24,95%,53%)"  stopOpacity={0}   />
              </linearGradient>
              <linearGradient id="scheduledGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="hsl(199,89%,48%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(199,89%,48%)" stopOpacity={0}   />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,20%,16%)" />
            <XAxis
              dataKey="date"
              stroke="hsl(215,20%,55%)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="hsl(215,20%,55%)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => formatUSD(v)}
              width={72}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(value: any, name: any) => [
                formatUSD(Number(value)),
                name === "behavioral" ? "Behavioral (PP)" : "Scheduled (PR)",
              ]}
            />
            <Legend
              formatter={(value) =>
                value === "behavioral" ? "Behavioral PP" : "Scheduled PR"
              }
              wrapperStyle={{ fontSize: "11px", color: "hsl(215,20%,55%)" }}
            />
            <Area
              type="monotone"
              dataKey="behavioral"
              stroke="hsl(24,95%,53%)"
              fill="url(#behavioralGrad)"
              strokeWidth={2}
              stackId="1"
            />
            <Area
              type="monotone"
              dataKey="scheduled"
              stroke="hsl(199,89%,48%)"
              fill="url(#scheduledGrad)"
              strokeWidth={2}
              stackId="1"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  )
}

// ─── Chart 5: Event Type Distribution ────────────────────────────────────────

function EventDistributionChart({ events }: { events: SimulationEvent[] }) {
  const counts: Record<string, number> = {}
  for (const e of events) {
    counts[e.type] = (counts[e.type] ?? 0) + 1
  }

  const data = Object.entries(counts).map(([type, count]) => ({
    type,
    count,
    label: EVENT_META[type]?.label ?? type,
    fill: EVENT_META[type]?.hex ?? "hsl(215,20%,55%)",
  }))

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.44 }}
      className="rounded-xl border border-border bg-card p-5"
    >
      <div className="mb-1 flex items-center gap-2">
        <Activity className="h-4 w-4 text-emerald-400" />
        <h4 className="text-sm font-semibold text-foreground">
          Event Type Distribution
        </h4>
        <Badge
          variant="outline"
          className="ml-auto border-border text-xs text-muted-foreground"
        >
          {events.length} total
        </Badge>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Breakdown of all ACTUS events generated by the simulation
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-6">
        {/* Bar breakdown */}
        <div className="flex-1 space-y-2">
          {data.map((d) => (
            <div key={d.type} className="flex items-center gap-2">
              <span
                className="w-10 shrink-0 font-mono text-xs font-bold"
                style={{ color: d.fill }}
              >
                {d.type}
              </span>
              <div className="relative flex-1 h-4 rounded-full bg-secondary overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                  style={{
                    width: `${(d.count / events.length) * 100}%`,
                    backgroundColor: d.fill,
                    opacity: 0.75,
                  }}
                />
              </div>
              <span className="w-8 shrink-0 text-right text-xs font-semibold text-foreground">
                {d.count}
              </span>
              <span className="hidden w-24 text-xs text-muted-foreground sm:block truncate">
                {d.label}
              </span>
            </div>
          ))}
        </div>

        {/* Mini pie */}
        <div className="h-48 w-full sm:w-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={72}
                paddingAngle={2}
                dataKey="count"
                nameKey="type"
              >
                {data.map((d, i) => (
                  <Cell key={i} fill={d.fill} fillOpacity={0.8} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(value: any, name: any) => [
                  `${value} events`,
                  EVENT_META[name]?.label ?? name,
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Pipeline Steps ───────────────────────────────────────────────────────────

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
    <div className="rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between p-4"
      >
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-amber-400" />
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
            <div className="space-y-1.5 p-4">
              {steps.map((step) => (
                <div
                  key={step.step}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm",
                    step.status === "success" ? "bg-amber-500/5" : "bg-destructive/5"
                  )}
                >
                  {step.status === "success" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-amber-400" />
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
                        ? "border-amber-500/30 text-amber-400"
                        : "border-destructive/30 text-destructive"
                    )}
                  >
                    {step.httpStatus ?? "ERR"}
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

// ─── Raw JSON Panel ───────────────────────────────────────────────────────────

function RawJsonPanel({
  result,
  show,
  onToggle,
}: {
  result: StimulationResult
  show: boolean
  onToggle: () => void
}) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between p-4"
      >
        <span className="text-sm font-semibold text-foreground">
          Raw JSON Response
        </span>
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
            <pre className="scrollbar-thin max-h-96 overflow-auto p-4 font-mono text-xs text-muted-foreground">
              {JSON.stringify(result, null, 2)}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
