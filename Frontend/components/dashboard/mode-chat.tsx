"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Send,
  Bot,
  User,
  Sparkles,
  Loader2,
  Play,
  ChevronDown,
  ChevronUp,
  FileJson,
  History,
  Lightbulb,
  Shield,
  Zap,
  TrendingDown,
  Scale,
  Landmark,
  Copy,
  Check,
  RotateCcw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ResultsPanel } from "./results-panel"
import type {
  ChatMessage,
  Portfolio,
  Thresholds,
  VerifyResponse,
  ScenarioTemplate,
} from "@/lib/types"
import { defaultThresholds, presetPortfolios } from "@/lib/sample-data"
import { verifyPortfolio } from "@/lib/api"
import { cn } from "@/lib/utils"

// -- Scenario Templates --
const scenarioTemplates: ScenarioTemplate[] = [
  {
    id: "conservative",
    name: "Conservative Bank Reserve",
    description: "60% cash, 30% treasuries, 10% corporate bonds",
    prompt:
      "Create a conservative portfolio with 60% US Treasuries, 30% cash, and 10% corporate bonds with $10M notional, designed for EU MiCA compliance.",
  },
  {
    id: "aggressive",
    name: "High-Yield Aggressive",
    description: "Heavy corporate bond exposure, long maturities",
    prompt:
      "Generate a high-risk scenario with 50% concentration in corporate bonds, 30% in long-dated treasuries, and 20% cash with $8M total. Include below-investment-grade assets.",
  },
  {
    id: "eu-mica",
    name: "EU MiCA Compliant",
    description: "Optimized for European regulatory requirements",
    prompt:
      "Build a portfolio fully optimized for EU MiCA compliance. Include at least 30% liquid cash, keep concentration under 30%, and ensure asset quality above 85. Use $5M notional.",
  },
  {
    id: "us-genius",
    name: "US GENIUS Act Compliant",
    description: "Tailored for US regulatory framework",
    prompt:
      "Create a US GENIUS Act compliant stablecoin reserve with $15M notional. Ensure backing ratio above 100%, liquidity above 20%, and keep concentration risk below 40%.",
  },
  {
    id: "stress-crash",
    name: "Stress Test: Market Crash",
    description: "Simulate portfolio under severe market stress",
    prompt:
      "Simulate a market crash scenario where corporate bonds lose 30% of value. Start with a $10M diversified portfolio and show the impact on compliance metrics.",
  },
  {
    id: "stress-run",
    name: "Stress Test: Bank Run",
    description: "Rapid redemption pressure scenario",
    prompt:
      "Model a bank run scenario where 50% of stablecoin holders redeem simultaneously. Create a portfolio with $20M notional and assess if liquidity ratios hold.",
  },
]

