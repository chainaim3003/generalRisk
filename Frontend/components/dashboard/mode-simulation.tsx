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
  Layers,
  Calendar,
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
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

// ---- Simulation Panel (Normal + Holder tabs — untouched) ----

function SimulationPanel() {
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
        err?.message ||
          "Simulation failed. Is the backend running on localhost:4000?"
      )
    } finally {
      setIsRunning(false)
    }
  }

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

  const events: SimulationEvent[] = result?.simulation?.[0]?.events || []
  const hasSelection = !!selectedId || !!uploadedJson

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="flex w-full flex-col gap-4 lg:w-80 lg:shrink-0">
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

      <div className="flex min-w-0 flex-1 flex-col gap-5">
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

        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col gap-5"
            >
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

              {events.length > 0 && <SummaryCards events={events} />}
              {events.length > 0 && <NominalValueChart events={events} />}
              {events.length > 0 && <PayoffBarChart events={events} />}
              {events.length > 0 && <CumulativeRedemptionChart events={events} />}

              <PipelineSteps
                steps={result.steps}
                show={showSteps}
                onToggle={() => setShowSteps(!showSteps)}
              />

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

// ════════════════════════════════════════════════════════════════
// ISSUER PANEL — reads ALL contracts from simulation[], not just [0]
// ════════════════════════════════════════════════════════════════

// Helper: get contractID from a simulation contract object
// The ACTUS response uses contractID (capital D); the TS type says contractId
function getContractId(c: { contractId: string; events: SimulationEvent[] }): string {
  return (c as any).contractID ?? c.contractId ?? ""
}

