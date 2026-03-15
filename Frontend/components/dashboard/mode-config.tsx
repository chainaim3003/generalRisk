"use client"

import React, { useState, useCallback } from "react"
import {
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  Settings2,
  Building2,
  User,
  BarChart3,
  Server,
  FileJson,
  ChevronDown,
  ChevronRight,
  RotateCcw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import type {
  StimulationStepResult,
} from "@/lib/types"
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine,
} from "recharts"

// ═══════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════

interface IssuerThresholds {
  backingThreshold: number
  liquidityThreshold: number
  wamMaxDays: number
  bankStressThreshold: number
  baseQuality: number
  qualityFloor: number
  sovereignMaxDegradation: number
  maxSingleAssetShare: number
  hhiWarningThreshold: number
}

interface HolderPortfolio {
  initialUsd: number
  targetUsdc: number
  deployPct: number
}

interface ThresholdSet {
  br: number
  lq: number
  peg: number
  mr: number
  hqla: number
  cc: number
}

interface ConfigSimulationProps {
  entityType: "issuer" | "holder"
}

// ═══════════════════════════════════════════════════════════════════
// Presets — extracted from the real config JSON files on disk
// ═══════════════════════════════════════════════════════════════════

const ISS_PRESETS: Record<string, { label: string; thresholds: IssuerThresholds }> = {
  "us-genius": {
    label: "US GENIUS Act",
    thresholds: {
      backingThreshold: 1.0,
      liquidityThreshold: 0.2,
      wamMaxDays: 93,
      bankStressThreshold: 0.5,
      baseQuality: 100,
      qualityFloor: 50,
      sovereignMaxDegradation: 0.30,
      maxSingleAssetShare: 0.40,
      hhiWarningThreshold: 0.35,
    },
  },
  "eu-mica": {
    label: "EU MiCA",
    thresholds: {
      backingThreshold: 1.0,
      liquidityThreshold: 0.3,
      wamMaxDays: 60,
      bankStressThreshold: 0.4,
      baseQuality: 100,
      qualityFloor: 60,
      sovereignMaxDegradation: 0.20,
      maxSingleAssetShare: 0.30,
      hhiWarningThreshold: 0.25,
    },
  },
  conservative: {
    label: "Conservative",
    thresholds: {
      backingThreshold: 1.1,
      liquidityThreshold: 0.4,
      wamMaxDays: 45,
      bankStressThreshold: 0.3,
      baseQuality: 100,
      qualityFloor: 70,
      sovereignMaxDegradation: 0.15,
      maxSingleAssetShare: 0.25,
      hhiWarningThreshold: 0.20,
    },
  },
}

const HOL_PRESETS: Record<string, {
  label: string
  portfolio: HolderPortfolio
  good: ThresholdSet
  bad: ThresholdSet
}> = {
  conservative: {
    label: "Conservative",
    portfolio: { initialUsd: 150000, targetUsdc: 75000, deployPct: 30 },
    good: { br: 0.03, lq: 0.05, peg: 0.005, mr: 0.05, hqla: 98, cc: 0.10 },
    bad: { br: 0.08, lq: 0.20, peg: 0.015, mr: 0.15, hqla: 95, cc: 0.30 },
  },
  moderate: {
    label: "Moderate",
    portfolio: { initialUsd: 150000, targetUsdc: 75000, deployPct: 30 },
    good: { br: 0.05, lq: 0.10, peg: 0.01, mr: 0.10, hqla: 95, cc: 0.15 },
    bad: { br: 0.10, lq: 0.30, peg: 0.02, mr: 0.20, hqla: 90, cc: 0.40 },
  },
  aggressive: {
    label: "Aggressive",
    portfolio: { initialUsd: 150000, targetUsdc: 100000, deployPct: 50 },
    good: { br: 0.10, lq: 0.20, peg: 0.03, mr: 0.20, hqla: 90, cc: 0.25 },
    bad: { br: 0.20, lq: 0.50, peg: 0.05, mr: 0.40, hqla: 80, cc: 0.60 },
  },
}

// ═══════════════════════════════════════════════════════════════════
// API call
// ═══════════════════════════════════════════════════════════════════

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000/api"

