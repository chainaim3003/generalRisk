'use client'
import React, { useState } from 'react'
import { Play, Loader2, RotateCcw, CheckCircle2, XCircle, Zap, Activity } from 'lucide-react'
import { useBufferSimulation } from './use-buffer-simulation'
import { TabActusStandard } from './tab-actus-standard'
import { TabGranularity } from './tab-granularity'
import { TabCrisisScenario } from './tab-crisis-scenario'
import { TabStrategyOutcomes } from './tab-strategy-outcomes'
import { TabMarketData } from './tab-market-data'

type TabIndex = 0 | 1 | 2 | 3 | 4

const TABS = [
  { label: 'ACTUS Standard',    num: 1 },
  { label: 'Granularity',       num: 2 },
  { label: 'Crisis Scenario',   num: 3 },
  { label: 'Strategy Outcomes', num: 4 },
  { label: 'Market Data',       num: 5 },
]

const LIGHT_CSS = `
.buf-shell {
  --bs-bg:#f8f9fa; --bs-surface:#ffffff; --bs-surface2:#f1f3f5;
  --bs-border:#dee2e6; --bs-border2:#ced4da;
  --bs-text:#212529; --bs-text2:#495057; --bs-text3:#868e96;
  --bs-blue:#2563eb; --bs-green:#16a34a; --bs-amber:#d97706;
  --bs-red:#dc2626; --bs-orange:#ea580c; --bs-violet:#7c3aed; --bs-teal:#0891b2;
  background:var(--bs-bg); color:var(--bs-text);
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  font-size:14px; line-height:1.5;
}
.bs-card { background:var(--bs-surface); border:1px solid var(--bs-border); border-radius:10px; padding:18px; margin-bottom:16px; }
.bs-card-sm { background:var(--bs-surface); border:1px solid var(--bs-border); border-radius:8px; padding:14px; }
.bs-heading { font-size:11px; font-weight:600; letter-spacing:.07em; text-transform:uppercase; color:var(--bs-text3); margin-bottom:12px; }
.bs-metric-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:16px; }
.bs-metric { background:var(--bs-surface2); border:1px solid var(--bs-border); border-radius:8px; padding:12px 14px; }
.bs-metric-label { font-size:11px; color:var(--bs-text3); margin-bottom:3px; }
.bs-metric-value { font-size:22px; font-weight:600; color:var(--bs-text); }
.bs-metric-value.green { color:var(--bs-green); }
.bs-metric-value.amber { color:var(--bs-amber); }
.bs-metric-value.red   { color:var(--bs-red); }
.bs-layout { display:flex; gap:20px; flex-wrap:wrap; }
.bs-col-left  { width:270px; flex-shrink:0; }
.bs-col-right { flex:1; min-width:0; }
.bs-slider-wrap { margin-top:10px; }
.bs-slider-label { font-size:12px; color:var(--bs-text2); display:block; margin-bottom:3px; }
.bs-slider-row { display:flex; align-items:center; gap:8px; }
.bs-slider-row input[type=range] { flex:1; accent-color:var(--bs-blue); height:4px; }
.bs-slider-val { font-size:12px; font-weight:600; min-width:54px; text-align:right; color:var(--bs-text); }
.bs-num-input { width:100%; height:32px; border:1px solid var(--bs-border2); border-radius:6px; background:var(--bs-surface2); padding:0 8px; font-size:12px; color:var(--bs-text); margin-top:2px; }
.bs-select { width:100%; height:32px; border:1px solid var(--bs-border2); border-radius:6px; background:var(--bs-surface2); padding:0 8px; font-size:12px; color:var(--bs-text); margin-top:2px; }
.bs-map-row { display:flex; align-items:center; gap:8px; padding:7px 0; border-bottom:1px solid var(--bs-border); font-size:12px; }
.bs-map-row:last-child { border-bottom:none; }
.bs-map-key { font-weight:600; min-width:78px; color:var(--bs-text); }
.bs-map-arrow { color:var(--bs-text3); }
.bs-map-val { color:var(--bs-text2); }
.bs-timeline { overflow-y:auto; max-height:196px; }
.bs-evt { display:flex; align-items:center; gap:8px; padding:6px 0; border-bottom:1px solid var(--bs-border); font-size:12px; }
.bs-evt:last-child { border-bottom:none; }
.bs-badge { display:inline-block; padding:2px 7px; border-radius:20px; font-size:10px; font-weight:700; }
.bs-badge-IED { background:#dbeafe; color:#1d4ed8; }
.bs-badge-PP  { background:#fef3c7; color:#d97706; }
.bs-badge-IP  { background:#dcfce7; color:#16a34a; }
.bs-badge-RR  { background:#ede9fe; color:#7c3aed; }
.bs-badge-AD  { background:#f3f4f6; color:#6b7280; }
.bs-badge-MD  { background:#d1fae5; color:#059669; }
.bs-nav { display:flex; border-bottom:1px solid var(--bs-border); background:var(--bs-surface); position:sticky; top:0; z-index:10; }
.bs-nav-tab { display:flex; align-items:center; gap:6px; padding:12px 18px; font-size:12px; font-weight:500; color:var(--bs-text3); cursor:pointer; border-bottom:2px solid transparent; background:none; border-top:none; border-left:none; border-right:none; white-space:nowrap; transition:all .15s; }
.bs-nav-tab:hover { color:var(--bs-text); background:var(--bs-surface2); }
.bs-nav-tab.active { color:var(--bs-text); border-bottom-color:var(--bs-blue); }
.bs-tab-num { display:inline-flex; align-items:center; justify-content:center; width:18px; height:18px; border-radius:50%; background:var(--bs-surface2); font-size:10px; font-weight:700; flex-shrink:0; }
.bs-nav-tab.active .bs-tab-num { background:var(--bs-blue); color:#fff; }
.bs-nav-run { margin-left:auto; display:flex; align-items:center; gap:8px; padding:8px 16px; }
.bs-btn-primary { display:inline-flex; align-items:center; gap:6px; padding:7px 18px; border-radius:8px; background:var(--bs-blue); color:#fff; font-size:12px; font-weight:600; border:none; cursor:pointer; transition:opacity .15s; }
.bs-btn-primary:hover { opacity:.88; }
.bs-btn-primary:disabled { opacity:.45; cursor:not-allowed; }
.bs-btn-secondary { display:inline-flex; align-items:center; gap:5px; padding:6px 14px; border-radius:8px; background:var(--bs-surface2); color:var(--bs-text2); font-size:12px; font-weight:500; border:1px solid var(--bs-border); cursor:pointer; transition:background .15s; }
.bs-btn-secondary:hover { background:var(--bs-border); }
.bs-btn-secondary:disabled { opacity:.45; cursor:not-allowed; }
.bs-pill { display:inline-flex; align-items:center; gap:4px; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:600; }
.bs-pill-green  { background:#dcfce7; color:#15803d; }
.bs-pill-red    { background:#fee2e2; color:#b91c1c; }
.bs-pill-amber  { background:#fef3c7; color:#b45309; }
.bs-pill-blue   { background:#dbeafe; color:#1d4ed8; }
.bs-pill-env    { background:#f1f5f9; color:#475569; border:1px solid #cbd5e1; font-family:monospace; }
.bs-gran-tabs   { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px; }
.bs-gran-tab    { padding:5px 14px; border-radius:20px; font-size:12px; font-weight:500; cursor:pointer; border:1px solid var(--bs-border2); color:var(--bs-text2); background:none; transition:all .15s; }
.bs-gran-tab:hover { background:var(--bs-surface2); }
.bs-gran-tab.active { background:var(--bs-blue); color:#fff; border-color:var(--bs-blue); }
.bs-2col { display:grid; grid-template-columns:repeat(2,1fr); gap:12px; margin-bottom:16px; }
.bs-mini-card { background:var(--bs-surface2); border-radius:8px; padding:10px; }
.bs-mini-title { font-size:11px; font-weight:600; color:var(--bs-text3); margin-bottom:6px; }
.bs-strategy-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-top:10px; }
.bs-strategy-card { border:1px solid var(--bs-border); border-radius:8px; padding:12px; cursor:pointer; transition:all .15s; }
.bs-strategy-card:hover { border-color:var(--bs-blue); background:#eff6ff; }
.bs-strategy-card.selected { border:2px solid var(--bs-blue); background:#eff6ff; }
.bs-strategy-title { font-size:13px; font-weight:600; color:var(--bs-text); margin-bottom:3px; }
.bs-strategy-sub { font-size:11px; color:var(--bs-text3); line-height:1.5; }
.bs-path-row { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px; align-items:center; }
.bs-path-btn { padding:5px 14px; border-radius:20px; font-size:12px; cursor:pointer; border:1px solid var(--bs-border2); background:none; color:var(--bs-text2); transition:all .15s; }
.bs-path-btn:hover { background:var(--bs-surface2); }
.bs-path-btn.active { border-color:var(--bs-blue); color:var(--bs-blue); font-weight:600; }
.bs-outcome-table { width:100%; border-collapse:collapse; font-size:12px; }
.bs-outcome-table th { padding:7px 10px; text-align:left; font-weight:600; font-size:11px; color:var(--bs-text3); border-bottom:1px solid var(--bs-border); }
.bs-outcome-table td { padding:7px 10px; border-bottom:1px solid var(--bs-border); }
.bs-outcome-table tr:last-child td { border-bottom:none; }
.bs-learn-row { display:flex; gap:10px; margin-top:10px; flex-wrap:wrap; }
.bs-learn-card { flex:1; min-width:100px; background:var(--bs-surface2); border-radius:8px; padding:12px; }
.bs-learn-score { font-size:24px; font-weight:700; margin-bottom:2px; }
.bs-learn-lbl { font-size:11px; color:var(--bs-text3); }
.bs-info { background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:10px 14px; font-size:12px; color:#1d4ed8; line-height:1.6; margin-bottom:14px; }
.bs-warn-box { background:#fffbeb; border:1px solid #fde68a; border-radius:8px; padding:10px 14px; font-size:12px; color:#92400e; line-height:1.6; margin-bottom:14px; }
.bs-preview-banner { background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:8px 14px; font-size:11px; color:#15803d; margin-bottom:14px; display:flex; align-items:center; gap:8px; }
.bs-live-banner { background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:8px 14px; font-size:11px; color:#1d4ed8; margin-bottom:14px; display:flex; align-items:center; gap:8px; }
.bs-error { background:#fef2f2; border:1px solid #fecaca; border-radius:8px; padding:12px 16px; font-size:12px; color:#991b1b; margin:12px 20px 0; }
.bs-cmp-table { width:100%; border-collapse:collapse; font-size:12px; }
.bs-cmp-table th { padding:6px 8px; text-align:left; font-size:11px; font-weight:600; color:var(--bs-text3); border-bottom:1px solid var(--bs-border); }
.bs-cmp-table td { padding:6px 8px; border-bottom:1px solid var(--bs-border); color:var(--bs-text2); }
.bs-cmp-table tr:last-child td { border-bottom:none; }
.bs-gauge-wrap { display:flex; flex-direction:column; align-items:center; padding:8px 0; }
.bs-chart-200 { position:relative; width:100%; height:200px; }
.bs-chart-160 { position:relative; width:100%; height:160px; }
.bs-chart-240 { position:relative; width:100%; height:240px; }
.bs-chart-120 { position:relative; width:100%; height:120px; }
`

