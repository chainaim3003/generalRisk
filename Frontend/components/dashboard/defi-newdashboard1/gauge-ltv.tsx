'use client'
/** gauge-ltv.tsx — light theme version (kept for any direct usage) */
import React from 'react'
interface Props { ltv: number; warnThreshold?: number; liqThreshold?: number; targetLtv?: number }
export function GaugeLtv({ ltv, warnThreshold = 75, liqThreshold = 82.5, targetLtv = 65 }: Props) {
  const c = Math.max(0, Math.min(100, ltv))
  const deg = Math.min(-90 + (c / 100) * 160, 80)
  const col = c < targetLtv ? '#16a34a' : c < warnThreshold ? '#16a34a' : c < liqThreshold ? '#d97706' : '#dc2626'
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'8px 0' }}>
      <svg width="160" height="90" viewBox="0 0 160 90">
        <path d="M15 80 A65 65 0 0 1 145 80" fill="none" stroke="#e5e7eb" strokeWidth="14" strokeLinecap="round"/>
        <path d="M15 80 A65 65 0 0 1 72 17"  fill="none" stroke="#16a34a" strokeWidth="14" strokeLinecap="round" opacity=".8"/>
        <path d="M72 17 A65 65 0 0 1 110 19" fill="none" stroke="#d97706" strokeWidth="14" strokeLinecap="round" opacity=".8"/>
        <path d="M110 19 A65 65 0 0 1 130 32" fill="none" stroke="#dc2626" strokeWidth="14" strokeLinecap="round" opacity=".8"/>
        <path d="M130 32 A65 65 0 0 1 145 80" fill="none" stroke="#991b1b" strokeWidth="14" strokeLinecap="round" opacity=".8"/>
        <line x1="80" y1="80" x2="80" y2="22" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round"
          transform={`rotate(${deg} 80 80)`} style={{ transition:'transform .15s ease-out' }}/>
        <circle cx="80" cy="80" r="4" fill="#1e293b"/>
        <text x="80" y="72" textAnchor="middle" fontSize="14" fontWeight="600" fill={col}>{c.toFixed(1)}%</text>
      </svg>
      <p style={{ fontSize:11, color:'#868e96', marginTop:4, textAlign:'center' }}>
        LTV · <span style={{ color:'#16a34a' }}>{targetLtv}% target</span>{' '}
        · <span style={{ color:'#d97706' }}>{warnThreshold}% warn</span>{' '}
        · <span style={{ color:'#dc2626' }}>{liqThreshold}% liq</span>
      </p>
    </div>
  )
}