// -- Simulated AI response generation --
function generateAIResponse(
  userMessage: string
): { text: string; portfolio?: Portfolio; thresholds?: Thresholds } {
  const lowerMsg = userMessage.toLowerCase()

  // Detect intent keywords
  const isMiCA = lowerMsg.includes("mica") || lowerMsg.includes("european") || lowerMsg.includes("eu ")
  const isGenius = lowerMsg.includes("genius") || lowerMsg.includes("us ") || lowerMsg.includes("american")
  const isConservative = lowerMsg.includes("conservative") || lowerMsg.includes("safe") || lowerMsg.includes("low risk")
  const isAggressive = lowerMsg.includes("aggressive") || lowerMsg.includes("high risk") || lowerMsg.includes("high-yield")
  const isStress = lowerMsg.includes("stress") || lowerMsg.includes("crash") || lowerMsg.includes("bank run")
  const wantsExplain = lowerMsg.includes("explain") || lowerMsg.includes("what is") || lowerMsg.includes("how does")

  // Extract notional amounts
  const amountMatch = lowerMsg.match(/\$?([\d,.]+)\s*(m|million|k|thousand)?/i)
  let notional = 1000000
  if (amountMatch) {
    notional = Number.parseFloat(amountMatch[1].replace(/,/g, ""))
    const unit = amountMatch[2]?.toLowerCase()
    if (unit === "m" || unit === "million") notional *= 1000000
    else if (unit === "k" || unit === "thousand") notional *= 1000
  }

  // Extract percentages
  const cashPct = extractPercentage(lowerMsg, "cash") ?? (isConservative ? 60 : isAggressive ? 15 : 40)
  const treasuryPct = extractPercentage(lowerMsg, "treasur") ?? (isConservative ? 30 : isAggressive ? 25 : 35)
  const corpPct = extractPercentage(lowerMsg, "corporate") ?? (isConservative ? 10 : isAggressive ? 50 : 20)
  const otherPct = Math.max(0, 100 - cashPct - treasuryPct - corpPct)

  // Select thresholds
  const jurisdiction = isMiCA ? "eu-mica" : "us-genius"
  const thresholds = defaultThresholds[jurisdiction]

  // Generate explanatory responses
  if (wantsExplain) {
    if (lowerMsg.includes("mica")) {
      return {
        text: `**EU MiCA (Markets in Crypto-Assets Regulation)** is the European Union's comprehensive regulatory framework for crypto-assets, including stablecoins.\n\n**Key Requirements for Stablecoin Reserves:**\n- **Backing Ratio:** Minimum 100% reserve backing at all times\n- **Liquidity Ratio:** At least 30% of reserves must be in highly liquid assets\n- **Concentration Limit:** No single asset type may exceed 30% of total reserves\n- **Asset Quality:** Minimum quality score of 85 for reserve assets\n\nMiCA applies to both Asset-Referenced Tokens (ARTs) and E-Money Tokens (EMTs). Issuers must maintain segregated custody and publish regular reserve attestation reports.\n\nWould you like me to generate an EU MiCA-compliant portfolio for analysis?`,
      }
    }
    if (lowerMsg.includes("genius")) {
      return {
        text: `**US GENIUS Act (Guiding and Establishing National Innovation for US Stablecoins)** is the United States' proposed regulatory framework for payment stablecoins.\n\n**Key Requirements:**\n- **Backing Ratio:** Minimum 100% reserve backing with permitted asset classes\n- **Liquidity Ratio:** At least 20% in short-term liquid assets\n- **Concentration Limit:** No single issuer exposure exceeding 40%\n- **Asset Quality:** Minimum quality score of 80\n\nThe GENIUS Act permits reserves in US Treasury securities, insured deposits, and certain short-term government obligations. Would you like me to create a US GENIUS Act compliant portfolio?`,
      }
    }
    return {
      text: `I can help you understand stablecoin reserve verification. Here's what I can do:\n\n1. **Generate Portfolios** - Describe your desired reserve allocation and I'll create the contract structure\n2. **Explain Regulations** - Ask about EU MiCA or US GENIUS Act requirements\n3. **Run Stress Tests** - Simulate market crashes or redemption scenarios\n4. **Verify Compliance** - Check any portfolio against regulatory thresholds\n\nTry asking something like:\n- "Create a conservative $10M portfolio for EU MiCA"\n- "Generate a stress test with 50% corporate bond exposure"\n- "Explain the difference between MiCA and GENIUS Act thresholds"`,
    }
  }

  // Build portfolio
  const now = new Date()
  const contracts = []
  const portions = [
    { type: "Cash", pct: cashPct, id: "cash", rate: 0.04, matMonths: 3, liq: 95, credit: 95 },
    { type: "Treasury", pct: treasuryPct, id: "treasury", rate: 0.043, matMonths: 9, liq: 90, credit: 92 },
    { type: "Corporate", pct: corpPct, id: "corporate", rate: 0.058, matMonths: 18, liq: 60, credit: 70 },
  ]

  if (otherPct > 0) {
    portions.push({ type: "Other", pct: otherPct, id: "other", rate: 0.035, matMonths: 6, liq: 75, credit: 78 })
  }

  for (const p of portions) {
    if (p.pct <= 0) continue
    const mat = new Date(now)
    mat.setMonth(mat.getMonth() + p.matMonths)

    contracts.push({
      contractType: "PAM",
      contractID: `${p.id}-ai-${Date.now().toString(36)}`,
      statusDate: now.toISOString().slice(0, 10) + "T00:00:00",
      contractRole: "RPA",
      contractDealDate: now.toISOString().slice(0, 10) + "T00:00:00",
      currency: "USD",
      notionalPrincipal: Math.round((notional * p.pct) / 100),
      maturityDate: mat.toISOString().slice(0, 10) + "T00:00:00",
      nominalInterestRate: isStress ? p.rate * 0.7 : p.rate,
      initialExchangeDate: now.toISOString().slice(0, 10) + "T00:00:00",
      dayCountConvention: "A365",
      reserveType: p.type as "Cash" | "Treasury" | "Corporate" | "Other",
      liquidityScore: isStress ? Math.max(20, p.liq - 30) : p.liq,
      creditRating: isStress ? Math.max(30, p.credit - 25) : p.credit,
    })
  }

  const portfolio: Portfolio = {
    id: `ai-portfolio-${Date.now().toString(36)}`,
    totalNotional: notional,
    description: `AI-generated ${isConservative ? "conservative" : isAggressive ? "aggressive" : isStress ? "stress test" : "balanced"} portfolio`,
    contracts,
  }

  const totalValue = contracts.reduce((s, c) => s + (c.notionalPrincipal || 0), 0)
  const breakdown = portions
    .filter((p) => p.pct > 0)
    .map((p) => `  - **${p.type}**: ${p.pct}% ($${Math.round((notional * p.pct) / 100).toLocaleString()})`)
    .join("\n")

  let riskAssessment = ""
  if (isAggressive || corpPct > 40) {
    riskAssessment = "\n\n**Risk Assessment:** This portfolio has elevated concentration risk due to high corporate bond exposure. It may fail regulatory thresholds under strict frameworks."
  } else if (isStress) {
    riskAssessment = "\n\n**Risk Assessment:** Under stress conditions, liquidity scores and credit ratings have been degraded to simulate adverse market conditions. This portfolio is designed to test the boundaries of compliance."
  } else {
    riskAssessment = "\n\n**Risk Assessment:** This portfolio appears well-diversified with adequate liquidity. It should perform well against standard compliance checks."
  }

  const text = `I've generated a ${isConservative ? "conservative" : isAggressive ? "high-risk aggressive" : isStress ? "stress test" : "balanced"} portfolio with **$${totalValue.toLocaleString()}** in total reserves across **${contracts.length} contracts**.\n\n**Reserve Allocation:**\n${breakdown}${riskAssessment}\n\nThe portfolio is configured for **${isMiCA ? "EU MiCA" : "US GENIUS Act"}** compliance thresholds. Review the contracts below and click **"Verify Now"** to run the full ACTUS analysis.`

  return { text, portfolio, thresholds }
}

