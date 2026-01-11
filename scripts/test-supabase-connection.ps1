# Test Supabase Connection
Write-Host "Testing Supabase Connection..." -ForegroundColor Cyan
Write-Host ""

# Read .env.local
if (Test-Path ".env.local") {
    $envContent = Get-Content ".env.local" -Raw
    
    if ($envContent -match "VITE_SUPABASE_URL=(.+)") {
        $supabaseUrl = $matches[1].Trim()
        Write-Host "[OK] Supabase URL: $supabaseUrl" -ForegroundColor Green
    } else {
        Write-Host "[X] VITE_SUPABASE_URL not found" -ForegroundColor Red
        exit 1
    }
    
    if ($envContent -match "VITE_SUPABASE_ANON_KEY=(.+)") {
        $anonKey = $matches[1].Trim()
        Write-Host "[OK] Supabase Anon Key: Found" -ForegroundColor Green
    } else {
        Write-Host "[X] VITE_SUPABASE_ANON_KEY not found" -ForegroundColor Red
        exit 1
    }
    
    # Test connection
    Write-Host ""
    Write-Host "Testing connection to Supabase..." -ForegroundColor Yellow
    
    $headers = @{
        "apikey" = $anonKey
        "Authorization" = "Bearer $anonKey"
        "Content-Type" = "application/json"
    }
    
    try {
        $testUrl = "$supabaseUrl/rest/v1/requests?select=id&limit=1"
        $response = Invoke-WebRequest -Uri $testUrl -Method GET -Headers $headers -TimeoutSec 10
        
        if ($response.StatusCode -eq 200) {
            Write-Host "[OK] Connection successful!" -ForegroundColor Green
            Write-Host "Status Code: $($response.StatusCode)" -ForegroundColor Green
        } else {
            Write-Host "[WARN] Connection returned status: $($response.StatusCode)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "[ERROR] Connection failed:" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
        
        if ($_.Exception.Message -match "timeout|timed out") {
            Write-Host ""
            Write-Host "Possible issues:" -ForegroundColor Yellow
            Write-Host "  1. Supabase project might be paused or inactive" -ForegroundColor White
            Write-Host "  2. Network connectivity issue" -ForegroundColor White
            Write-Host "  3. Check Supabase Dashboard for project status" -ForegroundColor White
        } elseif ($_.Exception.Message -match "401|403|unauthorized") {
            Write-Host ""
            Write-Host "Possible issues:" -ForegroundColor Yellow
            Write-Host "  1. Anon key might be incorrect" -ForegroundColor White
            Write-Host "  2. RLS policies might be blocking access" -ForegroundColor White
            Write-Host "  3. Check Supabase Dashboard -> Settings -> API" -ForegroundColor White
        }
    }
} else {
    Write-Host "[X] .env.local file not found" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Check Supabase Dashboard: https://app.supabase.com/project/gfjtyfwwbpjbwafbnfcc" -ForegroundColor White
Write-Host "  2. Verify project is active (not paused)" -ForegroundColor White
Write-Host "  3. Check Database -> Tables -> requests exists" -ForegroundColor White
Write-Host "  4. Check Authentication -> Policies for requests table" -ForegroundColor White
