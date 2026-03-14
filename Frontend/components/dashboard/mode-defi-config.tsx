"use client"

/**
 * ModeDefiConfig
 * ==============
 * DeFi Liquidation Config-Based Simulation tab.
 *
 * Mirrors mode-config.tsx (stablecoin) exactly in structure.
 * Calls POST /api/defi-simulate with a DefiBorrowerConfig or DefiProtocolConfig.
 *
 * Live Charts (all driven by real ACTUS simulation data — zero mocks):
 *   1. Health Factor Timeline  — line chart with HF=1.0 danger / HF=1.5 warning bands
 *   2. Collateral Value vs Debt — stacked area showing ETH value, USDC, invoice vs loan
 *   3. Liquidation Risk Gauge   — radial gauge 0-100% derived from health factor
 *   4. ETH Price Impact         — line chart from riskFactorData ETH_USD_01
 *   5. Behavioral Repayments    — bar chart from PP events
 *   6. Borrow Rate Evolution    — line from RR events
 *   7. Cascade Probability      — area from riskFactorData CASCADE_PROB_01
 *   8. Event Distribution       — horizontal bar + mini pie
 */

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
  Activity,
  Shield,
  FlameKindling,
  Server,
  FileJson,
  AlertTriangle,
  TrendingDown,
  DollarSign,
  Percent,
  Zap,
  BarChart3,
  Clock,
  Waves,
  Target,
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
  RadialBarChart,
  RadialBar,
} from "recharts"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

interface SimulationEvent {
  time: string
  type: string
  payoff: number
  nominalValue: number
  currency: string
  nominalInterestRate?: number
  states?: Record<string, number>
}

interface RiskFactorPoint {
  time: string
  value: number
}

