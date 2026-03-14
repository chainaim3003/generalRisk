"use client"

import React, { useState } from "react"
import { motion } from "framer-motion"
import { 
  Play, 
  Loader2, 
  CheckCircle2, 
  Settings2, 
  Calendar, 
  Globe2, 
  Activity,
  User,
  Building2,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Server,
  FileJson,
  BarChart3,
  AlertTriangle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { runConfigSimulation, type ConfigSimulationRequest } from "@/lib/api"

export function ConfigSimulationMode() {
  const [entityType, setEntityType] = useState<"issuer" | "holder">("issuer")
  const [jurisdiction, setJurisdiction] = useState("us-genius")
  const [scenario, setScenario] = useState("current-march-2026")
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly">("daily")
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<any | null>(null)
  const [error, setError] = useState("")
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    rawJson: false
  })

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const handleRun = async () => {
    setIsRunning(true)
    setError("")
    setResult(null)

    try {
      const collectionFile = entityType === "issuer" 
        ? "Stables-HT-ISS-time-daily-5.json"
        : "Stables-HT-HOL-ONLY-3RD-SOURCE-time-daily-5.json"

      const request: ConfigSimulationRequest = {
        configData: {
          config_metadata: {
            config_id: `UI_${entityType.toUpperCase()}_${jurisdiction.toUpperCase()}_${Date.now()}`,
            collection_file: collectionFile
          },
          jurisdiction: {
            source: "file",
            file: `jurisdictions/${jurisdiction}.json`
          },
          market_scenario: {
            source: "file",
            file: `market-scenarios/${scenario}.json`
          },
          compliance_scenario: {
            source: "file",
            file: "compliance-scenarios/current-ops.json"
          },
          simulation_timeframe: {
            start_date: "2026-03-01T00:00:00",
            end_date: "2026-04-14T00:00:00",
            frequency: frequency
          }
        }
      }

      const response = await runConfigSimulation(request)
      setResult(response)
    } catch (err: any) {
      setError(err.message || "Failed to run simulation")
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Settings2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Config-Based Simulation</h2>
          <p className="text-sm text-muted-foreground">
            Test different regulatory frameworks and market scenarios
          </p>
        </div>
      </div>

      {/* Configuration Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Simulation Configuration</CardTitle>
          <CardDescription>
            Select entity type, jurisdiction, market scenario, and simulation parameters
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Entity Type Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Entity Type
            </Label>
            <Select value={entityType} onValueChange={(v) => setEntityType(v as "issuer" | "holder")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="issuer">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Issuer (Stablecoin Provider)</span>
                      <span className="text-xs text-muted-foreground">
                        Test reserve management and compliance
                      </span>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="holder">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Holder (Investor/User)</span>
                      <span className="text-xs text-muted-foreground">
                        Test holder portfolio and risk exposure
                      </span>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Jurisdiction Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Globe2 className="h-4 w-4" />
              Regulatory Jurisdiction
            </Label>
            <Select value={jurisdiction} onValueChange={setJurisdiction}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="us-genius">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">US GENIUS Act</span>
                    <span className="text-xs text-muted-foreground">
                      Backing: 100% | Liquidity: 20% | WAM: 93 days
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="eu-mica">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">EU MiCA</span>
                    <span className="text-xs text-muted-foreground">
                      Backing: 100% | Liquidity: 30% | WAM: 60 days (Stricter)
                    </span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Market Scenario */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Market Scenario
            </Label>
            <Select value={scenario} onValueChange={setScenario}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="baseline-normal">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Baseline - Normal Markets</span>
                    <span className="text-xs text-muted-foreground">
                      Calm conditions, low stress
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="current-march-2026">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Current March 2026</span>
                    <span className="text-xs text-muted-foreground">
                      Moderate stress scenario
                    </span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Frequency */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Simulation Frequency
            </Label>
            <Select value={frequency} onValueChange={(v) => setFrequency(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily (45 monitoring points)</SelectItem>
                <SelectItem value="weekly">Weekly (~7 monitoring points)</SelectItem>
                <SelectItem value="monthly">Monthly (~2 monitoring points)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Run Button */}
          <Button 
            onClick={handleRun} 
            disabled={isRunning}
            className="w-full"
            size="lg"
          >
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running Simulation...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Run {entityType === "issuer" ? "Issuer" : "Holder"} Simulation
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-destructive/50 bg-destructive/10 p-4"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <p className="text-sm font-medium text-destructive">Simulation Failed</p>
          </div>
          <p className="mt-2 text-sm text-destructive/80">{error}</p>
        </motion.div>
      )}

      {/* Results Display */}
      {result && result.success && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Summary Card */}
          <Card className="border-green-500/50 bg-green-500/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <CardTitle className="text-green-500">Simulation Complete</CardTitle>
                </div>
                <Badge variant="outline" className="text-green-500">
                  {result.totalDurationMs}ms
                </Badge>
              </div>
              <CardDescription>{result.scenarioName || result.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Entity Type</p>
                  <div className="flex items-center gap-1">
                    {entityType === "issuer" ? (
                      <>
                        <Building2 className="h-3 w-3" />
                        <span className="text-sm font-medium">Issuer</span>
                      </>
                    ) : (
                      <>
                        <User className="h-3 w-3" />
                        <span className="text-sm font-medium">Holder</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Jurisdiction</p>
                  <Badge variant="outline">{result.configMetadata?.jurisdiction || jurisdiction.toUpperCase()}</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Environment</p>
                  <Badge variant="outline">{result.environment}</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Total Steps</p>
                  <span className="text-sm font-medium">{result.steps?.length || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Results Tabs */}
          <Card>
            <CardHeader>
              <CardTitle>Simulation Results</CardTitle>
              <CardDescription>Detailed breakdown of simulation execution</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="steps" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="steps">
                    <Server className="mr-2 h-4 w-4" />
                    Steps ({result.steps?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="simulation">
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Contracts ({result.simulation?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="riskFactors">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Risk Factors
                  </TabsTrigger>
                </TabsList>

                {/* Steps Tab */}
                <TabsContent value="steps" className="space-y-3 mt-4">
                  {result.steps && result.steps.length > 0 ? (
                    result.steps.map((step: any, idx: number) => (
                      <div
                        key={idx}
                        className="rounded-lg border bg-card p-3 text-sm"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono">
                              Step {step.step}
                            </Badge>
                            <span className="font-medium">{step.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={step.status === "success" ? "default" : "destructive"}
                              className={step.status === "success" ? "bg-green-500" : ""}
                            >
                              {step.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {step.durationMs}ms
                            </span>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="secondary" className="font-mono">
                            {step.method}
                          </Badge>
                          <span className="truncate">{step.url}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No steps data available
                    </div>
                  )}
                </TabsContent>

                {/* Simulation Tab */}
                <TabsContent value="simulation" className="space-y-3 mt-4">
                  {result.simulation && result.simulation.length > 0 ? (
                    result.simulation.map((contract: any, idx: number) => (
                      <Card key={idx}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">{contract.contractID}</CardTitle>
                            <Badge variant={contract.status === "Success" ? "default" : "destructive"}>
                              {contract.status}
                            </Badge>
                          </div>
                          {contract.scenarioId && (
                            <CardDescription className="text-xs">
                              Scenario: {contract.scenarioId}
                            </CardDescription>
                          )}
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Events</span>
                              <Badge variant="outline">{contract.events?.length || 0}</Badge>
                            </div>
                            {contract.events && contract.events.length > 0 && (
                              <div className="max-h-32 overflow-y-auto rounded border bg-muted/50 p-2 text-xs font-mono">
                                {contract.events.slice(0, 5).map((event: any, eidx: number) => (
                                  <div key={eidx} className="flex items-center justify-between py-1">
                                    <span>{event.type}</span>
                                    <span>{event.time}</span>
                                    <span className={event.payoff > 0 ? "text-green-500" : event.payoff < 0 ? "text-red-500" : ""}>
                                      ${event.payoff?.toFixed(2) || 0}
                                    </span>
                                  </div>
                                ))}
                                {contract.events.length > 5 && (
                                  <div className="pt-1 text-center text-muted-foreground">
                                    ... {contract.events.length - 5} more events
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No contract data available
                    </div>
                  )}
                </TabsContent>

                {/* Risk Factors Tab */}
                <TabsContent value="riskFactors" className="space-y-3 mt-4">
                  {result.riskFactorData && Object.keys(result.riskFactorData).length > 0 ? (
                    <>
                      {Object.entries(result.riskFactorData).map(([factorName, data]: [string, any]) => (
                        <Card key={factorName}>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-mono">{factorName}</CardTitle>
                            <CardDescription className="text-xs">
                              {data.length} data points
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="h-32 w-full">
                              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                                <span>Range: {Math.min(...data.map((d: any) => d.value)).toFixed(4)} - {Math.max(...data.map((d: any) => d.value)).toFixed(4)}</span>
                                <span>Avg: {(data.reduce((sum: number, d: any) => sum + d.value, 0) / data.length).toFixed(4)}</span>
                              </div>
                              <div className="h-24 rounded border bg-muted/50 p-2">
                                <div className="flex h-full items-end justify-between gap-px">
                                  {data.slice(0, 45).map((point: any, idx: number) => {
                                    const maxVal = Math.max(...data.map((d: any) => d.value))
                                    const height = maxVal > 0 ? (point.value / maxVal) * 100 : 0
                                    return (
                                      <div
                                        key={idx}
                                        className="flex-1 bg-primary/70 rounded-t"
                                        style={{ height: `${height}%` }}
                                        title={`${point.time}: ${point.value}`}
                                      />
                                    )
                                  })}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No risk factor data available
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Raw JSON (Collapsible) */}
          <Card>
            <CardHeader>
              <div
                className="flex cursor-pointer items-center justify-between"
                onClick={() => toggleSection("rawJson")}
              >
                <div className="flex items-center gap-2">
                  <FileJson className="h-5 w-5" />
                  <CardTitle>Raw JSON Response</CardTitle>
                </div>
                {expandedSections.rawJson ? (
                  <ChevronDown className="h-5 w-5" />
                ) : (
                  <ChevronRight className="h-5 w-5" />
                )}
              </div>
            </CardHeader>
            {expandedSections.rawJson && (
              <CardContent>
                <pre className="max-h-96 overflow-auto rounded-lg bg-muted p-4 text-xs font-mono">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </CardContent>
            )}
          </Card>
        </motion.div>
      )}
    </div>
  )
}
