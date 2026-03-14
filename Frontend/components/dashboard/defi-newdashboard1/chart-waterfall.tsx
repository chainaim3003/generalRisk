'use client'
/** chart-waterfall.tsx — light theme */
import React from 'react'
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { WaterfallPoint } from './types'
const TT = { backgroundColor:'#fff', border:'1px solid #dee2e6', borderRadius:8, color:'#212529', fontSize:11, padding:'6px 10px' }
const CM: Record<string, string> = { blue:'#2563eb', amber:'#d97706', green:'#16a34a' }
export function ChartWaterfall({ points, height=160 }: { points: WaterfallPoint[]; height?: number }) {
  if (!points.length) return <div style={{ height, display:'flex', alignItems:'center', justifyContent:'center', border:'1px dashed #dee2e6', borderRadius:8, color:'#868e96', fontSize:12 }}>No PP events</div>
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={points} margin={{ top:4, right:10, left:0, bottom:0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f5"/>
          <XAxis dataKey="label" tick={{ fontSize:10, fill:'#868e96' }} tickLine={false} axisLine={false}/>
          <YAxis tick={{ fontSize:10, fill:'#868e96' }} tickLine={false} axisLine={false} tickFormatter={v=>`$${Number(v).toLocaleString()}`} width={64}/>
          <Tooltip contentStyle={TT} formatter={(v:number)=>[`$${Number(v).toLocaleString()}`,'Balance']}/>
          <Bar dataKey="value" radius={[4,4,0,0]}>
            {points.map((p,i)=><Cell key={i} fill={CM[p.color]??'#2563eb'}/>)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
