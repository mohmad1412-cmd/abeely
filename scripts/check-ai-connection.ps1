# PowerShell script to check AI and Backend connection status
# Run with: .\scripts\check-ai-connection.ps1

Write-Host "Checking AI and Backend Connection..." -ForegroundColor Cyan
Write-Host ""

# Load environment variables from .env.local
$envFile = ".env.local"
$envVars = @{}

if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            $envVars[$key] = $value
        }
    }
}

$SUPABASE_URL = if ($envVars["VITE_SUPABASE_URL"]) { $envVars["VITE_SUPABASE_URL"] } else { $env:VITE_SUPABASE_URL }
$SUPABASE_ANON_KEY = if ($envVars["VITE_SUPABASE_ANON_KEY"]) { $envVars["VITE_SUPABASE_ANON_KEY"] } else { $env:VITE_SUPABASE_ANON_KEY }
$ANTHROPIC_API_KEY = if ($envVars["VITE_ANTHROPIC_API_KEY"]) { $envVars["VITE_ANTHROPIC_API_KEY"] } else { $env:VITE_ANTHROPIC_API_KEY }

# Check 1: Supabase Configuration
Write-Host "1. Checking Supabase Configuration..." -ForegroundColor Yellow
if ($SUPABASE_URL -and $SUPABASE_ANON_KEY) {
    $urlShort = if ($SUPABASE_URL.Length -gt 30) { $SUPABASE_URL.Substring(0, 30) + "..." } else { $SUPABASE_URL }
    $keyShort = if ($SUPABASE_ANON_KEY.Length -gt 20) { $SUPABASE_ANON_KEY.Substring(0, 20) + "..." } else { $SUPABASE_ANON_KEY }
    Write-Host "   [OK] Supabase URL: $urlShort" -ForegroundColor Green
    Write-Host "   [OK] Supabase Anon Key: $keyShort" -ForegroundColor Green
} else {
    Write-Host "   [FAIL] Missing Supabase configuration!" -ForegroundColor Red
    Write-Host "   Tip: Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local" -ForegroundColor Yellow
}

# Check 2: Anthropic API Key
Write-Host ""
Write-Host "2. Checking Anthropic API Key..." -ForegroundColor Yellow
if ($ANTHROPIC_API_KEY -and $ANTHROPIC_API_KEY -ne "your_anthropic_api_key_here") {
    $keyShort = if ($ANTHROPIC_API_KEY.Length -gt 20) { $ANTHROPIC_API_KEY.Substring(0, 20) + "..." } else { $ANTHROPIC_API_KEY }
    Write-Host "   [OK] Anthropic API Key found: $keyShort" -ForegroundColor Green
} else {
    Write-Host "   [FAIL] Missing or invalid Anthropic API Key!" -ForegroundColor Red
    Write-Host "   Tip: Add VITE_ANTHROPIC_API_KEY to .env.local" -ForegroundColor Yellow
}

# Check 3: Test Edge Function
if ($SUPABASE_URL -and $SUPABASE_ANON_KEY) {
    Write-Host ""
    Write-Host "3. Testing Edge Function 'ai-chat'..." -ForegroundColor Yellow
    try {
        $body = @{
            prompt = "ping"
            mode = "chat"
        } | ConvertTo-Json

        $headers = @{
            "Content-Type" = "application/json"
            "Authorization" = "Bearer $SUPABASE_ANON_KEY"
        }

        $response = Invoke-RestMethod -Uri "$SUPABASE_URL/functions/v1/ai-chat" -Method Post -Headers $headers -Body $body -ErrorAction Stop

        Write-Host "   [OK] Edge Function is working!" -ForegroundColor Green
        $responseJson = $response | ConvertTo-Json -Compress
        if ($responseJson.Length -gt 100) {
            $shortResponse = $responseJson.Substring(0, 100)
            Write-Host "   Response: $shortResponse..." -ForegroundColor Gray
        } else {
            Write-Host "   Response: $responseJson" -ForegroundColor Gray
        }
    } catch {
        $errorMsg = $_.Exception.Message
        Write-Host "   [FAIL] Edge Function error: $errorMsg" -ForegroundColor Red
        Write-Host "   Tip: Make sure Edge Function is deployed and ANTHROPIC_API_KEY is set in Supabase Secrets" -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "3. Skipping Edge Function test (Supabase not configured)" -ForegroundColor Gray
}

# Check 4: Test Direct Anthropic API
if ($ANTHROPIC_API_KEY -and $ANTHROPIC_API_KEY -ne "your_anthropic_api_key_here") {
    Write-Host ""
    Write-Host "4. Testing Direct Anthropic API..." -ForegroundColor Yellow
    try {
        $body = @{
            model = "claude-sonnet-4-20250514"
            max_tokens = 10
            messages = @(
                @{
                    role = "user"
                    content = "hi"
                }
            )
        } | ConvertTo-Json -Depth 10

        $headers = @{
            "Content-Type" = "application/json"
            "x-api-key" = $ANTHROPIC_API_KEY
            "anthropic-version" = "2023-06-01"
        }

        $response = Invoke-RestMethod -Uri "https://api.anthropic.com/v1/messages" -Method Post -Headers $headers -Body $body -ErrorAction Stop

        Write-Host "   [OK] Direct Anthropic API is working!" -ForegroundColor Green
        $responseJson = $response | ConvertTo-Json -Compress
        if ($responseJson.Length -gt 100) {
            $shortResponse = $responseJson.Substring(0, 100)
            Write-Host "   Response: $shortResponse..." -ForegroundColor Gray
        } else {
            Write-Host "   Response: $responseJson" -ForegroundColor Gray
        }
    } catch {
        $errorMsg = $_.Exception.Message
        Write-Host "   [FAIL] Anthropic API error: $errorMsg" -ForegroundColor Red
        Write-Host "   Tip: Check your API key validity" -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "4. Skipping Direct API test (API Key not configured)" -ForegroundColor Gray
}

# Summary
Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

$hasSupabase = ($SUPABASE_URL -and $SUPABASE_ANON_KEY)
$hasAnthropic = ($ANTHROPIC_API_KEY -and $ANTHROPIC_API_KEY -ne "your_anthropic_api_key_here")

if ($hasSupabase) {
    Write-Host "   [OK] Supabase Config" -ForegroundColor Green
} else {
    Write-Host "   [FAIL] Supabase Config" -ForegroundColor Red
}

if ($hasAnthropic) {
    Write-Host "   [OK] Anthropic API Key" -ForegroundColor Green
} else {
    Write-Host "   [FAIL] Anthropic API Key" -ForegroundColor Red
}

Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
if (-not $hasSupabase) {
    Write-Host "   1. Add Supabase configuration to .env.local" -ForegroundColor Yellow
}
if (-not $hasAnthropic) {
    Write-Host "   2. Add VITE_ANTHROPIC_API_KEY to .env.local" -ForegroundColor Yellow
}
if ($hasSupabase -and -not $hasAnthropic) {
    Write-Host "   3. Add ANTHROPIC_API_KEY to Supabase Secrets:" -ForegroundColor Yellow
    Write-Host "      supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxxxx" -ForegroundColor Gray
    Write-Host "   4. Deploy Edge Functions:" -ForegroundColor Yellow
    Write-Host "      supabase functions deploy ai-chat" -ForegroundColor Gray
    Write-Host "      supabase functions deploy customer-service-ai" -ForegroundColor Gray
}

Write-Host ""
