# vLEI Setup & Run Commands

## Prerequisites
- Docker Desktop running
- Node.js installed
- WSL2 available (for running .sh scripts)

---

## Terminal 1 — Docker Containers (LegentvLEI)

```powershell
cd C:\Asha\chainaim\asha\GENERAL\generalRisk\LegentvLEI
```

### Create Docker network (one-time, skip if already exists)
```powershell
docker network create vlei_workshop
```

### Start all vLEI containers
```powershell
docker compose up -d
```

### Wait for containers to become healthy (~40 seconds)
```powershell
Start-Sleep -Seconds 40
docker compose ps
```

### Fix CRLF line endings on all shell scripts (one-time)
```powershell
wsl bash -c "cd /mnt/c/Asha/chainaim/asha/GENERAL/generalRisk/LegentvLEI && find . -name '*.sh' -exec sed -i 's/\r$//' {} +"
```

### Run the full 4C trust chain setup (one-time, ~10-15 minutes)
```powershell
wsl bash -c "cd /mnt/c/Asha/chainaim/asha/GENERAL/generalRisk/LegentvLEI && bash run-all-buyerseller-4C-with-agents.sh"
```

### Verify agent data files exist after 4C completes
```powershell
dir task-data\jupiterSellerAgent-info.json
dir task-data\jupiterSellerAgent-bran.txt
```

---

## Terminal 2 — Backend Server

```powershell
cd C:\Asha\chainaim\asha\GENERAL\generalRisk\Backend
```

### Install dependencies (first time only)
```powershell
npm install
```

### Build TypeScript
```powershell
npm run build
```

### Start the backend server
```powershell
node dist/server.js
```

---

## Terminal 3 — Frontend

```powershell
cd C:\Asha\chainaim\asha\GENERAL\generalRisk\Frontend
```

### Install dependencies (first time only)
```powershell
npm install
```

### Start the dev server
```powershell
npm run dev
```

---

## Browser

1. Open `http://localhost:3000`
2. Click the **vLEI** tab (next to Issuer and Holder)
3. Click **Run vLEI 4C** button
4. Wait ~12 seconds for KERIA to sign the credential
5. Digital signature and full JSON response will be displayed

---

## Quick Smoke Test (optional, from any terminal)

```powershell
curl http://localhost:4000/api/vlei/status
curl http://localhost:4000/api/health
```

---

## If You Need to Reset Everything

```powershell
cd C:\Asha\chainaim\asha\GENERAL\generalRisk\LegentvLEI
docker compose down -v
docker compose up -d
Start-Sleep -Seconds 40
wsl bash -c "cd /mnt/c/Asha/chainaim/asha/GENERAL/generalRisk/LegentvLEI && bash run-all-buyerseller-4C-with-agents.sh"
```

---

## Ports Used

| Service | Port | Purpose |
|---------|------|---------|
| KERIA Admin | 3901 | KERIA admin API |
| KERIA HTTP | 3902 | KERIA HTTP API |
| KERIA Boot | 3903 | KERIA boot API |
| Schema Server | 7723 | vLEI schema OOBI server |
| Witness | 5642-5647 | 6 demo witnesses |
| Sally Verifier | 9723 | Credential verification |
| Resource Webhook | 9923 | IPEX presentation webhook |
| vLEI Verification | 9724 | Agent delegation verification |
| Backend | 4000 | Express API server |
| Frontend | 3000 | Next.js dev server |
