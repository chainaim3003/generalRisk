"use client"

import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  Activity,
  Shield,
  Wifi,
  WifiOff,
  Clock,
  Settings,
  Download,
  HelpCircle,
  Building2,
  User,
} from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
// Commented out — unused tabs
// import { ModeUpload } from "./mode-upload"
// import { ModeChat } from "./mode-chat"
// import { ModeSimulation } from "./mode-simulation"
// import { ModeDefiLiquidation } from "./mode-defi-liquidation"
// import { ModeDefiConfig } from "./mode-defi-config"
// import { BufferDashboardShell } from "./defi-newdashboard1"
import { ConfigSimulationMode } from "./mode-config"
import type { DashboardMode, HealthStatus } from "@/lib/types"
import { checkHealth } from "@/lib/api"
import { cn } from "@/lib/utils"

const modeDescriptions: Record<DashboardMode, string> = {
  upload:
    "Upload contract portfolios for full ACTUS verification analysis",
  chat:
    "Describe scenarios in natural language for AI-powered analysis",
  simulation:
    "Run stablecoin behavioral risk stress simulations via ACTUS risk service",
  config:
    "Config-based simulation - test different regulatory frameworks and market scenarios",
  "defi-config":
    "DeFi liquidation config simulation — protocol, borrower profile, market stress, cascade risk",
  "defi-liquidation":
    "DeFi liquidation risk — HealthFactor, CollateralVelocity & ETH price stress simulations",
  "buffer-v5":
    "Buffer-First V5 — ETH collateral defense with BufferLTVModel, configurable sliders, 4-tab ACTUS dashboard",
  issuer:
    "Issuer simulation — adjust regulatory thresholds (GENIUS / MiCA / Conservative) and run ACTUS behavioral models",
  holder:
    "Holder simulation — configure portfolio & risk thresholds, simulate 45-day USD ↔ USDC allocation strategy",
}

