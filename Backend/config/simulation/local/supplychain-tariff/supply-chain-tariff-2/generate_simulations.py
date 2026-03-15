#!/usr/bin/env python3
"""Generate ACTUS Supply Chain Tariff Simulations — 18 Postman Collections
Run: python generate_simulations.py
Outputs 18 JSON files in the same directory as this script.
"""
import json, os, sys, pathlib
OUTPUT_DIR = str(pathlib.Path(__file__).parent)
os.makedirs(OUTPUT_DIR, exist_ok=True)

MONITORING_TIMES = ["2026-03-01T00:00:00","2026-03-15T00:00:00","2026-03-31T00:00:00","2026-04-15T00:00:00","2026-04-30T00:00:00","2026-05-15T00:00:00","2026-05-31T00:00:00"]

# ═══ COMMON INDEXES ═══
TARIFF_CN = {"riskFactorID":"TARIFF_IDX_CN_01","marketObjectCode":"TARIFF_INDEX_CN","base":1.0,"data":[{"time":"2026-03-01T00:00:00","value":0.25},{"time":"2026-03-10T00:00:00","value":0.28},{"time":"2026-03-15T00:00:00","value":0.32},{"time":"2026-03-20T00:00:00","value":0.37},{"time":"2026-03-25T00:00:00","value":0.42},{"time":"2026-03-31T00:00:00","value":0.45},{"time":"2026-04-10T00:00:00","value":0.45},{"time":"2026-04-20T00:00:00","value":0.42},{"time":"2026-04-30T00:00:00","value":0.38},{"time":"2026-05-10T00:00:00","value":0.35},{"time":"2026-05-20T00:00:00","value":0.32},{"time":"2026-05-31T00:00:00","value":0.30}]}
TARIFF_IN = {"riskFactorID":"TARIFF_IDX_IN_01","marketObjectCode":"TARIFF_INDEX_IN","base":1.0,"data":[{"time":"2026-03-01T00:00:00","value":0.10},{"time":"2026-03-10T00:00:00","value":0.12},{"time":"2026-03-15T00:00:00","value":0.15},{"time":"2026-03-20T00:00:00","value":0.18},{"time":"2026-03-25T00:00:00","value":0.22},{"time":"2026-03-31T00:00:00","value":0.25},{"time":"2026-04-10T00:00:00","value":0.25},{"time":"2026-04-20T00:00:00","value":0.25},{"time":"2026-04-30T00:00:00","value":0.25},{"time":"2026-05-10T00:00:00","value":0.20},{"time":"2026-05-20T00:00:00","value":0.16},{"time":"2026-05-31T00:00:00","value":0.15}]}
TARIFF_MX = {"riskFactorID":"TARIFF_IDX_MX_01","marketObjectCode":"TARIFF_INDEX_MX","base":1.0,"data":[{"time":"2026-03-01T00:00:00","value":0.025},{"time":"2026-03-10T00:00:00","value":0.05},{"time":"2026-03-15T00:00:00","value":0.10},{"time":"2026-03-20T00:00:00","value":0.15},{"time":"2026-03-25T00:00:00","value":0.20},{"time":"2026-03-31T00:00:00","value":0.25},{"time":"2026-04-10T00:00:00","value":0.25},{"time":"2026-04-20T00:00:00","value":0.25},{"time":"2026-04-30T00:00:00","value":0.20},{"time":"2026-05-10T00:00:00","value":0.15},{"time":"2026-05-20T00:00:00","value":0.10},{"time":"2026-05-31T00:00:00","value":0.05}]}
SOFR = {"riskFactorID":"SOFR_IDX_01","marketObjectCode":"USD_SOFR","base":1.0,"data":[{"time":"2026-03-01T00:00:00","value":0.043},{"time":"2026-03-15T00:00:00","value":0.043},{"time":"2026-03-31T00:00:00","value":0.044},{"time":"2026-04-15T00:00:00","value":0.045},{"time":"2026-04-30T00:00:00","value":0.046},{"time":"2026-05-15T00:00:00","value":0.045},{"time":"2026-05-31T00:00:00","value":0.044}]}
FX_CNY = {"riskFactorID":"FX_USDCNY_01","marketObjectCode":"USD_CNY","base":1.0,"data":[{"time":"2026-03-01T00:00:00","value":7.25},{"time":"2026-03-10T00:00:00","value":7.32},{"time":"2026-03-15T00:00:00","value":7.40},{"time":"2026-03-20T00:00:00","value":7.52},{"time":"2026-03-25T00:00:00","value":7.65},{"time":"2026-03-31T00:00:00","value":7.78},{"time":"2026-04-10T00:00:00","value":7.85},{"time":"2026-04-20T00:00:00","value":7.80},{"time":"2026-04-30T00:00:00","value":7.70},{"time":"2026-05-10T00:00:00","value":7.55},{"time":"2026-05-20T00:00:00","value":7.45},{"time":"2026-05-31T00:00:00","value":7.35}]}
EXPOSURE = {"riskFactorID":"EXPOSURE_01","marketObjectCode":"CURRENT_EXPOSURE","base":1.0,"data":[{"time":"2026-03-01T00:00:00","value":10000000},{"time":"2026-03-10T00:00:00","value":10300000},{"time":"2026-03-20T00:00:00","value":11200000},{"time":"2026-03-31T00:00:00","value":12800000},{"time":"2026-04-10T00:00:00","value":14000000},{"time":"2026-04-20T00:00:00","value":13500000},{"time":"2026-04-30T00:00:00","value":12800000},{"time":"2026-05-10T00:00:00","value":11800000},{"time":"2026-05-20T00:00:00","value":11000000},{"time":"2026-05-31T00:00:00","value":10500000}]}
PORT_CONG = {"riskFactorID":"PORT_CONG_01","marketObjectCode":"PORT_CONGESTION_INDEX","base":1.0,"data":[{"time":"2026-03-01T00:00:00","value":4.0},{"time":"2026-03-10T00:00:00","value":4.5},{"time":"2026-03-15T00:00:00","value":5.5},{"time":"2026-03-20T00:00:00","value":7.0},{"time":"2026-03-25T00:00:00","value":9.0},{"time":"2026-03-31T00:00:00","value":11.0},{"time":"2026-04-10T00:00:00","value":12.0},{"time":"2026-04-20T00:00:00","value":11.5},{"time":"2026-04-30T00:00:00","value":10.0},{"time":"2026-05-10T00:00:00","value":8.0},{"time":"2026-05-20T00:00:00","value":6.0},{"time":"2026-05-31T00:00:00","value":5.0}]}
REVENUE = {"riskFactorID":"REVENUE_IDX_01","marketObjectCode":"REVENUE_INDEX","base":1.0,"data":[{"time":"2026-03-01T00:00:00","value":1.0},{"time":"2026-03-10T00:00:00","value":0.97},{"time":"2026-03-20T00:00:00","value":0.90},{"time":"2026-03-31T00:00:00","value":0.78},{"time":"2026-04-10T00:00:00","value":0.72},{"time":"2026-04-20T00:00:00","value":0.68},{"time":"2026-04-30T00:00:00","value":0.67},{"time":"2026-05-10T00:00:00","value":0.75},{"time":"2026-05-20T00:00:00","value":0.82},{"time":"2026-05-31T00:00:00","value":0.88}]}
DSO = {"riskFactorID":"DSO_IDX_01","marketObjectCode":"DSO_INDEX","base":1.0,"data":[{"time":"2026-03-01T00:00:00","value":1.0},{"time":"2026-03-15T00:00:00","value":1.05},{"time":"2026-03-31T00:00:00","value":1.20},{"time":"2026-04-15T00:00:00","value":1.35},{"time":"2026-04-30T00:00:00","value":1.45},{"time":"2026-05-15T00:00:00","value":1.25},{"time":"2026-05-31T00:00:00","value":1.10}]}