async function runStablecoinSimulation(body: Record<string, unknown>): Promise<any> {
  const res = await fetch(`${API_BASE}/stablecoin-simulate`, {
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

// ═══════════════════════════════════════════════════════════════════
// Reusable input components
// ═══════════════════════════════════════════════════════════════════

function SliderRow({ label, value, min, max, step, unit, onChange }: {
  label: string; value: number; min: number; max: number; step: number; unit?: string; onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-40 shrink-0 text-[11px] text-slate-500">{label}</span>
      <Slider className="flex-1" min={min} max={max} step={step} value={[value]} onValueChange={([v]) => onChange(v)} />
      <span className="w-16 shrink-0 text-right font-mono text-[11px] font-semibold text-slate-700">{value}{unit || ""}</span>
    </div>
  )
}

function NumberInput({ label, value, onChange, prefix }: {
  label: string; value: number; onChange: (v: number) => void; prefix?: string
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-28 shrink-0 text-[11px] text-slate-500">{label}</span>
      <div className="flex items-center gap-1">
        {prefix && <span className="text-[11px] text-slate-400">{prefix}</span>}
        <input
          type="number"
          className="h-7 w-24 rounded border border-slate-200 bg-slate-50 px-2 text-[11px] font-mono text-slate-700"
          value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
        />
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Main component
// ═══════════════════════════════════════════════════════════════════

export function ConfigSimulationMode({ entityType }: ConfigSimulationProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<any | null>(null)
  const [error, setError] = useState("")
  const [expandedRaw, setExpandedRaw] = useState(false)
  const [environment, setEnvironment] = useState("localhost")
  const [vleiStatus, setVleiStatus] = useState<'idle' | 'signing' | 'signed' | 'error'>('idle')
  const [vleiResult, setVleiResult] = useState<any>(null)

  // Issuer state
  const [issThresholds, setIssThresholds] = useState<IssuerThresholds>(
    ISS_PRESETS["us-genius"].thresholds,
  )
  const [issPreset, setIssPreset] = useState("us-genius")

  // Holder state
  const [holPortfolio, setHolPortfolio] = useState<HolderPortfolio>(
    HOL_PRESETS.moderate.portfolio,
  )
  const [holGood, setHolGood] = useState<ThresholdSet>(HOL_PRESETS.moderate.good)
  const [holBad, setHolBad] = useState<ThresholdSet>(HOL_PRESETS.moderate.bad)
  const [holPreset, setHolPreset] = useState("moderate")

  const applyIssPreset = useCallback((key: string) => {
    setIssPreset(key)
    setIssThresholds({ ...ISS_PRESETS[key].thresholds })
  }, [])

  const applyHolPreset = useCallback((key: string) => {
    setHolPreset(key)
    setHolPortfolio({ ...HOL_PRESETS[key].portfolio })
    setHolGood({ ...HOL_PRESETS[key].good })
    setHolBad({ ...HOL_PRESETS[key].bad })
  }, [])

  const handleRun = async () => {
    setIsRunning(true)
    setError("")
    setResult(null)
    try {
      const body: Record<string, unknown> = { entityType, environment }
      if (entityType === "issuer") {
        body.issuerThresholds = issThresholds
      } else {
        body.holderPortfolio = holPortfolio
        body.holderGood = holGood
        body.holderBad = holBad
      }
      const response = await runStablecoinSimulation(body)
      setResult(response)
    } catch (err: any) {
      setError(err.message || "Simulation failed")
    } finally {
      setIsRunning(false)
    }
  }

  // ── Data extraction ──
  const portfolioHistory: any[] | null = (() => {
    if (!result?.simulation || !Array.isArray(result.simulation)) return null
    if (result.simulation.length > 0 && result.simulation[0]?.day !== undefined) return result.simulation
    return null
  })()

  const contractEvents: any[] | null = (() => {
    if (!result?.simulation || !Array.isArray(result.simulation)) return null
    if (result.simulation.length > 0 && (result.simulation[0]?.contractId !== undefined || result.simulation[0]?.contractID !== undefined)) return result.simulation
    return null
  })()

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════

  return (
    <div className="flex gap-6">
      {/* ═══════════════════════════════════════════════════════
         LEFT PANEL — Inputs
         ═══════════════════════════════════════════════════════ */}
      <div className="w-[370px] shrink-0 space-y-4 overflow-y-auto" style={{ maxHeight: "calc(100vh - 140px)" }}>
        {/* Title */}
        <div className="flex items-center gap-2">
          {entityType === "issuer" ? <Building2 className="h-5 w-5 text-emerald-600" /> : <User className="h-5 w-5 text-emerald-600" />}
          <h2 className="text-lg font-bold text-slate-800 capitalize">{entityType} Simulation</h2>
        </div>

        {/* ── ISSUER INPUTS ── */}
        {entityType === "issuer" && (
          <>
            <Card className="border-slate-200 shadow-none">
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="text-xs text-slate-600">Regulatory preset</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(ISS_PRESETS).map(([key, preset]) => (
                    <Button key={key} variant={issPreset === key ? "default" : "outline"} size="sm"
                      className="h-7 text-[11px]" onClick={() => applyIssPreset(key)}>
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-none">
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="text-xs text-slate-600">Thresholds</CardTitle>
                <CardDescription className="text-[10px]">Injected into ACTUS behavioral models</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 px-3 pb-3">
                <SliderRow label="Backing Threshold" value={issThresholds.backingThreshold} min={0.8} max={1.5} step={0.01} onChange={(v) => setIssThresholds((p) => ({ ...p, backingThreshold: v }))} />
                <SliderRow label="Liquidity Threshold" value={issThresholds.liquidityThreshold} min={0.05} max={0.6} step={0.01} onChange={(v) => setIssThresholds((p) => ({ ...p, liquidityThreshold: v }))} />
                <SliderRow label="WAM Max Days" value={issThresholds.wamMaxDays} min={14} max={180} step={1} unit="d" onChange={(v) => setIssThresholds((p) => ({ ...p, wamMaxDays: v }))} />
                <SliderRow label="Bank Stress" value={issThresholds.bankStressThreshold} min={0.1} max={0.9} step={0.01} onChange={(v) => setIssThresholds((p) => ({ ...p, bankStressThreshold: v }))} />
                <SliderRow label="Quality Floor" value={issThresholds.qualityFloor} min={20} max={100} step={1} onChange={(v) => setIssThresholds((p) => ({ ...p, qualityFloor: v }))} />
                <SliderRow label="Sovereign Degradation" value={issThresholds.sovereignMaxDegradation} min={0.05} max={0.6} step={0.01} onChange={(v) => setIssThresholds((p) => ({ ...p, sovereignMaxDegradation: v }))} />
                <SliderRow label="Max Single Asset" value={issThresholds.maxSingleAssetShare} min={0.1} max={0.8} step={0.01} onChange={(v) => setIssThresholds((p) => ({ ...p, maxSingleAssetShare: v }))} />
                <SliderRow label="HHI Warning" value={issThresholds.hhiWarningThreshold} min={0.1} max={0.6} step={0.01} onChange={(v) => setIssThresholds((p) => ({ ...p, hhiWarningThreshold: v }))} />
              </CardContent>
            </Card>
          </>
        )}

        {/* ── HOLDER INPUTS ── */}
        {entityType === "holder" && (
          <>
            <Card className="border-slate-200 shadow-none">
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="text-xs text-slate-600">Investor profile preset</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(HOL_PRESETS).map(([key, preset]) => (
                    <Button key={key} variant={holPreset === key ? "default" : "outline"} size="sm"
                      className="h-7 text-[11px]" onClick={() => applyHolPreset(key)}>
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-none">
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="text-xs text-slate-600">Portfolio</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 px-3 pb-3">
                <NumberInput label="Initial USD" value={holPortfolio.initialUsd} prefix="$" onChange={(v) => setHolPortfolio((p) => ({ ...p, initialUsd: v }))} />
                <NumberInput label="Target USDC" value={holPortfolio.targetUsdc} prefix="$" onChange={(v) => setHolPortfolio((p) => ({ ...p, targetUsdc: v }))} />
                <SliderRow label="Deploy % / Day" value={holPortfolio.deployPct} min={5} max={100} step={5} unit="%" onChange={(v) => setHolPortfolio((p) => ({ ...p, deployPct: v }))} />
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-none">
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="text-xs text-green-600">&quot;Good&quot; — Buy when all below</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 px-3 pb-3">
                <SliderRow label="Backing Risk" value={holGood.br} min={0.01} max={0.20} step={0.01} onChange={(v) => setHolGood((p) => ({ ...p, br: v }))} />
                <SliderRow label="Liquidity Risk" value={holGood.lq} min={0.01} max={0.30} step={0.01} onChange={(v) => setHolGood((p) => ({ ...p, lq: v }))} />
                <SliderRow label="Peg Deviation" value={holGood.peg} min={0.001} max={0.05} step={0.001} onChange={(v) => setHolGood((p) => ({ ...p, peg: v }))} />
                <SliderRow label="Market Risk" value={holGood.mr} min={0.01} max={0.30} step={0.01} onChange={(v) => setHolGood((p) => ({ ...p, mr: v }))} />
                <SliderRow label="HQLA above" value={holGood.hqla} min={80} max={100} step={1} onChange={(v) => setHolGood((p) => ({ ...p, hqla: v }))} />
                <SliderRow label="Custodian Conc." value={holGood.cc} min={0.01} max={0.30} step={0.01} onChange={(v) => setHolGood((p) => ({ ...p, cc: v }))} />
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-none">
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="text-xs text-red-500">&quot;Bad&quot; — Sell when any above</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 px-3 pb-3">
                <SliderRow label="Backing Risk" value={holBad.br} min={0.05} max={0.50} step={0.01} onChange={(v) => setHolBad((p) => ({ ...p, br: v }))} />
                <SliderRow label="Liquidity Risk" value={holBad.lq} min={0.10} max={0.70} step={0.01} onChange={(v) => setHolBad((p) => ({ ...p, lq: v }))} />
                <SliderRow label="Peg Deviation" value={holBad.peg} min={0.005} max={0.10} step={0.001} onChange={(v) => setHolBad((p) => ({ ...p, peg: v }))} />
                <SliderRow label="Market Risk" value={holBad.mr} min={0.05} max={0.60} step={0.01} onChange={(v) => setHolBad((p) => ({ ...p, mr: v }))} />
                <SliderRow label="HQLA below" value={holBad.hqla} min={70} max={100} step={1} onChange={(v) => setHolBad((p) => ({ ...p, hqla: v }))} />
                <SliderRow label="Custodian Conc." value={holBad.cc} min={0.10} max={0.80} step={0.01} onChange={(v) => setHolBad((p) => ({ ...p, cc: v }))} />
              </CardContent>
            </Card>
          </>
        )}

        {/* Environment + Run */}
        <div className="space-y-2">
          <select
            className="h-8 w-full rounded border border-slate-200 bg-slate-50 px-2 text-[11px] text-slate-700"
            value={environment}
            onChange={(e) => setEnvironment(e.target.value)}
          >
            <option value="localhost">localhost (8082/8083)</option>
            <option value="aws">AWS (34.203.247.32)</option>
          </select>

          <Button onClick={handleRun} disabled={isRunning} className="w-full" size="sm">
            {isRunning ? (
              <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Running…</>
            ) : (
              <><Play className="mr-2 h-3.5 w-3.5" /> Run Simulation</>
            )}
          </Button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
         RIGHT PANEL — Results
         ═══════════════════════════════════════════════════════ */}
      <div className="flex-1 min-w-0 overflow-y-auto" style={{ maxHeight: "calc(100vh - 140px)" }}>
        {/* No result yet */}
        {!result && !error && !isRunning && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center text-slate-400">
              <Settings2 className="mx-auto mb-3 h-12 w-12 opacity-30" />
              <p className="text-sm font-medium">Configure & run</p>
              <p className="text-xs mt-1">Adjust thresholds on the left, then click Run Simulation</p>
            </div>
          </div>
        )}

        {/* Loading */}
        {isRunning && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Loader2 className="mx-auto mb-3 h-10 w-10 animate-spin text-emerald-500" />
              <p className="text-sm text-slate-500">Running {entityType} simulation…</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <p className="text-sm font-medium text-red-700">Simulation failed</p>
            </div>
            <p className="mt-2 text-xs text-red-600 font-mono whitespace-pre-wrap">{error}</p>
          </div>
        )}

        {/* Results */}
        {result && result.success && (
          <div className="space-y-4">
            {/* Summary bar */}
            <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-700">Complete</span>
              <span className="text-xs text-emerald-600">{result.scenarioName}</span>
              <div className="ml-auto flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-600">{result.environment}</Badge>
                <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-600">{result.totalDurationMs}ms</Badge>
                <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-600">
                  {portfolioHistory ? `${portfolioHistory.length} days` : `${contractEvents?.length || 0} contracts`}
                </Badge>
                <button
                  type="button"
                  disabled={vleiStatus === 'signing'}
                  className={`flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-medium transition-colors ${
                    vleiStatus === 'signed'
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                      : vleiStatus === 'error'
                        ? 'border-red-300 bg-red-50 text-red-600'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                  }`}
                  onClick={async () => {
                    setVleiStatus('signing')
                    setVleiResult(null)
                    try {
                      const payload = {
                        entityType,
                        thresholds: entityType === 'issuer' ? issThresholds : { portfolio: holPortfolio, good: holGood, bad: holBad },
                        simulationResult: result,
                        timestamp: new Date().toISOString(),
                      }
                      const res = await fetch(`${API_BASE}/vlei-sign`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                      })
                      if (!res.ok) throw new Error(`${res.status}`)
                      const data = await res.json()
                      setVleiResult(data)
                      setVleiStatus('signed')
                    } catch {
                      setVleiStatus('error')
                    }
                  }}
                >
                  {vleiStatus === 'signing' && <Loader2 className="h-3 w-3 animate-spin" />}
                  {vleiStatus === 'signed' ? '\u2713 Signed' : vleiStatus === 'error' ? 'Sign failed' : vleiStatus === 'signing' ? 'Signing\u2026' : '\uD83D\uDD0F Sign vLEI'}
                </button>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { setResult(null); setError(""); setVleiStatus('idle'); setVleiResult(null) }}>
                  <RotateCcw className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Result tabs */}
            <Tabs defaultValue={portfolioHistory ? "portfolio" : contractEvents ? "metrics" : "charts"}>
              <TabsList className="mb-3">
                {portfolioHistory && (
                  <TabsTrigger value="portfolio"><BarChart3 className="mr-1.5 h-3.5 w-3.5" />Portfolio</TabsTrigger>
                )}
                {contractEvents && (
                  <TabsTrigger value="metrics"><BarChart3 className="mr-1.5 h-3.5 w-3.5" />Metrics</TabsTrigger>
                )}
                {portfolioHistory && contractEvents && (
                  <TabsTrigger value="contracts"><BarChart3 className="mr-1.5 h-3.5 w-3.5" />Contracts</TabsTrigger>
                )}
                <TabsTrigger value="charts"><BarChart3 className="mr-1.5 h-3.5 w-3.5" />Charts</TabsTrigger>
                {portfolioHistory && (
                  <TabsTrigger value="steps"><Server className="mr-1.5 h-3.5 w-3.5" />Steps</TabsTrigger>
                )}
                {portfolioHistory && (
                  <TabsTrigger value="riskFactors"><BarChart3 className="mr-1.5 h-3.5 w-3.5" />Risk Factors</TabsTrigger>
                )}
              </TabsList>

              {/* ── Portfolio (HOL) ── */}
              {portfolioHistory && (
                <TabsContent value="portfolio">
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
                          <th className="p-2">Day</th><th className="p-2 text-right">USD</th><th className="p-2 text-right">USDC</th>
                          <th className="p-2 text-right">Total</th><th className="p-2">Action</th><th className="p-2 text-right">Amt</th>
                          <th className="p-2 text-right">BR</th><th className="p-2 text-right">LQ</th><th className="p-2 text-right">PEG</th>
                          <th className="p-2 text-right">MR</th><th className="p-2 text-right">HQLA</th><th className="p-2 text-right">CC</th>
                        </tr>
                      </thead>
                      <tbody className="font-mono">
                        {portfolioHistory.map((row: any, i: number) => (
                          <tr key={i} className={`border-b border-slate-100 ${row.action === "BUY_USDC" ? "bg-green-50/50" : row.action === "SELL_USDC" ? "bg-red-50/50" : ""}`}>
                            <td className="p-2 font-semibold text-slate-700">{row.day}</td>
                            <td className="p-2 text-right text-slate-600">${(row.usd ?? 0).toLocaleString()}</td>
                            <td className="p-2 text-right text-slate-600">${(row.usdc ?? 0).toLocaleString()}</td>
                            <td className="p-2 text-right font-semibold text-slate-800">${(row.total ?? 0).toLocaleString()}</td>
                            <td className="p-2">
                              {row.action === "BUY_USDC" && <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">BUY</span>}
                              {row.action === "SELL_USDC" && <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700">SELL</span>}
                              {row.action === "HOLD" && <span className="text-slate-300">—</span>}
                            </td>
                            <td className="p-2 text-right text-slate-500">{row.amount > 0 ? `$${row.amount.toLocaleString()}` : ""}</td>
                            <td className={`p-2 text-right ${row.br > 0.10 ? "text-red-600 font-semibold" : "text-slate-500"}`}>{(row.br ?? 0).toFixed(2)}</td>
                            <td className={`p-2 text-right ${row.lq > 0.30 ? "text-red-600 font-semibold" : "text-slate-500"}`}>{(row.lq ?? 0).toFixed(2)}</td>
                            <td className={`p-2 text-right ${row.peg > 0.02 ? "text-red-600 font-semibold" : "text-slate-500"}`}>{(row.peg ?? 0).toFixed(3)}</td>
                            <td className={`p-2 text-right ${row.mr > 0.20 ? "text-red-600 font-semibold" : "text-slate-500"}`}>{(row.mr ?? 0).toFixed(2)}</td>
                            <td className={`p-2 text-right ${(row.hqla ?? 100) < 90 ? "text-red-600 font-semibold" : "text-slate-500"}`}>{row.hqla ?? ""}</td>
                            <td className={`p-2 text-right ${row.cc > 0.40 ? "text-red-600 font-semibold" : "text-slate-500"}`}>{(row.cc ?? 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {portfolioHistory.length > 0 && (() => {
                    const last = portfolioHistory[portfolioHistory.length - 1]
                    const first = portfolioHistory[0]
                    const buys = portfolioHistory.filter((r: any) => r.action === "BUY_USDC").length
                    const sells = portfolioHistory.filter((r: any) => r.action === "SELL_USDC").length
                    const initTotal = (first?.usd ?? 0) + (first?.usdc ?? 0)
                    return (
                      <div className="mt-3 flex flex-wrap gap-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                        <span>Final: <strong className="text-slate-800">${(last?.total ?? 0).toLocaleString()}</strong></span>
                        <span>Buys: <strong>{buys}</strong></span>
                        <span>Sells: <strong>{sells}</strong></span>
                        <span>{(last?.total ?? 0) >= initTotal ? "✅ Capital preserved" : "⚠️ Loss"}</span>
                      </div>
                    )
                  })()}
                </TabsContent>
              )}

              {/* ── Issuer Risk Metrics Table (ISS) ── */}
              {contractEvents && (() => {
                const liability = contractEvents.find((c: any) =>
                  (c.contractId || c.contractID || '').includes('Liability')
                )
                if (!liability) return null
                const ppEvts = (liability.events || []).filter((e: any) => e.type === 'PP')
                if (ppEvts.length === 0) return null
                const MODEL_NAMES = ['Backing Ratio', 'Compliance', 'Quality', 'Maturity', 'Concentration', 'Attestation']
                const MODELS_PER_DAY = 6
                const rows: any[] = []
                for (let i = 0; i < ppEvts.length; i += MODELS_PER_DAY) {
                  const chunk = ppEvts.slice(i, i + MODELS_PER_DAY)
                  if (chunk.length === 0) break
                  const dayNum = Math.floor(i / MODELS_PER_DAY) + 1
                  const date = chunk[0]?.time || ''
                  const payoffs = chunk.map((e: any) => e.payoff ?? 0)
                  const nominal = chunk[0]?.nominalValue ?? 0
                  const hasAlert = payoffs.some((p: number) => p !== 0)
                  rows.push({ dayNum, date, payoffs, nominal, hasAlert })
                }
                return (
                  <TabsContent value="metrics">
                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
                            <th className="p-2 w-10">Day</th>
                            <th className="p-2 w-28">Date</th>
                            {MODEL_NAMES.map((m) => <th key={m} className="p-2 text-right w-20">{m}</th>)}
                            <th className="p-2 text-right w-24">Nominal</th>
                            <th className="p-2 w-14">Status</th>
                          </tr>
                        </thead>
                        <tbody className="font-mono">
                          {rows.map((row) => (
                            <tr key={row.dayNum} className={`border-b border-slate-100 ${row.hasAlert ? 'bg-red-50/50' : ''}`}>
                              <td className="p-2 font-semibold text-slate-700">{row.dayNum}</td>
                              <td className="p-2 text-slate-500">{row.date?.split('T')[0] || ''}</td>
                              {row.payoffs.map((p: number, pi: number) => (
                                <td key={pi} className={`p-2 text-right ${p !== 0 ? 'text-red-600 font-semibold' : 'text-emerald-600'}`}>
                                  {p === 0 ? '0' : p.toFixed(2)}
                                </td>
                              ))}
                              {/* pad if fewer than 6 models */}
                              {row.payoffs.length < MODELS_PER_DAY && Array.from({ length: MODELS_PER_DAY - row.payoffs.length }).map((_: any, ki: number) => (
                                <td key={`pad-${ki}`} className="p-2 text-right text-slate-300">—</td>
                              ))}
                              <td className="p-2 text-right text-slate-600">{row.nominal.toLocaleString()}</td>
                              <td className="p-2">
                                {row.hasAlert
                                  ? <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700">ALERT</span>
                                  : <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">OK</span>
                                }
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                      <span>Days: <strong>{rows.length}</strong></span>
                      <span>PP Events: <strong>{ppEvts.length}</strong></span>
                      <span>Alert Days: <strong className="text-red-600">{rows.filter((r: any) => r.hasAlert).length}</strong></span>
                      <span>Clean Days: <strong className="text-emerald-600">{rows.filter((r: any) => !r.hasAlert).length}</strong></span>
                    </div>
                  </TabsContent>
                )
              })()}

              {/* ── Contracts (ISS) ── */}
              {contractEvents && (
                <TabsContent value="contracts" className="space-y-3">
                  {contractEvents.map((contract: any, idx: number) => {
                    const cid = contract.contractId || contract.contractID || `Contract ${idx}`
                    const events = contract.events || []
                    const ppEvents = events.filter((e: any) => e.type === "PP")
                    return (
                      <Card key={idx} className="border-slate-200 shadow-none">
                        <CardHeader className="pb-2 pt-3 px-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-xs font-mono text-slate-700">{cid}</CardTitle>
                            <div className="flex items-center gap-1.5">
                              <Badge variant="outline" className="text-[10px]">{events.length} events</Badge>
                              {ppEvents.length > 0 && <Badge className="bg-amber-100 text-amber-700 text-[10px]">{ppEvents.length} PP</Badge>}
                            </div>
                          </div>
                        </CardHeader>
                        {ppEvents.length > 0 && (
                          <CardContent className="px-3 pb-3">
                            <div className="max-h-40 overflow-y-auto rounded border border-slate-100 bg-slate-50 p-2 text-[10px] font-mono">
                              <div className="flex border-b border-slate-200 pb-1 text-slate-400">
                                <span className="w-40">Time</span><span className="w-10">Type</span>
                                <span className="w-20 text-right">Payoff</span><span className="w-20 text-right">Nominal</span>
                              </div>
                              {ppEvents.slice(0, 30).map((e: any, eidx: number) => (
                                <div key={eidx} className="flex py-0.5 text-slate-600">
                                  <span className="w-40">{e.time}</span><span className="w-10">{e.type}</span>
                                  <span className={`w-20 text-right ${e.payoff > 0 ? "text-green-600" : e.payoff < 0 ? "text-red-600" : ""}`}>{e.payoff?.toFixed(2)}</span>
                                  <span className="w-20 text-right">{e.nominalValue?.toFixed(2)}</span>
                                </div>
                              ))}
                              {ppEvents.length > 30 && <div className="pt-1 text-center text-slate-400">… {ppEvents.length - 30} more</div>}
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    )
                  })}
                </TabsContent>
              )}

              {/* ── Charts ── */}
              <TabsContent value="charts">
                <div className="space-y-5">
                  {/* HOL charts */}
                  {portfolioHistory && portfolioHistory.length > 0 && (
                    <>
                      <div>
                        <h4 className="mb-1.5 text-xs font-semibold text-slate-600">Portfolio balance (USD vs USDC)</h4>
                        <ResponsiveContainer width="100%" height={240}>
                          <AreaChart data={portfolioHistory}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                            <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" tickFormatter={(v: number) => `${(v/1000).toFixed(0)}k`} />
                            <Tooltip contentStyle={{ fontSize: 11, background: '#fff', border: '1px solid #e2e8f0' }} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <Area type="monotone" dataKey="usdc" stackId="1" fill="#22c55e" stroke="#16a34a" fillOpacity={0.6} name="USDC" />
                            <Area type="monotone" dataKey="usd" stackId="1" fill="#94a3b8" stroke="#64748b" fillOpacity={0.4} name="USD" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                      <div>
                        <h4 className="mb-1.5 text-xs font-semibold text-slate-600">Risk metrics</h4>
                        <ResponsiveContainer width="100%" height={200}>
                          <LineChart data={portfolioHistory}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                            <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                            <Tooltip contentStyle={{ fontSize: 11, background: '#fff', border: '1px solid #e2e8f0' }} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <Line type="monotone" dataKey="br" stroke="#ef4444" strokeWidth={1.5} dot={false} name="Backing Risk" />
                            <Line type="monotone" dataKey="lq" stroke="#f97316" strokeWidth={1.5} dot={false} name="Liquidity" />
                            <Line type="monotone" dataKey="mr" stroke="#3b82f6" strokeWidth={1.5} dot={false} name="Market Risk" />
                            <Line type="monotone" dataKey="peg" stroke="#8b5cf6" strokeWidth={1.5} dot={false} name="Peg Dev" />
                            <ReferenceLine y={holBad.br} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.4} />
                            <ReferenceLine y={holBad.lq} stroke="#f97316" strokeDasharray="4 4" strokeOpacity={0.4} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      <div>
                        <h4 className="mb-1.5 text-xs font-semibold text-slate-600">HQLA &amp; custodian concentration</h4>
                        <ResponsiveContainer width="100%" height={180}>
                          <LineChart data={portfolioHistory}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                            <YAxis yAxisId="left" tick={{ fontSize: 10 }} stroke="#0891b2" domain={[60, 100]} />
                            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} stroke="#dc2626" domain={[0, 1]} />
                            <Tooltip contentStyle={{ fontSize: 11, background: '#fff', border: '1px solid #e2e8f0' }} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <Line yAxisId="left" type="monotone" dataKey="hqla" stroke="#0891b2" strokeWidth={2} dot={false} name="HQLA Score" />
                            <Line yAxisId="right" type="monotone" dataKey="cc" stroke="#dc2626" strokeWidth={2} dot={false} name="Custodian Conc." />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      <div>
                        <h4 className="mb-1.5 text-xs font-semibold text-slate-600">Buy / sell actions</h4>
                        <ResponsiveContainer width="100%" height={140}>
                          <BarChart data={portfolioHistory.map((r: any) => ({ day: r.day, buy: r.action === 'BUY_USDC' ? r.amount : 0, sell: r.action === 'SELL_USDC' ? -r.amount : 0 }))}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                            <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" tickFormatter={(v: number) => `${(Math.abs(v)/1000).toFixed(0)}k`} />
                            <Tooltip contentStyle={{ fontSize: 11, background: '#fff', border: '1px solid #e2e8f0' }} />
                            <Bar dataKey="buy" fill="#22c55e" name="Buy USDC" />
                            <Bar dataKey="sell" fill="#ef4444" name="Sell USDC" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </>
                  )}
                  {/* ISS charts */}
                  {contractEvents && contractEvents.length > 0 && (
                    <>
                      <div>
                        <h4 className="mb-1.5 text-xs font-semibold text-slate-600">Events per contract</h4>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={contractEvents.map((c: any) => {
                            const cid = (c.contractId || c.contractID || '').replace('ISS-', '')
                            const evts = c.events || []
                            return { name: cid.length > 16 ? cid.slice(0, 16) + '…' : cid, total: evts.length, pp: evts.filter((e: any) => e.type === 'PP').length }
                          })}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="#94a3b8" angle={-15} textAnchor="end" height={45} />
                            <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                            <Tooltip contentStyle={{ fontSize: 11, background: '#fff', border: '1px solid #e2e8f0' }} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <Bar dataKey="total" fill="#94a3b8" name="Total Events" />
                            <Bar dataKey="pp" fill="#f59e0b" name="PP (Risk)" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      {(() => {
                        const liability = contractEvents.find((c: any) => (c.contractId || c.contractID || '').includes('Liability'))
                        if (!liability) return null
                        const ppEvts = (liability.events || []).filter((e: any) => e.type === 'PP' && e.payoff !== 0)
                        if (ppEvts.length === 0) return null
                        return (
                          <div>
                            <h4 className="mb-1.5 text-xs font-semibold text-slate-600">Liability PP payoffs ({ppEvts.length} events)</h4>
                            <ResponsiveContainer width="100%" height={200}>
                              <LineChart data={ppEvts.map((e: any, i: number) => ({ idx: i + 1, payoff: parseFloat((e.payoff ?? 0).toFixed(2)), nominal: parseFloat((e.nominalValue ?? 0).toFixed(2)) }))}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="idx" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                                <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                                <Tooltip contentStyle={{ fontSize: 11, background: '#fff', border: '1px solid #e2e8f0' }} />
                                <Legend wrapperStyle={{ fontSize: 11 }} />
                                <Line type="monotone" dataKey="payoff" stroke="#f59e0b" strokeWidth={1.5} dot={false} name="PP Payoff" />
                                <Line type="monotone" dataKey="nominal" stroke="#3b82f6" strokeWidth={1} dot={false} name="Nominal" />
                                <ReferenceLine y={0} stroke="#94a3b8" />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        )
                      })()}
                    </>
                  )}
                  {!portfolioHistory && !contractEvents && (
                    <div className="py-8 text-center text-sm text-slate-400">No chart data</div>
                  )}
                </div>
              </TabsContent>

              {/* ── Steps ── */}
              <TabsContent value="steps" className="space-y-1.5">
                {(result.steps || []).map((step: StimulationStepResult, idx: number) => (
                  <div key={idx} className="flex items-center justify-between rounded border border-slate-100 p-2 text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">{step.step}</span>
                      <span className="font-medium text-slate-700">{step.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {step.status === "success" ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <XCircle className="h-3 w-3 text-red-500" />}
                      {step.httpStatus && <span className="text-[10px] text-slate-400">{step.httpStatus}</span>}
                      <span className="text-[10px] text-slate-400">{step.durationMs}ms</span>
                    </div>
                  </div>
                ))}
              </TabsContent>

              {/* ── Risk Factors ── */}
              <TabsContent value="riskFactors" className="space-y-3">
                {result.riskFactorData && Object.keys(result.riskFactorData).length > 0 ? (
                  Object.entries(result.riskFactorData).map(([name, data]: [string, any]) => (
                    <Card key={name} className="border-slate-200 shadow-none">
                      <CardHeader className="pb-1 pt-2 px-3">
                        <CardTitle className="text-[11px] font-mono text-slate-600">{name}</CardTitle>
                        <CardDescription className="text-[10px]">
                          {data.length} pts | {Math.min(...data.map((d: any) => d.value)).toFixed(4)} – {Math.max(...data.map((d: any) => d.value)).toFixed(4)}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="px-3 pb-2">
                        <div className="flex h-14 items-end gap-px">
                          {data.slice(0, 45).map((pt: any, i: number) => {
                            const max = Math.max(...data.map((d: any) => d.value))
                            const h = max > 0 ? (pt.value / max) * 100 : 0
                            return <div key={i} className="flex-1 rounded-t bg-emerald-400/60" style={{ height: `${Math.max(h, 1)}%` }} title={`${pt.time}: ${pt.value}`} />
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="py-8 text-center text-sm text-slate-400">No risk factor data</div>
                )}
              </TabsContent>
            </Tabs>

            {/* Raw JSON (collapsible) */}
            <div className="rounded-lg border border-slate-200">
              <div className="flex cursor-pointer items-center justify-between px-3 py-2">
                <div className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer" onClick={() => setExpandedRaw(!expandedRaw)}>
                  <FileJson className="h-3.5 w-3.5" />
                  <span>Raw JSON</span>
                  {expandedRaw ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
                </div>
                <button
                  type="button"
                  className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(result, null, 2))
                      .then(() => {
                        const btn = document.getElementById('copy-json-btn')
                        if (btn) { btn.textContent = 'Copied!'; setTimeout(() => { btn.textContent = 'Copy JSON' }, 1500) }
                      })
                  }}
                  id="copy-json-btn"
                >
                  Copy JSON
                </button>
              </div>
              {expandedRaw && (
                <pre className="max-h-80 overflow-auto border-t border-slate-100 bg-slate-50 p-3 text-[10px] font-mono text-slate-600">
                  {JSON.stringify(result, null, 2)}
                </pre>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
