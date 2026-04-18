$projectRoot = Split-Path -Parent $PSScriptRoot
$frontendRoot = Join-Path $projectRoot "frontend"
$buildIdPath = Join-Path $frontendRoot ".next\\BUILD_ID"
$dbPortOpen = Get-NetTCPConnection -LocalPort 5433 -State Listen -ErrorAction SilentlyContinue

if (-not $dbPortOpen) {
  Write-Host "Aviso: no se detecta nada escuchando en 127.0.0.1:5433." -ForegroundColor Yellow
  Write-Host "Si tu base esta en el VPS, primero activa tu tunel SSH antes de probar login." -ForegroundColor Yellow
  Write-Host ""
}

Write-Host "Iniciando backend en http://localhost:3000 ..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-Command",
  "Set-Location '$projectRoot'; npm.cmd start"
)

if (-not (Test-Path $buildIdPath)) {
  Write-Host "No existe build del frontend. Generando uno ahora..." -ForegroundColor Yellow
  Set-Location $frontendRoot
  npm.cmd run build
}

Write-Host "Iniciando frontend en http://localhost:3001 ..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-Command",
  "Set-Location '$frontendRoot'; npm.cmd run start:3001"
)

Write-Host ""
Write-Host "Listo. Abre estas URLs en tu navegador:" -ForegroundColor Green
Write-Host "  Frontend: http://localhost:3001"
Write-Host "  Dashboard: http://localhost:3001/dashboard"
Write-Host "  Backend health: http://localhost:3000/api/health"
