'use client'
import React, { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { DerivedSeries } from './types'

type Granularity = 'hourly' | 'daily' | 'minutely' | 'secondly'

interface Props {
  displaySeries: DerivedSeries
  isLiveData: boolean
  isRunning: boolean
}

const TT = {
  backgroundColor: '#fff', border: '1px solid #dee2e6',
  borderRadius: 8, color: '#212529', fontSize: 11, padding: '6px 10px',
}

export function TabMarketData({ displaySeries, isLiveData, isRunning }: Props) {
  const [granularity, setGranularity] = useState<Granularity>('hourly')

  // Only show graphs if live data is available
  if (!isLiveData) {
    return (
      <div style={{ padding: 20 }}>
        <div className="bs-card">
          <div style={{ 
            padding: '60px 20px', 
            textAlign: 'center', 
            color: '#868e96',
            fontSize: 14,
            lineHeight: 1.8
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: '#495057' }}>
              No Market Data Available
            </div>
            <div>
              Click <strong>"Run Simulation"</strong> to load market risk factor data from ACTUS
            </div>
          </div>
        </div>
      </div>
    )
  }

  const data = displaySeries.marketData

  const granularityData = (() => {
    if (granularity === 'daily') {
      return data.filter((_, i) => i % 24 === 0)
    }
    return data
  })()

  const actualDataCount = data.length
  const dailyDataCount = Math.ceil(data.length / 24)

  const tInt = Math.max(1, Math.floor(granularityData.length / 8))

  return (
    <div style={{ padding: 20 }}>
      <div className="bs-live-banner">
        <span>✓ Live Data</span>
        <span style={{ opacity: 0.8 }}>Showing real ACTUS simulation results ({actualDataCount} points)</span>
      </div>

      <div className="bs-card">
        <div className="bs-heading">Market Risk Factors</div>
        <div className="bs-gran-tabs">
          <button
            className={`bs-gran-tab${granularity === 'hourly' ? ' active' : ''}`}
            onClick={() => setGranularity('hourly')}
          >
            All Data ({actualDataCount} points)
          </button>
          <button
            className={`bs-gran-tab${granularity === 'daily' ? ' active' : ''}`}
            onClick={() => setGranularity('daily')}
            disabled={actualDataCount < 24}
            style={actualDataCount < 24 ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
          >
            Daily ({dailyDataCount} points)
          </button>
          <button
            className="bs-gran-tab"
            disabled
            style={{ opacity: 0.5, cursor: 'not-allowed' }}
          >
            Minutely (requires minutely file)
          </button>
          <button
            className="bs-gran-tab"
            disabled
            style={{ opacity: 0.5, cursor: 'not-allowed' }}
          >
            Secondly (requires secondly file)
          </button>
        </div>

        <div className="bs-2col">
          <div>
            <div className="bs-mini-title">ETH/USDC Price</div>
            <div className="bs-chart-200">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={granularityData} margin={{ top: 4, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f5" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#868e96' }} tickLine={false} axisLine={false} interval={tInt} />
                  <YAxis tick={{ fontSize: 10, fill: '#868e96' }} tickLine={false} axisLine={false}
                    tickFormatter={v => `$${Math.round(Number(v)).toLocaleString()}`} width={58} />
                  <Tooltip contentStyle={TT} formatter={(v: number) => [`$${v.toLocaleString()}`, 'ETH Price']} />
                  <Line type="monotone" dataKey="ethPrice" stroke="#2563eb" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div>
            <div className="bs-mini-title">DeFi Borrowing Rate</div>
            <div className="bs-chart-200">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={granularityData} margin={{ top: 4, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f5" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#868e96' }} tickLine={false} axisLine={false} interval={tInt} />
                  <YAxis tick={{ fontSize: 10, fill: '#868e96' }} tickLine={false} axisLine={false}
                    tickFormatter={v => `${Number(v).toFixed(2)}%`} width={48} />
                  <Tooltip contentStyle={TT} formatter={(v: number) => [`${v.toFixed(4)}%`, 'DeFi Rate']} />
                  <Line type="monotone" dataKey="defiRate" stroke="#16a34a" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 20, fontSize: 12, color: 'var(--bs-text3)' }}>
          <strong>Data Points:</strong> {granularityData.length} | 
          <strong> ETH Range:</strong> ${Math.min(...granularityData.map(d => d.ethPrice)).toFixed(2)} - ${Math.max(...granularityData.map(d => d.ethPrice)).toFixed(2)} | 
          <strong> Rate Range:</strong> {Math.min(...granularityData.map(d => d.defiRate)).toFixed(4)}% - {Math.max(...granularityData.map(d => d.defiRate)).toFixed(4)}%
        </div>
      </div>
    </div>
  )
}
