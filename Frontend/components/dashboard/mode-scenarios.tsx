"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  BookOpen,
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Filter,
  Search,
  BarChart3,
  AlertTriangle,
  Shield,
  Zap,
  FlaskConical,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ResultsPanel } from "./results-panel"
import type { Scenario, VerifyResponse } from "@/lib/types"
import { getScenarios, verifyPortfolio } from "@/lib/api"
import { cn } from "@/lib/utils"

const categoryConfig: Record<
  string,
  { icon: typeof Shield; color: string; bgColor: string }
> = {
  Compliant: {
    icon: Shield,
    color: "text-success",
    bgColor: "bg-success/10",
  },
  "Non-Compliant": {
    icon: AlertTriangle,
    color: "text-destructive",
    bgColor: "bg-destructive/10",
  },
  "Stress Test": {
    icon: Zap,
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
}

const difficultyColor: Record<string, string> = {
  Easy: "bg-success/20 text-success",
  Medium: "bg-accent/20 text-accent",
  Hard: "bg-destructive/20 text-destructive",
}

export function ModeScenarios() {
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [loadError, setLoadError] = useState<string>("")
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(
    null
  )
  const [filter, setFilter] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("All")
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<VerifyResponse | null>(null)

  useEffect(() => {
    getScenarios()
      .then((data) => {
        setScenarios(data)
        setLoadError("")
      })
      .catch((err) => {
        setScenarios([])
        setLoadError(`Failed to load scenarios: ${err?.message || "Backend unreachable"}. Ensure the server is running on localhost:4000.`)
      })
  }, [])

  const categories = [
    "All",
    ...new Set(scenarios.map((s) => s.category)),
  ]

  const filtered = scenarios.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(filter.toLowerCase()) ||
      s.description.toLowerCase().includes(filter.toLowerCase())
    const matchesCategory =
      categoryFilter === "All" || s.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const handleRun = async (scenario: Scenario) => {
    setSelectedScenario(scenario)
    setIsRunning(true)
    setResult(null)
    setLoadError("")
    try {
      const res = await verifyPortfolio(
        scenario.portfolio,
        scenario.thresholds
      )
      setResult(res)
    } catch (err: any) {
      setResult(null)
      setLoadError(`Verification failed: ${err?.message || "Unknown error"}. Ensure the backend and ACTUS server are running.`)
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Scenario List */}
      <div className="flex w-full flex-col gap-4 lg:w-96 lg:shrink-0">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">
              Test Scenarios
            </h3>
            <Badge variant="secondary" className="ml-auto bg-secondary text-secondary-foreground">
              {filtered.length}
            </Badge>
          </div>

          {/* Search */}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search scenarios..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-secondary pl-9 text-sm text-foreground"
            />
          </div>

          {/* Category Filters */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={cn(
                  "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                  categoryFilter === cat
                    ? "bg-primary/20 text-primary"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                )}
              >
                {cat !== "All" && <Filter className="h-3 w-3" />}
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Error Display */}
        {loadError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <div className="flex items-start gap-2">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <p className="text-sm text-destructive">{loadError}</p>
            </div>
          </div>
        )}

        {/* Scenario Cards */}
        <div className="flex flex-col gap-2">
          {filtered.map((scenario, i) => {
            const config =
              categoryConfig[scenario.category] || categoryConfig.Compliant
            const CategoryIcon = config.icon

            return (
              <motion.button
                key={scenario.id}
                type="button"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => {
                  setSelectedScenario(scenario)
                  setResult(null)
                }}
                className={cn(
                  "group flex items-start gap-3 rounded-lg border p-4 text-left transition-all",
                  selectedScenario?.id === scenario.id
                    ? "border-primary/50 bg-primary/5"
                    : "border-border bg-card hover:border-primary/30 hover:bg-secondary/50"
                )}
              >
                <div
                  className={cn(
                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                    config.bgColor
                  )}
                >
                  <CategoryIcon className={cn("h-4 w-4", config.color)} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground">
                      {scenario.name}
                    </p>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {scenario.description}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        difficultyColor[scenario.difficulty] ||
                          "bg-secondary text-secondary-foreground"
                      )}
                    >
                      {scenario.difficulty}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      {scenario.expectedResult === "COMPLIANT" ? (
                        <CheckCircle2 className="h-3 w-3 text-success" />
                      ) : (
                        <XCircle className="h-3 w-3 text-destructive" />
                      )}
                      Expected:{" "}
                      {scenario.expectedResult === "COMPLIANT"
                        ? "Pass"
                        : "Fail"}
                    </span>
                  </div>
                </div>
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Scenario Detail & Results */}
      <div className="min-w-0 flex-1">
        <AnimatePresence mode="wait">
          {selectedScenario ? (
            <motion.div
              key={selectedScenario.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col gap-4"
            >
              {/* Scenario Detail Card */}
              <div className="rounded-lg border border-border bg-card p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">
                      {selectedScenario.name}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selectedScenario.description}
                    </p>
                  </div>
                  <Button
                    onClick={() => handleRun(selectedScenario)}
                    disabled={isRunning}
                    className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {isRunning ? (
                      <>
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                        Running...
                      </>
                    ) : (
                      <>
                        <Play className="mr-1.5 h-4 w-4" />
                        Run Scenario
                      </>
                    )}
                  </Button>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div className="rounded-md bg-secondary p-3">
                    <p className="text-xs text-muted-foreground">Category</p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {selectedScenario.category}
                    </p>
                  </div>
                  <div className="rounded-md bg-secondary p-3">
                    <p className="text-xs text-muted-foreground">Difficulty</p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {selectedScenario.difficulty}
                    </p>
                  </div>
                  <div className="rounded-md bg-secondary p-3">
                    <p className="text-xs text-muted-foreground">Contracts</p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {selectedScenario.portfolio.contracts.length}
                    </p>
                  </div>
                  <div className="rounded-md bg-secondary p-3">
                    <p className="text-xs text-muted-foreground">
                      Expected Result
                    </p>
                    <p
                      className={cn(
                        "mt-1 text-sm font-medium",
                        selectedScenario.expectedResult === "COMPLIANT"
                          ? "text-success"
                          : "text-destructive"
                      )}
                    >
                      {selectedScenario.expectedResult === "COMPLIANT"
                        ? "Compliant"
                        : "Non-Compliant"}
                    </p>
                  </div>
                </div>

                {/* Thresholds Overview */}
                <div className="mt-4 rounded-md bg-secondary p-3">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    Configured Thresholds
                  </p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Backing:</span>
                      <span className="font-mono text-foreground">
                        {selectedScenario.thresholds.backingRatio}%
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Liquidity:</span>
                      <span className="font-mono text-foreground">
                        {selectedScenario.thresholds.liquidityRatio}%
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">
                        Concentration:
                      </span>
                      <span className="font-mono text-foreground">
                        {selectedScenario.thresholds.concentrationLimit}%
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Quality:</span>
                      <span className="font-mono text-foreground">
                        {selectedScenario.thresholds.assetQuality}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Results */}
              <AnimatePresence>
                {isRunning && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center justify-center rounded-lg border border-border bg-card p-12"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">
                        Verifying scenario against ACTUS engine...
                      </p>
                    </div>
                  </motion.div>
                )}
                {result && !isRunning && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <ResultsPanel result={result} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 py-20"
            >
              <BookOpen className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-sm font-medium text-muted-foreground">
                Select a scenario to explore
              </p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                Choose from pre-built test cases to verify compliance
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