def req(name, method, path, body=None, test_lines=None, port=8082):
    h = f"localhost:{port}"
    item = {"name":name,"request":{"method":method,"header":[{"key":"Content-Type","value":"application/json"}] if body else [],"url":{"raw":f"http://{h}/{path}","protocol":"http","host":[h],"path":path.split("/")}}}
    if body: item["request"]["body"]={"mode":"raw","raw":json.dumps(body,separators=(',',':')),"options":{"raw":{"language":"json"}}}
    if test_lines: item["event"]=[{"listen":"test","script":{"type":"text/javascript","exec":test_lines}}]
    return item

def ok(msg): return [f"pm.test('OK',function(){{pm.response.to.have.status(200);console.log('\\u2705 {msg}');}});"]

def sim_test(titles, cid):
    lines=["pm.test('Simulation success',function(){","    pm.response.to.have.status(200);","    var data=pm.response.json();","    pm.expect(data[0].status).to.eql('Success');","    var events=data[0].events;","    console.log('\\u2550'.repeat(60));"]
    for t in titles: lines.append(f"    console.log('{t}');")
    lines+=["    console.log('\\u2550'.repeat(60));","    console.log('Total events: '+events.length);","    var c={};events.forEach(function(e){c[e.type]=(c[e.type]||0)+1;});","    Object.keys(c).forEach(function(k){console.log('  '+k+': '+c[k]);});","    console.log('');console.log('ALL EVENTS:');","    events.forEach(function(e){console.log('  '+e.time+' '+e.type+' payoff=$'+e.payoff.toFixed(2)+' nominal='+e.nominalValue.toFixed(2)+' rate='+(e.nominalRate||0).toFixed(6));});","    var ips=events.filter(function(e){return e.type==='IP'||e.type==='IPFX'||e.type==='IPFL';});","    if(ips.length>0){console.log('');console.log('INTEREST/SWAP PAYMENTS:');","        ips.forEach(function(m){console.log('  '+m.time+' '+m.type+' $'+m.payoff.toFixed(2)+' rate='+(m.nominalRate||0).toFixed(6));});}","    var pps=events.filter(function(e){return e.type==='PP'||e.type==='MRD';});","    if(pps.length>0){console.log('');console.log('BEHAVIORAL CALLOUTS:');","        pps.forEach(function(m){console.log('  '+m.time+' '+m.type+' payoff=$'+m.payoff.toFixed(2));});}","});"]
    return lines