export function DashboardShell() {
  const [mode, setMode] = useState<DashboardMode>("issuer")
  const [health, setHealth] = useState<HealthStatus>({
    status: "checking",
    actusConnected: false,
  })

  useEffect(() => {
    checkHealth().then(setHealth)
    const interval = setInterval(() => {
      checkHealth().then(setHealth)
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-foreground">
                StableRisk AI
              </h1>
              <p className="text-xs text-muted-foreground">
                Stablecoin Reserve Verification Engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Health Status */}
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                  health.status === "healthy"
                    ? "bg-success/10 text-success"
                    : health.status === "checking"
                      ? "bg-accent/10 text-accent"
                      : "bg-destructive/10 text-destructive"
                )}
              >
                {health.status === "healthy" ? (
                  <Wifi className="h-3 w-3" />
                ) : health.status === "checking" ? (
                  <Activity className="h-3 w-3 animate-pulse" />
                ) : (
                  <WifiOff className="h-3 w-3" />
                )}
                {health.status === "healthy"
                  ? "API Online"
                  : health.status === "checking"
                    ? "Checking..."
                    : "Demo Mode"}
              </div>
              {health.actusConnected && (
                <Badge
                  variant="outline"
                  className="hidden border-border text-xs text-muted-foreground sm:flex"
                >
                  ACTUS Connected
                </Badge>
              )}
            </div>

            {/* Utility Icons */}
            <div className="hidden items-center gap-1 md:flex">
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                aria-label="Settings"
              >
                <Settings className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                aria-label="Export"
              >
                <Download className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                aria-label="Help"
              >
                <HelpCircle className="h-4 w-4" />
              </button>
            </div>

            {/* Live Clock */}
            <div className="hidden items-center gap-1.5 text-xs text-muted-foreground lg:flex">
              <Clock className="h-3.5 w-3.5" />
              <LiveClock />
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <div className="flex-1 bg-white">
      <main
        className="mx-auto w-full max-w-[1440px] px-6 py-6 text-slate-900"
        style={{
          '--background': '0 0% 100%',
          '--foreground': '222 47% 11%',
          '--card': '0 0% 100%',
          '--card-foreground': '222 47% 11%',
          '--popover': '0 0% 100%',
          '--popover-foreground': '222 47% 11%',
          '--primary': '160 84% 40%',
          '--primary-foreground': '0 0% 100%',
          '--secondary': '210 40% 96%',
          '--secondary-foreground': '222 47% 11%',
          '--muted': '210 40% 96%',
          '--muted-foreground': '215 16% 47%',
          '--accent': '210 40% 96%',
          '--accent-foreground': '222 47% 11%',
          '--destructive': '0 84% 60%',
          '--destructive-foreground': '210 40% 98%',
          '--border': '214 32% 91%',
          '--input': '214 32% 91%',
          '--ring': '222 47% 11%',
        } as React.CSSProperties}
      >
        <Tabs
          value={mode}
          onValueChange={(v) => setMode(v as DashboardMode)}
          className="flex flex-col gap-6"
        >
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <TabsList className="bg-secondary">
              {/* ── Issuer ── */}
              <TabsTrigger
                value="issuer"
                className="gap-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground"
              >
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">Issuer</span>
                <span className="sm:hidden">ISS</span>
              </TabsTrigger>

              {/* ── Holder ── */}
              <TabsTrigger
                value="holder"
                className="gap-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground"
              >
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Holder</span>
                <span className="sm:hidden">HOL</span>
              </TabsTrigger>
            </TabsList>

            <p className="hidden text-xs text-muted-foreground lg:block">
              {modeDescriptions[mode]}
            </p>
          </div>

          {/* ── Issuer Tab ── */}
          <TabsContent value="issuer" className="mt-0">
            {mode === "issuer" && (
              <motion.div
                key="issuer-content"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.25 }}
              >
                <ConfigSimulationMode entityType="issuer" />
              </motion.div>
            )}
          </TabsContent>

          {/* ── Holder Tab ── */}
          <TabsContent value="holder" className="mt-0">
            {mode === "holder" && (
              <motion.div
                key="holder-content"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.25 }}
              >
                <ConfigSimulationMode entityType="holder" />
              </motion.div>
            )}
          </TabsContent>

          {/* ══════════════════════════════════════════════════════════
             COMMENTED OUT TABS — kept for future restoration
             ══════════════════════════════════════════════════════════ */}

          {/*
          <TabsContent value="upload" className="mt-0">
            {mode === "upload" && <ModeUpload />}
          </TabsContent>

          <TabsContent value="chat" className="mt-0">
            {mode === "chat" && <ModeChat />}
          </TabsContent>

          <TabsContent value="config" className="mt-0">
            {mode === "config" && <ConfigSimulationMode />}
          </TabsContent>

          <TabsContent value="simulation" className="mt-0">
            {mode === "simulation" && <ModeSimulation />}
          </TabsContent>

          <TabsContent value="defi-config" className="mt-0">
            {mode === "defi-config" && <ModeDefiConfig />}
          </TabsContent>

          <TabsContent value="defi-liquidation" className="mt-0">
            {mode === "defi-liquidation" && <ModeDefiLiquidation />}
          </TabsContent>

          <TabsContent value="buffer-v5" className="mt-0">
            {mode === "buffer-v5" && <BufferDashboardShell />}
          </TabsContent>
          */}
        </Tabs>
      </main>
      </div>

      {/* ── Footer ── */}
      <footer className="border-t border-border bg-card/50 px-6 py-3">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between text-xs text-muted-foreground">
          <span>
            StableRisk AI v1.0 — Stablecoin Reserve &amp; DeFi Liquidation Risk Engine
          </span>
          <span className="hidden sm:inline">
            ACTUS Financial Contracts — Algorithmic Contract Types Unified Standards
          </span>
        </div>
      </footer>
    </div>
  )
}

function LiveClock() {
  const [time, setTime] = useState("")

  useEffect(() => {
    const update = () =>
      setTime(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      )
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [])

  return <span className="font-mono">{time}</span>
}
