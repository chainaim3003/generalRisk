// ---- Verification Request / Response Types ----

export interface Contract {
  contractType: string
  contractID: string
  statusDate: string
  contractRole: string
  contractDealDate?: string
  currency?: string
  notionalPrincipal?: number
  maturityDate?: string
  nominalInterestRate?: number
  initialExchangeDate?: string
  dayCountConvention?: string
  reserveType?: "cash" | "treasury" | "corporate" | "other"
  liquidityScore?: number
  creditRating?: number
  maturityDays?: number
  [key: string]: unknown
}

export interface Portfolio {
  id?: string
  totalNotional?: number
  description?: string
  contracts: Contract[]
}

export interface Thresholds {
  backingRatio: number
  liquidityRatio: number
  concentrationLimit: number
  assetQuality: number
}

export interface VerifyRequest {
  portfolio: Portfolio
  thresholds: Thresholds
  actusUrl?: string
  jurisdiction?: string
}

export interface MetricResult {
  value: number
  threshold: number
  pass: boolean
  details?: string
}

export interface ReserveBreakdown {
  type: string
  count: number
  totalValue: number
  percentage: number
}

export interface PeriodMetrics {
  period: string
  backingRatio: number
  liquidityRatio: number
  concentrationRisk: number
  assetQuality: number
}

// Backend response structure
export interface VerifyResponse {
  success: boolean
  compliant: boolean
  riskMetrics: {
    backingRatios: number[]
    liquidityRatios: number[]
    concentrationRisks: number[]
    assetQualityScores: number[]
    averageBackingRatio: number
    averageLiquidityRatio: number
    maxConcentrationRisk: number
    averageAssetQuality: number
    backingCompliant: boolean
    liquidityCompliant: boolean
    concentrationCompliant: boolean
    qualityCompliant: boolean
    overallCompliant: boolean
  }
  summary: {
    portfolioId: string
    periodsAnalyzed: number
    backing: {
      average: number
      threshold: number
      status: 'PASS' | 'FAIL'
    }
    liquidity: {
      average: number
      threshold: number
      status: 'PASS' | 'FAIL'
    }
    concentration: {
      maximum: number
      limit: number
      status: 'PASS' | 'FAIL'
    }
    quality: {
      score: number
      threshold: number
      status: 'PASS' | 'FAIL'
    }
    overallStatus: 'COMPLIANT' | 'NON-COMPLIANT'
    failureReasons: string[]
  }
  timestamp: string
  jurisdiction?: string
}

// ---- Scenario Types ----

export interface Scenario {
  id: string
  filename: string
  portfolio: {
    portfolioMetadata: {
      portfolioId: string
      totalNotional: number
      currency: string
      description?: string
    }
    contracts: Contract[]
  }
}

// ---- Quick Check Types ----

export interface QuickCheckResult {
  compliant: boolean
  backingRatio: number
  liquidityRatio: number
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
}

// ---- Chat / AI Types ----

export interface ChatMessage {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: string
  portfolio?: Portfolio
  isVerifying?: boolean
}

export interface ScenarioTemplate {
  id: string
  name: string
  description: string
  prompt: string
}

// ---- UI State Types ----

export type DashboardMode =
  | "upload"
  | "chat"
  | "simulation"
  | "config"
  | "defi-config"
  | "defi-liquidation"
  | "buffer-v5"
  | "issuer"
  | "holder"

export type Jurisdiction = "eu-mica" | "us-genius" | "custom"

export type ContractFormType = "PAM" | "ANN" | "NAM" | "LAM" | "CLM"

export interface HealthStatus {
  status: "healthy" | "unhealthy" | "checking"
  actusConnected: boolean
  apiVersion?: string
}

// ---- Stimulation Types ----

export interface StimulationListItem {
  id: string
  category: string
  filename: string
  name: string
  description: string
  stepsCount: number
}

export interface StimulationStepResult {
  step: number
  name: string
  method: string
  url: string
  status: "success" | "failed"
  httpStatus?: number
  response?: any
  error?: string
  durationMs: number
}

export interface SimulationEvent {
  time: string
  type: string
  payoff: number
  nominalValue: number
  currency: string
  nominalInterestRate?: number
  states?: Record<string, number>
}

export interface RiskFactorPoint {
  time: string
  value: number
}

export interface StimulationResult {
  success: boolean
  scenarioName: string
  description: string
  environment: string
  riskServiceUrl: string
  actusServerUrl: string
  steps: StimulationStepResult[]
  simulation: Array<{
    contractId: string
    events: SimulationEvent[]
  }> | null
  /** Risk factor input time-series extracted from addReferenceIndex steps */
  riskFactorData: Record<string, RiskFactorPoint[]> | null
  totalDurationMs: number
  timestamp: string
}

export interface EnvironmentInfo {
  name: string
  riskServiceUrl: string
  actusServerUrl: string
}