def coll(pid,name,desc,items):
    return {"info":{"_postman_id":pid,"name":name,"description":desc,"schema":"https://schema.getpostman.com/json/collection/v2.1.0/collection.json"},"item":items}

def swaps(cid,notional,fixed,fspread,fmoc="USD_SOFR",tmodels=None):
    """ACTUS SWAPS: Two PAM legs in contractStructure. Per https://documentation.actusfrf.org/docs/examples/basic-contract-types/example_SWAPS"""
    c={"contractType":"SWAPS","contractID":cid,"contractRole":"RFL","currency":"USD","contractDealDate":"2026-02-28T00:00:00","statusDate":"2026-02-28T00:00:00","deliverySettlement":"D","contractStructure":[{"object":{"contractType":"PAM","contractID":f"{cid}-leg1-fixed","contractDealDate":"2026-02-28T00:00:00","initialExchangeDate":"2026-03-01T00:00:00","currency":"USD","statusDate":"2026-02-28T00:00:00","notionalPrincipal":str(notional),"dayCountConvention":"A365","nominalInterestRate":str(fixed),"maturityDate":"2026-05-31T00:00:00","cycleAnchorDateOfInterestPayment":"2026-03-31T00:00:00","cycleOfInterestPayment":"P1ML1","premiumDiscountAtIED":"0"},"referenceType":"CNT","referenceRole":"FIL"},{"object":{"contractType":"PAM","contractID":f"{cid}-leg2-float","contractDealDate":"2026-02-28T00:00:00","initialExchangeDate":"2026-03-01T00:00:00","currency":"USD","statusDate":"2026-02-28T00:00:00","notionalPrincipal":str(notional),"dayCountConvention":"A365","nominalInterestRate":str(fspread),"maturityDate":"2026-05-31T00:00:00","cycleAnchorDateOfInterestPayment":"2026-03-31T00:00:00","cycleOfInterestPayment":"P1ML1","cycleOfRateReset":"P1ML1","cycleAnchorDateOfRateReset":"2026-03-01T00:00:00","marketObjectCodeOfRateReset":fmoc,"rateMultiplier":"1.0","rateSpread":str(fspread),"premiumDiscountAtIED":"0"},"referenceType":"CNT","referenceRole":"SEL"}]}
    if tmodels: c["tariffModels"]=tmodels
    return c

