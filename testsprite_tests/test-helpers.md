# 🧪 Test Helpers - ServiceLink AI Platform

هذا الملف يحتوي على helper functions و selectors للاستخدام في TestSprite tests.

## Test IDs

### Authentication (`components/AuthPage.tsx`)

```typescript
// Phone Input
'[data-testid="phone-input"]'  // حقل إدخال رقم الجوال

// Buttons
'[data-testid="send-otp-button"]'  // زر إرسال رمز التحقق
'[data-testid="guest-mode-button"]'  // زر تصفح كضيف
'[data-testid="verify-otp-button"]'  // زر تأكيد الدخول (في صفحة OTP)
'[data-testid="send-email-link-button"]'  // زر إرسال رابط الدخول (البريد)

// OTP Inputs
'[data-testid="otp-input-0"]'  // أول خانة OTP
'[data-testid="otp-input-1"]'  // ثاني خانة OTP
'[data-testid="otp-input-2"]'  // ثالث خانة OTP
'[data-testid="otp-input-3"]'  // رابع خانة OTP

// Email Input
'[data-testid="email-input"]'  // حقل إدخال البريد الإلكتروني
```

### Navigation (`components/BottomNavigation.tsx`)

```typescript
// Mobile Bottom Navigation
'[data-testid="nav-tab-marketplace"]'  // تبويب اكتشف
'[data-testid="nav-tab-my-requests"]'  // تبويب طلباتي
'[data-testid="nav-tab-create"]'  // تبويب أنشئ طلب
'[data-testid="nav-tab-my-offers"]'  // تبويب عروضي
'[data-testid="nav-tab-profile"]'  // تبويب أنت (الملف الشخصي)

// Desktop Sidebar Navigation
'[data-testid="nav-sidebar-marketplace"]'  // اكتشف
'[data-testid="nav-sidebar-my-requests"]'  // طلباتي
'[data-testid="nav-sidebar-my-offers"]'  // عروضي
'[data-testid="nav-sidebar-create"]'  // أنشئ طلب
```

## Helper Functions (Python/Playwright)

### Authentication Helpers

```python
async def login_with_phone(page, phone_number):
    """تسجيل الدخول برقم الجوال"""
    await page.fill('[data-testid="phone-input"]', phone_number)
    await page.click('[data-testid="send-otp-button"]')
    # انتظار صفحة OTP
    await page.wait_for_selector('[data-testid="otp-input-0"]')
    
async def enter_otp(page, otp_code):
    """إدخال رمز OTP"""
    for i, digit in enumerate(str(otp_code)):
        await page.fill(f'[data-testid="otp-input-{i}"]', digit)
    await page.wait_for_timeout(500)  # انتظار auto-verify
    
async def login_as_guest(page):
    """الدخول كضيف"""
    await page.click('[data-testid="guest-mode-button"]')
    await page.wait_for_timeout(1000)
```

### Navigation Helpers

```python
async def navigate_to_marketplace(page):
    """الانتقال لصفحة اكتشف"""
    await page.click('[data-testid="nav-tab-marketplace"]')
    await page.wait_for_timeout(500)
    
async def navigate_to_my_requests(page):
    """الانتقال لصفحة طلباتي"""
    await page.click('[data-testid="nav-tab-my-requests"]')
    await page.wait_for_timeout(500)
    
async def navigate_to_create_request(page):
    """الانتقال لصفحة إنشاء طلب"""
    await page.click('[data-testid="nav-tab-create"]')
    await page.wait_for_timeout(1000)  # صفحة كبيرة تحتاج وقت أكثر
    
async def navigate_to_my_offers(page):
    """الانتقال لصفحة عروضي"""
    await page.click('[data-testid="nav-tab-my-offers"]')
    await page.wait_for_timeout(500)
    
async def navigate_to_profile(page):
    """الانتقال لصفحة الملف الشخصي"""
    await page.click('[data-testid="nav-tab-profile"]')
    await page.wait_for_timeout(500)
```

## Test Data

### Test Users

```python
TEST_USERS = {
    "phone": "0501234567",  # رقم جوال للاختبار
    "otp": "1234",  # رمز OTP (يجب تعديله حسب البيئة)
    "email": "test@example.com",
}
```

## Common Test Flows

### 1. Login Flow

```python
async def test_login_flow(page):
    """اختبار flow تسجيل الدخول الكامل"""
    # انتظار تحميل الصفحة
    await page.goto("http://localhost:3005")
    await page.wait_for_load_state("networkidle")
    
    # إدخال رقم الجوال
    await login_with_phone(page, TEST_USERS["phone"])
    
    # إدخال OTP (في بيئة الاختبار، قد تحتاج mock)
    await enter_otp(page, TEST_USERS["otp"])
    
    # انتظار الانتقال للصفحة الرئيسية
    await page.wait_for_selector('[data-testid="nav-tab-marketplace"]', timeout=5000)
```

### 2. Guest Mode Flow

```python
async def test_guest_mode(page):
    """اختبار دخول كضيف"""
    await page.goto("http://localhost:3005")
    await page.wait_for_load_state("networkidle")
    
    await login_as_guest(page)
    
    # التحقق من وجود navigation
    await page.wait_for_selector('[data-testid="nav-tab-marketplace"]')
```

### 3. Navigation Flow

```python
async def test_navigation(page):
    """اختبار التنقل بين الصفحات"""
    await page.goto("http://localhost:3005")
    await page.wait_for_load_state("networkidle")
    
    # اختبار كل تبويب
    await navigate_to_marketplace(page)
    await navigate_to_my_requests(page)
    await navigate_to_my_offers(page)
    await navigate_to_create_request(page)
    await navigate_to_profile(page)
```

## Waiting Strategies

```python
# انتظار تحميل الصفحة
await page.wait_for_load_state("networkidle")

# انتظار selector معين
await page.wait_for_selector('[data-testid="..."]', timeout=5000)

# انتظار اختفاء loading
await page.wait_for_selector('.loading', state='hidden', timeout=5000)

# انتظار timeout بسيط (لـ animations)
await page.wait_for_timeout(500)
```

## Notes

- جميع test IDs تستخدم `data-testid` attribute
- في بعض الحالات، قد تحتاج استخدام text selectors كـ fallback
- OTP inputs قد تقوم auto-verify عند إكمال 4 أرقام
- بعض الصفحات تحتاج وقت تحميل (خاصة CreateRequest)
- Navigation animations تحتاج وقت قصير للانتقال

