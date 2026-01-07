
# TestSprite AI Testing Report(MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** copy-of-copy-of-servicelink-ai-platform
- **Date:** 2026-01-06
- **Prepared by:** TestSprite AI Team

---

## 2️⃣ Requirement Validation Summary

#### Test TC001
- **Test Name:** Authentication with Email Login Success
- **Test Code:** [TC001_Authentication_with_Email_Login_Success.py](./TC001_Authentication_with_Email_Login_Success.py)
- **Test Error:** The login page only supports phone number login and does not provide an email/password login form. Therefore, the task to verify login with email and password cannot be completed as the UI does not support it.
Browser Console Logs:
[WARNING] Google Maps JavaScript API has been loaded directly without loading=async. This can result in suboptimal performance. For best-practice loading patterns please see https://goo.gle/js-api-loading (at https://maps.googleapis.com/maps/api/js?key=AIzaSyBFP8kmj-ojjfKJX6tKIGoJwvM_hHrsQBU&libraries=places&language=ar:1374:287)
[WARNING] [WARN] ⚠️ WebSocket connection closed (at http://localhost:3005/utils/logger.ts:36:14)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://fonts.gstatic.com/s/ibmplexsansarabic/v14/Qw3NZRtWPQCuHme67tEYUIx3Kh0PHR9N6YOG-eCRXMR5Kw.woff2:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://fonts.gstatic.com/s/ibmplexsansarabic/v14/Qw3NZRtWPQCuHme67tEYUIx3Kh0PHR9N6YPO_-CRXMR5Kw.woff2:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://fonts.gstatic.com/s/ibmplexsansarabic/v14/Qw3CZRtWPQCuHme67tEYUIx3Kh0PHR9N6Ys43PWrfQ.woff2:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/functions/v1/ai-chat:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/functions/v1/ai-chat:0:0)
[ERROR] WebSocket connection to 'wss://iwfvlrtmbixequntufjr.supabase.co/realtime/v1/websocket?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3ZnZscnRtYml4ZXF1bnR1ZmpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MzMxMjcsImV4cCI6MjA4MjAwOTEyN30.NCgLu7sP87odD-W3JW8Gp_6BTcI3w4VFgBhskZ5D0RA&eventsPerSecond=10&vsn=1.0.0' failed: Error in connection establishment: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=2fb96622:1509:0)
[WARNING] [WARN] ⚠️ WebSocket channel error - categories updates may not work (at http://localhost:3005/utils/logger.ts:36:14)
[WARNING] [WARN] ⚠️ WebSocket channel error - categories updates may not work (at http://localhost:3005/utils/logger.ts:36:14)
[WARNING] [WARN] ⚠️ WebSocket connection closed (at http://localhost:3005/utils/logger.ts:36:14)
[WARNING] [WARN] ⚠️ WebSocket connection closed (at http://localhost:3005/utils/logger.ts:36:14)
[WARNING] [WARN] Supabase connection failed: Connection timeout (15s) (at http://localhost:3005/utils/logger.ts:36:14)
[WARNING] [WARN] ⚠️ فشل النموذج claude-sonnet-4-20250514: AI connection timeout (5s) (at http://localhost:3005/utils/logger.ts:36:14)
[WARNING] [WARN] Supabase connection failed: Connection timeout (15s) (at http://localhost:3005/utils/logger.ts:36:14)
[WARNING] [WARN] ⚠️ فشل النموذج claude-sonnet-4-20250514: AI connection timeout (5s) (at http://localhost:3005/utils/logger.ts:36:14)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://api.anthropic.com/v1/messages:0:0)
[WARNING] [WARN] ⚠️ WebSocket connection timed out - categories updates may not work (at http://localhost:3005/utils/logger.ts:36:14)
[ERROR] WebSocket connection to 'wss://iwfvlrtmbixequntufjr.supabase.co/realtime/v1/websocket?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3ZnZscnRtYml4ZXF1bnR1ZmpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MzMxMjcsImV4cCI6MjA4MjAwOTEyN30.NCgLu7sP87odD-W3JW8Gp_6BTcI3w4VFgBhskZ5D0RA&eventsPerSecond=10&vsn=1.0.0' failed: Error in connection establishment: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=2fb96622:1509:0)
[WARNING] [WARN] ⚠️ WebSocket channel error - categories updates may not work (at http://localhost:3005/utils/logger.ts:36:14)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/86ff689b-098a-4816-8a57-8cee2ddff3c0/568a9615-57a1-4300-a3fc-f92d19828c2a
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC002
- **Test Name:** Authentication with Email Login Failure
- **Test Code:** [TC002_Authentication_with_Email_Login_Failure.py](./TC002_Authentication_with_Email_Login_Failure.py)
- **Test Error:** Login page is empty and does not contain login form elements. Cannot verify login failure with invalid credentials. Reporting issue and stopping.
Browser Console Logs:
[WARNING] Google Maps JavaScript API has been loaded directly without loading=async. This can result in suboptimal performance. For best-practice loading patterns please see https://goo.gle/js-api-loading (at https://maps.googleapis.com/maps/api/js?key=AIzaSyBFP8kmj-ojjfKJX6tKIGoJwvM_hHrsQBU&libraries=places&language=ar:1374:287)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/components/CreateRequestV2.tsx?t=1767715308051:0:0)
[WARNING] Google Maps JavaScript API has been loaded directly without loading=async. This can result in suboptimal performance. For best-practice loading patterns please see https://goo.gle/js-api-loading (at https://maps.googleapis.com/maps/api/js?key=AIzaSyBFP8kmj-ojjfKJX6tKIGoJwvM_hHrsQBU&libraries=places&language=ar:1374:287)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/@vite/client:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/@react-refresh:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/App.tsx?t=1767715331235:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/components/ErrorBoundary.tsx:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/86ff689b-098a-4816-8a57-8cee2ddff3c0/a1a58988-5752-4e00-bb9d-749a250b796e
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC003
- **Test Name:** Authentication with Phone OTP Success
- **Test Code:** [TC003_Authentication_with_Phone_OTP_Success.py](./TC003_Authentication_with_Phone_OTP_Success.py)
- **Test Error:** The user cannot successfully log in using phone number OTP authentication because the login page is missing all necessary interactive elements. The page is empty and does not allow entering phone number or OTP. The issue should be reported to the development team for resolution.
Browser Console Logs:
[WARNING] Google Maps JavaScript API has been loaded directly without loading=async. This can result in suboptimal performance. For best-practice loading patterns please see https://goo.gle/js-api-loading (at https://maps.googleapis.com/maps/api/js?key=AIzaSyBFP8kmj-ojjfKJX6tKIGoJwvM_hHrsQBU&libraries=places&language=ar:1374:287)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/node_modules/.vite/deps/react-dom_client.js?v=2fb96622:0:0)
[WARNING] Google Maps JavaScript API has been loaded directly without loading=async. This can result in suboptimal performance. For best-practice loading patterns please see https://goo.gle/js-api-loading (at https://maps.googleapis.com/maps/api/js?key=AIzaSyBFP8kmj-ojjfKJX6tKIGoJwvM_hHrsQBU&libraries=places&language=ar:1374:287)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/index.tsx?t=1767715331235:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/@react-refresh:0:0)
[WARNING] Google Maps JavaScript API has been loaded directly without loading=async. This can result in suboptimal performance. For best-practice loading patterns please see https://goo.gle/js-api-loading (at https://maps.googleapis.com/maps/api/js?key=AIzaSyBFP8kmj-ojjfKJX6tKIGoJwvM_hHrsQBU&libraries=places&language=ar:1374:287)
[ERROR] WebSocket connection to 'ws://localhost:3005/?token=wav4qoU8GoXY' failed: Error in connection establishment: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/@vite/client:801:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/node_modules/.vite/deps/chunk-DC5AMYBS.js?v=2fb96622:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/components/ErrorBoundary.tsx:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/node_modules/.vite/deps/chunk-RLJ2RCJQ.js?v=2fb96622:0:0)
[WARNING] Google Maps JavaScript API has been loaded directly without loading=async. This can result in suboptimal performance. For best-practice loading patterns please see https://goo.gle/js-api-loading (at https://maps.googleapis.com/maps/api/js?key=AIzaSyBFP8kmj-ojjfKJX6tKIGoJwvM_hHrsQBU&libraries=places&language=ar:1374:287)
[WARNING] Google Maps JavaScript API has been loaded directly without loading=async. This can result in suboptimal performance. For best-practice loading patterns please see https://goo.gle/js-api-loading (at https://maps.googleapis.com/maps/api/js?key=AIzaSyBFP8kmj-ojjfKJX6tKIGoJwvM_hHrsQBU&libraries=places&language=ar:1374:287)
[WARNING] Google Maps JavaScript API has been loaded directly without loading=async. This can result in suboptimal performance. For best-practice loading patterns please see https://goo.gle/js-api-loading (at https://maps.googleapis.com/maps/api/js?key=AIzaSyBFP8kmj-ojjfKJX6tKIGoJwvM_hHrsQBU&libraries=places&language=ar:1374:287)
[WARNING] Google Maps JavaScript API has been loaded directly without loading=async. This can result in suboptimal performance. For best-practice loading patterns please see https://goo.gle/js-api-loading (at https://maps.googleapis.com/maps/api/js?key=AIzaSyBFP8kmj-ojjfKJX6tKIGoJwvM_hHrsQBU&libraries=places&language=ar:1374:287)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/86ff689b-098a-4816-8a57-8cee2ddff3c0/8ade9c93-e3ef-4bdd-8137-08ddedf157a5
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC004
- **Test Name:** Authentication with Google OAuth Success
- **Test Code:** [TC004_Authentication_with_Google_OAuth_Success.py](./TC004_Authentication_with_Google_OAuth_Success.py)
- **Test Error:** The main page at http://localhost:3005/ is empty with no interactive elements visible. Unable to find login link or button to proceed with Google OAuth login test. Reporting this issue and stopping the task.
Browser Console Logs:
[WARNING] Google Maps JavaScript API has been loaded directly without loading=async. This can result in suboptimal performance. For best-practice loading patterns please see https://goo.gle/js-api-loading (at https://maps.googleapis.com/maps/api/js?key=AIzaSyBFP8kmj-ojjfKJX6tKIGoJwvM_hHrsQBU&libraries=places&language=ar:1374:287)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/components/BottomNavigation.tsx?t=1767715308038:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/components/Marketplace.tsx?t=1767714524387:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/86ff689b-098a-4816-8a57-8cee2ddff3c0/82d32975-b591-427a-8499-0c4d557db279
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC005
- **Test Name:** Guest Mode Access
- **Test Code:** [TC005_Guest_Mode_Access.py](./TC005_Guest_Mode_Access.py)
- **Test Error:** 
Browser Console Logs:
[ERROR] Failed to load resource: net::ERR_CONNECTION_CLOSED (at https://accounts.google.com/gsi/client:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/components/MyRequests.tsx:0:0)
[ERROR] WebSocket connection to 'ws://localhost:3005/?token=wav4qoU8GoXY' failed: Error in connection establishment: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/@vite/client:801:0)
[ERROR] Failed to load resource: net::ERR_CONNECTION_CLOSED (at https://maps.googleapis.com/maps/api/js?key=AIzaSyBFP8kmj-ojjfKJX6tKIGoJwvM_hHrsQBU&libraries=places&language=ar:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/86ff689b-098a-4816-8a57-8cee2ddff3c0/6f500fb1-afa2-4e5f-811a-aa80e55b754a
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC006
- **Test Name:** Create New Request Using AI Assistant
- **Test Code:** [TC006_Create_New_Request_Using_AI_Assistant.py](./TC006_Create_New_Request_Using_AI_Assistant.py)
- **Test Error:** Login process is blocked due to verification code submission failure. Cannot proceed to create request page or test AI assistant request creation. Task stopped.
Browser Console Logs:
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/App.tsx?t=1767715331235:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/styles/globals.css?t=1767715331235:0:0)
[ERROR] Failed to load resource: net::ERR_CONNECTION_CLOSED (at https://maps.googleapis.com/maps/api/js?key=AIzaSyBFP8kmj-ojjfKJX6tKIGoJwvM_hHrsQBU&libraries=places&language=ar:0:0)
[ERROR] WebSocket connection to 'ws://localhost:3005/?token=wav4qoU8GoXY' failed: Error in connection establishment: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/@vite/client:801:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/node_modules/.vite/deps/chunk-DC5AMYBS.js?v=2fb96622:0:0)
[WARNING] Google Maps JavaScript API has been loaded directly without loading=async. This can result in suboptimal performance. For best-practice loading patterns please see https://goo.gle/js-api-loading (at https://maps.googleapis.com/maps/api/js?key=AIzaSyBFP8kmj-ojjfKJX6tKIGoJwvM_hHrsQBU&libraries=places&language=ar:1374:287)
[WARNING] [WARN] Supabase connection failed: Connection timeout (15s) (at http://localhost:3005/utils/logger.ts:36:14)
[WARNING] [WARN] ⚠️ فشل النموذج claude-sonnet-4-20250514: AI connection timeout (5s) (at http://localhost:3005/utils/logger.ts:36:14)
[WARNING] [WARN] Supabase connection failed: Connection timeout (15s) (at http://localhost:3005/utils/logger.ts:36:14)
[WARNING] [WARN] ⚠️ فشل النموذج claude-sonnet-4-20250514: AI connection timeout (5s) (at http://localhost:3005/utils/logger.ts:36:14)
[WARNING] Google Maps JavaScript API has been loaded directly without loading=async. This can result in suboptimal performance. For best-practice loading patterns please see https://goo.gle/js-api-loading (at https://maps.googleapis.com/maps/api/js?key=AIzaSyBFP8kmj-ojjfKJX6tKIGoJwvM_hHrsQBU&libraries=places&language=ar:1374:287)
[WARNING] Google Maps JavaScript API has been loaded directly without loading=async. This can result in suboptimal performance. For best-practice loading patterns please see https://goo.gle/js-api-loading (at https://maps.googleapis.com/maps/api/js?key=AIzaSyBFP8kmj-ojjfKJX6tKIGoJwvM_hHrsQBU&libraries=places&language=ar:1374:287)
[WARNING] Google Maps JavaScript API has been loaded directly without loading=async. This can result in suboptimal performance. For best-practice loading patterns please see https://goo.gle/js-api-loading (at https://maps.googleapis.com/maps/api/js?key=AIzaSyBFP8kmj-ojjfKJX6tKIGoJwvM_hHrsQBU&libraries=places&language=ar:1374:287)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/86ff689b-098a-4816-8a57-8cee2ddff3c0/5218ae9d-1838-4cca-9696-9accbcbcb269
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC007
- **Test Name:** Create New Request Using Manual Form
- **Test Code:** [TC007_Create_New_Request_Using_Manual_Form.py](./TC007_Create_New_Request_Using_Manual_Form.py)
- **Test Error:** The homepage at http://localhost:3005/ is completely empty with no interactive elements visible, preventing login and navigation. Therefore, it is not possible to verify that users can create a new request using the manual input form without AI assistance. The issue has been reported. Task is marked as done due to this blocking issue.
Browser Console Logs:
[ERROR] Failed to load resource: net::ERR_CONNECTION_CLOSED (at https://maps.googleapis.com/maps/api/js?key=AIzaSyBFP8kmj-ojjfKJX6tKIGoJwvM_hHrsQBU&libraries=places&language=ar:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/node_modules/.vite/deps/lucide-react.js?v=2fb96622:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/components/RequestDetail.tsx?t=1767715308039:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/components/Marketplace.tsx?t=1767714524387:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/86ff689b-098a-4816-8a57-8cee2ddff3c0/caf7c1e0-5025-4af4-8148-9bf14fb982d9
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC008
- **Test Name:** Edit Existing Request
- **Test Code:** [TC008_Edit_Existing_Request.py](./TC008_Edit_Existing_Request.py)
- **Test Error:** The application at http://localhost:3005/ is not loading, resulting in a chrome error page. No interactive elements are available to perform the login or navigate to the requests page. Please ensure the local server is running and accessible. The task to verify editing an existing request cannot proceed until the app is accessible.
Browser Console Logs:
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/components/AuthPage.tsx:0:0)
[WARNING] Google Maps JavaScript API has been loaded directly without loading=async. This can result in suboptimal performance. For best-practice loading patterns please see https://goo.gle/js-api-loading (at https://maps.googleapis.com/maps/api/js?key=AIzaSyBFP8kmj-ojjfKJX6tKIGoJwvM_hHrsQBU&libraries=places&language=ar:1374:287)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/86ff689b-098a-4816-8a57-8cee2ddff3c0/c23e556d-bfd0-41cc-a4e5-035543fba59f
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC009
- **Test Name:** Archive and Unarchive Request
- **Test Code:** [TC009_Archive_and_Unarchive_Request.py](./TC009_Archive_and_Unarchive_Request.py)
- **Test Error:** The test to verify archiving a request hides it from active views and unarchiving restores it correctly could not be fully completed because there were no active requests available to archive or archived requests to unarchive. The user was able to log in as guest, navigate to the requests page, and confirm the absence of active requests. Without existing requests, the archiving and unarchiving functionality could not be tested. Please ensure there are requests in the system to perform this test fully.
Browser Console Logs:
[ERROR] WebSocket connection to 'ws://localhost:3005/?token=wav4qoU8GoXY' failed: Error in connection establishment: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/@vite/client:801:0)
[WARNING] Google Maps JavaScript API has been loaded directly without loading=async. This can result in suboptimal performance. For best-practice loading patterns please see https://goo.gle/js-api-loading (at https://maps.googleapis.com/maps/api/js?key=AIzaSyBFP8kmj-ojjfKJX6tKIGoJwvM_hHrsQBU&libraries=places&language=ar:1374:287)
[ERROR] WebSocket connection to 'ws://localhost:3005/?token=wav4qoU8GoXY' failed: Error in connection establishment: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/@vite/client:814:0)
[ERROR] [vite] failed to connect to websocket.
your current setup:
  (browser) localhost:3005/ <--[HTTP]--> localhost:3005/ (server)
  (browser) localhost:3005/ <--[WebSocket (failing)]--> localhost:3005/ (server)
Check out your Vite / network configuration and https://vite.dev/config/server-options.html#server-hmr . (at http://localhost:3005/@vite/client:829:24)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/components/MyOffers.tsx:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/components/OnboardingScreen.tsx:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/services/preferencesService.ts:0:0)
[WARNING] Google Maps JavaScript API has been loaded directly without loading=async. This can result in suboptimal performance. For best-practice loading patterns please see https://goo.gle/js-api-loading (at https://maps.googleapis.com/maps/api/js?key=AIzaSyBFP8kmj-ojjfKJX6tKIGoJwvM_hHrsQBU&libraries=places&language=ar:1374:287)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/index.tsx?t=1767715331235:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/@react-refresh:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://maps.googleapis.com/maps/api/mapsjs/gen_204?csp_test=true:0:0)
[ERROR] WebSocket connection to 'ws://localhost:3005/?token=wav4qoU8GoXY' failed: Error in connection establishment: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/@vite/client:801:0)
[WARNING] Google Maps JavaScript API has been loaded directly without loading=async. This can result in suboptimal performance. For best-practice loading patterns please see https://goo.gle/js-api-loading (at https://maps.googleapis.com/maps/api/js?key=AIzaSyBFP8kmj-ojjfKJX6tKIGoJwvM_hHrsQBU&libraries=places&language=ar:1374:287)
[WARNING] Google Maps JavaScript API has been loaded directly without loading=async. This can result in suboptimal performance. For best-practice loading patterns please see https://goo.gle/js-api-loading (at https://maps.googleapis.com/maps/api/js?key=AIzaSyBFP8kmj-ojjfKJX6tKIGoJwvM_hHrsQBU&libraries=places&language=ar:1374:287)
[WARNING] [WARN] Supabase connection failed: Connection timeout (15s) (at http://localhost:3005/utils/logger.ts:36:14)
[WARNING] [WARN] Supabase connection failed: Connection timeout (15s) (at http://localhost:3005/utils/logger.ts:36:14)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/rest/v1/requests?select=*%2Crequest_categories%28category_id%2Ccategories%28id%2Clabel%29%29&is_public=eq.true&status=eq.active&order=created_at.desc&offset=0&limit=10:0:0)
[ERROR] [ERROR] ❌ Error fetching requests: {message: TypeError: Failed to fetch, details: TypeError: Failed to fetch
    at fetch (http://lo…://localhost:3005/App.tsx?t=1767715331235:809:56), hint: , code: } (at http://localhost:3005/utils/logger.ts:26:14)
[ERROR] [ERROR] Error details: {
  "message": "TypeError: Failed to fetch",
  "code": "",
  "details": "TypeError: Failed to fetch\n    at fetch (http://localhost:3005/services/supabaseClient.ts:52:18)\n    at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=2fb96622:11440:40\n    at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=2fb96622:11455:12\n    at async fetchRequestsPaginated (http://localhost:3005/services/requestsService.ts:287:17)\n    at async loadPublicData (http://localhost:3005/App.tsx?t=1767715331235:809:56)",
  "hint": ""
} (at http://localhost:3005/utils/logger.ts:26:14)
[ERROR] Error loading public data: {message: TypeError: Failed to fetch, details: TypeError: Failed to fetch
    at fetch (http://lo…://localhost:3005/App.tsx?t=1767715331235:809:56), hint: , code: } (at http://localhost:3005/App.tsx?t=1767715331235:817:16)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/86ff689b-098a-4816-8a57-8cee2ddff3c0/b66b2aa3-38bf-4088-92fe-0d400f43e60e
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC010
- **Test Name:** Hide and Bump Request
- **Test Code:** [TC010_Hide_and_Bump_Request.py](./TC010_Hide_and_Bump_Request.py)
- **Test Error:** 
Browser Console Logs:
[WARNING] Google Maps JavaScript API has been loaded directly without loading=async. This can result in suboptimal performance. For best-practice loading patterns please see https://goo.gle/js-api-loading (at https://maps.googleapis.com/maps/api/js?key=AIzaSyBFP8kmj-ojjfKJX6tKIGoJwvM_hHrsQBU&libraries=places&language=ar:1374:287)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/services/notificationsService.ts:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/node_modules/.vite/deps/react-icons_fa.js?v=2fb96622:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/86ff689b-098a-4816-8a57-8cee2ddff3c0/5c67f4aa-3b1d-46ef-a227-9c963d7ee877
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC011
- **Test Name:** Browse Requests with Filters
- **Test Code:** [TC011_Browse_Requests_with_Filters.py](./TC011_Browse_Requests_with_Filters.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/86ff689b-098a-4816-8a57-8cee2ddff3c0/cdcf08e0-aee3-43d7-b200-287d1039711c
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC012
- **Test Name:** Switch Marketplace View Modes
- **Test Code:** [TC012_Switch_Marketplace_View_Modes.py](./TC012_Switch_Marketplace_View_Modes.py)
- **Test Error:** 
Browser Console Logs:
[ERROR] Failed to load resource: net::ERR_CONNECTION_CLOSED (at https://maps.googleapis.com/maps/api/js?key=AIzaSyBFP8kmj-ojjfKJX6tKIGoJwvM_hHrsQBU&libraries=places&language=ar:0:0)
[WARNING] [WARN] ⚠️ WebSocket connection closed (at http://localhost:3005/utils/logger.ts:36:14)
[WARNING] [WARN] ⚠️ فشل النموذج claude-sonnet-4-20250514: AI connection timeout (5s) (at http://localhost:3005/utils/logger.ts:36:14)
[WARNING] [WARN] Supabase connection failed: Connection timeout (15s) (at http://localhost:3005/utils/logger.ts:36:14)
[WARNING] [WARN] ⚠️ فشل النموذج claude-sonnet-4-20250514: AI connection timeout (5s) (at http://localhost:3005/utils/logger.ts:36:14)
[WARNING] [WARN] ⚠️ WebSocket connection timed out - categories updates may not work (at http://localhost:3005/utils/logger.ts:36:14)
[WARNING] [WARN] ⚠️ WebSocket connection closed (at http://localhost:3005/utils/logger.ts:36:14)
[ERROR] WebSocket connection to 'wss://iwfvlrtmbixequntufjr.supabase.co/realtime/v1/websocket?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3ZnZscnRtYml4ZXF1bnR1ZmpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MzMxMjcsImV4cCI6MjA4MjAwOTEyN30.NCgLu7sP87odD-W3JW8Gp_6BTcI3w4VFgBhskZ5D0RA&eventsPerSecond=10&vsn=1.0.0' failed: Error in connection establishment: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=2fb96622:1509:0)
[WARNING] [WARN] ⚠️ WebSocket channel error - categories updates may not work (at http://localhost:3005/utils/logger.ts:36:14)
[WARNING] [WARN] ⚠️ WebSocket channel error - categories updates may not work (at http://localhost:3005/utils/logger.ts:36:14)
[WARNING] [WARN] ⚠️ WebSocket connection closed (at http://localhost:3005/utils/logger.ts:36:14)
[ERROR] WebSocket connection to 'ws://localhost:3005/' failed: Error in connection establishment: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/@vite/client:1034:0)
[WARNING] [WARN] ⚠️ WebSocket connection closed (at http://localhost:3005/utils/logger.ts:36:14)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/86ff689b-098a-4816-8a57-8cee2ddff3c0/70c61b64-a534-45b2-a405-c5bd1838c0aa
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC013
- **Test Name:** Submit Offer on a Request using AI Assistant
- **Test Code:** [TC013_Submit_Offer_on_a_Request_using_AI_Assistant.py](./TC013_Submit_Offer_on_a_Request_using_AI_Assistant.py)
- **Test Error:** The app homepage is empty and no interactive elements are available to proceed with the test steps. The task to verify providers can create and submit offers using AI assistance cannot be completed due to this issue.
Browser Console Logs:
[ERROR] Failed to load resource: net::ERR_CONNECTION_CLOSED (at https://maps.googleapis.com/maps/api/js?key=AIzaSyBFP8kmj-ojjfKJX6tKIGoJwvM_hHrsQBU&libraries=places&language=ar:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/components/Messages.tsx?t=1767712771359:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/services/categoriesService.ts:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/index.tsx?t=1767715331235:0:0)
[WARNING] Google Maps JavaScript API has been loaded directly without loading=async. This can result in suboptimal performance. For best-practice loading patterns please see https://goo.gle/js-api-loading (at https://maps.googleapis.com/maps/api/js?key=AIzaSyBFP8kmj-ojjfKJX6tKIGoJwvM_hHrsQBU&libraries=places&language=ar:1374:287)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/86ff689b-098a-4816-8a57-8cee2ddff3c0/0ad9b2f8-f697-445a-b5c7-1ae16fec4363
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC014
- **Test Name:** Submit Manual Offer on a Request
- **Test Code:** [TC014_Submit_Manual_Offer_on_a_Request.py](./TC014_Submit_Manual_Offer_on_a_Request.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/86ff689b-098a-4816-8a57-8cee2ddff3c0/58f067fd-f7f1-427a-a813-ef430f835bad
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC015
- **Test Name:** Edit and Archive Offers
- **Test Code:** [TC015_Edit_and_Archive_Offers.py](./TC015_Edit_and_Archive_Offers.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/86ff689b-098a-4816-8a57-8cee2ddff3c0/ff5450ba-6325-4622-8cb3-8d5e1c38cc03
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC016
- **Test Name:** Initiate and Conduct Negotiation
- **Test Code:** [TC016_Initiate_and_Conduct_Negotiation.py](./TC016_Initiate_and_Conduct_Negotiation.py)
- **Test Error:** 
Browser Console Logs:
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/App.tsx?t=1767715331235:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/styles/globals.css?t=1767715331235:0:0)
[ERROR] WebSocket connection to 'ws://localhost:3005/?token=wav4qoU8GoXY' failed: Error in connection establishment: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/@vite/client:801:0)
[ERROR] WebSocket connection to 'ws://localhost:3005/?token=wav4qoU8GoXY' failed: Error in connection establishment: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/@vite/client:814:0)
[ERROR] [vite] failed to connect to websocket.
your current setup:
  (browser) localhost:3005/ <--[HTTP]--> localhost:3005/ (server)
  (browser) localhost:3005/ <--[WebSocket (failing)]--> localhost:3005/ (server)
Check out your Vite / network configuration and https://vite.dev/config/server-options.html#server-hmr . (at http://localhost:3005/@vite/client:829:24)
[ERROR] Failed to load resource: net::ERR_CONNECTION_CLOSED (at https://maps.googleapis.com/maps/api/js?key=AIzaSyBFP8kmj-ojjfKJX6tKIGoJwvM_hHrsQBU&libraries=places&language=ar:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/86ff689b-098a-4816-8a57-8cee2ddff3c0/94fb0245-b70e-4608-9ed9-8200415cb659
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC017
- **Test Name:** Real-time Messaging Functionality
- **Test Code:** [TC017_Real_time_Messaging_Functionality.py](./TC017_Real_time_Messaging_Functionality.py)
- **Test Error:** The task to verify instant messages between requesters and providers with real-time sending, receiving, and file exchange support could not be fully completed. The user successfully logged in as a requester and navigated the marketplace and order creation pages. However, no active orders were available to open a chat with a provider, and attempts to create or submit offers encountered navigation or page state issues. Therefore, real-time message sending, receiving, and file attachment verification in the chat could not be performed. Further testing requires active orders and stable navigation to the chat interface.
Browser Console Logs:
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/node_modules/.vite/deps/react-dom_client.js?v=2fb96622:0:0)
[ERROR] Failed to load resource: net::ERR_CONNECTION_CLOSED (at https://accounts.google.com/gsi/client:0:0)
[ERROR] WebSocket connection to 'ws://localhost:3005/?token=wav4qoU8GoXY' failed: Error in connection establishment: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/@vite/client:801:0)
[WARNING] Google Maps JavaScript API has been loaded directly without loading=async. This can result in suboptimal performance. For best-practice loading patterns please see https://goo.gle/js-api-loading (at https://maps.googleapis.com/maps/api/js?key=AIzaSyBFP8kmj-ojjfKJX6tKIGoJwvM_hHrsQBU&libraries=places&language=ar:1374:287)
[WARNING] Google Maps JavaScript API has been loaded directly without loading=async. This can result in suboptimal performance. For best-practice loading patterns please see https://goo.gle/js-api-loading (at https://maps.googleapis.com/maps/api/js?key=AIzaSyBFP8kmj-ojjfKJX6tKIGoJwvM_hHrsQBU&libraries=places&language=ar:1374:287)
[WARNING] [WARN] ⚠️ WebSocket connection closed (at http://localhost:3005/utils/logger.ts:36:14)
[WARNING] [WARN] ⚠️ فشل النموذج claude-sonnet-4-20250514: AI connection timeout (5s) (at http://localhost:3005/utils/logger.ts:36:14)
[WARNING] [WARN] ⚠️ فشل النموذج claude-sonnet-4-20250514: AI connection timeout (5s) (at http://localhost:3005/utils/logger.ts:36:14)
[WARNING] Google Maps JavaScript API has been loaded directly without loading=async. This can result in suboptimal performance. For best-practice loading patterns please see https://goo.gle/js-api-loading (at https://maps.googleapis.com/maps/api/js?key=AIzaSyBFP8kmj-ojjfKJX6tKIGoJwvM_hHrsQBU&libraries=places&language=ar:1374:287)
[WARNING] [WARN] ⚠️ WebSocket connection closed (at http://localhost:3005/utils/logger.ts:36:14)
[WARNING] [WARN] ⚠️ WebSocket connection closed (at http://localhost:3005/utils/logger.ts:36:14)
[WARNING] Google Maps JavaScript API has been loaded directly without loading=async. This can result in suboptimal performance. For best-practice loading patterns please see https://goo.gle/js-api-loading (at https://maps.googleapis.com/maps/api/js?key=AIzaSyBFP8kmj-ojjfKJX6tKIGoJwvM_hHrsQBU&libraries=places&language=ar:1374:287)
[WARNING] [WARN] ⚠️ WebSocket connection closed (at http://localhost:3005/utils/logger.ts:36:14)
[WARNING] [WARN] ⚠️ WebSocket connection closed (at http://localhost:3005/utils/logger.ts:36:14)
[WARNING] Google Maps JavaScript API has been loaded directly without loading=async. This can result in suboptimal performance. For best-practice loading patterns please see https://goo.gle/js-api-loading (at https://maps.googleapis.com/maps/api/js?key=AIzaSyBFP8kmj-ojjfKJX6tKIGoJwvM_hHrsQBU&libraries=places&language=ar:1374:287)
[WARNING] [WARN] ⚠️ WebSocket connection closed (at http://localhost:3005/utils/logger.ts:36:14)
[WARNING] [WARN] ⚠️ WebSocket connection timed out - categories updates may not work (at http://localhost:3005/utils/logger.ts:36:14)
[WARNING] [WARN] ⚠️ WebSocket connection closed (at http://localhost:3005/utils/logger.ts:36:14)
[ERROR] WebSocket connection to 'wss://iwfvlrtmbixequntufjr.supabase.co/realtime/v1/websocket?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3ZnZscnRtYml4ZXF1bnR1ZmpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MzMxMjcsImV4cCI6MjA4MjAwOTEyN30.NCgLu7sP87odD-W3JW8Gp_6BTcI3w4VFgBhskZ5D0RA&eventsPerSecond=10&vsn=1.0.0' failed: Error in connection establishment: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=2fb96622:1509:0)
[WARNING] [WARN] ⚠️ WebSocket channel error - categories updates may not work (at http://localhost:3005/utils/logger.ts:36:14)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/86ff689b-098a-4816-8a57-8cee2ddff3c0/3e5bdefe-5d7e-4cfe-bd69-a6d71700b584
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC018
- **Test Name:** In-App Notifications with Sound and Badge Count
- **Test Code:** [TC018_In_App_Notifications_with_Sound_and_Badge_Count.py](./TC018_In_App_Notifications_with_Sound_and_Badge_Count.py)
- **Test Error:** The login page is empty with no login form or buttons, preventing authentication and further testing of notifications. Please check the app server or deployment for issues.
Browser Console Logs:
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/styles/globals.css?t=1767715331235:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/node_modules/.vite/deps/react-dom_client.js?v=2fb96622:0:0)
[ERROR] WebSocket connection to 'ws://localhost:3005/?token=wav4qoU8GoXY' failed: Error in connection establishment: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/@vite/client:801:0)
[WARNING] Google Maps JavaScript API has been loaded directly without loading=async. This can result in suboptimal performance. For best-practice loading patterns please see https://goo.gle/js-api-loading (at https://maps.googleapis.com/maps/api/js?key=AIzaSyBFP8kmj-ojjfKJX6tKIGoJwvM_hHrsQBU&libraries=places&language=ar:1374:287)
[ERROR] WebSocket connection to 'ws://localhost:3005/?token=wav4qoU8GoXY' failed: Error in connection establishment: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/@vite/client:814:0)
[ERROR] [vite] failed to connect to websocket.
your current setup:
  (browser) localhost:3005/ <--[HTTP]--> localhost:3005/ (server)
  (browser) localhost:3005/ <--[WebSocket (failing)]--> localhost:3005/ (server)
Check out your Vite / network configuration and https://vite.dev/config/server-options.html#server-hmr . (at http://localhost:3005/@vite/client:829:24)
[WARNING] Google Maps JavaScript API has been loaded directly without loading=async. This can result in suboptimal performance. For best-practice loading patterns please see https://goo.gle/js-api-loading (at https://maps.googleapis.com/maps/api/js?key=AIzaSyBFP8kmj-ojjfKJX6tKIGoJwvM_hHrsQBU&libraries=places&language=ar:1374:287)
[ERROR] WebSocket connection to 'ws://localhost:3005/?token=wav4qoU8GoXY' failed: Error in connection establishment: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/@vite/client:801:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/components/ErrorBoundary.tsx:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/node_modules/.vite/deps/lucide-react.js?v=2fb96622:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/components/Marketplace.tsx?t=1767714524387:0:0)
[WARNING] Google Maps JavaScript API has been loaded directly without loading=async. This can result in suboptimal performance. For best-practice loading patterns please see https://goo.gle/js-api-loading (at https://maps.googleapis.com/maps/api/js?key=AIzaSyBFP8kmj-ojjfKJX6tKIGoJwvM_hHrsQBU&libraries=places&language=ar:1374:287)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/components/ui/LoadingSkeleton.tsx:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/86ff689b-098a-4816-8a57-8cee2ddff3c0/4cd1e1e8-863a-4b2a-bba4-802aeb787666
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC019
- **Test Name:** User Profile Settings Update
- **Test Code:** [TC019_User_Profile_Settings_Update.py](./TC019_User_Profile_Settings_Update.py)
- **Test Error:** Tested profile preferences update on the app. Successfully updated user interests as a guest. However, login was blocked due to verification code submission failure, preventing access to full profile settings. Theme toggle (dark/light) did not change the UI theme as expected. Language change (Arabic, English, Urdu) did not update UI text or layout direction. These issues prevent full verification of profile preferences update. Task is incomplete due to these critical issues.
Browser Console Logs:
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/styles/globals.css?t=1767715331235:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/node_modules/.vite/deps/react-dom_client.js?v=2fb96622:0:0)
[ERROR] WebSocket connection to 'ws://localhost:3005/?token=wav4qoU8GoXY' failed: Error in connection establishment: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/@vite/client:801:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/node_modules/.vite/deps/chunk-DC5AMYBS.js?v=2fb96622:0:0)
[WARNING] Google Maps JavaScript API has been loaded directly without loading=async. This can result in suboptimal performance. For best-practice loading patterns please see https://goo.gle/js-api-loading (at https://maps.googleapis.com/maps/api/js?key=AIzaSyBFP8kmj-ojjfKJX6tKIGoJwvM_hHrsQBU&libraries=places&language=ar:1374:287)
[WARNING] Google Maps JavaScript API has been loaded directly without loading=async. This can result in suboptimal performance. For best-practice loading patterns please see https://goo.gle/js-api-loading (at https://maps.googleapis.com/maps/api/js?key=AIzaSyBFP8kmj-ojjfKJX6tKIGoJwvM_hHrsQBU&libraries=places&language=ar:1374:287)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/index.tsx?t=1767715331235:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/@react-refresh:0:0)
[WARNING] Google Maps JavaScript API has been loaded directly without loading=async. This can result in suboptimal performance. For best-practice loading patterns please see https://goo.gle/js-api-loading (at https://maps.googleapis.com/maps/api/js?key=AIzaSyBFP8kmj-ojjfKJX6tKIGoJwvM_hHrsQBU&libraries=places&language=ar:1374:287)
[ERROR] WebSocket connection to 'ws://localhost:3005/?token=wav4qoU8GoXY' failed: Error in connection establishment: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/@vite/client:801:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/components/ErrorBoundary.tsx:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/node_modules/.vite/deps/chunk-DC5AMYBS.js?v=2fb96622:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/node_modules/.vite/deps/lucide-react.js?v=2fb96622:0:0)
[WARNING] Google Maps JavaScript API has been loaded directly without loading=async. This can result in suboptimal performance. For best-practice loading patterns please see https://goo.gle/js-api-loading (at https://maps.googleapis.com/maps/api/js?key=AIzaSyBFP8kmj-ojjfKJX6tKIGoJwvM_hHrsQBU&libraries=places&language=ar:1374:287)
[WARNING] Google Maps JavaScript API has been loaded directly without loading=async. This can result in suboptimal performance. For best-practice loading patterns please see https://goo.gle/js-api-loading (at https://maps.googleapis.com/maps/api/js?key=AIzaSyBFP8kmj-ojjfKJX6tKIGoJwvM_hHrsQBU&libraries=places&language=ar:1374:287)
[WARNING] [WARN] Supabase connection failed: Connection timeout (15s) (at http://localhost:3005/utils/logger.ts:36:14)
[WARNING] [WARN] Supabase connection failed: Connection timeout (15s) (at http://localhost:3005/utils/logger.ts:36:14)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/rest/v1/requests?select=*%2Crequest_categories%28category_id%2Ccategories%28id%2Clabel%29%29&is_public=eq.true&status=eq.active&order=created_at.desc&offset=0&limit=10:0:0)
[ERROR] [ERROR] ❌ Error fetching requests: {message: TypeError: Failed to fetch, details: TypeError: Failed to fetch
    at fetch (http://lo…://localhost:3005/App.tsx?t=1767715331235:809:56), hint: , code: } (at http://localhost:3005/utils/logger.ts:26:14)
[ERROR] [ERROR] Error details: {
  "message": "TypeError: Failed to fetch",
  "code": "",
  "details": "TypeError: Failed to fetch\n    at fetch (http://localhost:3005/services/supabaseClient.ts:52:18)\n    at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=2fb96622:11440:40\n    at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=2fb96622:11455:12\n    at async fetchRequestsPaginated (http://localhost:3005/services/requestsService.ts:287:17)\n    at async loadPublicData (http://localhost:3005/App.tsx?t=1767715331235:809:56)",
  "hint": ""
} (at http://localhost:3005/utils/logger.ts:26:14)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/86ff689b-098a-4816-8a57-8cee2ddff3c0/c6524230-c813-4301-b9de-daaf07a9ec98
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC020
- **Test Name:** Multi-language Interface and RTL Support
- **Test Code:** [TC020_Multi_language_Interface_and_RTL_Support.py](./TC020_Multi_language_Interface_and_RTL_Support.py)
- **Test Error:** The UI verification for Arabic language was successful. However, the app is currently not accessible at http://localhost:3005, preventing further verification for Urdu and English languages. Please ensure the app server is running and accessible to continue testing.
Browser Console Logs:
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/node_modules/.vite/deps/react.js?v=2fb96622:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/node_modules/.vite/deps/react-dom_client.js?v=2fb96622:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/styles/globals.css?t=1767715331235:0:0)
[ERROR] Failed to load resource: net::ERR_CONNECTION_CLOSED (at https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/components/ErrorBoundary.tsx:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/App.tsx?t=1767715331235:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/node_modules/.vite/deps/chunk-DC5AMYBS.js?v=2fb96622:0:0)
[WARNING] Google Maps JavaScript API has been loaded directly without loading=async. This can result in suboptimal performance. For best-practice loading patterns please see https://goo.gle/js-api-loading (at https://maps.googleapis.com/maps/api/js?key=AIzaSyBFP8kmj-ojjfKJX6tKIGoJwvM_hHrsQBU&libraries=places&language=ar:1374:287)
[ERROR] Failed to load resource: net::ERR_CONNECTION_CLOSED (at https://accounts.google.com/gsi/client:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/86ff689b-098a-4816-8a57-8cee2ddff3c0/79bfd1fa-1e3d-49ca-b4c4-936deaab6ea0
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC021
- **Test Name:** Google Maps City Autocomplete and Search
- **Test Code:** [TC021_Google_Maps_City_Autocomplete_and_Search.py](./TC021_Google_Maps_City_Autocomplete_and_Search.py)
- **Test Error:** 
Browser Console Logs:
[WARNING] Google Maps JavaScript API has been loaded directly without loading=async. This can result in suboptimal performance. For best-practice loading patterns please see https://goo.gle/js-api-loading (at https://maps.googleapis.com/maps/api/js?key=AIzaSyBFP8kmj-ojjfKJX6tKIGoJwvM_hHrsQBU&libraries=places&language=ar:1374:287)
[WARNING] [WARN] ⚠️ WebSocket connection closed (at http://localhost:3005/utils/logger.ts:36:14)
[WARNING] [WARN] ⚠️ WebSocket connection timed out - categories updates may not work (at http://localhost:3005/utils/logger.ts:36:14)
[WARNING] [WARN] ⚠️ WebSocket connection closed (at http://localhost:3005/utils/logger.ts:36:14)
[ERROR] WebSocket connection to 'wss://iwfvlrtmbixequntufjr.supabase.co/realtime/v1/websocket?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3ZnZscnRtYml4ZXF1bnR1ZmpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MzMxMjcsImV4cCI6MjA4MjAwOTEyN30.NCgLu7sP87odD-W3JW8Gp_6BTcI3w4VFgBhskZ5D0RA&eventsPerSecond=10&vsn=1.0.0' failed: Error in connection establishment: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=2fb96622:1509:0)
[WARNING] [WARN] ⚠️ WebSocket channel error - categories updates may not work (at http://localhost:3005/utils/logger.ts:36:14)
[WARNING] [WARN] ⚠️ WebSocket channel error - categories updates may not work (at http://localhost:3005/utils/logger.ts:36:14)
[WARNING] [WARN] ⚠️ WebSocket connection closed (at http://localhost:3005/utils/logger.ts:36:14)
[WARNING] [WARN] ⚠️ WebSocket connection closed (at http://localhost:3005/utils/logger.ts:36:14)
[WARNING] Google Maps JavaScript API has been loaded directly without loading=async. This can result in suboptimal performance. For best-practice loading patterns please see https://goo.gle/js-api-loading (at https://maps.googleapis.com/maps/api/js?key=AIzaSyBFP8kmj-ojjfKJX6tKIGoJwvM_hHrsQBU&libraries=places&language=ar:1374:287)
[WARNING] [WARN] ⚠️ WebSocket connection closed (at http://localhost:3005/utils/logger.ts:36:14)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/86ff689b-098a-4816-8a57-8cee2ddff3c0/199d077f-6509-45d3-85e4-36f213da8ff9
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC022
- **Test Name:** Security: Data Encryption and Access Control
- **Test Code:** [TC022_Security_Data_Encryption_and_Access_Control.py](./TC022_Security_Data_Encryption_and_Access_Control.py)
- **Test Error:** The testing task to verify that sensitive user data such as passwords and personal info are encrypted in storage and proper access controls prevent unauthorized data access could not be fully completed due to a blocked login flow. Unauthorized API access was correctly denied, indicating some access control is in place. However, the login process is blocked because the verification code input field does not appear after sending the code, preventing further authentication and verification of encrypted password storage. This issue has been reported. Further testing requires a functional login flow.
Browser Console Logs:
[WARNING] Google Maps JavaScript API has been loaded directly without loading=async. This can result in suboptimal performance. For best-practice loading patterns please see https://goo.gle/js-api-loading (at https://maps.googleapis.com/maps/api/js?key=AIzaSyBFP8kmj-ojjfKJX6tKIGoJwvM_hHrsQBU&libraries=places&language=ar:1374:287)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/node_modules/vite/dist/client/env.mjs:0:0)
[WARNING] Google Maps JavaScript API has been loaded directly without loading=async. This can result in suboptimal performance. For best-practice loading patterns please see https://goo.gle/js-api-loading (at https://maps.googleapis.com/maps/api/js?key=AIzaSyBFP8kmj-ojjfKJX6tKIGoJwvM_hHrsQBU&libraries=places&language=ar:1374:287)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/functions/v1/ai-chat:0:0)
[WARNING] [WARN] Supabase connection failed: Connection timeout (15s) (at http://localhost:3005/utils/logger.ts:36:14)
[WARNING] [WARN] ⚠️ فشل النموذج claude-sonnet-4-20250514: AI connection timeout (5s) (at http://localhost:3005/utils/logger.ts:36:14)
[WARNING] [WARN] Supabase connection failed: Connection timeout (15s) (at http://localhost:3005/utils/logger.ts:36:14)
[WARNING] [WARN] ⚠️ فشل النموذج claude-sonnet-4-20250514: AI connection timeout (5s) (at http://localhost:3005/utils/logger.ts:36:14)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/functions/v1/ai-chat:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/rest/v1/requests?select=*%2Crequest_categories%28category_id%2Ccategories%28id%2Clabel%29%29&is_public=eq.true&status=eq.active&order=created_at.desc&offset=0&limit=10:0:0)
[ERROR] [ERROR] ❌ Error fetching requests: {message: TypeError: Failed to fetch, details: TypeError: Failed to fetch
    at fetch (http://lo…://localhost:3005/App.tsx?t=1767715331235:809:56), hint: , code: } (at http://localhost:3005/utils/logger.ts:26:14)
[ERROR] [ERROR] Error details: {
  "message": "TypeError: Failed to fetch",
  "code": "",
  "details": "TypeError: Failed to fetch\n    at fetch (http://localhost:3005/services/supabaseClient.ts:52:18)\n    at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=2fb96622:11440:40\n    at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=2fb96622:11455:12\n    at async fetchRequestsPaginated (http://localhost:3005/services/requestsService.ts:287:17)\n    at async loadPublicData (http://localhost:3005/App.tsx?t=1767715331235:809:56)",
  "hint": ""
} (at http://localhost:3005/utils/logger.ts:26:14)
[ERROR] Error loading public data: {message: TypeError: Failed to fetch, details: TypeError: Failed to fetch
    at fetch (http://lo…://localhost:3005/App.tsx?t=1767715331235:809:56), hint: , code: } (at http://localhost:3005/App.tsx?t=1767715331235:817:16)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/rest/v1/requests?select=id&limit=1:0:0)
[ERROR] [ERROR] ❌ Supabase query error: {
  "message": "TypeError: Failed to fetch",
  "code": "",
  "details": "TypeError: Failed to fetch\n    at fetch (http://localhost:3005/services/supabaseClient.ts:52:18)\n    at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=2fb96622:11440:40\n    at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=2fb96622:11455:12\n    at async http://localhost:3005/services/requestsService.ts:325:31\n    at async checkSupabaseConnection (http://localhost:3005/services/requestsService.ts:338:12)\n    at async Promise.all (index 0)",
  "hint": ""
} (at http://localhost:3005/utils/logger.ts:26:14)
[ERROR] [ERROR] ❌ Supabase query error: {
  "message": "AbortError: signal is aborted without reason",
  "code": "",
  "details": "AbortError: signal is aborted without reason\n    at http://localhost:3005/services/supabaseClient.ts:51:57",
  "hint": ""
} (at http://localhost:3005/utils/logger.ts:26:14)
[WARNING] Google Maps JavaScript API has been loaded directly without loading=async. This can result in suboptimal performance. For best-practice loading patterns please see https://goo.gle/js-api-loading (at https://maps.googleapis.com/maps/api/js?key=AIzaSyBFP8kmj-ojjfKJX6tKIGoJwvM_hHrsQBU&libraries=places&language=ar:1374:287)
[WARNING] [WARN] Supabase connection failed: Connection timeout (15s) (at http://localhost:3005/utils/logger.ts:36:14)
[WARNING] [WARN] Supabase connection failed: Connection timeout (15s) (at http://localhost:3005/utils/logger.ts:36:14)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/rest/v1/requests?select=*%2Crequest_categories%28category_id%2Ccategories%28id%2Clabel%29%29&is_public=eq.true&status=eq.active&order=created_at.desc&offset=0&limit=10:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/86ff689b-098a-4816-8a57-8cee2ddff3c0/96e30f1b-5876-47fe-ad57-8f8b347e008c
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC023
- **Test Name:** Performance: Fast Loading Times and UI Responsiveness
- **Test Code:** [TC023_Performance_Fast_Loading_Times_and_UI_Responsiveness.py](./TC023_Performance_Fast_Loading_Times_and_UI_Responsiveness.py)
- **Test Error:** The application main page loads but only displays a static title with no interactive elements or navigation options. Direct navigation to login or marketplace pages fails. Unable to perform further UI interaction or performance tests as required by the task. Please verify the application deployment and server status.
Browser Console Logs:
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/styles/globals.css?t=1767715331235:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/App.tsx?t=1767715331235:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/node_modules/.vite/deps/react-dom_client.js?v=2fb96622:0:0)
[ERROR] WebSocket connection to 'ws://localhost:3005/?token=wav4qoU8GoXY' failed: Error in connection establishment: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/@vite/client:801:0)
[WARNING] Google Maps JavaScript API has been loaded directly without loading=async. This can result in suboptimal performance. For best-practice loading patterns please see https://goo.gle/js-api-loading (at https://maps.googleapis.com/maps/api/js?key=AIzaSyBFP8kmj-ojjfKJX6tKIGoJwvM_hHrsQBU&libraries=places&language=ar:1374:287)
[WARNING] Google Maps JavaScript API has been loaded directly without loading=async. This can result in suboptimal performance. For best-practice loading patterns please see https://goo.gle/js-api-loading (at https://maps.googleapis.com/maps/api/js?key=AIzaSyBFP8kmj-ojjfKJX6tKIGoJwvM_hHrsQBU&libraries=places&language=ar:1374:287)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/components/Marketplace.tsx?t=1767714524387:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/components/RequestDetail.tsx?t=1767715308039:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/86ff689b-098a-4816-8a57-8cee2ddff3c0/10b6e76d-9421-4196-ba9a-bb301a5b0084
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC024
- **Test Name:** Error Handling: Global Error Boundary
- **Test Code:** [TC024_Error_Handling_Global_Error_Boundary.py](./TC024_Error_Handling_Global_Error_Boundary.py)
- **Test Error:** 
Browser Console Logs:
[WARNING] Google Maps JavaScript API has been loaded directly without loading=async. This can result in suboptimal performance. For best-practice loading patterns please see https://goo.gle/js-api-loading (at https://maps.googleapis.com/maps/api/js?key=AIzaSyBFP8kmj-ojjfKJX6tKIGoJwvM_hHrsQBU&libraries=places&language=ar:1374:287)
[ERROR] WebSocket connection to 'ws://localhost:3005/?token=wav4qoU8GoXY' failed: Error in connection establishment: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/@vite/client:801:0)
[WARNING] [WARN] ⚠️ WebSocket connection closed (at http://localhost:3005/utils/logger.ts:36:14)
[WARNING] [WARN] ⚠️ فشل النموذج claude-sonnet-4-20250514: AI connection timeout (5s) (at http://localhost:3005/utils/logger.ts:36:14)
[WARNING] [WARN] ⚠️ فشل النموذج claude-sonnet-4-20250514: AI connection timeout (5s) (at http://localhost:3005/utils/logger.ts:36:14)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://api.anthropic.com/v1/messages:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://api.anthropic.com/v1/messages:0:0)
[WARNING] [WARN] ⚠️ WebSocket connection timed out - categories updates may not work (at http://localhost:3005/utils/logger.ts:36:14)
[WARNING] [WARN] ⚠️ WebSocket connection closed (at http://localhost:3005/utils/logger.ts:36:14)
[ERROR] WebSocket connection to 'wss://iwfvlrtmbixequntufjr.supabase.co/realtime/v1/websocket?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3ZnZscnRtYml4ZXF1bnR1ZmpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MzMxMjcsImV4cCI6MjA4MjAwOTEyN30.NCgLu7sP87odD-W3JW8Gp_6BTcI3w4VFgBhskZ5D0RA&eventsPerSecond=10&vsn=1.0.0' failed: Error in connection establishment: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=2fb96622:1509:0)
[WARNING] [WARN] ⚠️ WebSocket channel error - categories updates may not work (at http://localhost:3005/utils/logger.ts:36:14)
[WARNING] [WARN] ⚠️ WebSocket channel error - categories updates may not work (at http://localhost:3005/utils/logger.ts:36:14)
[WARNING] [WARN] ⚠️ WebSocket connection closed (at http://localhost:3005/utils/logger.ts:36:14)
[WARNING] [WARN] ⚠️ WebSocket connection closed (at http://localhost:3005/utils/logger.ts:36:14)
[WARNING] Google Maps JavaScript API has been loaded directly without loading=async. This can result in suboptimal performance. For best-practice loading patterns please see https://goo.gle/js-api-loading (at https://maps.googleapis.com/maps/api/js?key=AIzaSyBFP8kmj-ojjfKJX6tKIGoJwvM_hHrsQBU&libraries=places&language=ar:1374:287)
[WARNING] [WARN] ⚠️ WebSocket connection closed (at http://localhost:3005/utils/logger.ts:36:14)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/86ff689b-098a-4816-8a57-8cee2ddff3c0/0bdb905c-be59-48d5-b0e4-3ec3dbedd782
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC025
- **Test Name:** Notification Badge Count Reset on Reading
- **Test Code:** [TC025_Notification_Badge_Count_Reset_on_Reading.py](./TC025_Notification_Badge_Count_Reset_on_Reading.py)
- **Test Error:** Login process failed to proceed past phone number input screen, preventing further testing of notification unread count reset. Reporting issue and stopping test.
Browser Console Logs:
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/node_modules/.vite/deps/react-dom_client.js?v=2fb96622:0:0)
[WARNING] Google Maps JavaScript API has been loaded directly without loading=async. This can result in suboptimal performance. For best-practice loading patterns please see https://goo.gle/js-api-loading (at https://maps.googleapis.com/maps/api/js?key=AIzaSyBFP8kmj-ojjfKJX6tKIGoJwvM_hHrsQBU&libraries=places&language=ar:1374:287)
[WARNING] Google Maps JavaScript API has been loaded directly without loading=async. This can result in suboptimal performance. For best-practice loading patterns please see https://goo.gle/js-api-loading (at https://maps.googleapis.com/maps/api/js?key=AIzaSyBFP8kmj-ojjfKJX6tKIGoJwvM_hHrsQBU&libraries=places&language=ar:1374:287)
[WARNING] [WARN] Supabase connection failed: Connection timeout (15s) (at http://localhost:3005/utils/logger.ts:36:14)
[WARNING] [WARN] ⚠️ فشل النموذج claude-sonnet-4-20250514: AI connection timeout (5s) (at http://localhost:3005/utils/logger.ts:36:14)
[WARNING] [WARN] Supabase connection failed: Connection timeout (15s) (at http://localhost:3005/utils/logger.ts:36:14)
[WARNING] [WARN] ⚠️ فشل النموذج claude-sonnet-4-20250514: AI connection timeout (5s) (at http://localhost:3005/utils/logger.ts:36:14)
[WARNING] Google Maps JavaScript API has been loaded directly without loading=async. This can result in suboptimal performance. For best-practice loading patterns please see https://goo.gle/js-api-loading (at https://maps.googleapis.com/maps/api/js?key=AIzaSyBFP8kmj-ojjfKJX6tKIGoJwvM_hHrsQBU&libraries=places&language=ar:1374:287)
[WARNING] Google Maps JavaScript API has been loaded directly without loading=async. This can result in suboptimal performance. For best-practice loading patterns please see https://goo.gle/js-api-loading (at https://maps.googleapis.com/maps/api/js?key=AIzaSyBFP8kmj-ojjfKJX6tKIGoJwvM_hHrsQBU&libraries=places&language=ar:1374:287)
[WARNING] [WARN] Supabase connection failed: Connection timeout (15s) (at http://localhost:3005/utils/logger.ts:36:14)
[WARNING] [WARN] Supabase connection failed: Connection timeout (15s) (at http://localhost:3005/utils/logger.ts:36:14)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/86ff689b-098a-4816-8a57-8cee2ddff3c0/2574fdbf-8e5a-4197-90ee-21d2570528f3
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC026
- **Test Name:** File Upload in Messaging
- **Test Code:** [TC026_File_Upload_in_Messaging.py](./TC026_File_Upload_in_Messaging.py)
- **Test Error:** The app page at http://localhost:3005/ is empty and does not load any UI elements. Therefore, I cannot proceed with the testing of file upload and messaging features. Please ensure the app server is running and the UI is accessible.
Browser Console Logs:
[ERROR] Failed to load resource: net::ERR_CONNECTION_CLOSED (at https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/node_modules/.vite/deps/chunk-DC5AMYBS.js?v=2fb96622:0:0)
[WARNING] Google Maps JavaScript API has been loaded directly without loading=async. This can result in suboptimal performance. For best-practice loading patterns please see https://goo.gle/js-api-loading (at https://maps.googleapis.com/maps/api/js?key=AIzaSyBFP8kmj-ojjfKJX6tKIGoJwvM_hHrsQBU&libraries=places&language=ar:1374:287)
[ERROR] WebSocket connection to 'ws://localhost:3005/?token=wav4qoU8GoXY' failed: Error in connection establishment: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/@vite/client:801:0)
[WARNING] Google Maps JavaScript API has been loaded directly without loading=async. This can result in suboptimal performance. For best-practice loading patterns please see https://goo.gle/js-api-loading (at https://maps.googleapis.com/maps/api/js?key=AIzaSyBFP8kmj-ojjfKJX6tKIGoJwvM_hHrsQBU&libraries=places&language=ar:1374:287)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/index.tsx?t=1767715331235:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/@react-refresh:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://maps.googleapis.com/maps/api/mapsjs/gen_204?csp_test=true:0:0)
[ERROR] WebSocket connection to 'ws://localhost:3005/?token=wav4qoU8GoXY' failed: Error in connection establishment: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/@vite/client:801:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/86ff689b-098a-4816-8a57-8cee2ddff3c0/7356ed70-29cf-4d0c-b5b4-bfcb68d85576
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---


## 3️⃣ Coverage & Matching Metrics

- **11.54** of tests passed

| Requirement        | Total Tests | ✅ Passed | ❌ Failed  |
|--------------------|-------------|-----------|------------|
| ...                | ...         | ...       | ...        |
---


## 4️⃣ Key Gaps / Risks
{AI_GNERATED_KET_GAPS_AND_RISKS}
---