def swppv(cid,notional,fixed,float2,fmoc="USD_SOFR",rspread=0.0,tmodels=None):
    """ACTUS SWPPV: Plain vanilla IRS. Per https://documentation.actusfrf.org/docs/examples/basic-contract-types/example_SWPPV"""
    c={"contractType":"SWPPV","contractID":cid,"statusDate":"2026-02-28T00:00:00","contractRole":"RF","currency":"USD","contractDealDate":"2026-02-28T00:00:00","initialExchangeDate":"2026-03-01T00:00:00","maturityDate":"2026-05-31T00:00:00","notionalPrincipal":notional,"cycleAnchorDateOfInterestPayment":"2026-03-31T00:00:00","cycleOfInterestPayment":"P1ML1","nominalInterestRate":fixed,"nominalInterestRate2":float2,"dayCountConvention":"A365","cycleAnchorDateOfRateReset":"2026-03-01T00:00:00","rateSpread":rspread,"marketObjectCodeOfRateReset":fmoc,"fixingPeriod":"P0D","deliverySettlement":"D"}
    if tmodels: c["tariffModels"]=tmodels
    return c

# ═══ RISK MODEL CONFIGS ═══
def he_model(rid,tariff_moc,notional):
    return {"riskFactorId":rid,"tariffIndexMOC":tariff_moc,"fxRateMOC":"USD_CNY","hedgedNotional":notional,"currentExposureMOC":"CURRENT_EXPOSURE","lowerEffectivenessBound":0.80,"upperEffectivenessBound":1.25,"tariffExposureSensitivity":0.6,"monitoringEventTimes":MONITORING_TIMES}

def fxtc_model(rid,tariff_moc):
    return {"riskFactorId":rid,"tariffIndexMOC":tariff_moc,"fxRateMOC":"USD_CNY","baseFxRate":7.25,"correlationCoefficient":0.65,"fxSensitivity":0.8,"amplificationFactor":1.2,"monitoringEventTimes":MONITORING_TIMES}

def re_model(rid,tariff_moc,elasticity,base_rev,pt=0.70,floor=0.40):
    return {"riskFactorId":rid,"tariffIndexMOC":tariff_moc,"productElasticity":elasticity,"baseRevenue":base_rev,"passThrough":pt,"revenueFloorFraction":floor,"monitoringEventTimes":MONITORING_TIMES}

def pc_model(rid,tariff_moc):
    return {"riskFactorId":rid,"portCongestionIndexMOC":"PORT_CONGESTION_INDEX","tariffIndexMOC":tariff_moc,"baseDwellDays":4.0,"congestionSensitivity":0.5,"maxDelayDays":10.0,"financialImpactPerDay":0.002,"monitoringEventTimes":MONITORING_TIMES}

def ts_model(rid,tariff_moc,elast=2.8):
    return {"riskFactorId":rid,"tariffIndexMOC":tariff_moc,"baseSpread":0.02,"baseTariffIndex":0.10,"baseTariffSensitivity":0.5,"maxSpreadCap":0.08,"armingtonElasticity":elast,"monitoringEventTimes":MONITORING_TIMES}

def wcs_model(rid,tariff_moc):
    return {"riskFactorId":rid,"tariffIndexMOC":tariff_moc,"revenueIndexMOC":"REVENUE_INDEX","dsoIndexMOC":"DSO_INDEX","baseDSO":45.0,"baseDIO":30.0,"baseDPO":35.0,"tariffDSOSensitivity":0.5,"tariffDIOSensitivity":0.3,"maxDrawdownFraction":1.0,"monitoringEventTimes":MONITORING_TIMES}

# ═══ SCENARIO DESCRIPTOR BUILDERS ═══
def he_scenario(sid,model_id):
    return {"scenarioID":sid,"riskFactorDescriptors":[{"riskFactorID":"TARIFF_IDX_CN_01","riskFactorType":"ReferenceIndex"},{"riskFactorID":"FX_USDCNY_01","riskFactorType":"ReferenceIndex"},{"riskFactorID":"SOFR_IDX_01","riskFactorType":"ReferenceIndex"},{"riskFactorID":"EXPOSURE_01","riskFactorType":"ReferenceIndex"},{"riskFactorID":model_id,"riskFactorType":"HedgeEffectivenessModel"}]}

def fxtc_scenario(sid,model_id):
    return {"scenarioID":sid,"riskFactorDescriptors":[{"riskFactorID":"TARIFF_IDX_CN_01","riskFactorType":"ReferenceIndex"},{"riskFactorID":"FX_USDCNY_01","riskFactorType":"ReferenceIndex"},{"riskFactorID":"SOFR_IDX_01","riskFactorType":"ReferenceIndex"},{"riskFactorID":model_id,"riskFactorType":"FXTariffCorrelationModel"}]}

