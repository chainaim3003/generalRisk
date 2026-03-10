"use client"

import { useState, useCallback, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Plus,
  Trash2,
  Copy,
  Play,
  Loader2,
  ChevronDown,
  ChevronUp,
  Save,
  Code2,
  Scale,
  Landmark,
  DollarSign,
  FileText,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Layers,
  Banknote,
  Building2,
  Briefcase,
  HelpCircle,
} from "lucide-react"
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { ResultsPanel } from "./results-panel"
import type {
  Contract,
  Portfolio,
  Thresholds,
  Jurisdiction,
  VerifyResponse,
  ContractFormType,
} from "@/lib/types"
import { defaultThresholds } from "@/lib/sample-data"
import { verifyPortfolio } from "@/lib/api"
import { cn } from "@/lib/utils"

const CONTRACT_TYPES: { value: ContractFormType; label: string; desc: string }[] = [
  { value: "PAM", label: "PAM", desc: "Principal at Maturity" },
  { value: "ANN", label: "ANN", desc: "Annuity" },
  { value: "NAM", label: "NAM", desc: "Negative Amortizer" },
  { value: "LAM", label: "LAM", desc: "Linear Amortizer" },
  { value: "CLM", label: "CLM", desc: "Call Money" },
]

const CURRENCIES = ["USD", "EUR", "GBP", "CHF", "JPY"]
const DAY_COUNT_CONVENTIONS = ["A365", "A360", "30E360", "30360", "AA"]

const RESERVE_TYPES: { value: Contract["reserveType"]; label: string; color: string; icon: typeof Banknote }[] = [
  { value: "cash", label: "Cash", color: "text-chart-1", icon: Banknote },
  { value: "treasury", label: "Treasury", color: "text-chart-2", icon: Landmark },
  { value: "corporate", label: "Corporate", color: "text-chart-3", icon: Building2 },
  { value: "other", label: "Other", color: "text-chart-5", icon: Briefcase },
]

const CHART_COLORS = [
  "hsl(160, 84%, 40%)",
  "hsl(199, 89%, 48%)",
  "hsl(38, 92%, 50%)",
  "hsl(262, 83%, 58%)",
]

