@echo off
echo ════════════════════════════════════════════════════════════════
echo  CONVERGE.FI — CRON SIMULATION (3 periodic health checks)
echo  Each period: read portfolio + overrides, ACTUS simulation,
echo  compute 3 health metrics, determine MINT gate status
echo ════════════════════════════════════════════════════════════════

echo.
echo ═══════════════════════════════════════════════════════════════
echo  PERIOD 1 of 3:  Healthy baseline (no overrides active)
echo ═══════════════════════════════════════════════════════════════
echo { "overrideActive": false, "portfolioAdjustments": [], "contracts": [], "earlyLiquidations": [] } > reserve_overrides.json
node demo-runner.js
echo.
echo ─── Simulating cron interval (10 seconds) ───
timeout /t 10 /nobreak >nul

echo.
echo ═══════════════════════════════════════════════════════════════
echo  PERIOD 2 of 3:  Stress — $16K cash withdrawn (regulatory fine)
echo  Operator edited reserve_overrides.json between cron cycles
echo ═══════════════════════════════════════════════════════════════
copy /Y override_phaseB_stress.json reserve_overrides.json >nul
node demo-runner.js
echo.
echo ─── Simulating cron interval (10 seconds) ───
timeout /t 10 /nobreak >nul

echo.
echo ═══════════════════════════════════════════════════════════════
echo  PERIOD 3 of 3:  Restore — T-bill early liquidation + injection
echo  Operator edited reserve_overrides.json between cron cycles
echo ═══════════════════════════════════════════════════════════════
copy /Y override_phaseC_restore.json reserve_overrides.json >nul
node demo-runner.js

echo.
echo ════════════════════════════════════════════════════════════════
echo  DEMO COMPLETE
echo.
echo  Period 1:  MINT ALLOWED   (backing 103%%, liquidity 24.3%%)
echo  Period 2:  MINT BLOCKED   (backing  87%%, liquidity 10.3%%)
echo  Period 3:  MINT RESTORED  (backing 101%%, liquidity 48.6%%)
echo.
echo  T-bill early liquidation penalty: $780 (3%% of $26,000)
echo  Capital injection: $15,000
echo  Net cost of restoring health: $780
echo ════════════════════════════════════════════════════════════════