def re_scenario(sid,model_id,tariff_idx="TARIFF_IDX_IN_01"):
    return {"scenarioID":sid,"riskFactorDescriptors":[{"riskFactorID":tariff_idx,"riskFactorType":"ReferenceIndex"},{"riskFactorID":"SOFR_IDX_01","riskFactorType":"ReferenceIndex"},{"riskFactorID":model_id,"riskFactorType":"RevenueElasticityModel"}]}

def pc_scenario(sid,model_id,tariff_idx="TARIFF_IDX_MX_01"):
    return {"scenarioID":sid,"riskFactorDescriptors":[{"riskFactorID":tariff_idx,"riskFactorType":"ReferenceIndex"},{"riskFactorID":"PORT_CONG_01","riskFactorType":"ReferenceIndex"},{"riskFactorID":"SOFR_IDX_01","riskFactorType":"ReferenceIndex"},{"riskFactorID":model_id,"riskFactorType":"PortCongestionModel"}]}

def ts_scenario(sid,model_id,tariff_idx="TARIFF_IDX_IN_01"):
    return {"scenarioID":sid,"riskFactorDescriptors":[{"riskFactorID":tariff_idx,"riskFactorType":"ReferenceIndex"},{"riskFactorID":"SOFR_IDX_01","riskFactorType":"ReferenceIndex"},{"riskFactorID":model_id,"riskFactorType":"TariffSpreadModel"}]}

def wcs_scenario(sid,model_id,tariff_idx="TARIFF_IDX_IN_01"):
    return {"scenarioID":sid,"riskFactorDescriptors":[{"riskFactorID":tariff_idx,"riskFactorType":"ReferenceIndex"},{"riskFactorID":"SOFR_IDX_01","riskFactorType":"ReferenceIndex"},{"riskFactorID":"REVENUE_IDX_01","riskFactorType":"ReferenceIndex"},{"riskFactorID":"DSO_IDX_01","riskFactorType":"ReferenceIndex"},{"riskFactorID":model_id,"riskFactorType":"WorkingCapitalStressModel"}]}

# ═══ SIMULATION BODY BUILDER ═══
def sim_body(contracts,scn_id):
    return {"contracts":contracts,"scenarioDescriptor":{"scenarioID":scn_id,"scenarioType":"scenario"},"simulateTo":"2026-05-31T00:00:00","monitoringTimes":[]}

