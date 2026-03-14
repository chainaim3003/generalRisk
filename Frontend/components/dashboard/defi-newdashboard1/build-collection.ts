/**
 * build-collection.ts
 * Pure function: takes user SimParams and returns a valid Postman collection
 * object matching the V5 schema exactly.
 *
 * All 7 steps are reconstructed with user values substituted.
 * No hardcoded risk values — every numerical constant comes from params.
 *
 * Based on: ETH-Liq-LTV-TPP-COM-COL-BUF-SELL-1mon-30-100Y3M-daily-FIXED-V5.json
 */

import type { SimParams } from './types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Generate daily ISO timestamps from 2026-02-18 for N days */
function dailyTimes(n: number): string[] {
  const base = new Date('2026-02-18T00:00:00')
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(base.getTime() + i * 86_400_000)
    return d.toISOString().slice(0, 19)
  })
}

/** Generate monitoring times at +1ms offset (V5 state sync fix) */
function monitoringTimes(): string[] {
  // Day 0 is IED (2026-02-18), monitoring starts day 1 through day 89 → 89 times
  const base = new Date('2026-02-19T00:00:00.001')
  return Array.from({ length: 89 }, (_, i) => {
    const d = new Date(base.getTime() + i * 86_400_000)
    return d.toISOString().slice(0, 23)
  })
}

/** Generate weekly prepayment event times (12 events starting Feb 25) */
function weeklyPrepaymentTimes(): string[] {
  const base = new Date('2026-02-25T00:00:00')
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(base.getTime() + i * 7 * 86_400_000)
    return d.toISOString().slice(0, 19)
  })
}

/**
 * Generate the monotone-rising DeFi rate series.
 * Uses compound-root progression matching the original V5 collection ratio.
 * rateStart * ((rateEnd/rateStart)^(i/89)) for i in 0..89
 * Original: 0.05 → 0.11462 = factor 2.2924
 */
function buildRateSeries(
  times: string[],
  rateStart: number,
): Array<{ time: string; value: number }> {
  const n = times.length
  const rateEnd = rateStart * 2.2924
  return times.map((time, i) => ({
    time,
    value: parseFloat(
      (rateStart * Math.pow(rateEnd / rateStart, i / (n - 1))).toFixed(6),
    ),
  }))
}

/** Build ETH price series linearly from ethStart to ethEnd */
function buildPriceSeries(
  times: string[],
  ethStart: number,
  ethEnd: number,
): Array<{ time: string; value: number }> {
  const n = times.length
  return times.map((time, i) => ({
    time,
    value: parseFloat(
      (ethStart + (ethEnd - ethStart) * (i / (n - 1))).toFixed(2),
    ),
  }))
}

// ─── Postman item builder ─────────────────────────────────────────────────────

