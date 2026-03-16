"use client"

import React, { useState, useCallback, useEffect } from "react"
import {
  Shield,
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  FileJson,
  ChevronDown,
  ChevronRight,
  Fingerprint,
  KeyRound,
  Search,
  AlertCircle,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  runVleiWorkflow,
  queryVleiCredentials,
  checkVleiStatus,
} from "@/lib/api"

// ═══════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════

type VleiState = "idle" | "checking" | "running" | "querying" | "done" | "error"

interface VleiStep {
  step: number
  name: string
  status: "success" | "failed"
  detail?: string
}

// ═══════════════════════════════════════════════════════════════════
// Helper: Highlight digital signature fields in JSON
// ═══════════════════════════════════════════════════════════════════

const SIGNATURE_KEYS = new Set([
  "d",           // SAID — Self-Addressing IDentifier (the cryptographic digest)
  "i",           // Issuer AID
  "signedDigest",
  "signaturePresent",
  "selfAttested",
  "issuerAID",
  "issueeAID",
  "credentialSAID",
  "schemaSAID",
  "registryID",
  "issuanceTimestamp",
  "atc",         // Attestation / signature attachments
  "ri",          // Registry identifier
  "s",           // Schema SAID
])

function JsonHighlighter({ data, depth = 0 }: { data: any; depth?: number }) {
  if (data === null || data === undefined) {
    return <span className="text-slate-400">null</span>
  }
  if (typeof data === "boolean") {
    return <span className={data ? "text-emerald-600 font-semibold" : "text-red-500 font-semibold"}>{String(data)}</span>
  }
  if (typeof data === "number") {
    return <span className="text-blue-600">{data}</span>
  }
  if (typeof data === "string") {
    // Truncate very long strings for display but keep them copyable
    const display = data.length > 120 ? data.substring(0, 120) + "..." : data
    return <span className="text-amber-700" title={data}>&quot;{display}&quot;</span>
  }
  if (Array.isArray(data)) {
    if (data.length === 0) return <span className="text-slate-400">[]</span>
    return (
      <span>
        {"["}
        <span className="block pl-4">
          {data.map((item, i) => (
            <span key={i} className="block">
              <JsonHighlighter data={item} depth={depth + 1} />
              {i < data.length - 1 && ","}
            </span>
          ))}
        </span>
        {"]"}
      </span>
    )
  }
  if (typeof data === "object") {
    const keys = Object.keys(data)
    if (keys.length === 0) return <span className="text-slate-400">{"{}"}</span>
    return (
      <span>
        {"{"}
        <span className="block pl-4">
          {keys.map((key, i) => {
            const isSigKey = SIGNATURE_KEYS.has(key)
            return (
              <span key={key} className="block">
                <span className={isSigKey ? "bg-emerald-100 text-emerald-800 font-bold px-0.5 rounded" : "text-slate-600"}>
                  &quot;{key}&quot;
                </span>
                <span className="text-slate-500">: </span>
                {isSigKey ? (
                  <span className="bg-emerald-50 border border-emerald-200 rounded px-1 py-0.5 inline-block">
                    <JsonHighlighter data={data[key]} depth={depth + 1} />
                  </span>
                ) : (
                  <JsonHighlighter data={data[key]} depth={depth + 1} />
                )}
                {i < keys.length - 1 && ","}
              </span>
            )
          })}
        </span>
        {"}"}
      </span>
    )
  }
  return <span>{String(data)}</span>
}

// ═══════════════════════════════════════════════════════════════════
// Component: Digital Signature Card
// ═══════════════════════════════════════════════════════════════════