function IssuerPanel() {
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
        err?.message ||
          "Simulation failed. Is the backend running on localhost:4000?"
      )
    } finally {
      setIsRunning(false)
    }
  }

  const handleExport = () => {
    if (!result) return
    const blob = new Blob([JSON.stringify(result, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `issuer-${result.scenarioName}-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const hasSelection = !!selectedId || !!uploadedJson

  // Total events across ALL contracts (not just [0])
  const totalEvents = result?.simulation?.reduce((sum, c) => sum + c.events.length, 0) ?? 0

  // Liability contract = the one that has PP events with non-zero payoff
  const liabilityContract = result?.simulation?.find((c) =>
    c.events.some((e) => e.type === "PP" && e.payoff > 0)
  ) ?? null

  // Asset contracts = those with MD events with non-zero payoff
  const assetContracts = result?.simulation?.filter((c) =>
    c.events.some((e) => e.type === "MD" && e.payoff > 0)
  ) ?? []

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* ── Left Panel (identical structure to SimulationPanel) ── */}
      <div className="flex w-full flex-col gap-4 lg:w-80 lg:shrink-0">
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

      {/* ── Right Panel — Issuer-specific display ── */}
      <div className="flex min-w-0 flex-1 flex-col gap-5">
        {!result && !isRunning && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20">
            <Layers className="mb-4 h-12 w-12 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">
              Select a scenario and click Run
            </p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              Issuer reserve &amp; stablecoin run analysis will appear here
            </p>
          </div>
        )}

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

        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col gap-5"
            >
              {/* Banner */}
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
                      {result.scenarioName || "Issuer Simulation"}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {result.success
                        ? `Completed in ${result.totalDurationMs}ms • ${result.simulation?.length ?? 0} contracts • ${totalEvents} events`
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

              {/* Contract Summary Cards */}
              {result.simulation && result.simulation.length > 0 && (
                <IssuerContractCards simulation={result.simulation} />
              )}

              {/* Stablecoin Run Chart — liability nominalValue over time */}
              {liabilityContract && (
                <IssuerRunChart contract={liabilityContract} />
              )}

              {/* Daily Redemption Bar Chart — PP payoffs per day */}
              {liabilityContract && (
                <IssuerDailyRedemptionChart contract={liabilityContract} />
              )}

              {/* Asset Maturity Timeline */}
              {assetContracts.length > 0 && (
                <IssuerMaturityTimeline assetContracts={assetContracts} />
              )}

              {/* Parameter Trend Charts */}
              {(result.riskFactorData || (result.simulation && result.simulation.length > 0)) && (
                <IssuerParameterCharts
                  simulation={result.simulation}
                  riskFactorData={result.riskFactorData}
                />
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

// ---- Issuer: Contract Summary Cards ----
// One card per contract in simulation[]. Data from real response only.

function IssuerContractCards({
  simulation,
}: {
  simulation: NonNullable<StimulationResult["simulation"]>
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <Layers className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">
          Contracts ({simulation.length})
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {simulation.map((c, i) => {
          const contractId = getContractId(c)
          const mdPayoff = c.events
            .filter((e) => e.type === "MD")
            .reduce((sum, e) => sum + e.payoff, 0)
          const ppCount = c.events.filter(
            (e) => e.type === "PP" && e.payoff > 0
          ).length
          const isLiability = ppCount > 0
          return (
            <motion.div
              key={contractId || i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.25 }}
              className={cn(
                "rounded-lg border bg-card p-3",
                isLiability
                  ? "border-destructive/30"
                  : "border-primary/20"
              )}
            >
              <p
                className={cn(
                  "mb-1 text-[10px] font-bold uppercase tracking-wider",
                  isLiability ? "text-destructive" : "text-primary"
                )}
              >
                {isLiability ? "Liability" : "Asset"}
              </p>
              <p className="truncate text-xs font-semibold text-foreground">
                {contractId}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {c.events.length} events
              </p>
              {mdPayoff > 0 && (
                <p className="mt-0.5 text-xs font-semibold text-primary">
                  MD: {formatUSD(mdPayoff)}
                </p>
              )}
              {ppCount > 0 && (
                <p className="mt-0.5 text-xs font-semibold text-destructive">
                  {ppCount} PP redemptions
                </p>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

// ---- Issuer: Stablecoin Run Chart ----
// Plots nominalValue of the liability contract day-by-day.
// Takes the last PP event per day — that is the day-end remaining supply.

function IssuerRunChart({
  contract,
}: {
  contract: NonNullable<StimulationResult["simulation"]>[number]
}) {
  // Aggregate: last PP event per day gives end-of-day nominalValue
  const byDay = new Map<string, number>()
  for (const e of contract.events) {
    if (e.type === "PP") {
      const day = e.time.slice(0, 10)
      byDay.set(day, e.nominalValue) // later event on same day overwrites → final value
    }
  }

  const data = Array.from(byDay.entries()).map(([day, nominalValue]) => ({
    date: formatDate(day + "T00:00"),
    nominalValue,
  }))

  if (data.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="rounded-lg border border-border bg-card p-5"
    >
      <h4 className="mb-1 text-sm font-semibold text-foreground">
        Stablecoin Supply Run — {getContractId(contract)}
      </h4>
      <p className="mb-4 text-xs text-muted-foreground">
        Outstanding token supply day-by-day as redemptions (PP events) reduce it to zero
      </p>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="issuerRunGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0} />
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
              width={75}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(222, 44%, 8%)",
                border: "1px solid hsl(222, 20%, 16%)",
                borderRadius: "8px",
                color: "hsl(210, 40%, 96%)",
                fontSize: "12px",
              }}
              formatter={(value: any) => [formatUSD(Number(value)), "Remaining Supply"]}
              labelFormatter={(label: any) => String(label)}
            />
            <Area
              type="monotone"
              dataKey="nominalValue"
              stroke="hsl(0, 72%, 51%)"
              fill="url(#issuerRunGrad)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  )
}

// ---- Issuer: Daily Redemption Bar Chart ----
// Sums all non-zero PP payoffs per day from the liability contract.

function IssuerDailyRedemptionChart({
  contract,
}: {
  contract: NonNullable<StimulationResult["simulation"]>[number]
}) {
  const byDay = new Map<string, number>()
  for (const e of contract.events) {
    if (e.type === "PP" && e.payoff > 0) {
      const day = e.time.slice(0, 10)
      byDay.set(day, (byDay.get(day) ?? 0) + e.payoff)
    }
  }

  const data = Array.from(byDay.entries()).map(([day, amount]) => ({
    date: formatDate(day + "T00:00"),
    amount,
  }))

  if (data.length === 0) return null

  const peakDay = data.reduce((max, d) => (d.amount > max.amount ? d : max), data[0])

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="rounded-lg border border-border bg-card p-5"
    >
      <div className="mb-1 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">
          Daily Redemptions (PP Payoffs)
        </h4>
        <span className="text-xs text-muted-foreground">
          Peak: <span className="font-semibold text-destructive">{formatUSD(peakDay.amount)}</span> on {peakDay.date}
        </span>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Total tokens redeemed each day — shows the shape and intensity of the run
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
              width={75}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(222, 44%, 8%)",
                border: "1px solid hsl(222, 20%, 16%)",
                borderRadius: "8px",
                color: "hsl(210, 40%, 96%)",
                fontSize: "12px",
              }}
              formatter={(value: any) => [formatUSD(Number(value)), "Redeemed"]}
            />
            <Bar dataKey="amount" radius={[3, 3, 0, 0]}>
              {data.map((entry, idx) => (
                <Cell
                  key={idx}
                  fill={
                    entry.amount === peakDay.amount
                      ? "hsl(0, 72%, 51%)"
                      : "hsl(0, 72%, 51%)"
                  }
                  fillOpacity={entry.amount === peakDay.amount ? 1 : 0.6}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  )
}

// ---- Issuer: Asset Maturity Timeline ----
// Shows each asset contract, its maturity date, and MD payoff amount.

function IssuerMaturityTimeline({
  assetContracts,
}: {
  assetContracts: NonNullable<StimulationResult["simulation"]>
}) {
  const items = assetContracts
    .map((c) => {
      const mdEvent = c.events.find((e) => e.type === "MD" && e.payoff > 0)
      return {
        contractId: getContractId(c),
        maturityDate: mdEvent ? formatDate(mdEvent.time) : null,
        maturityIso: mdEvent?.time ?? "",
        payoff: mdEvent?.payoff ?? 0,
      }
    })
    .filter((d) => d.payoff > 0)
    .sort((a, b) => a.maturityIso.localeCompare(b.maturityIso))

  if (items.length === 0) return null

  const totalAssets = items.reduce((sum, d) => sum + d.payoff, 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="rounded-lg border border-border bg-card p-5"
    >
      <div className="mb-1 flex items-center gap-2">
        <Calendar className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold text-foreground">
          Reserve Asset Maturities
        </h4>
        <span className="ml-auto text-xs text-muted-foreground">
          Total: <span className="font-semibold text-primary">{formatUSD(totalAssets)}</span>
        </span>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        When each reserve asset matures and returns cash to the issuer
      </p>
      <div className="flex flex-col gap-2">
        {items.map((item, i) => {
          const pct = totalAssets > 0 ? (item.payoff / totalAssets) * 100 : 0
          return (
            <div key={item.contractId} className="flex items-center gap-3">
              <div className="w-40 shrink-0">
                <p className="truncate text-xs font-semibold text-foreground">
                  {item.contractId}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Matures {item.maturityDate}
                </p>
              </div>
              <div className="relative flex-1 h-5 rounded bg-secondary overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ delay: 0.4 + i * 0.05, duration: 0.4 }}
                  style={{ opacity: 0.7 }}
                />
              </div>
              <span className="w-20 shrink-0 text-right text-xs font-semibold text-foreground">
                {formatUSD(item.payoff)}
              </span>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}

// ---- Issuer: Parameter Charts ----
// Renders individual line charts for: Backing Ratio, WAM (days),
// Liquidity Ratio, Max Concentration, HQLA Score, Attestation Age, Mar.
// X-axis is Epoch (time index). Handles both data formats:
//   (a) contract-events: [{contractId, events: [{type, time, states: {...}}]}]
//   (b) epoch-history:   [{epoch, backingRatio, wamDays, ...}]

/** Parameter display config: label shown in chart title, color for the line */
const PARAM_CONFIG: Record<string, { label: string; color: string }> = {
  backingRatio:     { label: "Backing Ratio",     color: "hsl(142, 71%, 45%)" },
  wamDays:          { label: "WAM (days)",        color: "hsl(38, 92%, 50%)" },
  liquidityRatio:   { label: "Liquidity Ratio",   color: "hsl(199, 89%, 48%)" },
  maxConcentration: { label: "Max Concentration", color: "hsl(280, 67%, 55%)" },
  hqlaScore:        { label: "HQLA Score",        color: "hsl(348, 83%, 47%)" },
  attestationAge:   { label: "Attestation Age",   color: "hsl(25, 95%, 53%)" },
  mar:              { label: "Mar",               color: "hsl(180, 60%, 45%)" },
  totalReserves:    { label: "Total Reserves",    color: "hsl(210, 70%, 50%)" },
  cashReserve:      { label: "Cash Reserve",      color: "hsl(160, 60%, 45%)" },
  pegDeviation:     { label: "Peg Deviation",     color: "hsl(0, 70%, 55%)" },
}

/**
 * Map ACTUS marketObjectCode names (e.g. SC_BACKING_RATIO) and other
 * key formats to canonical camelCase names used by PARAM_CONFIG.
 */
function normalizeStateKey(raw: string): string {
  const lower = raw.toLowerCase().replace(/[^a-z0-9]/g, "")
  const MAP: Record<string, string> = {
    backingratio: "backingRatio",
    scbackingratio: "backingRatio",
    wamdays: "wamDays",
    wam: "wamDays",
    scwamdays: "wamDays",
    liquidityratio: "liquidityRatio",
    scliquidityratio: "liquidityRatio",
    maxconcentration: "maxConcentration",
    concentrationrisk: "maxConcentration",
    scmaxconcentration: "maxConcentration",
    hqlascore: "hqlaScore",
    schqlascore: "hqlaScore",
    attestationage: "attestationAge",
    scattestationage: "attestationAge",
    mar: "mar",
    totalreserves: "totalReserves",
    sctotalreserves: "totalReserves",
    cashreserve: "cashReserve",
    sccashreserve: "cashReserve",
    pegdeviation: "pegDeviation",
    stablecoinpegdev: "pegDeviation",
  }
  return MAP[lower] ?? raw
}

interface ParamDataPoint {
  epoch: number
  date: string
  value: number
}

/**
 * Extract parameter time-series from all available data sources.
 * Priority: riskFactorData (input time-series from collection) > simulation events/epochs.
 */
function extractParameterData(
  simulation: any,
  riskFactorData: Record<string, Array<{ time: string; value: number }>> | null | undefined,
): Record<string, ParamDataPoint[]> {
  const series: Record<string, ParamDataPoint[]> = {}

  // Source 1: riskFactorData from backend (extracted from addReferenceIndex steps)
  if (riskFactorData && typeof riskFactorData === "object") {
    for (const [moc, points] of Object.entries(riskFactorData)) {
      if (!Array.isArray(points) || points.length === 0) continue
      const canonical = normalizeStateKey(moc)
      series[canonical] = points.map((pt, idx) => ({
        epoch: idx + 1,
        date: pt.time && pt.time.includes("T") ? formatDate(pt.time) : `Epoch ${idx + 1}`,
        value: Number(pt.value),
      }))
    }
  }

  // Source 2: simulation data (epoch-history or contract-events with states)
  if (simulation && Array.isArray(simulation) && simulation.length > 0) {
    const first = simulation[0]
    const isEpochHistory =
      first && typeof first === "object" && !Array.isArray(first.events)

    // Track which keys came from riskFactorData so we don't override them
    const fromRiskFactors = new Set(Object.keys(series))

    if (isEpochHistory) {
      simulation.forEach((entry: any, idx: number) => {
        const epoch = typeof entry.epoch === "number" ? entry.epoch : idx + 1
        const date =
          entry.time || entry.date || entry.timestamp || `Epoch ${epoch}`
        const dateLabel =
          typeof date === "string" && date.includes("T")
            ? formatDate(date)
            : String(date)

        for (const [rawKey, rawVal] of Object.entries(entry)) {
          if (["epoch", "time", "date", "timestamp"].includes(rawKey)) continue
          const numVal = Number(rawVal)
          if (Number.isNaN(numVal)) continue
          const canonical = normalizeStateKey(rawKey)
          if (fromRiskFactors.has(canonical)) continue
          if (!series[canonical]) series[canonical] = []
          series[canonical].push({ epoch, date: dateLabel, value: numVal })
        }
      })
    } else {
      // contract-events with states
      const allEvents: Array<{ time: string; states: Record<string, number> }> = []
      for (const contract of simulation) {
        if (!Array.isArray(contract.events)) continue
        for (const ev of contract.events) {
          if (ev.states && typeof ev.states === "object") {
            allEvents.push({ time: ev.time, states: ev.states })
          }
        }
      }
      allEvents.sort((a, b) => a.time.localeCompare(b.time))
      allEvents.forEach((ev, idx) => {
        const epoch = idx + 1
        const dateLabel = formatDate(ev.time)
        for (const [rawKey, rawVal] of Object.entries(ev.states)) {
          const numVal = Number(rawVal)
          if (Number.isNaN(numVal)) continue
          const canonical = normalizeStateKey(rawKey)
          if (fromRiskFactors.has(canonical)) continue
          if (!series[canonical]) series[canonical] = []
          series[canonical].push({ epoch, date: dateLabel, value: numVal })
        }
      })
    }
  }

  return series
}

function IssuerParameterCharts({
  simulation,
  riskFactorData,
}: {
  simulation: StimulationResult["simulation"]
  riskFactorData: StimulationResult["riskFactorData"]
}) {
  const series = extractParameterData(simulation, riskFactorData)
  const paramKeys = Object.keys(series)

  if (paramKeys.length === 0) return null

  // Determine render order: known params first (in PARAM_CONFIG order), then any extras
  const knownOrder = Object.keys(PARAM_CONFIG)
  const ordered = [
    ...knownOrder.filter((k) => series[k]),
    ...paramKeys.filter((k) => !knownOrder.includes(k)),
  ]

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">
          Parameter Trends ({ordered.length} metrics)
        </span>
      </div>
      {ordered.map((paramKey, chartIdx) => {
        const data = series[paramKey]
        const config = PARAM_CONFIG[paramKey]
        const label = config?.label ?? paramKey
        const color = config?.color ?? "hsl(215, 70%, 55%)"

        return (
          <motion.div
            key={paramKey}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + chartIdx * 0.08 }}
            className="rounded-lg border border-border bg-card p-5"
          >
            <h4 className="mb-1 text-sm font-semibold text-foreground">
              {label}
            </h4>
            <p className="mb-4 text-xs text-muted-foreground">
              {data.length} data points
            </p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(222, 20%, 16%)"
                  />
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
                    width={60}
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
                      Number(value).toFixed(4),
                      label,
                    ]}
                    labelFormatter={(l: any) => String(l)}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={color}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: color }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// ModeSimulation: outer 3-tab wrapper
// Normal → SimulationPanel, Holder → SimulationPanel, Issuer → IssuerPanel
// ════════════════════════════════════════════════════════════════

export function ModeSimulation() {
  return (
    <Tabs defaultValue="normal" className="flex flex-col gap-4">
      <TabsList className="w-fit bg-secondary">
        <TabsTrigger
          value="normal"
          className="data-[state=active]:bg-background data-[state=active]:text-foreground"
        >
          Normal
        </TabsTrigger>
        <TabsTrigger
          value="holder"
          className="data-[state=active]:bg-background data-[state=active]:text-foreground"
        >
          Holder
        </TabsTrigger>
        <TabsTrigger
          value="issuer"
          className="data-[state=active]:bg-background data-[state=active]:text-foreground"
        >
          Issuer
        </TabsTrigger>
      </TabsList>

      <TabsContent value="normal" className="mt-0">
        <SimulationPanel />
      </TabsContent>

      <TabsContent value="holder" className="mt-0">
        <SimulationPanel />
      </TabsContent>

      <TabsContent value="issuer" className="mt-0">
        <IssuerPanel />
      </TabsContent>
    </Tabs>
  )
}

// ════════════════════════════════════════════════════════════════
// Shared sub-components used by SimulationPanel (Normal + Holder)
// These are NOT used by IssuerPanel
// ════════════════════════════════════════════════════════════════

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