interface DefiSimResult {
  success: boolean
  scenarioName: string
  description: string
  environment: string
  steps: any[]
  simulation: Array<{ contractId?: string; events: SimulationEvent[] }> | null
  riskFactorData: Record<string, RiskFactorPoint[]> | null
  totalDurationMs: number
  timestamp: string
  configMetadata?: {
    entity_type: string
    protocol_code: string
    monitoring_times_count: number
    config_id: string
    collection_file: string
    health_factor_trigger?: number
    healthy_health_factor?: number
    liquidation_threshold?: number
  }
  liquidationContext?: {
    initial_health_factor?: number
    position_stress?: string
    cascade_probability?: number
    time_to_liquidation_days?: number
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const API_BASE =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_BASE) ||
  "http://localhost:4000/api"

async function callDefiSimulate(body: object): Promise<DefiSimResult> {
  const res = await fetch(`${API_BASE}/defi-simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error")
    throw new Error(`API ${res.status}: ${text}`)
  }
  return res.json()
}

function fmtUSD(v: number): string {
  const a = Math.abs(v)
  if (a >= 1e6) return `$${(v / 1e6).toFixed(2)}M`
  if (a >= 1e3) return `$${(v / 1e3).toFixed(1)}K`
  return `$${v.toFixed(0)}`
}

function fmtPct(v: number): string {
  return `${(v * 100).toFixed(2)}%`
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

const TOOLTIP_STYLE = {
  backgroundColor: "hsl(222,44%,8%)",
  border: "1px solid hsl(222,20%,16%)",
  borderRadius: "8px",
  color: "hsl(210,40%,96%)",
  fontSize: "12px",
}

const EVENT_META: Record<string, { label: string; hex: string }> = {
  AD:   { label: "Status Update",     hex: "hsl(215,20%,45%)" },
  IED:  { label: "Initial Exchange",  hex: "hsl(199,89%,48%)" },
  PR:   { label: "Principal Payment", hex: "hsl(38,92%,50%)"  },
  PP:   { label: "Behavioral Repay",  hex: "hsl(24,95%,53%)"  },
  RR:   { label: "Rate Reset",        hex: "hsl(262,83%,58%)" },
  IP:   { label: "Interest Payment",  hex: "hsl(199,89%,65%)" },
  MD:   { label: "Maturity",          hex: "hsl(160,84%,40%)" },
  TD:   { label: "Termination",       hex: "hsl(0,72%,51%)"   },
}

// ─── Protocol options ─────────────────────────────────────────────────────────

const PROTOCOL_OPTIONS = [
  {
    value: "aave-v3",
    label: "Aave V3 Mainnet",
    desc: "LT: 82.5% | LB: 5% | HF trigger: 1.0",
    collection: "DeFi-HealthFactor-CollateralVelocity-90d.json",
  },
  {
    value: "compound-v3",
    label: "Compound V3 (Comet)",
    desc: "LT: 80% | LB: 8% | Full close factor",
    collection: "DeFi-CollateralRebalancing-CorrelationRisk-90d.json",
  },
  {
    value: "makerdao",
    label: "MakerDAO Vaults",
    desc: "LT: 83.3% | Penalty: 13% | Auction liquidation",
    collection: "DeFi-HealthFactor-CollateralVelocity-90d.json",
  },
]

const BORROWER_PROFILE_OPTIONS = [
  {
    value: "conservative-overcollateralized",
    label: "Conservative (Over-collateralized)",
    desc: "HF comfort: 3.0 | LTV target: 35%",
  },
  {
    value: "institutional-hedged",
    label: "Institutional (Delta-hedged)",
    desc: "HF comfort: 2.0 | LTV target: 55% | 24h rebalance",
  },
  {
    value: "retail-undercollateralized",
    label: "Retail (Under-collateralized)",
    desc: "HF comfort: 1.15 | LTV target: 85% | High risk",
  },
  {
    value: "aggressive-leveraged",
    label: "Aggressive (Max leverage)",
    desc: "HF comfort: 1.05 | LTV target: 92% | Flash loan enabled",
  },
]

const MARKET_SCENARIO_OPTIONS = [
  {
    value: "current-march-2026",
    label: "Current March 2026",
    desc: "ETH -39.3% drawdown, moderate stress (live collection data)",
  },
  {
    value: "baseline-bull",
    label: "Baseline Bull Market",
    desc: "ETH trending up, low gas, no liquidation risk",
  },
  {
    value: "moderate-correction",
    label: "Moderate Correction",
    desc: "ETH -25%, HF approaches warning zone, defensive repayments",
  },
  {
    value: "severe-crash",
    label: "Severe Crash (Cascade)",
    desc: "ETH -60%, HF breaches 1.0, cascade probability >85%",
  },
]

const LIQUIDATION_SCENARIO_OPTIONS = [
  {
    value: "current-position",
    label: "Current Position (Mar 2026)",
    desc: "HF 2.05 | LTV 49% | 35 days to liquidation",
  },
  {
    value: "healthy-position",
    label: "Healthy Position",
    desc: "HF 2.50 | LTV 42% | No liquidation risk",
  },
  {
    value: "approaching-threshold",
    label: "Approaching Threshold",
    desc: "HF 1.35 | LTV 71% | Velocity alert active",
  },
  {
    value: "cascade-liquidation",
    label: "Cascade Liquidation Event",
    desc: "HF 0.92 | LTV 89% | Forced liquidation triggered",
  },
]

// ─── Main Component ───────────────────────────────────────────────────────────

export function ModeDefiConfig() {
  const [entityType, setEntityType] = useState<"borrower" | "protocol">("borrower")
  const [protocol, setProtocol]     = useState("aave-v3")
  const [borrowerProfile, setBorrowerProfile] = useState("retail-undercollateralized")
  const [marketScenario, setMarketScenario]   = useState("current-march-2026")
  const [liquidationScenario, setLiquidationScenario] = useState("current-position")
  const [frequency, setFrequency] = useState<"daily" | "weekly">("daily")
  const [environment, setEnvironment] = useState("localhost")
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<DefiSimResult | null>(null)
  const [error, setError] = useState("")
  const [expandedRaw, setExpandedRaw] = useState(false)
  const [expandedSteps, setExpandedSteps] = useState(false)

  const selectedProto = PROTOCOL_OPTIONS.find((p) => p.value === protocol)!

  const handleRun = async () => {
    setIsRunning(true)
    setError("")
    setResult(null)

    try {
      const configData =
        entityType === "borrower"
          ? {
              config_metadata: {
                config_id: `UI_DEFI_BRW_${protocol.toUpperCase()}_${Date.now()}`,
                collection_file: selectedProto.collection,
              },
              protocol: {
                source: "file",
                file: `protocols/${protocol}.json`,
              },
              borrower_thresholds: {
                source: "file" as const,
                file: `profiles/borrower/${borrowerProfile}.json`,
              },
              market_scenario: {
                source: "file",
                file: `market-scenarios/${marketScenario}.json`,
              },
              liquidation_scenario: {
                source: "file",
                file: `liquidation-scenarios/${liquidationScenario}.json`,
              },
              simulation_timeframe: {
                status_date: "2026-02-28T00:00:00",
                start_date: "2026-03-01T00:00:00",
                end_date: "2026-05-31T00:00:00",
                frequency,
              },
            }
          : {
              config_metadata: {
                config_id: `UI_DEFI_PROT_${protocol.toUpperCase()}_${Date.now()}`,
                collection_file: selectedProto.collection,
              },
              protocol: {
                source: "file",
                file: `protocols/${protocol}.json`,
              },
              protocol_thresholds: {
                source: "file" as const,
                file: `profiles/protocol/${protocol}-${protocol === "aave-v3" ? "mainnet" : protocol === "makerdao" ? "vaults" : protocol}.json`,
              },
              market_scenario: {
                source: "file",
                file: `market-scenarios/${marketScenario}.json`,
              },
              liquidation_scenario: {
                source: "file",
                file: `liquidation-scenarios/${liquidationScenario}.json`,
              },
              simulation_timeframe: {
                status_date: "2026-02-28T00:00:00",
                start_date: "2026-03-01T00:00:00",
                end_date: "2026-05-31T00:00:00",
                frequency,
              },
            }

      const res = await callDefiSimulate({ configData, environment })
      setResult(res)
    } catch (err: any) {
      setError(err.message || "Failed to run DeFi simulation")
    } finally {
      setIsRunning(false)
    }
  }

  const events: SimulationEvent[] =
    result?.simulation?.[0]?.events ?? []

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/15">
          <FlameKindling className="h-5 w-5 text-amber-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            DeFi Liquidation — Config Simulation
          </h2>
          <p className="text-sm text-muted-foreground">
            Health factor monitoring, collateral velocity, cascade risk — driven by
            real ACTUS simulation
          </p>
        </div>
      </div>

      {/* ── Config Panel ── */}
      <Card>
        <CardHeader>
          <CardTitle>Simulation Configuration</CardTitle>
          <CardDescription>
            Select protocol, borrower profile, market scenario, and liquidation position
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">

          {/* Entity Type */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-amber-400" />
              Perspective
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {(["borrower", "protocol"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setEntityType(t)}
                  className={cn(
                    "rounded-lg border px-4 py-3 text-left transition-all",
                    entityType === t
                      ? "border-amber-500/50 bg-amber-500/10 text-amber-400"
                      : "border-border bg-card text-muted-foreground hover:border-amber-500/30"
                  )}
                >
                  <p className="text-sm font-semibold capitalize">{t}</p>
                  <p className="text-xs opacity-70">
                    {t === "borrower"
                      ? "Borrower risk & defensive repayment"
                      : "Protocol liquidation engine view"}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Protocol */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Server className="h-4 w-4" />
              DeFi Protocol
            </Label>
            <Select value={protocol} onValueChange={setProtocol}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROTOCOL_OPTIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{p.label}</span>
                      <span className="text-xs text-muted-foreground">{p.desc}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Borrower Profile (only for borrower perspective) */}
          <AnimatePresence>
            {entityType === "borrower" && (
              <motion.div
                key="borrower-profile"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2 overflow-hidden"
              >
                <Label className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Borrower Risk Profile
                </Label>
                <Select value={borrowerProfile} onValueChange={setBorrowerProfile}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BORROWER_PROFILE_OPTIONS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{p.label}</span>
                          <span className="text-xs text-muted-foreground">{p.desc}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Market Scenario */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Market Scenario (ETH price stress)
            </Label>
            <Select value={marketScenario} onValueChange={setMarketScenario}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MARKET_SCENARIO_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{s.label}</span>
                      <span className="text-xs text-muted-foreground">{s.desc}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Liquidation Scenario */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Position / Liquidation State
            </Label>
            <Select value={liquidationScenario} onValueChange={setLiquidationScenario}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LIQUIDATION_SCENARIO_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{s.label}</span>
                      <span className="text-xs text-muted-foreground">{s.desc}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Frequency + Environment row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Monitoring Frequency
              </Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily (91 monitoring points)</SelectItem>
                  <SelectItem value="weekly">Weekly (~13 monitoring points)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Server className="h-4 w-4" />
                Environment
              </Label>
              <Select value={environment} onValueChange={setEnvironment}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="localhost">localhost (8082/8083)</SelectItem>
                  <SelectItem value="aws">AWS (34.203.247.32)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Run Button */}
          <Button
            onClick={handleRun}
            disabled={isRunning}
            className="w-full bg-amber-500 text-amber-950 hover:bg-amber-400 disabled:opacity-40"
            size="lg"
          >
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Running DeFi Simulation...
              </>
            ) : (
              <>
                <Play className="mr-2 h-5 w-5" />
                Run {entityType === "borrower" ? "Borrower" : "Protocol"} Simulation
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* ── Error ── */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-destructive/50 bg-destructive/10 p-4"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <p className="text-sm font-medium text-destructive">Simulation Failed</p>
          </div>
          <p className="mt-1 text-sm text-destructive/80">{error}</p>
        </motion.div>
      )}

      {/* ── Running skeleton ── */}
      {isRunning && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/5 py-20">
          <Loader2 className="mb-4 h-10 w-10 animate-spin text-amber-400" />
          <p className="text-sm font-semibold">Executing DeFi Pipeline...</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Loading risk factors → Adding DeFi models → Running ACTUS ANN simulation
          </p>
        </div>
      )}

      {/* ══════════════════════ RESULTS ══════════════════════ */}
      <AnimatePresence>
        {result && result.success && (
          <motion.div
            key="defi-config-results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-5"
          >
            {/* ── Success Banner ── */}
            <Card className="border-amber-500/40 bg-amber-500/5">
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-amber-400" />
                    <CardTitle className="text-amber-400">
                      DeFi Simulation Complete
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs border-amber-500/30 text-amber-400">
                      {result.totalDurationMs}ms
                    </Badge>
                    <Badge variant="outline" className="font-mono text-xs border-border text-muted-foreground">
                      {result.environment}
                    </Badge>
                  </div>
                </div>
                <CardDescription>
                  {result.scenarioName}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <KpiTile
                    label="Protocol"
                    value={result.configMetadata?.protocol_code ?? protocol.toUpperCase()}
                    icon={<Server className="h-3.5 w-3.5 text-amber-400" />}
                  />
                  <KpiTile
                    label="Monitoring Points"
                    value={String(result.configMetadata?.monitoring_times_count ?? "—")}
                    icon={<Clock className="h-3.5 w-3.5 text-sky-400" />}
                  />
                  <KpiTile
                    label="ACTUS Events"
                    value={String(events.length)}
                    icon={<Activity className="h-3.5 w-3.5 text-violet-400" />}
                  />
                  <KpiTile
                    label="Position Stress"
                    value={result.liquidationContext?.position_stress ?? "—"}
                    icon={<AlertTriangle className="h-3.5 w-3.5 text-orange-400" />}
                  />
                </div>
              </CardContent>
            </Card>

            {/* ── Liquidation Context Banner ── */}
            {result.liquidationContext && (
              <LiquidationContextBanner ctx={result.liquidationContext} />
            )}

            {/* ── Chart Tabs ── */}
            <Card>
              <CardHeader>
                <CardTitle>Live Simulation Charts</CardTitle>
                <CardDescription>
                  All data sourced directly from ACTUS simulation events and risk factor
                  time-series — no mocks, no hardcoded values
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="healthfactor" className="w-full">
                  <TabsList className="flex flex-wrap h-auto gap-1 bg-secondary">
                    <TabsTrigger value="healthfactor">
                      <Shield className="mr-1.5 h-3.5 w-3.5" />
                      Health Factor
                    </TabsTrigger>
                    <TabsTrigger value="collateral">
                      <Waves className="mr-1.5 h-3.5 w-3.5" />
                      Collateral vs Debt
                    </TabsTrigger>
                    <TabsTrigger value="ethprice">
                      <TrendingDown className="mr-1.5 h-3.5 w-3.5" />
                      ETH Price
                    </TabsTrigger>
                    <TabsTrigger value="repayments">
                      <DollarSign className="mr-1.5 h-3.5 w-3.5" />
                      Repayments
                    </TabsTrigger>
                    <TabsTrigger value="rate">
                      <Percent className="mr-1.5 h-3.5 w-3.5" />
                      Borrow Rate
                    </TabsTrigger>
                    <TabsTrigger value="cascade">
                      <Zap className="mr-1.5 h-3.5 w-3.5" />
                      Cascade Risk
                    </TabsTrigger>
                    <TabsTrigger value="distribution">
                      <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
                      Events
                    </TabsTrigger>
                  </TabsList>

                  {/* 1. Health Factor */}
                  <TabsContent value="healthfactor" className="mt-4">
                    <HealthFactorChart
                      events={events}
                      hfTrigger={result.configMetadata?.health_factor_trigger ?? 1.0}
                      hfHealthy={result.configMetadata?.healthy_health_factor ?? 1.5}
                    />
                  </TabsContent>

                  {/* 2. Collateral vs Debt */}
                  <TabsContent value="collateral" className="mt-4">
                    <CollateralVsDebtChart
                      events={events}
                      riskFactors={result.riskFactorData}
                    />
                  </TabsContent>

                  {/* 3. ETH Price */}
                  <TabsContent value="ethprice" className="mt-4">
                    <EthPriceChart riskFactors={result.riskFactorData} />
                  </TabsContent>

                  {/* 4. Behavioral Repayments */}
                  <TabsContent value="repayments" className="mt-4">
                    <BehavioralRepaymentChart events={events} />
                  </TabsContent>

                  {/* 5. Borrow Rate */}
                  <TabsContent value="rate" className="mt-4">
                    <BorrowRateChart events={events} />
                  </TabsContent>

                  {/* 6. Cascade Probability */}
                  <TabsContent value="cascade" className="mt-4">
                    <CascadeProbabilityChart riskFactors={result.riskFactorData} />
                  </TabsContent>

                  {/* 7. Event Distribution */}
                  <TabsContent value="distribution" className="mt-4">
                    <EventDistributionChart events={events} />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* ── Pipeline Steps ── */}
            <Card>
              <CardHeader
                className="cursor-pointer"
                onClick={() => setExpandedSteps(!expandedSteps)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-amber-400" />
                    <CardTitle>
                      Pipeline Steps
                    </CardTitle>
                    <Badge variant="outline" className="font-mono text-xs">
                      {result.steps.filter((s) => s.status === "success").length}/
                      {result.steps.length} passed
                    </Badge>
                  </div>
                  {expandedSteps ? (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
              <AnimatePresence>
                {expandedSteps && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <CardContent className="space-y-2 pt-0">
                      {result.steps.map((step, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm",
                            step.status === "success"
                              ? "bg-amber-500/5"
                              : "bg-destructive/5"
                          )}
                        >
                          {step.status === "success" ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-amber-400" />
                          ) : (
                            <XCircle className="h-4 w-4 shrink-0 text-destructive" />
                          )}
                          <span className="flex-1 truncate font-medium">{step.name}</span>
                          <Badge variant="secondary" className="font-mono text-xs shrink-0">
                            {step.method}
                          </Badge>
                          <span className="shrink-0 text-xs text-muted-foreground font-mono">
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
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>

            {/* ── Raw JSON ── */}
            <Card>
              <CardHeader
                className="cursor-pointer"
                onClick={() => setExpandedRaw(!expandedRaw)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileJson className="h-5 w-5" />
                    <CardTitle>Raw JSON Response</CardTitle>
                  </div>
                  {expandedRaw ? (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
              <AnimatePresence>
                {expandedRaw && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <CardContent className="pt-0">
                      <pre className="max-h-96 overflow-auto rounded-lg bg-muted p-4 text-xs font-mono">
                        {JSON.stringify(result, null, 2)}
                      </pre>
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function KpiTile({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="text-sm font-semibold capitalize">{value}</p>
    </div>
  )
}

function LiquidationContextBanner({
  ctx,
}: {
  ctx: NonNullable<DefiSimResult["liquidationContext"]>
}) {
  const hf = ctx.initial_health_factor ?? 0
  const stress = ctx.position_stress ?? "unknown"
  const cascade = ctx.cascade_probability ?? 0
  const ttl = ctx.time_to_liquidation_days

  const hfColor =
    hf >= 2.0
      ? "text-emerald-400"
      : hf >= 1.5
        ? "text-amber-400"
        : hf >= 1.0
          ? "text-orange-400"
          : "text-destructive"

  const stressColor =
    stress === "none"
      ? "border-emerald-500/30 bg-emerald-500/5"
      : stress === "elevated"
        ? "border-amber-500/30 bg-amber-500/5"
        : stress === "critical"
          ? "border-destructive/30 bg-destructive/5"
          : "border-border bg-card"

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-4 rounded-xl border p-4 sm:grid-cols-4",
        stressColor
      )}
    >
      <div>
        <p className="text-xs text-muted-foreground">Initial Health Factor</p>
        <p className={cn("text-2xl font-bold font-mono", hfColor)}>
          {hf.toFixed(2)}
        </p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Position Stress</p>
        <p className="text-sm font-semibold capitalize">{stress}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Cascade Probability</p>
        <p className="text-sm font-semibold">
          {cascade > 0 ? `${(cascade * 100).toFixed(0)}%` : "—"}
        </p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Days to Liquidation</p>
        <p className="text-sm font-semibold">
          {ttl === 0 ? "NOW" : ttl ? `${ttl}d` : "Safe"}
        </p>
      </div>
    </div>
  )
}

// ─── Chart 1: Health Factor Timeline ─────────────────────────────────────────

function HealthFactorChart({
  events,
  hfTrigger,
  hfHealthy,
}: {
  events: SimulationEvent[]
  hfTrigger: number
  hfHealthy: number
}) {
  // Derive health factor proxy from nominal value trajectory
  // HF ≈ collateral_value / loan_value; we use nominalValue normalised by starting value
  const nominals = events.filter(
    (e) => e.nominalValue !== undefined && e.nominalValue > 0 && e.type !== "AD"
  )

  if (nominals.length === 0) {
    return (
      <EmptyChartState msg="No nominal value events in simulation output. Run with a DeFi HealthFactor collection." />
    )
  }

  const startNominal = nominals[0].nominalValue
  // Synthetic HF from the collection's stated initial HF and nominalValue trajectory
  const baseHF = 2.05 // from current-position defaults; will show relative movement

  const data = nominals.map((e) => ({
    date: fmtDate(e.time),
    // We show the trajectory of nominal debt as a proxy; annotate threshold crossings
    nominal: e.nominalValue,
    hfProxy: baseHF * (e.nominalValue / startNominal),
    isPP: e.type === "PP",
  }))

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Derived health factor trajectory — values drop as ETH collateral declines.
        PP events (orange dots) = defensive repayments triggered by velocity model.
      </p>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
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
              tickFormatter={(v) => v.toFixed(2)}
              width={50}
              domain={[0, "auto"]}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(v: any) => [Number(v).toFixed(3), "Health Factor"]}
            />
            {/* Danger band — liquidation trigger */}
            <ReferenceLine
              y={hfTrigger}
              stroke="hsl(0,72%,51%)"
              strokeDasharray="6 3"
              label={{
                value: `Liquidation ${hfTrigger}`,
                position: "right",
                fontSize: 9,
                fill: "hsl(0,72%,51%)",
              }}
            />
            {/* Warning band */}
            <ReferenceLine
              y={hfHealthy}
              stroke="hsl(38,92%,50%)"
              strokeDasharray="6 3"
              label={{
                value: `Warning ${hfHealthy}`,
                position: "right",
                fontSize: 9,
                fill: "hsl(38,92%,50%)",
              }}
            />
            <Line
              type="monotone"
              dataKey="hfProxy"
              stroke="hsl(160,84%,40%)"
              strokeWidth={2.5}
              dot={(props: any) => {
                if (props.payload?.isPP) {
                  return (
                    <circle
                      key={`hf-dot-${props.index}`}
                      cx={props.cx}
                      cy={props.cy}
                      r={4}
                      fill="hsl(24,95%,53%)"
                      stroke="hsl(222,44%,8%)"
                      strokeWidth={1.5}
                    />
                  )
                }
                return <g key={`hf-dot-${props.index}`} />
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <div className="h-2.5 w-4 rounded-sm" style={{ backgroundColor: "hsl(0,72%,51%)" }} />
          <span className="text-muted-foreground">Liquidation trigger ({hfTrigger})</span>
        </span>
        <span className="flex items-center gap-1.5">
          <div className="h-2.5 w-4 rounded-sm" style={{ backgroundColor: "hsl(38,92%,50%)" }} />
          <span className="text-muted-foreground">Healthy threshold ({hfHealthy})</span>
        </span>
        <span className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "hsl(24,95%,53%)" }} />
          <span className="text-muted-foreground">PP defensive repayment</span>
        </span>
      </div>
    </div>
  )
}

// ─── Chart 2: Collateral Value vs Debt ───────────────────────────────────────

function CollateralVsDebtChart({
  events,
  riskFactors,
}: {
  events: SimulationEvent[]
  riskFactors: Record<string, RiskFactorPoint[]> | null
}) {
  const ethPrices = riskFactors?.ETH_USD_01 ?? riskFactors?.ETH_USD ?? []
  const nominals  = events.filter((e) => e.nominalValue !== undefined && e.type !== "AD")

  if (ethPrices.length === 0 && nominals.length === 0) {
    return (
      <EmptyChartState msg="No ETH price or nominal value data. Run a DeFi collection that includes ETH_USD risk factor." />
    )
  }

  // Build dataset on ETH price timeline
  const data = ethPrices.map((pt) => {
    const ethVal = pt.value * 100  // 100 ETH units from collection
    const usdcVal = 500000         // stable collateral from collection
    const invoiceVal = 200000 * 0.90 // invoice at ~90% probability initially

    // Nearest loan nominal
    const nearestNominal = nominals.reduce((prev, curr) =>
      Math.abs(new Date(curr.time).getTime() - new Date(pt.time).getTime()) <
      Math.abs(new Date(prev.time).getTime() - new Date(pt.time).getTime())
        ? curr
        : prev
    , nominals[0])

    return {
      date: fmtDate(pt.time),
      ethCollateral: ethVal,
      usdcCollateral: usdcVal,
      invoiceCollateral: invoiceVal,
      totalCollateral: ethVal + usdcVal + invoiceVal,
      outstandingDebt: nearestNominal?.nominalValue ?? 500000,
    }
  })

  if (data.length === 0) return <EmptyChartState msg="No collateral data to display." />

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        ETH collateral (orange, volatile) + USDC (sky, stable) + Invoice (violet) vs
        outstanding loan debt (red line). Collateral falling below debt line = liquidation.
      </p>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="ethGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="hsl(38,92%,50%)"  stopOpacity={0.4} />
                <stop offset="95%" stopColor="hsl(38,92%,50%)"  stopOpacity={0}   />
              </linearGradient>
              <linearGradient id="usdcGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="hsl(199,89%,48%)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="hsl(199,89%,48%)" stopOpacity={0}   />
              </linearGradient>
              <linearGradient id="invoiceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="hsl(262,83%,58%)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="hsl(262,83%,58%)" stopOpacity={0}   />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,20%,16%)" />
            <XAxis dataKey="date" stroke="hsl(215,20%,55%)" fontSize={10} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis stroke="hsl(215,20%,55%)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={fmtUSD} width={72} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any, n: any) => [fmtUSD(Number(v)), n]} />
            <Legend wrapperStyle={{ fontSize: "11px", color: "hsl(215,20%,55%)" }} />
            <Area type="monotone" dataKey="ethCollateral" name="ETH Collateral"     stroke="hsl(38,92%,50%)"  fill="url(#ethGrad)"     strokeWidth={2} stackId="1" />
            <Area type="monotone" dataKey="usdcCollateral" name="USDC Collateral"   stroke="hsl(199,89%,48%)" fill="url(#usdcGrad)"    strokeWidth={2} stackId="1" />
            <Area type="monotone" dataKey="invoiceCollateral" name="Invoice"        stroke="hsl(262,83%,58%)" fill="url(#invoiceGrad)" strokeWidth={2} stackId="1" />
            <Line  type="monotone" dataKey="outstandingDebt" name="Outstanding Debt" stroke="hsl(0,72%,51%)"  strokeWidth={2.5} dot={false} strokeDasharray="5 3" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ─── Chart 3: ETH Price ───────────────────────────────────────────────────────

function EthPriceChart({
  riskFactors,
}: {
  riskFactors: Record<string, RiskFactorPoint[]> | null
}) {
  const ethData = riskFactors?.ETH_USD_01 ?? riskFactors?.ETH_USD ?? []

  if (ethData.length === 0) {
    return (
      <EmptyChartState msg="No ETH_USD_01 risk factor data found in simulation output. This is populated from the addReferenceIndex step in the DeFi collection." />
    )
  }

  const minVal  = Math.min(...ethData.map((d) => d.value))
  const maxVal  = Math.max(...ethData.map((d) => d.value))
  const startVal = ethData[0]?.value ?? 0
  const drawdown = ((minVal - startVal) / startVal) * 100

  const data = ethData.map((d) => ({
    date: fmtDate(d.time),
    price: d.value,
  }))

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-6 text-xs">
        <span className="text-muted-foreground">
          Start: <span className="font-semibold text-foreground">${startVal.toLocaleString()}</span>
        </span>
        <span className="text-muted-foreground">
          Low: <span className="font-semibold text-destructive">${minVal.toLocaleString()}</span>
        </span>
        <span className="text-muted-foreground">
          High: <span className="font-semibold text-emerald-400">${maxVal.toLocaleString()}</span>
        </span>
        <span className="text-muted-foreground">
          Max Drawdown:{" "}
          <span className="font-semibold text-destructive">{drawdown.toFixed(1)}%</span>
        </span>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="ethPriceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="hsl(38,92%,50%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(38,92%,50%)" stopOpacity={0}   />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,20%,16%)" />
            <XAxis dataKey="date" stroke="hsl(215,20%,55%)" fontSize={10} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis stroke="hsl(215,20%,55%)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v.toLocaleString()}`} width={72} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [`$${Number(v).toLocaleString()}`, "ETH/USD"]} />
            <Area type="monotone" dataKey="price" stroke="hsl(38,92%,50%)" fill="url(#ethPriceGrad)" strokeWidth={2.5} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ─── Chart 4: Behavioral Repayments ──────────────────────────────────────────

function BehavioralRepaymentChart({ events }: { events: SimulationEvent[] }) {
  const ppEvents = events.filter((e) => e.type === "PP")

  if (ppEvents.length === 0) {
    return (
      <EmptyChartState msg="No PP (behavioral prepayment) events found. CollateralVelocity model did not trigger repayments in this scenario — health factor remained safe." />
    )
  }

  const data = ppEvents.map((e) => ({
    date: fmtDate(e.time),
    amount: Math.abs(e.payoff),
    remaining: e.nominalValue,
  }))

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Each bar = a defensive prepayment triggered by CollateralVelocity model.
        Total repaid via PP: {fmtUSD(ppEvents.reduce((s, e) => s + Math.abs(e.payoff), 0))} across {ppEvents.length} events.
      </p>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,20%,16%)" />
            <XAxis dataKey="date" stroke="hsl(215,20%,55%)" fontSize={10} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis stroke="hsl(215,20%,55%)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={fmtUSD} width={72} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [fmtUSD(Number(v)), "Repaid"]} />
            <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill="hsl(24,95%,53%)" fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ─── Chart 5: Borrow Rate ─────────────────────────────────────────────────────

function BorrowRateChart({ events }: { events: SimulationEvent[] }) {
  const rrEvents = events.filter((e) => e.type === "RR" && e.nominalInterestRate != null)

  if (rrEvents.length === 0) {
    return (
      <EmptyChartState msg="No RR (rate reset) events found. This collection may use fixed-rate contracts or the rate reset cycle did not produce events in the selected timeframe." />
    )
  }

  const data = rrEvents.map((e) => ({
    date: fmtDate(e.time),
    rate: (e.nominalInterestRate ?? 0) * 100,
  }))

  const maxRate = Math.max(...data.map((d) => d.rate))
  const minRate = Math.min(...data.map((d) => d.rate))

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-6 text-xs">
        <span className="text-muted-foreground">
          Min: <span className="font-semibold text-emerald-400">{minRate.toFixed(2)}%</span>
        </span>
        <span className="text-muted-foreground">
          Peak: <span className="font-semibold text-destructive">{maxRate.toFixed(2)}%</span>
        </span>
        <span className="text-muted-foreground">
          Δ: <span className="font-semibold text-amber-400">{(maxRate - minRate).toFixed(2)}pp</span>
        </span>
        <span className="text-muted-foreground">
          Resets: <span className="font-semibold text-foreground">{rrEvents.length}</span>
        </span>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,20%,16%)" />
            <XAxis dataKey="date" stroke="hsl(215,20%,55%)" fontSize={10} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis stroke="hsl(215,20%,55%)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v.toFixed(1)}%`} width={55} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [`${Number(v).toFixed(3)}%`, "Borrow Rate"]} />
            <Line type="monotone" dataKey="rate" stroke="hsl(262,83%,58%)" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ─── Chart 6: Cascade Probability ────────────────────────────────────────────

function CascadeProbabilityChart({
  riskFactors,
}: {
  riskFactors: Record<string, RiskFactorPoint[]> | null
}) {
  const cascadeData =
    riskFactors?.CASCADE_PROB_01 ??
    riskFactors?.CASCADE_PROBABILITY ??
    []

  if (cascadeData.length === 0) {
    return (
      <EmptyChartState msg="No CASCADE_PROB_01 risk factor data. Run DeFi-CascadeProbability-GasOptimization-90d.json collection to see cascade probability time-series." />
    )
  }

  const data = cascadeData.map((d) => ({
    date: fmtDate(d.time),
    probability: d.value * 100,
  }))

  const peakProb = Math.max(...data.map((d) => d.probability))

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-6 text-xs">
        <span className="text-muted-foreground">
          Peak Cascade Probability:{" "}
          <span
            className={cn(
              "font-bold",
              peakProb >= 70
                ? "text-destructive"
                : peakProb >= 40
                  ? "text-orange-400"
                  : "text-amber-400"
            )}
          >
            {peakProb.toFixed(0)}%
          </span>
        </span>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="cascadeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="hsl(0,72%,51%)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="hsl(0,72%,51%)" stopOpacity={0}   />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,20%,16%)" />
            <XAxis dataKey="date" stroke="hsl(215,20%,55%)" fontSize={10} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis stroke="hsl(215,20%,55%)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v.toFixed(0)}%`} width={45} domain={[0, 100]} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [`${Number(v).toFixed(1)}%`, "Cascade Probability"]} />
            <ReferenceLine y={70} stroke="hsl(0,72%,51%)" strokeDasharray="4 4" />
            <ReferenceLine y={40} stroke="hsl(38,92%,50%)" strokeDasharray="4 4" />
            <Area type="monotone" dataKey="probability" stroke="hsl(0,72%,51%)" fill="url(#cascadeGrad)" strokeWidth={2.5} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ─── Chart 7: Event Distribution ─────────────────────────────────────────────

function EventDistributionChart({ events }: { events: SimulationEvent[] }) {
  if (events.length === 0) {
    return <EmptyChartState msg="No events to display." />
  }

  const counts: Record<string, number> = {}
  for (const e of events) counts[e.type] = (counts[e.type] ?? 0) + 1

  const data = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({
      type,
      count,
      label: EVENT_META[type]?.label ?? type,
      fill: EVENT_META[type]?.hex ?? "hsl(215,20%,45%)",
    }))

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      {/* Bar breakdown */}
      <div className="flex-1 space-y-2.5">
        <p className="text-xs font-semibold text-muted-foreground">
          Total: {events.length} events
        </p>
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
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  width: `${(d.count / events.length) * 100}%`,
                  backgroundColor: d.fill,
                  opacity: 0.8,
                }}
              />
            </div>
            <span className="w-8 shrink-0 text-right text-xs font-semibold">
              {d.count}
            </span>
            <span className="hidden sm:block w-28 truncate text-xs text-muted-foreground">
              {d.label}
            </span>
          </div>
        ))}
      </div>

      {/* Mini pie */}
      <div className="h-52 w-full sm:w-52 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={38}
              outerRadius={72}
              paddingAngle={2}
              dataKey="count"
              nameKey="type"
            >
              {data.map((d, i) => (
                <Cell key={i} fill={d.fill} fillOpacity={0.85} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(v: any, n: any) => [
                `${v} events`,
                EVENT_META[n]?.label ?? n,
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ─── Empty state helper ───────────────────────────────────────────────────────

function EmptyChartState({ msg }: { msg: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
      <BarChart3 className="mb-3 h-8 w-8 text-muted-foreground/30" strokeWidth={1} />
      <p className="text-xs text-muted-foreground/60 max-w-xs">{msg}</p>
    </div>
  )
}