# ═══ GENERIC BUILDER FOR ALL 18 SIMULATIONS ═══
CONFIGS = [
    # (filename, contract_type, risk_factor, corridor, description_params)
    # PAM × 6 risk factors
    ("SupplyChain-PAM-HedgeEffectiveness-90d","PAM","HE","CN-electronics",{"contract":"$10M FX forward hedge","notional":10000000,"rate":0.0,"ip_cycle":"P3ML0","tariff_src":"Section 301","scenario":"Exposure grows beyond hedge → ASC 815 breach"}),
    ("SupplyChain-PAM-FXTariffCorrelation-90d","PAM","FXTC","CN-electronics",{"contract":"$8M trade finance","notional":8000000,"rate":0.065,"ip_cycle":"P1ML0","tariff_src":"Section 301","scenario":"Correlated CNY depreciation + tariff amplification"}),
    ("SupplyChain-PAM-RevenueElasticity-90d","PAM","RE","IN-textiles",{"contract":"$5M WC loan","notional":5000000,"rate":0.0525,"ip_cycle":"P1ML0","tariff_src":"HS52-63 textiles","scenario":"Armington elasticity 2.8 → 49% revenue decline"}),
    ("SupplyChain-PAM-PortCongestion-90d","PAM","PC","MX-autoparts",{"contract":"$6M trade finance","notional":6000000,"rate":0.07,"ip_cycle":"P1ML0","tariff_src":"HS87 auto parts","scenario":"Port dwell 4→12 days → 1.6% notional impact"}),
    ("SupplyChain-PAM-TariffSpread-90d","PAM","TS","IN-textiles",{"contract":"$5M WC loan SOFR+100bps","notional":5000000,"rate":0.0525,"ip_cycle":"P1ML0","tariff_src":"HS52-63 textiles","scenario":"Spread widening capped at 800bps"}),
    ("SupplyChain-PAM-WorkingCapitalStress-90d","PAM","WCS","IN-textiles",{"contract":"$5M revolving WC","notional":5000000,"rate":0.0525,"ip_cycle":"P1ML0","tariff_src":"HS52-63 textiles","scenario":"CCC 40→53.5 days, revenue -33%"}),
    # SWAPS × 6 risk factors
    ("SupplyChain-SWAPS-HedgeEffectiveness-90d","SWAPS","HE","CN-electronics",{"contract":"$10M IRS","notional":10000000,"fixed":0.055,"spread":0.02,"scenario":"Swap under-hedged as exposure grows"}),
    ("SupplyChain-SWAPS-FXTariffCorrelation-90d","SWAPS","FXTC","CN-electronics",{"contract":"$8M IRS","notional":8000000,"fixed":0.06,"spread":0.02,"scenario":"Correlated FX+tariff stress on swap MTM"}),
    ("SupplyChain-SWAPS-RevenueElasticity-90d","SWAPS","RE","IN-textiles",{"contract":"$5M IRS","notional":5000000,"fixed":0.055,"spread":0.015,"scenario":"Revenue decline → swap payment squeeze"}),
    ("SupplyChain-SWAPS-PortCongestion-90d","SWAPS","PC","MX-autoparts",{"contract":"$6M IRS","notional":6000000,"fixed":0.06,"spread":0.025,"scenario":"Port delays → swap cash flow timing mismatch"}),
    ("SupplyChain-SWAPS-TariffSpread-90d","SWAPS","TS","IN-textiles",{"contract":"$5M IRS refinancing hedge","notional":5000000,"fixed":0.055,"spread":0.01,"scenario":"Lock fixed before spread blow-out (saves 830bps)"}),
    ("SupplyChain-SWAPS-WorkingCapitalStress-90d","SWAPS","WCS","IN-textiles",{"contract":"$5M IRS","notional":5000000,"fixed":0.055,"spread":0.01,"scenario":"CCC squeeze on swap payment capacity"}),
    # SWPPV × 6 risk factors
    ("SupplyChain-SWPPV-HedgeEffectiveness-90d","SWPPV","HE","CN-electronics",{"contract":"$10M plain vanilla IRS","notional":10000000,"fixed":0.05,"float2":0.043,"spread":0.0,"scenario":"Effectiveness breach on SWPPV"}),
    ("SupplyChain-SWPPV-FXTariffCorrelation-90d","SWPPV","FXTC","CN-electronics",{"contract":"$8M plain vanilla IRS","notional":8000000,"fixed":0.05,"float2":0.043,"spread":0.0,"scenario":"Correlated FX+tariff on SWPPV MTM"}),
    ("SupplyChain-SWPPV-RevenueElasticity-90d","SWPPV","RE","IN-gems",{"contract":"$4M plain vanilla IRS (gems)","notional":4000000,"fixed":0.06,"float2":0.043,"spread":0.01,"scenario":"GTAP elasticity 3.2 (luxury goods) → severe squeeze"}),
    ("SupplyChain-SWPPV-PortCongestion-90d","SWPPV","PC","MX-autoparts",{"contract":"$6M plain vanilla IRS","notional":6000000,"fixed":0.055,"float2":0.043,"spread":0.015,"scenario":"Port delay impact on SWPPV payments"}),
    ("SupplyChain-SWPPV-TariffSpread-90d","SWPPV","TS","IN-textiles",{"contract":"$5M plain vanilla IRS","notional":5000000,"fixed":0.055,"float2":0.043,"spread":0.01,"scenario":"SWPPV locks refinancing cost pre-spread widening"}),
    ("SupplyChain-SWPPV-WorkingCapitalStress-90d","SWPPV","WCS","IN-textiles",{"contract":"$5M plain vanilla IRS","notional":5000000,"fixed":0.055,"float2":0.043,"spread":0.01,"scenario":"CCC stress on SWPPV differential funding"}),
]

RF_LABELS={"HE":"HEDGE EFFECTIVENESS","FXTC":"FX-TARIFF CORRELATION","RE":"REVENUE ELASTICITY (GTAP)","PC":"PORT CONGESTION","TS":"TARIFF SPREAD","WCS":"WORKING CAPITAL STRESS"}
CORRIDOR_TARIFF={"CN-electronics":"TARIFF_INDEX_CN","IN-textiles":"TARIFF_INDEX_IN","IN-gems":"TARIFF_INDEX_IN","MX-autoparts":"TARIFF_INDEX_MX"}
CORRIDOR_IDX={"CN-electronics":"TARIFF_IDX_CN_01","IN-textiles":"TARIFF_IDX_IN_01","IN-gems":"TARIFF_IDX_IN_01","MX-autoparts":"TARIFF_IDX_MX_01"}
CORRIDOR_TARIFF_DATA={"CN-electronics":TARIFF_CN,"IN-textiles":TARIFF_IN,"IN-gems":TARIFF_IN,"MX-autoparts":TARIFF_MX}

