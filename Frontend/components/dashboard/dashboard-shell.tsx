"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Upload,
  MessageSquareText,
  Activity,
  Shield,
  Wifi,
  WifiOff,
  Clock,
  Settings,
  Download,
  HelpCircle,
} from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ModeUpload } from "./mode-upload"
import { ModeChat } from "./mode-chat"
import { ModeSimulation } from "./mode-simulation"
import type { DashboardMode, HealthStatus } from "@/lib/types"
import { checkHealth, getActusEnvironment } from "@/lib/api"
import { cn } from "@/lib/utils"

const modeDescriptions: Record<DashboardMode, string> = {
  upload: "Upload contract portfolios for full ACTUS verification analysis",
  chat: "Describe scenarios in natural language for AI-powered analysis",
  simulation: "Run behavioral risk stress simulations via ACTUS risk service",
}

export function DashboardShell() {
  const [mode, setMode] = useState<DashboardMode>("upload")
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
      {/* Header */}
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

            {/* Time */}
            <div className="hidden items-center gap-1.5 text-xs text-muted-foreground lg:flex">
              <Clock className="h-3.5 w-3.5" />
              <LiveClock />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-6 py-6">
        <Tabs
          value={mode}
          onValueChange={(v) => setMode(v as DashboardMode)}
          className="flex flex-col gap-6"
        >
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <TabsList className="bg-secondary">
              <TabsTrigger
                value="upload"
                className="gap-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground"
              >
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">File Upload</span>
                <span className="sm:hidden">Upload</span>
              </TabsTrigger>
              <TabsTrigger
                value="chat"
                className="gap-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground"
              >
                <MessageSquareText className="h-4 w-4" />
                <span className="hidden sm:inline">AI Assistant</span>
                <span className="sm:hidden">AI Chat</span>
              </TabsTrigger>
              <TabsTrigger
                value="simulation"
                className="gap-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground"
              >
                <Activity className="h-4 w-4" />
                <span className="hidden sm:inline">Simulation</span>
                <span className="sm:hidden">Sim</span>
              </TabsTrigger>
            </TabsList>

            <p className="hidden text-xs text-muted-foreground lg:block">
              {modeDescriptions[mode]}
            </p>
          </div>

          <TabsContent value="upload" className="mt-0">
            {mode === "upload" && (
              <motion.div
                key="upload-content"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.25 }}
              >
                <ModeUpload />
              </motion.div>
            )}
          </TabsContent>

          <TabsContent value="chat" className="mt-0">
            {mode === "chat" && (
              <motion.div
                key="chat-content"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.25 }}
              >
                <ModeChat />
              </motion.div>
            )}
          </TabsContent>

          <TabsContent value="simulation" className="mt-0">
            {mode === "simulation" && (
              <motion.div
                key="simulation-content"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.25 }}
              >
                <ModeSimulation />
              </motion.div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 px-6 py-3">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between text-xs text-muted-foreground">
          <span>
            StableRisk AI v1.0 - Stablecoin Reserve Verification Engine
          </span>
          <span className="hidden sm:inline">
            ACTUS Financial Contracts - Algorithmic Contract Types Unified
            Standards
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