function generateId() {
  return `ct-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

function createEmptyContract(): Contract {
  const now = new Date()
  const maturity = new Date(now)
  maturity.setMonth(maturity.getMonth() + 6)
  return {
    contractType: "PAM",
    contractID: generateId(),
    statusDate: now.toISOString().slice(0, 10) + "T00:00:00",
    contractRole: "RPA",
    contractDealDate: now.toISOString().slice(0, 10) + "T00:00:00",
    currency: "USD",
    notionalPrincipal: 100000,
    maturityDate: maturity.toISOString().slice(0, 10) + "T00:00:00",
    nominalInterestRate: 0.045,
    initialExchangeDate: now.toISOString().slice(0, 10) + "T00:00:00",
    dayCountConvention: "A365",
    reserveType: "cash",
    liquidityScore: 90,
    creditRating: 85,
  }
}

function dateToInput(isoDate?: string): string {
  if (!isoDate) return ""
  return isoDate.slice(0, 10)
}

function inputToDate(val: string): string {
  return val ? val + "T00:00:00" : ""
}

export function ModeManual() {
  const [portfolioId, setPortfolioId] = useState("portfolio-001")
  const [totalNotional, setTotalNotional] = useState("1000000")
  const [description, setDescription] = useState("")
  const [contracts, setContracts] = useState<Contract[]>([createEmptyContract()])
  const [expandedCards, setExpandedCards] = useState<Set<string>>(
    new Set([contracts[0].contractID])
  )
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction>("us-genius")
  const [thresholds, setThresholds] = useState<Thresholds>(defaultThresholds["us-genius"])
  const [showPayload, setShowPayload] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [result, setResult] = useState<VerifyResponse | null>(null)
  const [error, setError] = useState<string>("")

  // -- Contract management --
  const addContract = useCallback(() => {
    const newContract = createEmptyContract()
    setContracts((prev) => [...prev, newContract])
    setExpandedCards((prev) => new Set([...prev, newContract.contractID]))
  }, [])

  const duplicateContract = useCallback((contract: Contract) => {
    const dup: Contract = {
      ...contract,
      contractID: generateId(),
    }
    setContracts((prev) => [...prev, dup])
    setExpandedCards((prev) => new Set([...prev, dup.contractID]))
  }, [])

  const removeContract = useCallback((id: string) => {
    setContracts((prev) => prev.filter((c) => c.contractID !== id))
    setExpandedCards((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])

  const updateContract = useCallback((id: string, field: string, value: unknown) => {
    setContracts((prev) =>
      prev.map((c) => (c.contractID === id ? { ...c, [field]: value } : c))
    )
  }, [])

  const toggleCard = useCallback((id: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // -- Statistics --
  const stats = useMemo(() => {
    const assets = contracts.filter((c) => c.contractRole === "RPA")
    const liabilities = contracts.filter((c) => c.contractRole === "RPL")
    const assetSum = assets.reduce((s, c) => s + (c.notionalPrincipal || 0), 0)
    const liabilitySum = liabilities.reduce((s, c) => s + (c.notionalPrincipal || 0), 0)
    const byType: Record<string, { count: number; value: number }> = {}
    for (const a of assets) {
      const t = a.reserveType || "Other"
      if (!byType[t]) byType[t] = { count: 0, value: 0 }
      byType[t].count++
      byType[t].value += a.notionalPrincipal || 0
    }
    return { assets, liabilities, assetSum, liabilitySum, byType }
  }, [contracts])

  const pieData = useMemo(() => {
    return Object.entries(stats.byType).map(([type, data]) => ({
      name: type,
      value: data.value,
      count: data.count,
    }))
  }, [stats.byType])

  const validationChecks = useMemo(() => {
    return {
      hasContracts: contracts.length > 0,
      hasAssets: stats.assets.length > 0,
      allDatesSet: contracts.every((c) => c.statusDate && c.maturityDate),
      allNotionals: contracts.every((c) => (c.notionalPrincipal || 0) > 0),
    }
  }, [contracts, stats.assets.length])

  const isValid = Object.values(validationChecks).every(Boolean)

  // -- Jurisdiction --
  const handleJurisdiction = (j: Jurisdiction) => {
    setJurisdiction(j)
    setThresholds(defaultThresholds[j])
  }

  // -- Portfolio payload --
  const portfolio: Portfolio = useMemo(
    () => ({
      id: portfolioId,
      totalNotional: Number(totalNotional) || 0,
      description,
      contracts,
    }),
    [portfolioId, totalNotional, description, contracts]
  )

  // -- Verify --
  const handleVerify = async () => {
    setIsVerifying(true)
    setResult(null)
    setError("")
    try {
      const res = await verifyPortfolio(portfolio, thresholds)
      setResult(res)
    } catch (err: any) {
      // Show error instead of demo data
      const errorMessage = err?.message || "Unknown error occurred"
      setError(`Verification failed: ${errorMessage}. Please ensure the backend server is running on localhost:4000 and ACTUS server is accessible.`)
      console.error("[ERROR] Verification failed:", err)
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Portfolio Metadata */}
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Portfolio Metadata
              </h3>
              <p className="text-xs text-muted-foreground">
                Define the high-level portfolio configuration
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const blob = new Blob([JSON.stringify(portfolio, null, 2)], {
                type: "application/json",
              })
              const url = URL.createObjectURL(blob)
              const a = document.createElement("a")
              a.href = url
              a.download = `${portfolioId}.json`
              a.click()
              URL.revokeObjectURL(url)
            }}
            className="border-border text-foreground bg-transparent"
          >
            <Save className="mr-1.5 h-3.5 w-3.5" />
            Save
          </Button>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs text-muted-foreground">
              Portfolio ID
            </label>
            <Input
              value={portfolioId}
              onChange={(e) => setPortfolioId(e.target.value)}
              className="bg-secondary font-mono text-sm text-foreground"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-muted-foreground">
              Total Notional (USD)
            </label>
            <Input
              value={totalNotional}
              onChange={(e) => setTotalNotional(e.target.value.replace(/[^0-9]/g, ""))}
              className="bg-secondary font-mono text-sm text-foreground"
              placeholder="1000000"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-muted-foreground">
              Description
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-secondary text-sm text-foreground"
              placeholder="Describe this portfolio..."
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Left: Contract Builder */}
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">
                Contract Builder
              </h3>
              <Badge variant="secondary" className="bg-secondary text-secondary-foreground">
                {contracts.length}
              </Badge>
            </div>
            <Button
              onClick={addContract}
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Contract
            </Button>
          </div>

          <div className="scrollbar-thin flex max-h-[600px] flex-col gap-3 overflow-y-auto pr-1">
            <AnimatePresence initial={false}>
              {contracts.map((contract, idx) => {
                const isExpanded = expandedCards.has(contract.contractID)
                const isAsset = contract.contractRole === "RPA"
                const reserveConfig = RESERVE_TYPES.find(
                  (r) => r.value === contract.reserveType
                )

                return (
                  <motion.div
                    key={contract.contractID}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div
                      className={cn(
                        "rounded-lg border bg-card transition-colors",
                        isAsset ? "border-primary/20" : "border-accent/20"
                      )}
                    >
                      {/* Card Header */}
                      <button
                        type="button"
                        onClick={() => toggleCard(contract.contractID)}
                        className="flex w-full items-center justify-between p-4"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold",
                              isAsset
                                ? "bg-primary/10 text-primary"
                                : "bg-accent/10 text-accent"
                            )}
                          >
                            {idx + 1}
                          </div>
                          <div className="text-left">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-foreground">
                                {contract.contractType}
                              </span>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "border-0 text-xs",
                                  isAsset
                                    ? "bg-primary/10 text-primary"
                                    : "bg-accent/10 text-accent"
                                )}
                              >
                                {isAsset ? "Asset" : "Liability"}
                              </Badge>
                              {isAsset && reserveConfig && (
                                <Badge
                                  variant="outline"
                                  className="border-0 bg-secondary text-xs text-secondary-foreground"
                                >
                                  {reserveConfig.label}
                                </Badge>
                              )}
                            </div>
                            <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                              {contract.contractID} | $
                              {(contract.notionalPrincipal || 0).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                            onClick={(e) => {
                              e.stopPropagation()
                              duplicateContract(contract)
                            }}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation()
                              removeContract(contract.contractID)
                            }}
                            disabled={contracts.length <= 1}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </button>

                      {/* Card Body */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden border-t border-border"
                          >
                            <div className="flex flex-col gap-4 p-4">
                              {/* Row 1: Type, Role, ID */}
                              <div className="grid grid-cols-3 gap-3">
                                <div>
                                  <label className="mb-1 block text-xs text-muted-foreground">
                                    Contract Type
                                  </label>
                                  <select
                                    value={contract.contractType}
                                    onChange={(e) =>
                                      updateContract(
                                        contract.contractID,
                                        "contractType",
                                        e.target.value
                                      )
                                    }
                                    className="h-9 w-full rounded-md border border-border bg-secondary px-3 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
                                  >
                                    {CONTRACT_TYPES.map((ct) => (
                                      <option key={ct.value} value={ct.value}>
                                        {ct.label} - {ct.desc}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs text-muted-foreground">
                                    Role
                                  </label>
                                  <div className="grid grid-cols-2 gap-1">
                                    {(
                                      [
                                        { key: "RPA", label: "Asset" },
                                        { key: "RPL", label: "Liability" },
                                      ] as const
                                    ).map((role) => (
                                      <button
                                        key={role.key}
                                        type="button"
                                        onClick={() =>
                                          updateContract(
                                            contract.contractID,
                                            "contractRole",
                                            role.key
                                          )
                                        }
                                        className={cn(
                                          "h-9 rounded-md border text-xs font-medium transition-colors",
                                          contract.contractRole === role.key
                                            ? role.key === "RPA"
                                              ? "border-primary/50 bg-primary/10 text-primary"
                                              : "border-accent/50 bg-accent/10 text-accent"
                                            : "border-border text-muted-foreground hover:text-foreground"
                                        )}
                                      >
                                        {role.label}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs text-muted-foreground">
                                    Contract ID
                                  </label>
                                  <Input
                                    value={contract.contractID}
                                    onChange={(e) =>
                                      updateContract(
                                        contract.contractID,
                                        "contractID",
                                        e.target.value
                                      )
                                    }
                                    className="bg-secondary font-mono text-xs text-foreground"
                                  />
                                </div>
                              </div>

                              {/* Row 2: Notional, Rate, Currency, DCC */}
                              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                <div>
                                  <label className="mb-1 block text-xs text-muted-foreground">
                                    Notional Principal
                                  </label>
                                  <Input
                                    type="number"
                                    value={contract.notionalPrincipal || ""}
                                    onChange={(e) =>
                                      updateContract(
                                        contract.contractID,
                                        "notionalPrincipal",
                                        Number(e.target.value)
                                      )
                                    }
                                    className="bg-secondary font-mono text-sm text-foreground"
                                  />
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs text-muted-foreground">
                                    Interest Rate (%)
                                  </label>
                                  <Input
                                    type="number"
                                    step="0.001"
                                    value={
                                      contract.nominalInterestRate
                                        ? (contract.nominalInterestRate * 100).toFixed(2)
                                        : ""
                                    }
                                    onChange={(e) =>
                                      updateContract(
                                        contract.contractID,
                                        "nominalInterestRate",
                                        Number(e.target.value) / 100
                                      )
                                    }
                                    className="bg-secondary font-mono text-sm text-foreground"
                                  />
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs text-muted-foreground">
                                    Currency
                                  </label>
                                  <select
                                    value={contract.currency || "USD"}
                                    onChange={(e) =>
                                      updateContract(
                                        contract.contractID,
                                        "currency",
                                        e.target.value
                                      )
                                    }
                                    className="h-9 w-full rounded-md border border-border bg-secondary px-3 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
                                  >
                                    {CURRENCIES.map((c) => (
                                      <option key={c} value={c}>
                                        {c}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs text-muted-foreground">
                                    Day Count
                                  </label>
                                  <select
                                    value={contract.dayCountConvention || "A365"}
                                    onChange={(e) =>
                                      updateContract(
                                        contract.contractID,
                                        "dayCountConvention",
                                        e.target.value
                                      )
                                    }
                                    className="h-9 w-full rounded-md border border-border bg-secondary px-3 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
                                  >
                                    {DAY_COUNT_CONVENTIONS.map((d) => (
                                      <option key={d} value={d}>
                                        {d}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              {/* Row 3: Dates */}
                              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                <div>
                                  <label className="mb-1 block text-xs text-muted-foreground">
                                    Deal Date
                                  </label>
                                  <Input
                                    type="date"
                                    value={dateToInput(contract.contractDealDate)}
                                    onChange={(e) =>
                                      updateContract(
                                        contract.contractID,
                                        "contractDealDate",
                                        inputToDate(e.target.value)
                                      )
                                    }
                                    className="bg-secondary text-sm text-foreground"
                                  />
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs text-muted-foreground">
                                    Initial Exchange
                                  </label>
                                  <Input
                                    type="date"
                                    value={dateToInput(contract.initialExchangeDate)}
                                    onChange={(e) =>
                                      updateContract(
                                        contract.contractID,
                                        "initialExchangeDate",
                                        inputToDate(e.target.value)
                                      )
                                    }
                                    className="bg-secondary text-sm text-foreground"
                                  />
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs text-muted-foreground">
                                    Status Date
                                  </label>
                                  <Input
                                    type="date"
                                    value={dateToInput(contract.statusDate)}
                                    onChange={(e) =>
                                      updateContract(
                                        contract.contractID,
                                        "statusDate",
                                        inputToDate(e.target.value)
                                      )
                                    }
                                    className="bg-secondary text-sm text-foreground"
                                  />
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs text-muted-foreground">
                                    Maturity Date
                                  </label>
                                  <Input
                                    type="date"
                                    value={dateToInput(contract.maturityDate)}
                                    onChange={(e) =>
                                      updateContract(
                                        contract.contractID,
                                        "maturityDate",
                                        inputToDate(e.target.value)
                                      )
                                    }
                                    className="bg-secondary text-sm text-foreground"
                                  />
                                </div>
                              </div>

                              {/* Row 4: Asset-only fields */}
                              {isAsset && (
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  className="rounded-md border border-primary/10 bg-primary/5 p-4"
                                >
                                  <div className="mb-3 flex items-center gap-1.5">
                                    <HelpCircle className="h-3.5 w-3.5 text-primary" />
                                    <span className="text-xs font-medium text-primary">
                                      Asset Reserve Properties
                                    </span>
                                  </div>

                                  {/* Reserve Type */}
                                  <div className="mb-4">
                                    <label className="mb-1.5 block text-xs text-muted-foreground">
                                      Reserve Type
                                    </label>
                                    <div className="grid grid-cols-4 gap-1.5">
                                      {RESERVE_TYPES.map((rt) => (
                                        <button
                                          key={rt.value}
                                          type="button"
                                          onClick={() =>
                                            updateContract(
                                              contract.contractID,
                                              "reserveType",
                                              rt.value
                                            )
                                          }
                                          className={cn(
                                            "flex flex-col items-center gap-1 rounded-md border py-2 text-xs font-medium transition-colors",
                                            contract.reserveType === rt.value
                                              ? "border-primary/50 bg-primary/10 text-primary"
                                              : "border-border text-muted-foreground hover:text-foreground"
                                          )}
                                        >
                                          <rt.icon className="h-3.5 w-3.5" />
                                          {rt.label}
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Sliders */}
                                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                      <div className="mb-1.5 flex items-center justify-between">
                                        <label className="text-xs text-muted-foreground">
                                          Liquidity Score
                                        </label>
                                        <span className="font-mono text-xs font-medium text-foreground">
                                          {contract.liquidityScore ?? 50}
                                        </span>
                                      </div>
                                      <Slider
                                        value={[contract.liquidityScore ?? 50]}
                                        min={0}
                                        max={100}
                                        step={1}
                                        onValueChange={([v]) =>
                                          updateContract(
                                            contract.contractID,
                                            "liquidityScore",
                                            v
                                          )
                                        }
                                      />
                                    </div>
                                    <div>
                                      <div className="mb-1.5 flex items-center justify-between">
                                        <label className="text-xs text-muted-foreground">
                                          Credit Rating
                                        </label>
                                        <span className="font-mono text-xs font-medium text-foreground">
                                          {contract.creditRating ?? 50}
                                        </span>
                                      </div>
                                      <Slider
                                        value={[contract.creditRating ?? 50]}
                                        min={0}
                                        max={100}
                                        step={1}
                                        onValueChange={([v]) =>
                                          updateContract(
                                            contract.contractID,
                                            "creditRating",
                                            v
                                          )
                                        }
                                      />
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* Right: Stats + Thresholds */}
        <div className="flex w-full flex-col gap-4 lg:w-80 lg:shrink-0">
          {/* Real-time Stats */}
          <div className="rounded-lg border border-border bg-card p-4">
            <h4 className="mb-3 text-sm font-semibold text-foreground">
              Portfolio Statistics
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md bg-secondary p-3">
                <p className="text-xs text-muted-foreground">Assets</p>
                <p className="mt-0.5 text-lg font-bold text-foreground">
                  {stats.assets.length}
                </p>
                <p className="font-mono text-xs text-primary">
                  ${stats.assetSum.toLocaleString()}
                </p>
              </div>
              <div className="rounded-md bg-secondary p-3">
                <p className="text-xs text-muted-foreground">Liabilities</p>
                <p className="mt-0.5 text-lg font-bold text-foreground">
                  {stats.liabilities.length}
                </p>
                <p className="font-mono text-xs text-accent">
                  ${stats.liabilitySum.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Mini Donut Chart */}
            {pieData.length > 0 && (
              <div className="mt-4 h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                      nameKey="name"
                      strokeWidth={0}
                    >
                      {pieData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(222, 44%, 8%)",
                        border: "1px solid hsl(222, 20%, 16%)",
                        borderRadius: "8px",
                        color: "hsl(210, 40%, 96%)",
                        fontSize: "11px",
                      }}
                      formatter={(value: number) => [
                        `$${value.toLocaleString()}`,
                        "Value",
                      ]}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: "10px", color: "hsl(215, 20%, 55%)" }}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Validation Indicators */}
            <div className="mt-4 flex flex-col gap-1.5">
              {[
                { check: validationChecks.hasContracts, label: "Has contracts" },
                { check: validationChecks.hasAssets, label: "Has asset contracts" },
                { check: validationChecks.allDatesSet, label: "All dates configured" },
                { check: validationChecks.allNotionals, label: "All notionals set" },
              ].map((v) => (
                <div
                  key={v.label}
                  className="flex items-center gap-2 text-xs"
                >
                  {v.check ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-destructive" />
                  )}
                  <span
                    className={
                      v.check ? "text-muted-foreground" : "text-destructive"
                    }
                  >
                    {v.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Jurisdiction */}
          <div className="rounded-lg border border-border bg-card p-4">
            <h4 className="mb-3 text-sm font-semibold text-foreground">
              Regulatory Framework
            </h4>
            <div className="flex flex-col gap-2">
              {(
                [
                  { key: "eu-mica" as const, label: "EU MiCA", icon: Landmark },
                  { key: "us-genius" as const, label: "US GENIUS Act", icon: Scale },
                  { key: "custom" as const, label: "Custom", icon: DollarSign },
                ] as const
              ).map((j) => (
                <button
                  key={j.key}
                  type="button"
                  onClick={() => handleJurisdiction(j.key)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md border p-2.5 text-left transition-colors",
                    jurisdiction === j.key
                      ? "border-primary/50 bg-primary/10"
                      : "border-border hover:border-primary/30 hover:bg-secondary/50"
                  )}
                >
                  <j.icon
                    className={cn(
                      "h-4 w-4",
                      jurisdiction === j.key
                        ? "text-primary"
                        : "text-muted-foreground"
                    )}
                  />
                  <span className="text-sm font-medium text-foreground">
                    {j.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Threshold Sliders */}
          <div className="rounded-lg border border-border bg-card p-4">
            <h4 className="mb-3 text-sm font-semibold text-foreground">
              Thresholds
            </h4>
            <div className="flex flex-col gap-4">
              {[
                { key: "backingRatio" as const, label: "Backing Ratio", unit: "%", min: 0, max: 200 },
                { key: "liquidityRatio" as const, label: "Liquidity", unit: "%", min: 0, max: 100 },
                { key: "concentrationLimit" as const, label: "Concentration", unit: "%", min: 0, max: 100 },
                { key: "assetQuality" as const, label: "Asset Quality", unit: "", min: 0, max: 100 },
              ].map((s) => (
                <div key={s.key}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-xs text-muted-foreground">
                      {s.label}
                    </label>
                    <span className="font-mono text-xs font-medium text-foreground">
                      {thresholds[s.key]}
                      {s.unit}
                    </span>
                  </div>
                  <Slider
                    value={[thresholds[s.key]]}
                    min={s.min}
                    max={s.max}
                    step={1}
                    onValueChange={([v]) =>
                      setThresholds((prev) => ({ ...prev, [s.key]: v }))
                    }
                    disabled={jurisdiction !== "custom"}
                  />
                </div>
              ))}
            </div>
            {jurisdiction !== "custom" && (
              <p className="mt-3 text-xs text-muted-foreground">
                Locked to {jurisdiction === "eu-mica" ? "EU MiCA" : "US GENIUS Act"} defaults.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          variant="outline"
          onClick={() => setShowPayload(!showPayload)}
          className="flex-1 border-border text-foreground bg-transparent"
        >
          <Code2 className="mr-2 h-4 w-4" />
          {showPayload ? "Hide" : "Preview"} ACTUS Payload
        </Button>
        <Button
          onClick={handleVerify}
          disabled={!isValid || isVerifying}
          className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {isVerifying ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Submit to ACTUS & Verify
            </>
          )}
        </Button>
      </div>

      {!isValid && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-4 py-2 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5" />
          Please fix validation errors before submitting.
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-4 py-2 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </div>
      )}

      {/* Payload Preview */}
      <AnimatePresence>
        {showPayload && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-lg border border-border bg-card p-4">
              <h4 className="mb-2 text-sm font-semibold text-foreground">
                Generated ACTUS Payload
              </h4>
              <pre className="scrollbar-thin max-h-64 overflow-auto rounded-md bg-secondary p-4 font-mono text-xs leading-relaxed text-foreground">
                {JSON.stringify(
                  { portfolio, thresholds, actusUrl: "http://34.203.247.32:8083/eventsBatch" },
                  null,
                  2
                )}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <ResultsPanel result={result} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