export function BufferDashboardShell() {
  const [activeTab, setActiveTab] = useState<TabIndex>(0)
  const sim = useBufferSimulation()

  const {
    params, setParam,
    environment, setEnvironment,
    status, derived, displaySeries, isLiveData, error,
    runSimulation, resetSimulation,
  } = sim

  const isRunning = status === 'running'
  const isSuccess = status === 'success'
  const isError   = status === 'error'

  return (
    <>
      <style>{LIGHT_CSS}</style>
      <div className="buf-shell">

        {/* ── Nav ─────────────────────────────────────────────────────── */}
        <div className="bs-nav">
          {TABS.map((t, i) => (
            <button key={i} type="button"
              onClick={() => setActiveTab(i as TabIndex)}
              className={`bs-nav-tab${activeTab === i ? ' active' : ''}`}>
              <span className="bs-tab-num">{t.num}</span>
              {t.label}
            </button>
          ))}
          <div className="bs-nav-run">
            {isSuccess && <span className="bs-pill bs-pill-green"><CheckCircle2 size={11}/> Live Data</span>}
            {isError   && <span className="bs-pill bs-pill-red"><XCircle size={11}/> Error</span>}
            {isRunning && <span className="bs-pill bs-pill-amber"><Loader2 size={11} className="animate-spin"/> Running…</span>}
            {!isSuccess && !isRunning && !isError && <span className="bs-pill bs-pill-blue"><Activity size={11}/> Preview</span>}
            <span className="bs-pill bs-pill-env">{environment}</span>
            {(isSuccess || isError) && (
              <button type="button" onClick={resetSimulation} className="bs-btn-secondary">
                <RotateCcw size={12}/> Reset
              </button>
            )}
            <button type="button" onClick={runSimulation} disabled={isRunning} className="bs-btn-primary">
              {isRunning ? <Loader2 size={13} className="animate-spin"/> : <Zap size={13}/>}
              {isRunning ? 'Simulating…' : 'Run Simulation'}
            </button>
          </div>
        </div>

        {/* ── Error ───────────────────────────────────────────────────── */}
        {error && (
          <div className="bs-error">
            <strong>Simulation failed:</strong> {error}
            <p style={{ marginTop:4, opacity:.75 }}>Ensure ACTUS risk service (8082) and server (8083) are running on {environment}.</p>
          </div>
        )}

        {/* ── Tabs ────────────────────────────────────────────────────── */}
        {activeTab === 0 && (
          <TabActusStandard params={params} setParam={setParam}
            environment={environment} setEnvironment={setEnvironment}
            displaySeries={displaySeries} isLiveData={isLiveData} isRunning={isRunning} />
        )}
        {activeTab === 1 && (
          <TabGranularity displaySeries={displaySeries} params={params}
            isLiveData={isLiveData} isRunning={isRunning} />
        )}
        {activeTab === 2 && (
          <TabCrisisScenario displaySeries={displaySeries} params={params}
            isLiveData={isLiveData} isRunning={isRunning} />
        )}
        {activeTab === 3 && (
          <TabStrategyOutcomes displaySeries={displaySeries}
            isLiveData={isLiveData} isRunning={isRunning} />
        )}
        {activeTab === 4 && (
          <TabMarketData displaySeries={displaySeries}
            isLiveData={isLiveData} isRunning={isRunning} />
        )}
      </div>
    </>
  )
}