count=0
for fname,ctype,rf,corridor,params in CONFIGS:
    items=[]
    tariff_data=CORRIDOR_TARIFF_DATA[corridor]
    tariff_moc=CORRIDOR_TARIFF[corridor]
    tariff_rfid=CORRIDOR_IDX[corridor]
    model_id=f"{rf.lower()}_{ctype.lower()}_{corridor.split('-')[0]}_01"
    scn_id=f"{ctype.lower()}_{rf.lower()}_{corridor.split('-')[0]}_scn01"
    step=1
    
    # 1. Add tariff index
    items.append(req(f"{step}. Add Tariff Index ({corridor})","POST","addReferenceIndex",tariff_data,ok(f"{tariff_rfid}: {corridor} tariff loaded")))
    step+=1
    
    # 2. Add supporting indexes based on risk factor
    if rf in ("HE","FXTC"):
        items.append(req(f"{step}. Add USD_CNY","POST","addReferenceIndex",FX_CNY,ok("USD/CNY FX rate loaded")))
        step+=1
    if rf=="HE":
        items.append(req(f"{step}. Add CURRENT_EXPOSURE","POST","addReferenceIndex",EXPOSURE,ok("Tariff-inflated exposure loaded")))
        step+=1
    if rf=="PC":
        items.append(req(f"{step}. Add PORT_CONGESTION_INDEX","POST","addReferenceIndex",PORT_CONG,ok("Port congestion index loaded")))
        step+=1
    if rf=="WCS":
        items.append(req(f"{step}. Add REVENUE_INDEX","POST","addReferenceIndex",REVENUE,ok("Revenue index loaded")))
        step+=1
        items.append(req(f"{step}. Add DSO_INDEX","POST","addReferenceIndex",DSO,ok("DSO index loaded")))
        step+=1
    if ctype in ("SWAPS","SWPPV") or rf in ("TS","RE"):
        items.append(req(f"{step}. Add USD_SOFR","POST","addReferenceIndex",SOFR,ok("SOFR reference rate loaded")))
        step+=1
    
    # 3. Add behavioral model
    model_endpoint_map={"HE":"addHedgeEffectivenessModel","FXTC":"addFXTariffCorrelationModel","RE":"addRevenueElasticityModel","PC":"addPortCongestionModel","TS":"addTariffSpreadModel","WCS":"addWorkingCapitalStressModel"}
    model_data_map={
        "HE": he_model(model_id,tariff_moc,params.get("notional",10000000)),
        "FXTC": fxtc_model(model_id,tariff_moc),
        "RE": re_model(model_id,tariff_moc,3.2 if "gems" in corridor else 2.8, params.get("notional",5000000), 0.65 if "gems" in corridor else 0.70, 0.35 if "gems" in corridor else 0.40),
        "PC": pc_model(model_id,tariff_moc),
        "TS": ts_model(model_id,tariff_moc),
        "WCS": wcs_model(model_id,tariff_moc),
    }
    items.append(req(f"{step}. Add {RF_LABELS[rf]} Model","POST",model_endpoint_map[rf],model_data_map[rf],ok(f"{model_id}: {RF_LABELS[rf]} model loaded")))
    step+=1
    
    # 4. Add scenario
    scn_builder_map={"HE":he_scenario,"FXTC":fxtc_scenario,"RE":re_scenario,"PC":pc_scenario,"TS":ts_scenario,"WCS":wcs_scenario}
    scn_data=scn_builder_map[rf](scn_id,model_id) if rf in ("HE","FXTC") else scn_builder_map[rf](scn_id,model_id,tariff_rfid)
    items.append(req(f"{step}. Add Scenario","POST","addScenario",scn_data,ok(f"{scn_id}: scenario created")))
    step+=1
    
    # 5. Build contract
    if ctype=="PAM":
        contract=[{"calendar":"NC","businessDayConvention":"SCF","contractType":"PAM","statusDate":"2026-02-28T00:00:00","contractRole":"RPA","contractID":f"{ctype}-{rf}-{corridor}-01","cycleAnchorDateOfInterestPayment":"2026-03-31T00:00:00" if rf!="HE" else "2026-05-31T00:00:00","cycleOfInterestPayment":params.get("ip_cycle","P1ML0"),"nominalInterestRate":params["rate"],"dayCountConvention":"AA","currency":"USD","contractDealDate":"2026-02-28T00:00:00","initialExchangeDate":"2026-03-01T00:00:00","maturityDate":"2026-05-31T00:00:00","notionalPrincipal":params["notional"],"premiumDiscountAtIED":0,"tariffModels":[model_id]}]
        if rf=="TS":
            contract[0].update({"cycleOfRateReset":"P1ML0","cycleAnchorDateOfRateReset":"2026-03-31T00:00:00","marketObjectCodeOfRateReset":"USD_SOFR","rateMultiplier":1.0,"rateSpread":0.01})
    elif ctype=="SWAPS":
        contract=[swaps(f"SWAPS-{rf}-{corridor}-01",params["notional"],params["fixed"],params["spread"],"USD_SOFR",[model_id])]
    elif ctype=="SWPPV":
        contract=[swppv(f"SWPPV-{rf}-{corridor}-01",params["notional"],params["fixed"],params["float2"],"USD_SOFR",params["spread"],[model_id])]
    
    # 6. Run simulation
    cid=contract[0]["contractID"]
    titles=[
        f"{ctype} — {RF_LABELS[rf]} (Single Factor)",
        f"  Contract: {params.get('contract','N/A')}",
        f"  Corridor: {corridor}",
        f"  Scenario: {params['scenario']}"
    ]
    if ctype=="SWAPS":
        titles.insert(2,f"  Leg 1 (receive): Fixed {params['fixed']*100:.1f}% | Leg 2 (pay): SOFR+{params['spread']*100:.0f}bps")
    elif ctype=="SWPPV":
        titles.insert(2,f"  Receive Fixed {params['fixed']*100:.1f}% (IPFX) | Pay Floating SOFR+{params['spread']*100:.0f}bps (IPFL)")
    
    items.append(req(f"{step}. Run {ctype} {RF_LABELS[rf]} Simulation","POST","rf2/scenarioSimulation",sim_body(contract,scn_id),sim_test(titles,cid),port=8083))
    
    desc=f"ACTUS {ctype} contract: {RF_LABELS[rf]} single-factor simulation.\n\n{params.get('contract','')}, {corridor} corridor.\n{params['scenario']}.\n\nPer ACTUS official documentation:\n"
    if ctype=="SWAPS": desc+="- SWAPS uses contractStructure with FIL/SEL PAM child legs\n- See: https://documentation.actusfrf.org/docs/examples/basic-contract-types/example_SWAPS\n"
    elif ctype=="SWPPV": desc+="- SWPPV: nominalInterestRate (fixed IPFX) + nominalInterestRate2 (floating IPFL)\n- See: https://documentation.actusfrf.org/docs/examples/basic-contract-types/example_SWPPV\n"
    else: desc+="- PAM: Principal At Maturity\n- See: https://documentation.actusfrf.org/docs/examples/basic-contract-types/example_PAM\n"
    desc+=f"\nRisk Factor: {RF_LABELS[rf]} model only (single dimension).\nBehavioral model from Risk-Factor-2.md Domain 2: Tariff/Trade Finance."
    
    collection=coll(f"{ctype.lower()}-{rf.lower()}-90d-001",fname,desc,items)
    filepath=os.path.join(OUTPUT_DIR,fname+".json")
    with open(filepath,'w') as f: json.dump(collection,f,indent=2)
    count+=1
    print(f"  ✅ {fname}.json ({len(items)} steps)")

print(f"\n{'='*60}")
print(f"Generated {count} simulation files in {OUTPUT_DIR}/")
print(f"{'='*60}")
print(f"Phase 1: 6 × PAM (best-fit basic contract)")
print(f"Phase 2: 6 × SWAPS (two-leg combination swap)")
print(f"Phase 3: 6 × SWPPV (plain vanilla interest rate swap)")
print(f"\nRisk Factors (1 per file):")
for k,v in RF_LABELS.items(): print(f"  {k}: {v}")
