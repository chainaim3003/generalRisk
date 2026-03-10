"use client"

import React from "react"

import { useState, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Upload,
  FileJson,
  X,
  Play,
  Loader2,
  Wifi,
  WifiOff,
  Server,
  ChevronDown,
  Briefcase,
  Scale,
  Landmark,
  DollarSign,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ResultsPanel } from "./results-panel"
import type {
  Portfolio,
  Thresholds,
  Jurisdiction,
  VerifyResponse,
} from "@/lib/types"
import { presetPortfolios, defaultThresholds } from "@/lib/sample-data"
import { verifyPortfolio, testActusConnection } from "@/lib/api"
import { cn } from "@/lib/utils"

const DEFAULT_ACTUS_URL = "http://34.203.247.32:8083/eventsBatch"

export function ModeUpload() {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  const [fileName, setFileName] = useState<string>("")
  const [selectedPreset, setSelectedPreset] = useState<string>("")
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction>("us-genius")
  const [thresholds, setThresholds] = useState<Thresholds>(
    defaultThresholds["us-genius"]
  )
  const [actusUrl, setActusUrl] = useState(DEFAULT_ACTUS_URL)
  const [actusStatus, setActusStatus] = useState<
    "idle" | "testing" | "connected" | "failed"
  >("idle")
  const [isVerifying, setIsVerifying] = useState(false)
  const [result, setResult] = useState<VerifyResponse | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [error, setError] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((file: File) => {
    setError("")
    if (!file.name.endsWith(".json")) {
      setError("Please upload a JSON file")
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string)
        if (parsed.contracts && Array.isArray(parsed.contracts)) {
          setPortfolio(parsed)
          setFileName(file.name)
          setSelectedPreset("")
        } else if (Array.isArray(parsed)) {
          setPortfolio({ contracts: parsed })
          setFileName(file.name)
          setSelectedPreset("")
        } else {
          setError("Invalid portfolio format. Expected { contracts: [...] }")
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
      setDragActive(false)
      if (e.dataTransfer.files?.[0]) {
        handleFile(e.dataTransfer.files[0])
      }
    },
    [handleFile]
  )

  const handlePreset = (presetId: string) => {
    const preset = presetPortfolios.find((p) => p.id === presetId)
    if (preset) {
      setPortfolio(preset.portfolio)
      setFileName("")
      setSelectedPreset(presetId)
      setError("")
    }
  }

  const handleJurisdiction = (j: Jurisdiction) => {
    setJurisdiction(j)
    setThresholds(defaultThresholds[j])
  }

  const handleTestActus = async () => {
    setActusStatus("testing")
    const ok = await testActusConnection(actusUrl)
    setActusStatus(ok ? "connected" : "failed")
  }

  const handleVerify = async () => {
    if (!portfolio) return
    setIsVerifying(true)
    setError("")
    setResult(null)
    try {
      const res = await verifyPortfolio(portfolio, thresholds, actusUrl)
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

  const clearPortfolio = () => {
    setPortfolio(null)
    setFileName("")
    setSelectedPreset("")
    setResult(null)
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Left Column: Upload & Presets */}
      <div className="flex w-full flex-col gap-4 lg:w-80 lg:shrink-0">
        {/* Upload Zone */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            Portfolio Source
          </h3>

          {/* Drop zone */}
          <div
            role="button"
            tabIndex={0}
            onDragOver={(e) => {
              e.preventDefault()
              setDragActive(true)
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                fileInputRef.current?.click()
              }
            }}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors",
              dragActive
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-secondary/50",
              portfolio && "border-success/30 bg-success/5"
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
            {portfolio ? (
              <div className="flex flex-col items-center gap-2 text-center">
                <FileJson className="h-8 w-8 text-success" />
                <p className="text-sm font-medium text-foreground">
                  {fileName || selectedPreset}
                </p>
                <p className="text-xs text-muted-foreground">
                  {portfolio.contracts.length} contract(s) loaded
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    clearPortfolio()
                  }}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="mr-1 h-3 w-3" />
                  Clear
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-center">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">
                  Drop JSON file here
                </p>
                <p className="text-xs text-muted-foreground">
                  or click to browse
                </p>
              </div>
            )}
          </div>

          {error && (
            <p className="mt-2 text-xs text-destructive">{error}</p>
          )}

          {portfolio && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3 w-full border-border text-foreground bg-transparent"
              onClick={() => setShowPreview(!showPreview)}
            >
              <ChevronDown
                className={cn(
                  "mr-1.5 h-3.5 w-3.5 transition-transform",
                  showPreview && "rotate-180"
                )}
              />
              {showPreview ? "Hide" : "Preview"} Contract Data
            </Button>
          )}

          <AnimatePresence>
            {showPreview && portfolio && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 overflow-hidden"
              >
                <pre className="scrollbar-thin max-h-48 overflow-auto rounded-md bg-secondary p-3 font-mono text-xs text-foreground">
                  {JSON.stringify(portfolio, null, 2)}
                </pre>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Presets */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            Quick Presets
          </h3>
          <div className="flex flex-col gap-2">
            {presetPortfolios.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handlePreset(preset.id)}
                className={cn(
                  "flex items-center gap-3 rounded-md border p-3 text-left transition-colors",
                  selectedPreset === preset.id
                    ? "border-primary/50 bg-primary/10"
                    : "border-border hover:border-primary/30 hover:bg-secondary/50"
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                    selectedPreset === preset.id
                      ? "bg-primary/20 text-primary"
                      : "bg-secondary text-muted-foreground"
                  )}
                >
                  <Briefcase className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {preset.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {preset.totalValue}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Center Column: Config & Verification */}
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        {/* Jurisdiction */}
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            Regulatory Framework
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {(
              [
                {
                  key: "eu-mica" as const,
                  label: "EU MiCA",
                  icon: Landmark,
                  desc: "European Markets in Crypto-Assets",
                },
                {
                  key: "us-genius" as const,
                  label: "US GENIUS Act",
                  icon: Scale,
                  desc: "Guiding National Stablecoin Use",
                },
                {
                  key: "custom" as const,
                  label: "Custom",
                  icon: DollarSign,
                  desc: "Custom threshold configuration",
                },
              ] as const
            ).map((j) => (
              <button
                key={j.key}
                type="button"
                onClick={() => handleJurisdiction(j.key)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors",
                  jurisdiction === j.key
                    ? "border-primary/50 bg-primary/10"
                    : "border-border hover:border-primary/30 hover:bg-secondary/50"
                )}
              >
                <j.icon
                  className={cn(
                    "h-5 w-5",
                    jurisdiction === j.key
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}
                />
                <span className="text-sm font-medium text-foreground">
                  {j.label}
                </span>
                <span className="text-center text-xs text-muted-foreground">
                  {j.desc}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Threshold Sliders */}
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            Verification Thresholds
          </h3>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {[
              {
                key: "backingRatio" as const,
                label: "Backing Ratio",
                unit: "%",
                min: 0,
                max: 200,
              },
              {
                key: "liquidityRatio" as const,
                label: "Liquidity Ratio",
                unit: "%",
                min: 0,
                max: 100,
              },
              {
                key: "concentrationLimit" as const,
                label: "Concentration Limit",
                unit: "%",
                min: 0,
                max: 100,
              },
              {
                key: "assetQuality" as const,
                label: "Asset Quality",
                unit: "",
                min: 0,
                max: 100,
              },
            ].map((s) => (
              <div key={s.key}>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm text-muted-foreground">
                    {s.label}
                  </label>
                  <span className="font-mono text-sm font-medium text-foreground">
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
            <p className="mt-4 text-xs text-muted-foreground">
              Thresholds locked to{" "}
              {jurisdiction === "eu-mica" ? "EU MiCA" : "US GENIUS Act"}{" "}
              requirements. Switch to Custom to modify.
            </p>
          )}
        </div>

        {/* ACTUS Server */}
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            ACTUS Server Connection
          </h3>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Server className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={actusUrl}
                onChange={(e) => {
                  setActusUrl(e.target.value)
                  setActusStatus("idle")
                }}
                className="bg-secondary pl-9 text-sm text-foreground"
                placeholder="ACTUS Server URL"
              />
            </div>
            <Button
              variant="outline"
              onClick={handleTestActus}
              disabled={actusStatus === "testing"}
              className="border-border text-foreground bg-transparent"
            >
              {actusStatus === "testing" ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : actusStatus === "connected" ? (
                <Wifi className="mr-1.5 h-4 w-4 text-success" />
              ) : actusStatus === "failed" ? (
                <WifiOff className="mr-1.5 h-4 w-4 text-destructive" />
              ) : (
                <Wifi className="mr-1.5 h-4 w-4" />
              )}
              Test
            </Button>
          </div>
          {actusStatus === "connected" && (
            <p className="mt-2 text-xs text-success">
              Connected to ACTUS server
            </p>
          )}
          {actusStatus === "failed" && (
            <p className="mt-2 text-xs text-destructive">
              Unable to reach ACTUS server
            </p>
          )}
        </div>

        {/* Run Button */}
        <Button
          size="lg"
          onClick={handleVerify}
          disabled={!portfolio || isVerifying}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {isVerifying ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Running Verification...
            </>
          ) : (
            <>
              <Play className="mr-2 h-5 w-5" />
              Run Verification
            </>
          )}
        </Button>

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
    </div>
  )
}
