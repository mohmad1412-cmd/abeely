# 🧪 How to Run TestSprite Tests

## Prerequisites

1. ✅ **App is running** on `http://localhost:3005`
2. ✅ **Code summary generated** at `testsprite_tests/tmp/code_summary.json`
3. ✅ **Test IDs added** to components (AuthPage, BottomNavigation)

---

## Step-by-Step Guide

### Step 1: Start the Development Server

Make sure your app is running:

```bash
npm run dev
```

The app should be accessible at: `http://localhost:3005`

### Step 2: Run TestSprite Tests

You have two options:

#### Option A: Using TestSprite MCP Tools (Recommended)

The tests have been initialized. To execute them, run:

```bash
cd C:\dev\copy-of-copy-of-servicelink-ai-platform
node C:\Users\moham\AppData\Local\npm-cache\_npx\8ddf6bea01b2519d\node_modules\@testsprite\testsprite-mcp\dist\index.js generateCodeAndExecute
```

#### Option B: Using TestSprite Dashboard

1. Go to [TestSprite Dashboard](https://www.testsprite.com/dashboard)
2. Select your project: "ServiceLink AI Platform"
3. Upload the configuration files:
   - `testsprite_tests/testsprite-api-config.json` (for backend)
   - `testsprite_tests/tmp/code_summary.json` (for frontend)
4. Click "Run Tests"

---

## What Tests Will Run

### Frontend Tests (Using Test IDs)

1. **Authentication Flow**
   - Phone input and OTP verification
   - Guest mode login
   - Email login (if enabled)

2. **Navigation**
   - Bottom navigation tabs
   - Sidebar navigation (desktop)
   - Page transitions

3. **Marketplace**
   - Request browsing
   - Filtering
   - Search functionality

4. **Request Management**
   - Create request flow
   - View request details
   - Edit request

### Backend Tests (Using API Endpoints)

1. **API Endpoints**
   - POST /rest/v1/requests
   - GET /rest/v1/requests
   - POST /rest/v1/offers
   - GET /rest/v1/categories

---

## Test Results

After tests complete, you'll find:

1. **Test Report:** `testsprite_tests/testsprite-mcp-test-report.md`
2. **Raw Report:** `testsprite_tests/tmp/raw_report.md`
3. **Test Videos:** Links to test execution videos (if available)

---

## Troubleshooting

### Issue: Tests can't connect to localhost:3005

**Solution:**
- Make sure `npm run dev` is running
- Check that the app is accessible at `http://localhost:3005`
- Verify firewall isn't blocking the connection

### Issue: Test IDs not found

**Solution:**
- Verify test IDs are in the components (they should be after our fixes)
- Check `testsprite_tests/test-helpers.md` for all available test IDs
- Make sure components are rendered (not lazy-loaded)

### Issue: API tests failing with 404

**Solution:**
- Check `testsprite_tests/testsprite-api-config.json` for correct endpoints
- Verify Supabase URL and API key are correct
- Ensure endpoints use `/rest/v1/{table_name}` format

---

## Next Steps After Tests

1. **Review the test report** in `testsprite_tests/testsprite-mcp-test-report.md`
2. **Fix any failing tests** based on the report
3. **Re-run tests** to verify fixes
4. **Add more test IDs** if needed for better coverage

---

## Files Reference

- **API Config:** `testsprite_tests/testsprite-api-config.json`
- **Test Helpers:** `testsprite_tests/test-helpers.md`
- **Setup Guide:** `testsprite_tests/TESTSPRITE_SETUP_GUIDE.md`
- **Code Summary:** `testsprite_tests/tmp/code_summary.json`
- **Test Plan:** `testsprite_tests/testsprite_frontend_test_plan.json`

---

**Ready to test?** Make sure the app is running, then execute the test command above! 🚀