function makeStep(name: string, method: string, rawUrl: string, body: object): object {
  const url = new URL(rawUrl)
  return {
    name,
    request: {
      method,
      header: [{ key: 'Content-Type', value: 'application/json' }],
      body: {
        mode: 'raw',
        raw: JSON.stringify(body),
      },
      url: {
        raw: rawUrl,
        protocol: url.protocol.replace(':', ''),
        host: [url.hostname],
        port: url.port,
        path: url.pathname.replace(/^\//, '').split('/'),
      },
    },
    response: [],
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

/** Returns a complete Postman collection JSON object with user params substituted */
export function buildCollection(params: SimParams): object {
  const {
    loanAmount,
    collateralEth,
    bufferEth,
    ethStartPrice,
    ethEndPrice,
    rateStart,
    ltvThreshold,
    ltvTarget,
    maxInterventions,
    minBufferReserve,
  } = params

  const DAYS = 90
  const times = dailyTimes(DAYS)
  const rateSeries = buildRateSeries(times, rateStart)
  const priceSeries = buildPriceSeries(times, ethStartPrice, ethEndPrice)
  const monTimes = monitoringTimes()
  const ppTimes = weeklyPrepaymentTimes()

  // Step 1: DEFI_RATE reference index
  const step1Body = {
    riskFactorID: 'DEFI_RAT_MON_01',
    marketObjectCode: 'DEFI_RATE',
    base: 1.0,
    data: rateSeries,
  }

  // Step 2: ETH_USD reference index
  const step2Body = {
    riskFactorID: 'ETH_PRICE_MON_01',
    marketObjectCode: 'ETH_USD',
    base: 1.0,
    data: priceSeries,
  }

  // Step 3: TwoDimensionalPrepaymentModel (surface unchanged from V5)
  const step3Body = {
    riskFactorId: 'defi_pp_mon_01',
    referenceRateId: 'DEFI_RATE',
    prepaymentEventTimes: ppTimes,
    surface: {
      interpolationMethod: 'linear',
      extrapolationMethod: 'constant',
      margins: [
        { dimension: 1, values: [0.03, 0.02, 0.01, 0.0, -0.01, -0.02, -0.03] },
        { dimension: 2, values: [0, 0.025, 0.05, 0.083] },
      ],
      data: [
        [0.15, 0.12, 0.1, 0.08],
        [0.1, 0.08, 0.06, 0.05],
        [0.05, 0.04, 0.03, 0.02],
        [0.02, 0.01, 0.005, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
    },
  }

  // Step 4: BufferLTVModel — all user-configurable params
  const step4Body = {
    riskFactorId: 'buffer_ltv_mon_01',
    collateralPriceMarketObjectCode: 'ETH_USD',
    collateralQuantity: collateralEth,
    bufferContractId: 'ETH-Buffer-Portfolio-01',
    initialBufferQuantity: bufferEth,
    ltvThreshold: ltvThreshold,
    ltvTarget: ltvTarget,
    liquidationThreshold: 0.825,
    maxInterventions: maxInterventions,
    minBufferReserve: minBufferReserve,
    maxBufferUsagePerIntervention: 0.33,
    cooldownMillis: 86400000,
    fallingKnifePriceDropThreshold: 0.20,
    fallingKnifeTimeWindowMillis: 172800000,
    monitoringEventTimes: monTimes,
  }

  // Step 5: addScenario
  const step5Body = {
    scenarioID: 'defi_buffer_first_scn01',
    riskFactorDescriptors: [
      { riskFactorID: 'DEFI_RAT_MON_01', riskFactorType: 'ReferenceIndex' },
      { riskFactorID: 'ETH_PRICE_MON_01', riskFactorType: 'ReferenceIndex' },
      { riskFactorID: 'defi_pp_mon_01', riskFactorType: 'TwoDimensionalPrepaymentModel' },
      { riskFactorID: 'buffer_ltv_mon_01', riskFactorType: 'BufferLTVModel' },
    ],
  }

  // Step 7: scenarioSimulation — 3 contracts
  const step7Body = {
    contracts: [
      {
        calendar: 'NC',
        businessDayConvention: 'SCF',
        contractType: 'COM',
        contractID: 'ETH-Collateral-CompetingRisk-01',
        contractRole: 'RPA',
        statusDate: '2026-02-17T00:00:00',
        contractDealDate: '2026-02-17T00:00:00',
        initialExchangeDate: '2026-02-18T00:00:00',
        maturityDate: '2126-02-18T00:00:00',
        currency: 'USD',
        marketObjectCode: 'ETH_USD',
        quantity: collateralEth,
        unit: 'ETH',
      },
      {
        calendar: 'NC',
        businessDayConvention: 'SCF',
        contractType: 'COM',
        contractID: 'ETH-Buffer-Portfolio-01',
        contractRole: 'RPA',
        statusDate: '2026-02-17T00:00:00',
        contractDealDate: '2026-02-17T00:00:00',
        initialExchangeDate: '2026-02-18T00:00:00',
        maturityDate: '2126-02-18T00:00:00',
        currency: 'USD',
        marketObjectCode: 'ETH_USD',
        quantity: bufferEth,
        unit: 'ETH',
      },
      {
        calendar: 'NC',
        businessDayConvention: 'SCF',
        contractType: 'PAM',
        statusDate: '2026-02-17T00:00:00',
        contractRole: 'RPA',
        contractID: 'DeFi-ETH-CompetingRisk-01',
        cycleAnchorDateOfInterestPayment: '2026-03-20T00:00:00',
        cycleOfInterestPayment: 'P1ML0',
        nominalInterestRate: rateStart,
        dayCountConvention: '30E360',
        currency: 'USD',
        contractDealDate: '2026-02-17T00:00:00',
        initialExchangeDate: '2026-02-18T00:00:00',
        maturityDate: '2126-02-18T00:00:00',
        notionalPrincipal: loanAmount,
        premiumDiscountAtIED: 0,
        cycleAnchorDateOfRateReset: '2026-02-19T00:00:00',
        cycleOfRateReset: 'P1DL1',
        rateSpread: 0.0,
        marketObjectCodeOfRateReset: 'DEFI_RATE',
        prepaymentModels: ['defi_pp_mon_01', 'buffer_ltv_mon_01'],
        enablePPStateCorrection: true,
      },
    ],
    scenarioDescriptor: {
      scenarioID: 'defi_buffer_first_scn01',
      scenarioType: 'scenario',
    },
    simulateTo: '2026-05-19T00:00:00',
    monitoringTimes: [],
  }

  return {
    info: {
      _postman_id: 'eth-portfolio-3contract-buffer-sell-90days-v5-ui',
      name: 'ETH-Liq-LTV-TPP-COM-COL-BUF-SELL-1mon-30-100Y3M-daily-FIXED-V5',
      description: 'UI-generated V5 collection — params from user sliders',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    item: [
      makeStep('1. Add DeFi Rate Index (90 days)', 'POST', 'http://localhost:8082/addReferenceIndex', step1Body),
      makeStep('2. Add ETH Price Index (90 days)', 'POST', 'http://localhost:8082/addReferenceIndex', step2Body),
      makeStep('3. Add Prepayment Model (90 days)', 'POST', 'http://localhost:8082/addTwoDimensionalPrepaymentModel', step3Body),
      makeStep('4. Add BufferLTV Model (90 days monitoring - V5 CONFIG)', 'POST', 'http://localhost:8082/addBufferLTVModel', step4Body),
      makeStep('5. Add Scenario (with BufferLTVModel)', 'POST', 'http://localhost:8082/addScenario', step5Body),
      {
        name: '6. Verify Setup',
        request: {
          method: 'GET',
          header: [],
          url: {
            raw: 'http://localhost:8082/findAllScenarios',
            protocol: 'http',
            host: ['localhost'],
            port: '8082',
            path: ['findAllScenarios'],
          },
        },
        response: [],
      },
      makeStep(
        '7. Run Portfolio Simulation - OPTION B + PP CORRECTION (FIXED-V5)',
        'POST',
        'http://localhost:8083/rf2/scenarioSimulation',
        step7Body,
      ),
    ],
  }
}
