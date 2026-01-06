# 🧪 TestSprite Test Execution Guide

## Prerequisites

1. ✅ Project running on `http://localhost:3005`
2. ✅ TestSprite MCP configured in Cursor
3. ✅ Test data ready (optional)

## Test Execution Steps

### Option 1: Using TestSprite MCP (Automated)

If TestSprite MCP is working in Cursor:

1. Open Cursor Command Palette (`Ctrl + Shift + P`)
2. Search for "TestSprite" or "MCP"
3. Use TestSprite tools to:
   - Generate tests automatically
   - Execute tests
   - Generate report

### Option 2: Manual Testing (Based on Test Plan)

Follow the test plan in `FRONTEND_TEST_PLAN.md`:

1. **Authentication Tests:**
   - Test login with email/password
   - Test Google OAuth login
   - Test error handling

2. **Marketplace Tests:**
   - Test request listing
   - Test filtering
   - Test view modes

3. **Request Management Tests:**
   - Test creating requests
   - Test editing requests
   - Test archiving requests

4. **And more...** (See `FRONTEND_TEST_PLAN.md` for complete list)

## Test Data

Default test credentials (from config.json):
- User: `0555555555`
- Password: `0000`

## Expected Results

After test execution, you should have:
- ✅ Test results report
- ✅ List of bugs/issues found
- ✅ Recommendations for improvements

