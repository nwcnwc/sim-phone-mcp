# Install optional Windows tools for sim-phone bridge audio capture.
$ErrorActionPreference = 'Stop'
Write-Host "sim-phone Windows bridge:"
Write-Host "  - Ensure Bluetooth is on and the phone is paired as Hands-Free."
Write-Host "  - Optional: install ffmpeg for listen/downlink (winget install Gyan.FFmpeg)."
Write-Host "  - Bridge daemon: helpers/win/bridge-daemon.ps1"
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Warning "Node.js 20+ is required for sim-phone-mcp."
}
