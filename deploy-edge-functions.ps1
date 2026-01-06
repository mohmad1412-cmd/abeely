# ==========================================
# سكريبت نشر Edge Functions على Supabase
# ==========================================

Write-Host "🚀 بدء نشر Edge Functions..." -ForegroundColor Cyan

# التحقق من تثبيت Supabase CLI
Write-Host "`n📦 التحقق من Supabase CLI..." -ForegroundColor Yellow
$supabaseInstalled = Get-Command supabase -ErrorAction SilentlyContinue

if (-not $supabaseInstalled) {
    Write-Host "❌ Supabase CLI غير مثبت!" -ForegroundColor Red
    Write-Host "📥 قم بتثبيته باستخدام: npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Supabase CLI مثبت" -ForegroundColor Green

# التحقق من تسجيل الدخول
Write-Host "`n🔐 التحقق من تسجيل الدخول..." -ForegroundColor Yellow
$loginStatus = supabase projects list 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ لم يتم تسجيل الدخول!" -ForegroundColor Red
    Write-Host "🔑 قم بتسجيل الدخول باستخدام: supabase login" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ تم تسجيل الدخول" -ForegroundColor Green

# قائمة الـ functions
$functions = @("ai-chat", "customer-service-ai", "image-search")

Write-Host "`n📋 الـ Functions المتاحة:" -ForegroundColor Cyan
foreach ($func in $functions) {
    Write-Host "   - $func" -ForegroundColor White
}

# سؤال المستخدم
Write-Host "`n❓ هل تريد نشر جميع الـ functions؟ (Y/N)" -ForegroundColor Yellow
$response = Read-Host

if ($response -eq "Y" -or $response -eq "y") {
    # نشر جميع الـ functions
    foreach ($func in $functions) {
        Write-Host "`n📤 نشر $func..." -ForegroundColor Cyan
        supabase functions deploy $func
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ تم نشر $func بنجاح!" -ForegroundColor Green
        } else {
            Write-Host "❌ فشل نشر $func" -ForegroundColor Red
        }
    }
} else {
    # اختيار function معينة
    Write-Host "`nاختر الـ function التي تريد نشرها:" -ForegroundColor Yellow
    for ($i = 0; $i -lt $functions.Length; $i++) {
        Write-Host "   $($i + 1). $($functions[$i])" -ForegroundColor White
    }
    
    $choice = Read-Host "`nاختيارك (1-$($functions.Length))"
    $selectedIndex = [int]$choice - 1
    
    if ($selectedIndex -ge 0 -and $selectedIndex -lt $functions.Length) {
        $selectedFunc = $functions[$selectedIndex]
        Write-Host "`n📤 نشر $selectedFunc..." -ForegroundColor Cyan
        supabase functions deploy $selectedFunc
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ تم نشر $selectedFunc بنجاح!" -ForegroundColor Green
        } else {
            Write-Host "❌ فشل نشر $selectedFunc" -ForegroundColor Red
        }
    } else {
        Write-Host "❌ اختيار غير صحيح!" -ForegroundColor Red
        exit 1
    }
}

Write-Host "`n✨ انتهى!" -ForegroundColor Green
Write-Host "`n💡 تذكير: تأكد من إضافة متغيرات البيئة من Dashboard → Edge Functions → Settings → Secrets" -ForegroundColor Yellow

