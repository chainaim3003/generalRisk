'use client'
/**
 * tab-crisis-scenario.tsx — Tab 3
 * Always has data. Animated playback from displaySeries.
 * Gauge + animated dual-axis chart + collateral vs loan.
 */
import React, { useState, useRef, useCallback, useEffect } from 'react'
import {
  ComposedChart, Line, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import type { DerivedSeries, SimParams, Strategy } from './types'

const TT = { backgroundColor:'#fff', border:'1px solid #dee2e6', borderRadius:8, color:'#212529', fontSize:11, padding:'6px 10px' }
type AnimStatus = 'idle' | 'playing' | 'paused' | 'complete' | 'liquidated'

export function TabCrisisScenario({ displaySeries: d, params, isLiveData, isRunning }: {
  displaySeries: DerivedSeries; params: SimParams; isLiveData: boolean; isRunning: boolean
}) {
  const [step, setStep] = useState(0)
  const [anim, setAnim] = useState<AnimStatus>('idle')
  const [strategy, setStrategy] = useState<Strategy | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const pp1Idx = d.ppEvents.length > 0
    ? (() => {
        const pp1Date = d.ppEvents[0].time.slice(0,10)
        const idx = d.priceLtv.findIndex(pt=>pt.isoDate.slice(0,10)>=pp1Date)
        return idx>=0?idx:-1
      })()
    : -1

  const stop = useCallback(()=>{ if(timerRef.current){clearInterval(timerRef.current);timerRef.current=null} },[])
  useEffect(()=>()=>stop(),[stop])
  const reset = useCallback(()=>{ stop();setStep(0);setAnim('idle');setStrategy(null) },[stop])

  useEffect(()=>{
    if(anim!=='playing'){stop();return}
    timerRef.current=setInterval(()=>{
      setStep(prev=>{
        const next=prev+1
        if(next>=d.priceLtv.length){stop();setAnim('complete');return prev}
        const ltv=d.priceLtv[next].ltv
        if(pp1Idx>0&&next===pp1Idx){stop();setAnim('paused');return next}
        if(ltv>=82.5){stop();setAnim('liquidated');return next}
        return next
      })
    },80)
    return stop
  },[anim,d,pp1Idx,stop])

  const startPlay=useCallback(()=>{
    if(anim==='paused'){setAnim('playing');return}
    setStep(0);setStrategy(null);setAnim('playing')
  },[anim])

  const vis=d.priceLtv.slice(0,step+1)
  const visCover=d.coverSeries.slice(0,step+1)
  const cur=step<d.priceLtv.length?d.priceLtv[step]:null
  const curLtv=cur?.ltv??0
  const curPrice=cur?.price??0
  const curBal=cur?.loanBalance??0
  const tInt=Math.max(1,Math.floor(vis.length/8))
  const startLoan=d.pamEvents.find(e=>e.type==='IED')?.nominalValue??params.loanAmount

  const clamped=Math.max(0,Math.min(100,curLtv))
  const needleDeg=Math.min(-90+(clamped/100)*160,80)
  const needleColor=clamped<65?'#16a34a':clamped<75?'#16a34a':clamped<82.5?'#d97706':'#dc2626'
  const ltvCls=curLtv<65?'green':curLtv<75?'green':curLtv<82.5?'amber':'red'

  const statusLabel=anim==='idle'?'Ready':anim==='playing'?'Running…':anim==='paused'?'PAUSED — Decision required':anim==='liquidated'?'LIQUIDATED':'Complete'
  const statusStyle: React.CSSProperties=
    anim==='paused'?{background:'#dbeafe',color:'#1d4ed8'}:
    anim==='liquidated'?{background:'#fee2e2',color:'#b91c1c'}:
    anim==='complete'?{background:'#dcfce7',color:'#15803d'}:
    {background:'#f1f5f9',color:'#475569'}

  // Collateral coverage ratio series for additional chart
  const coverageRatio = d.priceLtv.map(pt=>({
    date: pt.date,
    ratio: pt.loanBalance>0 ? parseFloat(((params.collateralEth*pt.price)/pt.loanBalance).toFixed(3)) : 0,
  }))

  return (
    <div style={{ padding:20 }}>
      {isLiveData
        ? <div className="bs-live-banner">✅ <strong>Live ACTUS data</strong> — animation plays real 90-day ETH price path. {d.ppEvents.length>0?`Pauses at PP1 (${new Date(d.ppEvents[0].time).toLocaleDateString('en-US',{month:'short',day:'numeric'})}) for strategy decision.`:'No PP events — ETH price stayed below LTV threshold.'}</div>
        : <div className="bs-preview-banner">📊 <strong>Preview mode</strong> — animation uses projected ETH price from slider values. PP pause point shown at projected Apr 15 intervention. Run Simulation for real ACTUS timing.</div>
      }

      <div className="bs-layout">
        {/* LEFT */}
        <div className="bs-col-left">
          <div className="bs-card">
            <div className="bs-heading">Scenario: ETH decline + buffer defense</div>
            <p style={{ fontSize:12, color:'#495057', lineHeight:1.6, marginBottom:12 }}>
              Loan: ${startLoan.toLocaleString('en-US',{maximumFractionDigits:0})} USDC ·
              Collateral: {d.collateralQty.toFixed(1)} ETH (constant)<br/>
              Buffer: {d.bufferInitial.toFixed(1)} ETH · ETH: ${params.ethStartPrice.toLocaleString()} → ${params.ethEndPrice.toLocaleString()}<br/>
              {pp1Idx>=0&&d.priceLtv[pp1Idx]
                ? `Decision at ${d.priceLtv[pp1Idx].date} when LTV = ${d.priceLtv[pp1Idx].ltv.toFixed(1)}%`
                : `Projected: ETH hits LTV ${(params.ltvThreshold*100).toFixed(0)}% around Apr 15`}
            </p>
            <div style={{ display:'flex', gap:8, marginBottom:10 }}>
              <button type="button" onClick={startPlay} className="bs-btn-primary" style={{ flex:1 }}>
                {anim==='complete'||anim==='liquidated'?'Replay':'Run simulation'}
              </button>
              <button type="button" onClick={reset} className="bs-btn-secondary">Reset</button>
            </div>
            <span style={{ ...statusStyle, display:'inline-block', padding:'3px 12px', borderRadius:20, fontSize:11, fontWeight:600 }}>
              {statusLabel}
            </span>

            {anim==='paused'&&(
              <div style={{ marginTop:14 }}>
                <div className="bs-warn-box">⏸ LTV crossed {(params.ltvThreshold*100).toFixed(0)}% threshold. Choose a strategy.</div>
                <div className="bs-heading">Choose your strategy</div>
                <div className="bs-strategy-grid">
                  {[
                    {key:'A' as Strategy, title:'A — Let it ride', sub:'No action. Bet on recovery.'},
                    {key:'B' as Strategy, title:'B — Buffer sell (V5)', sub:'Sell buffer ETH to reduce loan.'},
                    {key:'C' as Strategy, title:'C — Circuit breaker', sub:'Voluntary exit. Clean slate.'},
                  ].map(s=>(
                    <div key={s.key} onClick={()=>setStrategy(s.key)}
                      className={`bs-strategy-card${strategy===s.key?' selected':''}`}>
                      <div className="bs-strategy-title">{s.title}</div>
                      <div className="bs-strategy-sub">{s.sub}</div>
                    </div>
                  ))}
                </div>
                {strategy&&(
                  <button type="button"
                    onClick={()=>strategy==='C'?setAnim('complete'):setAnim('playing')}
                    className="bs-btn-primary" style={{ marginTop:10, width:'100%', justifyContent:'center' }}>
                    Confirm strategy ↗
                  </button>
                )}
              </div>
            )}
          </div>

          {/* LTV Gauge */}
          <div className="bs-card">
            <div className="bs-heading">LTV gauge</div>
            <div className="bs-gauge-wrap">
              <svg width="160" height="90" viewBox="0 0 160 90">
                <path d="M15 80 A65 65 0 0 1 145 80" fill="none" stroke="#e5e7eb" strokeWidth="14" strokeLinecap="round"/>
                <path d="M15 80 A65 65 0 0 1 72 17" fill="none" stroke="#16a34a" strokeWidth="14" strokeLinecap="round" opacity=".8"/>
                <path d="M72 17 A65 65 0 0 1 110 19" fill="none" stroke="#d97706" strokeWidth="14" strokeLinecap="round" opacity=".8"/>
                <path d="M110 19 A65 65 0 0 1 130 32" fill="none" stroke="#dc2626" strokeWidth="14" strokeLinecap="round" opacity=".8"/>
                <path d="M130 32 A65 65 0 0 1 145 80" fill="none" stroke="#991b1b" strokeWidth="14" strokeLinecap="round" opacity=".8"/>
                <line x1="80" y1="80" x2="80" y2="22" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round"
                  transform={`rotate(${needleDeg} 80 80)`} style={{ transition:'transform .15s ease-out' }}/>
                <circle cx="80" cy="80" r="4" fill="#1e293b"/>
                <text x="80" y="72" textAnchor="middle" fontSize="14" fontWeight="600" fill={needleColor}>
                  {anim==='idle'?`${d.initialLtv.toFixed(1)}%`:clamped.toFixed(1)+'%'}
                </text>
              </svg>
              <p style={{ fontSize:11, color:'#868e96', marginTop:4, textAlign:'center' }}>
                LTV · <span style={{ color:'#16a34a' }}>{(params.ltvTarget*100).toFixed(0)}% target</span>{' '}
                · <span style={{ color:'#d97706' }}>{(params.ltvThreshold*100).toFixed(0)}% warn</span>{' '}
                · <span style={{ color:'#dc2626' }}>82.5% liq</span>
              </p>
            </div>
          </div>

          {/* 3 live metrics */}
          <div className="bs-metric-grid" style={{ gridTemplateColumns:'repeat(3,1fr)' }}>
            <div className="bs-metric">
              <div className="bs-metric-label">Current LTV</div>
              <div className={`bs-metric-value${ltvCls?' '+ltvCls:''}`} style={{ fontSize:18 }}>
                {anim==='idle'?`${d.initialLtv.toFixed(1)}%`:`${curLtv.toFixed(1)}%`}
              </div>
            </div>
            <div className="bs-metric">
              <div className="bs-metric-label">ETH price</div>
              <div className="bs-metric-value" style={{ fontSize:18 }}>
                {anim==='idle'?`$${Math.round(d.priceLtv[0]?.price??0).toLocaleString()}`:`$${Math.round(curPrice).toLocaleString()}`}
              </div>
            </div>
            <div className="bs-metric">
              <div className="bs-metric-label">Loan balance</div>
              <div className="bs-metric-value" style={{ fontSize:18 }}>
                {anim==='idle'?`$${startLoan.toLocaleString('en-US',{maximumFractionDigits:0})}`:`$${curBal.toLocaleString('en-US',{maximumFractionDigits:0})}`}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="bs-col-right">
          {/* Animated ETH+LTV chart */}
          <div className="bs-card">
            <div className="bs-heading">ETH price &amp; LTV — live simulation{!isLiveData&&' (preview)'}</div>
            <div className="bs-chart-240">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={anim==='idle'?d.priceLtv:vis} margin={{ top:4, right:10, left:0, bottom:0 }}>
                  <defs>
                    <linearGradient id="cLtvW2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ea580c" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#ea580c" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f5"/>
                  <XAxis dataKey="date" tick={{ fontSize:10, fill:'#868e96' }} tickLine={false} axisLine={false} interval={tInt}/>
                  <YAxis yAxisId="p" orientation="left" tick={{ fontSize:10, fill:'#868e96' }} tickLine={false} axisLine={false} tickFormatter={v=>`$${Math.round(Number(v))}`} width={56}/>
                  <YAxis yAxisId="l" orientation="right" domain={[0,100]} tick={{ fontSize:10, fill:'#868e96' }} tickLine={false} axisLine={false} tickFormatter={v=>`${v}%`} width={36}/>
                  <Tooltip contentStyle={TT} formatter={(v:number,n:string)=>n==='price'?[`$${v.toLocaleString()}`,'ETH Price']:[`${v.toFixed(1)}%`,'LTV']}/>
                  <ReferenceLine yAxisId="l" y={params.ltvThreshold*100} stroke="#f59e0b" strokeDasharray="4 3" strokeWidth={1}/>
                  <ReferenceLine yAxisId="l" y={82.5} stroke="#dc2626" strokeDasharray="4 3" strokeWidth={1}/>
                  <Line yAxisId="p" type="monotone" dataKey="price" stroke="#2563eb" strokeWidth={2} dot={false} name="price" isAnimationActive={false}/>
                  <Area yAxisId="l" type="monotone" dataKey="ltv" stroke="#ea580c" fill="url(#cLtvW2)" strokeWidth={2} dot={false} name="ltv" isAnimationActive={false}/>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Collateral vs loan */}
          <div className="bs-card">
            <div className="bs-heading">Collateral value vs loan balance</div>
            <div className="bs-chart-200">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={anim==='idle'?d.coverSeries:visCover} margin={{ top:4, right:10, left:0, bottom:0 }}>
                  <defs>
                    <linearGradient id="covW2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16a34a" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f5"/>
                  <XAxis dataKey="date" tick={{ fontSize:10, fill:'#868e96' }} tickLine={false} axisLine={false} interval={Math.max(1,Math.floor((anim==='idle'?d.coverSeries:visCover).length/8))}/>
                  <YAxis tick={{ fontSize:10, fill:'#868e96' }} tickLine={false} axisLine={false} tickFormatter={v=>`$${Number(v).toLocaleString()}`} width={66}/>
                  <Tooltip contentStyle={TT} formatter={(v:number,n:string)=>[`$${Number(v).toLocaleString()}`,n==='collateralUsd'?'Collateral Value':'Loan Balance']}/>
                  <Area type="monotone" dataKey="collateralUsd" stroke="#16a34a" fill="url(#covW2)" strokeWidth={2} dot={false} name="collateralUsd" isAnimationActive={false}/>
                  <Line type="monotone" dataKey="loanBalance" stroke="#ea580c" strokeWidth={2} dot={false} name="loanBalance" isAnimationActive={false}/>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display:'flex', gap:16, marginTop:8, fontSize:11, color:'#868e96' }}>
              <span style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ display:'inline-block', width:16, height:3, background:'#16a34a', borderRadius:2 }}/>Collateral value</span>
              <span style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ display:'inline-block', width:16, height:3, background:'#ea580c', borderRadius:2 }}/>Loan balance</span>
              <span style={{ color:'#16a34a', fontWeight:600 }}>Green above red = safe zone</span>
            </div>
          </div>

          {/* Collateral coverage ratio */}
          <div className="bs-card">
            <div className="bs-heading">Collateral coverage ratio (collateral/loan)</div>
            <div className="bs-chart-120">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={coverageRatio} margin={{ top:4, right:10, left:0, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f5"/>
                  <XAxis dataKey="date" tick={{ fontSize:10, fill:'#868e96' }} tickLine={false} axisLine={false} interval={tInt}/>
                  <YAxis tick={{ fontSize:10, fill:'#868e96' }} tickLine={false} axisLine={false} tickFormatter={v=>`${Number(v).toFixed(1)}x`} width={36}/>
                  <Tooltip contentStyle={TT} formatter={(v:number)=>[`${v.toFixed(3)}x`,'Coverage ratio']}/>
                  <ReferenceLine y={1/params.ltvThreshold} stroke="#f59e0b" strokeDasharray="4 3" strokeWidth={1}/>
                  <ReferenceLine y={1/0.825} stroke="#dc2626" strokeDasharray="4 3" strokeWidth={1}/>
                  <Area type="monotone" dataKey="ratio" stroke="#2563eb" fill="#eff6ff" strokeWidth={2} dot={false} isAnimationActive={false}/>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <p style={{ fontSize:11, color:'#868e96', marginTop:6 }}>
              Must stay above {(1/0.825).toFixed(2)}x (liq threshold). Warn at {(1/params.ltvThreshold).toFixed(2)}x.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