function DigitalSignatureCard({ sig }: { sig: any }) {
  if (!sig) return null
  return (
    <Card className="border-emerald-300 bg-emerald-50/50 shadow-none">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="flex items-center gap-2 text-sm text-emerald-800">
          <Fingerprint className="h-4 w-4" />
          Digital Signature Verified
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-1.5">
        <div className="grid grid-cols-[140px_1fr] gap-x-3 gap-y-1 text-xs">
          <span className="font-medium text-emerald-700">Credential SAID</span>
          <span className="font-mono text-slate-700 break-all">{sig.credentialSAID || sig.signedDigest || "—"}</span>

          <span className="font-medium text-emerald-700">Issuer AID</span>
          <span className="font-mono text-slate-700 break-all">{sig.issuerAID || "—"}</span>

          <span className="font-medium text-emerald-700">Issuee AID</span>
          <span className="font-mono text-slate-700 break-all">{sig.issueeAID || "—"}</span>

          <span className="font-medium text-emerald-700">Self-Attested</span>
          <span>{sig.selfAttested ? (
            <Badge variant="outline" className="border-emerald-400 text-emerald-700 text-[10px]">Yes — Issuer = Issuee</Badge>
          ) : (
            <Badge variant="outline" className="text-[10px]">No</Badge>
          )}</span>

          <span className="font-medium text-emerald-700">Schema SAID</span>
          <span className="font-mono text-slate-700 break-all">{sig.schemaSAID || "—"}</span>

          <span className="font-medium text-emerald-700">Registry ID</span>
          <span className="font-mono text-slate-700 break-all">{sig.registryID || "—"}</span>

          <span className="font-medium text-emerald-700">Signed Digest</span>
          <span className="font-mono text-slate-700 break-all">{sig.signedDigest || "—"}</span>

          <span className="font-medium text-emerald-700">Signature Present</span>
          <span>{sig.signaturePresent ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 inline" />
          ) : (
            <XCircle className="h-3.5 w-3.5 text-red-500 inline" />
          )}</span>

          <span className="font-medium text-emerald-700">Timestamp</span>
          <span className="text-slate-600">{sig.issuanceTimestamp || "—"}</span>
        </div>
      </CardContent>
    </Card>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Main Export: VleiPanel
// ═══════════════════════════════════════════════════════════════════

export function VleiPanel() {
  const [state, setState] = useState<VleiState>("idle")
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string>("")
  const [steps, setSteps] = useState<VleiStep[]>([])
  const [showRawJson, setShowRawJson] = useState(false)
  const [showCredentialJson, setShowCredentialJson] = useState(false)
  const [vleiReady, setVleiReady] = useState<boolean | null>(null)
  const [statusInfo, setStatusInfo] = useState<any>(null)
  const [elapsedMs, setElapsedMs] = useState(0)

  // ── Check vLEI status on mount ──
  useEffect(() => {
    checkVleiStatus().then((s) => {
      setVleiReady(s.ready === true)
      setStatusInfo(s)
    }).catch(() => {
      setVleiReady(false)
    })
  }, [])

  // ── Elapsed timer while running ──
  useEffect(() => {
    if (state !== "running" && state !== "querying") return
    const start = Date.now()
    const iv = setInterval(() => setElapsedMs(Date.now() - start), 250)
    return () => clearInterval(iv)
  }, [state])

  // ── Run the 4C seller credential workflow ──
  const handleRun = useCallback(async () => {
    setState("running")
    setResult(null)
    setError("")
    setSteps([])
    setShowRawJson(false)
    setShowCredentialJson(false)

    try {
      const data = await runVleiWorkflow()
      setResult(data)
      setSteps(data.steps || [])
      setState(data.success ? "done" : "error")
      if (!data.success) {
        setError(data.error || "Workflow completed with errors")
      }
    } catch (err: any) {
      setState("error")
      setError(err.message || "Failed to run vLEI workflow")
    }
  }, [])

  // ── Query existing credentials ──
  const handleQuery = useCallback(async () => {
    setState("querying")
    setResult(null)
    setError("")
    setSteps([])
    setShowRawJson(false)
    setShowCredentialJson(false)

    try {
      const data = await queryVleiCredentials()
      setResult(data)
      setState(data.success ? "done" : "error")
      if (!data.success) {
        setError(data.error || "Query completed with errors")
      }
    } catch (err: any) {
      setState("error")
      setError(err.message || "Failed to query credentials")
    }
  }, [])

  // ── Re-check status ──
  const handleRefreshStatus = useCallback(async () => {
    setState("checking")
    try {
      const s = await checkVleiStatus()
      setVleiReady(s.ready === true)
      setStatusInfo(s)
    } catch {
      setVleiReady(false)
    }
    setState("idle")
  }, [])

  const isRunning = state === "running" || state === "querying" || state === "checking"

  return (
    <div className="space-y-4">
      {/* ── Header + Action Buttons ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100">
            <KeyRound className="h-5 w-5 text-emerald-700" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">vLEI Credential Signing</h3>
            <p className="text-[11px] text-slate-500">
              Jupiter Seller Agent — Self-Attested Invoice Credential with Digital Signature
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status indicator */}
          <div className="flex items-center gap-1.5">
            {vleiReady === null ? (
              <Badge variant="outline" className="text-[10px] text-slate-400">Checking...</Badge>
            ) : vleiReady ? (
              <Badge variant="outline" className="border-emerald-300 text-emerald-700 text-[10px]">
                <CheckCircle2 className="h-3 w-3 mr-1" /> KERIA Ready
              </Badge>
            ) : (
              <Badge variant="outline" className="border-amber-300 text-amber-700 text-[10px]">
                <AlertCircle className="h-3 w-3 mr-1" /> Not Ready
              </Badge>
            )}
            <button
              type="button"
              onClick={handleRefreshStatus}
              disabled={isRunning}
              className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40"
              title="Refresh vLEI status"
            >
              <RefreshCw className={`h-3 w-3 ${state === "checking" ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Query button */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleQuery}
            disabled={isRunning}
            className="gap-1.5 text-xs"
          >
            {state === "querying" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Search className="h-3.5 w-3.5" />
            )}
            Query Credentials
          </Button>

          {/* Main VLEI Run button */}
          <Button
            size="sm"
            onClick={handleRun}
            disabled={isRunning}
            className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {state === "running" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            {state === "running" ? "Running 4C..." : "Run vLEI 4C"}
          </Button>
        </div>
      </div>

      {/* ── Running indicator ── */}
      {isRunning && state !== "checking" && (
        <Card className="border-blue-200 bg-blue-50/50 shadow-none">
          <CardContent className="flex items-center gap-3 py-3 px-4">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-800">
                {state === "running"
                  ? "Running Jupiter Seller Credential Signing Workflow..."
                  : "Querying KERIA for existing credentials..."}
              </p>
              <p className="text-[11px] text-blue-600">
                Connecting to KERIA via Docker — this calls the real vLEI server.{" "}
                <span className="font-mono">{(elapsedMs / 1000).toFixed(1)}s</span>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Error display ── */}
      {state === "error" && error && (
        <Card className="border-red-200 bg-red-50/50 shadow-none">
          <CardContent className="flex items-start gap-3 py-3 px-4">
            <XCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-800">Workflow Error</p>
              <p className="text-xs text-red-600 mt-0.5">{error}</p>
              {statusInfo && !statusInfo.ready && (
                <div className="mt-2 text-[11px] text-red-500 space-y-0.5">
                  <p>KERIA Running: {statusInfo.keriaRunning ? "Yes" : "No"}</p>
                  <p>TSX Shell Running: {statusInfo.tsxShellRunning ? "Yes" : "No"}</p>
                  <p>Agent Data Exists: {statusInfo.agentDataExists ? "Yes" : "No (run OOR workflow first)"}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Results ── */}
      {result && (
        <div className="space-y-3">

          {/* Summary bar */}
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-2.5">
            {result.success ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-amber-500" />
            )}
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-800">
                {result.workflow || "vLEI Credential Response"}
              </p>
              <p className="text-[11px] text-slate-500">
                {result.sellerAgent && `Agent: ${result.sellerAgent}`}
                {result.sellerAgentAID && ` — AID: ${result.sellerAgentAID}`}
                {result.durationMs && ` — ${(result.durationMs / 1000).toFixed(1)}s`}
              </p>
            </div>
            {result.success && (
              <Badge className="bg-emerald-100 text-emerald-800 text-[10px] border-none">
                <Shield className="h-3 w-3 mr-1" /> Signed
              </Badge>
            )}
          </div>

          {/* ── Digital Signature Card ── */}
          {result.digitalSignature && (
            <DigitalSignatureCard sig={result.digitalSignature} />
          )}

          {/* ── Credential list (for query mode) ── */}
          {result.credentials && result.credentials.length > 0 && (
            <Card className="border-slate-200 shadow-none">
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-xs font-semibold text-slate-700">
                  Credentials in KERIA ({result.totalCredentials})
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3 space-y-2">
                {result.credentials.map((cred: any, idx: number) => (
                  <div key={idx} className="rounded border border-slate-100 p-2.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          cred.type === "InvoiceCredential"
                            ? "border-emerald-300 text-emerald-700"
                            : cred.type === "OOR"
                              ? "border-blue-300 text-blue-700"
                              : "text-slate-500"
                        }`}
                      >
                        {cred.type}
                      </Badge>
                      {cred.digitalSignature?.signaturePresent && (
                        <Fingerprint className="h-3.5 w-3.5 text-emerald-500" />
                      )}
                    </div>
                    <div className="text-[11px] text-slate-600 space-y-0.5">
                      <p><span className="font-medium">SAID:</span> <span className="font-mono">{cred.said}</span></p>
                      {cred.invoiceNumber && <p><span className="font-medium">Invoice:</span> {cred.invoiceNumber} — {cred.totalAmount} {cred.currency}</p>}
                      {cred.officialRole && <p><span className="font-medium">Role:</span> {cred.officialRole} ({cred.personLegalName})</p>}
                      {cred.selfAttested && (
                        <p className="text-emerald-600 font-medium">Self-Attested (issuer = issuee)</p>
                      )}
                    </div>
                    {/* Show full SAD for each credential */}
                    {cred.fullSAD && (
                      <details className="mt-1">
                        <summary className="text-[10px] text-slate-400 cursor-pointer hover:text-slate-600">
                          Show full SAD (signed data)
                        </summary>
                        <pre className="mt-1 max-h-48 overflow-auto rounded bg-slate-50 p-2 text-[9px] font-mono text-slate-600 border border-slate-100">
                          <JsonHighlighter data={cred.fullSAD} />
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* ── Workflow Steps ── */}
          {steps.length > 0 && (
            <Card className="border-slate-200 shadow-none">
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-xs font-semibold text-slate-700">
                  Workflow Steps
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3 space-y-1">
                {steps.map((step, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded border border-slate-100 px-2.5 py-1.5 text-[11px]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
                        {step.step}
                      </span>
                      <span className="font-medium text-slate-700">{step.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {step.status === "success" ? (
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <XCircle className="h-3 w-3 text-red-500" />
                      )}
                      {step.detail && (
                        <span className="max-w-[200px] truncate text-[10px] text-slate-400" title={step.detail}>
                          {step.detail}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* ── Credential JSON (highlighted) ── */}
          {result.credential && (
            <div className="rounded-lg border border-emerald-200">
              <div
                className="flex cursor-pointer items-center justify-between px-3 py-2 hover:bg-emerald-50/50"
                onClick={() => setShowCredentialJson(!showCredentialJson)}
              >
                <div className="flex items-center gap-2 text-xs text-emerald-700">
                  <Fingerprint className="h-3.5 w-3.5" />
                  <span className="font-medium">Credential JSON (with Digital Signature)</span>
                  {showCredentialJson ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                </div>
                <button
                  type="button"
                  className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-600 hover:bg-emerald-100 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigator.clipboard.writeText(JSON.stringify(result.credential, null, 2))
                  }}
                >
                  Copy
                </button>
              </div>
              {showCredentialJson && (
                <pre className="max-h-[500px] overflow-auto border-t border-emerald-100 bg-white p-3 text-[10px] font-mono leading-relaxed">
                  <JsonHighlighter data={result.credential} />
                </pre>
              )}
            </div>
          )}

          {/* ── Full Raw JSON ── */}
          <div className="rounded-lg border border-slate-200">
            <div
              className="flex cursor-pointer items-center justify-between px-3 py-2 hover:bg-slate-50"
              onClick={() => setShowRawJson(!showRawJson)}
            >
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <FileJson className="h-3.5 w-3.5" />
                <span>Full JSON Response</span>
                {showRawJson ? (
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                )}
              </div>
              <button
                type="button"
                className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-500 hover:bg-slate-100 transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  navigator.clipboard.writeText(JSON.stringify(result, null, 2))
                }}
              >
                Copy JSON
              </button>
            </div>
            {showRawJson && (
              <pre className="max-h-[600px] overflow-auto border-t border-slate-100 bg-slate-50 p-3 text-[10px] font-mono text-slate-600">
                {JSON.stringify(result, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}

      {/* ── Idle info ── */}
      {state === "idle" && !result && (
        <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center">
          <KeyRound className="mx-auto h-8 w-8 text-slate-300 mb-2" />
          <p className="text-sm text-slate-500">
            Click <strong>Run vLEI 4C</strong> to trigger the Jupiter Seller credential signing workflow.
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            This calls the KERIA server to issue a real self-attested invoice credential
            with a cryptographic digital signature. No mocks or fake data.
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Or click <strong>Query Credentials</strong> to view existing credentials from a prior run.
          </p>
        </div>
      )}
    </div>
  )
}