function extractPercentage(text: string, keyword: string): number | null {
  const patterns = [
    new RegExp(`(\\d+)\\s*%\\s*(?:in\\s+)?${keyword}`, "i"),
    new RegExp(`${keyword}\\s*(?:at\\s+|:?\\s*)(\\d+)\\s*%`, "i"),
    new RegExp(`(\\d+)\\s*%\\s*${keyword}`, "i"),
  ]
  for (const p of patterns) {
    const match = text.match(p)
    if (match) return Number.parseInt(match[1])
  }
  return null
}

function generateMsgId() {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

// -- Chat Component --
export function ModeChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Welcome to the StableRisk AI Assistant. I can help you build and verify stablecoin reserve portfolios using natural language.\n\n**What I can do:**\n- Generate contract portfolios from descriptions\n- Explain EU MiCA and US GENIUS Act requirements\n- Run stress tests and compliance checks\n- Answer questions about reserve verification\n\nDescribe your stablecoin reserve scenario, or try one of the templates on the left.",
      timestamp: new Date().toISOString(),
    },
  ])
  const [input, setInput] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [generatedPortfolio, setGeneratedPortfolio] = useState<Portfolio | null>(null)
  const [generatedThresholds, setGeneratedThresholds] = useState<Thresholds | null>(null)
  const [showContracts, setShowContracts] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [result, setResult] = useState<VerifyResponse | null>(null)
  const [showTemplates, setShowTemplates] = useState(true)
  const [copied, setCopied] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isProcessing) return

      const userMsg: ChatMessage = {
        id: generateMsgId(),
        role: "user",
        content: text.trim(),
        timestamp: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, userMsg])
      setInput("")
      setIsProcessing(true)
      setResult(null)

      // Simulate AI processing delay
      await new Promise((r) => setTimeout(r, 800 + Math.random() * 1200))

      const response = generateAIResponse(text)

      const assistantMsg: ChatMessage = {
        id: generateMsgId(),
        role: "assistant",
        content: response.text,
        timestamp: new Date().toISOString(),
        portfolio: response.portfolio,
      }

      setMessages((prev) => [...prev, assistantMsg])

      if (response.portfolio) {
        setGeneratedPortfolio(response.portfolio)
        setGeneratedThresholds(response.thresholds || null)
        setShowContracts(true)
      }

      setIsProcessing(false)
    },
    [isProcessing]
  )

  const handleVerify = async () => {
    if (!generatedPortfolio || !generatedThresholds) return
    setIsVerifying(true)
    setResult(null)

    const verifyMsg: ChatMessage = {
      id: generateMsgId(),
      role: "assistant",
      content: "Running ACTUS verification engine against the generated portfolio. Analyzing backing ratios, liquidity, concentration risk, and asset quality...",
      timestamp: new Date().toISOString(),
      isVerifying: true,
    }
    setMessages((prev) => [...prev, verifyMsg])

    try {
      const res = await verifyPortfolio(generatedPortfolio, generatedThresholds)
      setResult(res)
    } catch {
      const { demoVerifyResponse, demoFailedResponse } = await import("@/lib/sample-data")
      const totalCorp = generatedPortfolio.contracts
        .filter((c) => c.reserveType === "Corporate")
        .reduce((s, c) => s + (c.notionalPrincipal || 0), 0)
      const totalValue = generatedPortfolio.contracts.reduce(
        (s, c) => s + (c.notionalPrincipal || 0),
        0
      )
      const isHighRisk = totalCorp / totalValue > 0.4
      setResult({
        ...(isHighRisk ? demoFailedResponse : demoVerifyResponse),
        timestamp: new Date().toISOString(),
      })
    } finally {
      setIsVerifying(false)
      const resultMsg: ChatMessage = {
        id: generateMsgId(),
        role: "assistant",
        content: "Verification complete. Results are displayed below.",
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, resultMsg])
    }
  }

  const handleReset = () => {
    setMessages([
      {
        id: "welcome-reset",
        role: "assistant",
        content: "Chat reset. Describe a new stablecoin reserve scenario to get started.",
        timestamp: new Date().toISOString(),
      },
    ])
    setGeneratedPortfolio(null)
    setGeneratedThresholds(null)
    setResult(null)
    setShowContracts(false)
  }

  const handleCopyContracts = () => {
    if (!generatedPortfolio) return
    navigator.clipboard.writeText(JSON.stringify(generatedPortfolio, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Left Sidebar: Templates & History */}
      <div className="flex w-full flex-col gap-4 lg:w-72 lg:shrink-0">
        {/* Scenario Templates */}
        <div className="rounded-lg border border-border bg-card p-4">
          <button
            type="button"
            onClick={() => setShowTemplates(!showTemplates)}
            className="flex w-full items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">
                Scenario Templates
              </h3>
            </div>
            {showTemplates ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          <AnimatePresence>
            {showTemplates && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 overflow-hidden"
              >
                <div className="flex flex-col gap-1.5">
                  {scenarioTemplates.map((template) => {
                    const iconMap: Record<string, typeof Shield> = {
                      conservative: Shield,
                      aggressive: TrendingDown,
                      "eu-mica": Landmark,
                      "us-genius": Scale,
                      "stress-crash": Zap,
                      "stress-run": Zap,
                    }
                    const Icon = iconMap[template.id] || Sparkles

                    return (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => sendMessage(template.prompt)}
                        disabled={isProcessing}
                        className="flex items-start gap-2.5 rounded-md border border-border p-2.5 text-left transition-colors hover:border-primary/30 hover:bg-secondary/50 disabled:pointer-events-none disabled:opacity-50"
                      >
                        <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground">
                            {template.name}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {template.description}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Suggested Prompts */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h4 className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Quick Prompts
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {[
              "Explain MiCA Requirements",
              "Explain GENIUS Act",
              "Generate Random Portfolio",
              "Conservative $5M",
              "Stress Test $10M",
            ].map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => sendMessage(chip)}
                disabled={isProcessing}
                className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="w-full border-border text-foreground bg-transparent"
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Reset Chat
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const log = messages
                .map((m) => `[${m.role.toUpperCase()}] ${m.content}`)
                .join("\n\n---\n\n")
              const blob = new Blob([log], { type: "text/plain" })
              const url = URL.createObjectURL(blob)
              const a = document.createElement("a")
              a.href = url
              a.download = `stablerisk-chat-${new Date().toISOString().slice(0, 10)}.txt`
              a.click()
              URL.revokeObjectURL(url)
            }}
            className="w-full border-border text-foreground bg-transparent"
          >
            <History className="mr-1.5 h-3.5 w-3.5" />
            Export Chat
          </Button>
        </div>
      </div>

      {/* Center: Chat Interface */}
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        {/* Chat Messages */}
        <div className="scrollbar-thin flex min-h-[400px] max-h-[540px] flex-col gap-4 overflow-y-auto rounded-lg border border-border bg-card/50 p-4">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={cn(
                  "flex gap-3",
                  msg.role === "user" ? "flex-row-reverse" : "flex-row"
                )}
              >
                {/* Avatar */}
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    msg.role === "user"
                      ? "bg-primary/20"
                      : "bg-secondary"
                  )}
                >
                  {msg.role === "user" ? (
                    <User className="h-4 w-4 text-primary" />
                  ) : (
                    <Bot className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>

                {/* Bubble */}
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg px-4 py-3",
                    msg.role === "user"
                      ? "bg-primary/10 text-foreground"
                      : "bg-secondary text-foreground"
                  )}
                >
                  {msg.isVerifying ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">
                        {msg.content}
                      </span>
                    </div>
                  ) : (
                    <div className="prose-sm text-sm leading-relaxed">
                      <MessageContent content={msg.content} />
                    </div>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground/70">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isProcessing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary">
                <Bot className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="rounded-lg bg-secondary px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:0ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:150ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:300ms]" />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Analyzing your request...
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage(input)
                }
              }}
              placeholder="Describe your stablecoin reserve scenario..."
              rows={1}
              className="w-full resize-none rounded-lg border border-border bg-secondary px-4 py-3 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <Button
              size="sm"
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isProcessing}
              className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 bg-primary p-0 text-primary-foreground hover:bg-primary/90"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Generated Contracts Preview */}
        <AnimatePresence>
          {generatedPortfolio && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-lg border border-primary/20 bg-card"
            >
              <button
                type="button"
                onClick={() => setShowContracts(!showContracts)}
                className="flex w-full items-center justify-between p-4"
              >
                <div className="flex items-center gap-2.5">
                  <FileJson className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">
                    Generated Contracts
                  </span>
                  <Badge
                    variant="secondary"
                    className="bg-secondary text-secondary-foreground"
                  >
                    {generatedPortfolio.contracts.length}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCopyContracts()
                    }}
                    className="h-7 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {copied ? (
                      <Check className="mr-1 h-3 w-3 text-success" />
                    ) : (
                      <Copy className="mr-1 h-3 w-3" />
                    )}
                    {copied ? "Copied" : "Copy JSON"}
                  </Button>
                  {showContracts ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </button>

              <AnimatePresence>
                {showContracts && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden border-t border-border"
                  >
                    <div className="p-4">
                      {/* Contract Cards */}
                      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {generatedPortfolio.contracts.map((c) => (
                          <div
                            key={c.contractID}
                            className="flex items-center justify-between rounded-md border border-border bg-secondary/50 p-3"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-foreground">
                                  {c.contractType}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="border-0 bg-primary/10 text-xs text-primary"
                                >
                                  {c.reserveType}
                                </Badge>
                              </div>
                              <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                                ${(c.notionalPrincipal || 0).toLocaleString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-mono text-xs text-muted-foreground">
                                {c.nominalInterestRate
                                  ? `${(c.nominalInterestRate * 100).toFixed(1)}%`
                                  : "N/A"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {c.maturityDate?.slice(0, 10)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <Button
                          onClick={handleVerify}
                          disabled={isVerifying}
                          className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          {isVerifying ? (
                            <>
                              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                              Verifying...
                            </>
                          ) : (
                            <>
                              <Play className="mr-1.5 h-4 w-4" />
                              Verify Now
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
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
    </div>
  )
}

// -- Simple markdown-like renderer --
function MessageContent({ content }: { content: string }) {
  const lines = content.split("\n")
  return (
    <div className="flex flex-col gap-1">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-2" />
        // Bold text
        const formatted = line.replace(
          /\*\*(.+?)\*\*/g,
          '<strong class="font-semibold text-foreground">$1</strong>'
        )
        // List items
        if (line.trim().startsWith("- ")) {
          return (
            <div key={i} className="flex items-start gap-2 pl-2 text-sm text-muted-foreground">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
              <span
                className="text-foreground"
                dangerouslySetInnerHTML={{ __html: formatted.replace(/^-\s*/, "") }}
              />
            </div>
          )
        }
        // Numbered items
        const numMatch = line.match(/^(\d+)\.\s/)
        if (numMatch) {
          return (
            <div key={i} className="flex items-start gap-2 pl-2 text-sm">
              <span className="font-mono text-xs text-muted-foreground">
                {numMatch[1]}.
              </span>
              <span
                className="text-foreground"
                dangerouslySetInnerHTML={{ __html: formatted.replace(/^\d+\.\s*/, "") }}
              />
            </div>
          )
        }
        return (
          <p
            key={i}
            className="text-sm text-foreground"
            dangerouslySetInnerHTML={{ __html: formatted }}
          />
        )
      })}
    </div>
  )
}
