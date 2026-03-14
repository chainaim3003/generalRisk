'use client'
/** chart-cover.tsx — light theme */
import React from 'react'
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { CoverPoint } from './types'
const TT = { backgroundColor:'#fff', border:'1px solid #dee2e6', borderRadius:8, color:'#212529', fontSize:11, padding:'6px 10px' }
export function ChartCover({ data, height=200 }: { data: CoverPoint[]; height?: number }) {
  if (!data.length) return <div style={{ height, display:'flex', alignItems:'center', justifyContent:'center', border:'1px dashed #dee2e6', borderRadius:8, color:'#868e96', fontSize:12 }}>No data</div>
  const tInt = Math.max(1, Math.floor(data.length/8))
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top:4, right:10, left:0, bottom:0 }}>
          <defs><linearGradient id="covGradCC" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#16a34a" stopOpacity={0.15}/><stop offset="95%" stopColor="#16a34a" stopOpacity={0}/></linearGradient></defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f5"/>
          <XAxis dataKey="date" tick={{ fontSize:10, fill:'#868e96' }} tickLine={false} axisLine={false} interval={tInt}/>
          <YAxis tick={{ fontSize:10, fill:'#868e96' }} tickLine={false} axisLine={false} tickFormatter={v=>`$${Number(v).toLocaleString()}`} width={66}/>
          <Tooltip contentStyle={TT} formatter={(v:number,n:string)=>[`$${Number(v).toLocaleString()}`,n==='collateralUsd'?'Collateral Value':'Loan Balance']}/>
          <Area type="monotone" dataKey="collateralUsd" stroke="#16a34a" fill="url(#covGradCC)" strokeWidth={2} dot={false} name="collateralUsd" isAnimationActive={false}/>
          <Line type="monotone" dataKey="loanBalance" stroke="#ea580c" strokeWidth={2} dot={false} name="loanBalance" isAnimationActive={false}/>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
