# 🔧 TestSprite Setup Guide - ServiceLink AI Platform

دليل إعداد TestSprite للاختبارات التلقائية.

## 📋 المحتويات

1. [Configuration](#configuration)
2. [API Endpoints](#api-endpoints)
3. [Frontend Test IDs](#frontend-test-ids)
4. [Test Execution](#test-execution)

---

## ⚙️ Configuration

### 1. API Configuration

تم إنشاء ملف `testsprite-api-config.json` يحتوي على:
- Base URLs
- API endpoints
- Table schemas
- Auth configuration

**الملف:** `testsprite_tests/testsprite-api-config.json`

### 2. Frontend Configuration

**URL:** `http://localhost:3005`

**Port:** 3005 (يجب أن يكون التطبيق يعمل محلياً)

---

## 🔌 API Endpoints

### Supabase REST API

**Base URL:** `https://iwfvlrtmbixequntufjr.supabase.co/rest/v1`

### الجداول الرئيسية:

#### 1. Requests (`/rest/v1/requests`)
```json
{
  "method": "POST",
  "headers": {
    "Authorization": "Bearer {anon_key}",
    "Content-Type": "application/json",
    "apikey": "{anon_key}"
  },
  "body": {
    "title": "طلب اختبار",
    "description": "وصف الطلب",
    "author_id": "user_id",
    "status": "active",
    "is_public": true
  }
}
```

#### 2. Offers (`/rest/v1/offers`)
```json
{
  "method": "POST",
  "headers": {
    "Authorization": "Bearer {anon_key}",
    "Content-Type": "application/json",
    "apikey": "{anon_key}"
  },
  "body": {
    "request_id": "request_id",
    "provider_id": "user_id",
    "price": 1000,
    "description": "وصف العرض"
  }
}
```

#### 3. Categories (`/rest/v1/categories`)
```json
{
  "method": "GET",
  "headers": {
    "Authorization": "Bearer {anon_key}",
    "apikey": "{anon_key}"
  }
}
```

### Authentication Endpoints

**Base URL:** `https://iwfvlrtmbixequntufjr.supabase.co/auth/v1`

- `POST /auth/v1/otp` - إرسال OTP
- `POST /auth/v1/verify` - التحقق من OTP
- `POST /auth/v1/signup` - تسجيل جديد
- `POST /auth/v1/token` - تسجيل الدخول

---

## 🎯 Frontend Test IDs

جميع test IDs موجودة في `testsprite_tests/test-helpers.md`

### Authentication
- `[data-testid="phone-input"]` - حقل رقم الجوال
- `[data-testid="send-otp-button"]` - زر إرسال OTP
- `[data-testid="otp-input-0"]` إلى `[data-testid="otp-input-3"]` - حقول OTP
- `[data-testid="verify-otp-button"]` - زر تأكيد الدخول
- `[data-testid="guest-mode-button"]` - زر الدخول كضيف

### Navigation
- `[data-testid="nav-tab-marketplace"]` - تبويب اكتشف
- `[data-testid="nav-tab-my-requests"]` - تبويب طلباتي
- `[data-testid="nav-tab-create"]` - تبويب إنشاء طلب
- `[data-testid="nav-tab-my-offers"]` - تبويب عروضي
- `[data-testid="nav-tab-profile"]` - تبويب الملف الشخصي

---

## 🧪 Test Execution

### Backend API Tests

#### Example: Test Successful POST Request

```python
import requests
import json

def test_successful_post_request():
    url = "https://iwfvlrtmbixequntufjr.supabase.co/rest/v1/requests"
    headers = {
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "Content-Type": "application/json",
        "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "Prefer": "return=representation"
    }
    
    data = {
        "title": "طلب اختبار",
        "description": "وصف الطلب للاختبار",
        "author_id": "test_user_id",
        "status": "active",
        "is_public": True
    }
    
    response = requests.post(url, headers=headers, json=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
    
    assert response.status_code == 201, f"Expected 201 but got {response.status_code}"
    assert "id" in response.json()[0], "Response should contain 'id' field"
```

#### Common Issues & Solutions

**Issue 1: 404 Not Found**
- **Cause:** استخدام URL خاطئ (مثل base URL بدلاً من `/rest/v1/{table}`)
- **Solution:** استخدم `/rest/v1/{table_name}` بعد base URL

**Issue 2: 401 Unauthorized**
- **Cause:** مفقود Authorization header أو token غير صحيح
- **Solution:** أضف `Authorization: Bearer {anon_key}` و `apikey: {anon_key}` headers

**Issue 3: 400 Bad Request**
- **Cause:** بيانات غير صحيحة أو حقول مطلوبة مفقودة
- **Solution:** تحقق من required fields في `testsprite-api-config.json`

### Frontend UI Tests

#### Example: Test Login Flow

```python
from playwright.async_api import async_playwright

async def test_login_flow():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()
        
        # Navigate to app
        await page.goto("http://localhost:3005")
        await page.wait_for_load_state("networkidle")
        
        # Enter phone number
        await page.fill('[data-testid="phone-input"]', "0501234567")
        await page.click('[data-testid="send-otp-button"]')
        
        # Wait for OTP page
        await page.wait_for_selector('[data-testid="otp-input-0"]')
        
        # Enter OTP (in test environment, you might need to mock this)
        for i, digit in enumerate("1234"):
            await page.fill(f'[data-testid="otp-input-{i}"]', digit)
        
        # Wait for navigation to dashboard
        await page.wait_for_selector('[data-testid="nav-tab-marketplace"]', timeout=5000)
        
        await browser.close()
```

#### Example: Test Navigation

```python
async def test_navigation():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()
        
        await page.goto("http://localhost:3005")
        await page.wait_for_load_state("networkidle")
        
        # Test each navigation tab
        tabs = ["marketplace", "my-requests", "my-offers", "create", "profile"]
        
        for tab in tabs:
            await page.click(f'[data-testid="nav-tab-{tab}"]')
            await page.wait_for_timeout(500)  # Wait for animation
        
        await browser.close()
```

---

## 📝 Important Notes

### Backend Tests
1. **Supabase RLS:** بعض الجداول محمية بـ Row Level Security، قد تحتاج service_role key للاختبارات
2. **Test Data:** استخدم test users و test data منفصلة
3. **Cleanup:** نظف البيانات بعد كل اختبار

### Frontend Tests
1. **Local Server:** تأكد أن التطبيق يعمل على `http://localhost:3005`
2. **Timing:** بعض الصفحات تحتاج وقت للتحميل (خاصة CreateRequest)
3. **Animations:** أضف `wait_for_timeout` للانتظارات القصيرة
4. **Test Data:** قد تحتاج mock data أو test database

---

## 🔍 Debugging Tips

### Backend
- تحقق من headers (Authorization, apikey, Content-Type)
- تحقق من URL (يجب أن يكون `/rest/v1/{table}`)
- تحقق من response body للأخطاء
- استخدم Postman للاختبار اليدوي أولاً

### Frontend
- استخدم `page.screenshot()` لالتقاط screenshots عند الأخطاء
- استخدم `page.wait_for_selector()` بدلاً من `time.sleep()`
- تحقق من console errors: `page.on('console', lambda msg: print(msg.text))`
- استخدم `headless=False` للاختبارات المحلية

---

## 📚 Resources

- **API Config:** `testsprite_tests/testsprite-api-config.json`
- **Test Helpers:** `testsprite_tests/test-helpers.md`
- **Test Analysis:** `testsprite_tests/TEST_REPORT_ANALYSIS.md`
- **Supabase Docs:** https://supabase.com/docs/reference/javascript/introduction

---

**آخر تحديث:** 6 يناير 2026

