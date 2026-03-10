import type {
  VerifyRequest,
  VerifyResponse,
  Scenario,
  Thresholds,
  HealthStatus,
  Portfolio,
  Jurisdiction,
  StimulationListItem,
  StimulationResult,
  EnvironmentInfo,
} from "./types"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000/api"
const DEFAULT_ACTUS_URL = "http://34.203.247.32:8083/eventsBatch"

async function fetchApi<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  })
  if (!res.ok) {
    const errorBody = await res.text().catch(() => "Unknown error")
    throw new Error(`API Error ${res.status}: ${errorBody}`)
  }
  return res.json()
}

export async function verifyPortfolio(
  portfolio: Portfolio,
  thresholds: Thresholds,
  jurisdiction?: Jurisdiction,
  actusUrl?: string
): Promise<VerifyResponse> {
  const body: VerifyRequest = {
    portfolio,
    thresholds,
    jurisdiction: jurisdiction || 'custom',
    actusUrl: actusUrl || DEFAULT_ACTUS_URL,
  }
  return fetchApi<VerifyResponse>("/verify", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export async function getScenarios(): Promise<Scenario[]> {
  return fetchApi<Scenario[]>("/scenarios")
}

export async function getScenario(id: string): Promise<Scenario> {
  return fetchApi<Scenario>(`/scenarios/${id}`)
}

export async function getPortfolios(): Promise<
  Array<{ id: string; filename: string; portfolio: any }>
> {
  return fetchApi("/portfolios")
}

export async function getThresholds(
  jurisdiction: string
): Promise<Thresholds> {
  return fetchApi<Thresholds>(`/thresholds/${jurisdiction}`)
}

export async function checkHealth(): Promise<HealthStatus> {
  try {
    const data = await fetchApi<Record<string, unknown>>("/health")
    return {
      status: "healthy",
      actusConnected: (data.actusConnected as boolean) ?? true,
      apiVersion: (data.version as string) ?? "1.0.0",
    }
  } catch {
    return {
      status: "unhealthy",
      actusConnected: false,
    }
  }
}

export async function testActusConnection(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(5000),
    })
    return res.ok
  } catch {
    return false
  }
}

// ---- Stimulation API ----

export function getActusEnvironment(): string {
  return process.env.NEXT_PUBLIC_ACTUS_ENVIRONMENT || "localhost"
}

export async function getEnvironments(): Promise<EnvironmentInfo[]> {
  return fetchApi<EnvironmentInfo[]>("/environments")
}

export async function getStimulations(): Promise<StimulationListItem[]> {
  return fetchApi<StimulationListItem[]>("/stimulations")
}

export async function runStimulation(
  stimulationId: string,
  environment?: string
): Promise<StimulationResult> {
  const env = environment || getActusEnvironment()
  return fetchApi<StimulationResult>("/stimulation/run", {
    method: "POST",
    body: JSON.stringify({ stimulationId, environment: env }),
  })
}

export async function runStimulationFromJson(
  collectionJson: any,
  environment?: string
): Promise<StimulationResult> {
  const env = environment || getActusEnvironment()
  return fetchApi<StimulationResult>("/stimulation/run", {
    method: "POST",
    body: JSON.stringify({
      collectionJson,
      environment: env,
    }),
  })
}

export async function checkRiskServiceHealth(
  environment?: string
): Promise<any> {
  const env = environment || getActusEnvironment()
  return fetchApi(`/health/risk-service?environment=${env}`)
}

// SWR fetchers
export const scenariosFetcher = () => getScenarios()
export const portfoliosFetcher = () => getPortfolios()
export const healthFetcher = () => checkHealth()
export const stimulationsFetcher = () => getStimulations()
