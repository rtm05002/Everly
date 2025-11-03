# Quick test script for Whop sync endpoints
# Usage: .\test-endpoints.ps1 [local|production]

param(
    [string]$env = "local"
)

if ($env -eq "local") {
    $baseUrl = "http://localhost:3000"
    Write-Host "`n🧪 Testing LOCAL endpoints`n" -ForegroundColor Cyan
} else {
    $baseUrl = "https://everly-2plkdntuq-ryantmedeiros-1130s-projects.vercel.app"
    Write-Host "`n🧪 Testing PRODUCTION endpoints`n" -ForegroundColor Cyan
}

Write-Host "📊 Step 1: Checking Whop status..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/debug/whop-status" -Method GET -UseBasicParsing
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
    Write-Host "`n✅ Status check complete!`n" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: $_`n" -ForegroundColor Red
    exit 1
}

Write-Host "🚀 Step 2: Triggering test sync..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/debug/test-sync" -Method POST -UseBasicParsing
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
    Write-Host "`n✅ Sync complete!`n" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: $_`n" -ForegroundColor Red
    exit 1
}

Write-Host "🎉 All tests passed!`n" -ForegroundColor Green

