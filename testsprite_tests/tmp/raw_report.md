
# TestSprite AI Testing Report(MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** copy-of-copy-of-servicelink-ai-platform
- **Date:** 2026-01-06
- **Prepared by:** TestSprite AI Team

---

## 2️⃣ Requirement Validation Summary

#### Test TC001
- **Test Name:** Login with Google OAuth success
- **Test Code:** [TC001_Login_with_Google_OAuth_success.py](./TC001_Login_with_Google_OAuth_success.py)
- **Test Error:** 
Browser Console Logs:
[ERROR] Failed to load resource: net::ERR_CONTENT_LENGTH_MISMATCH (at http://localhost:3005/node_modules/.vite/deps/chunk-KDCVS43I.js?v=83574dff:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7ad57f97-1c78-4a5a-ab4a-27cb4d53c5ab/6fe435ff-d170-451c-8f34-2911d320ed97
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC002
- **Test Name:** Login with Email and Password success
- **Test Code:** [TC002_Login_with_Email_and_Password_success.py](./TC002_Login_with_Email_and_Password_success.py)
- **Test Error:** 
Browser Console Logs:
[ERROR] Failed to load resource: net::ERR_CONTENT_LENGTH_MISMATCH (at http://localhost:3005/node_modules/.vite/deps/chunk-KDCVS43I.js?v=83574dff:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7ad57f97-1c78-4a5a-ab4a-27cb4d53c5ab/bf7e6e2b-6771-48f6-98cb-8dbf41bd741b
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC003
- **Test Name:** Login with Phone OTP success
- **Test Code:** [null](./null)
- **Test Error:** Test execution timed out after 15 minutes
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7ad57f97-1c78-4a5a-ab4a-27cb4d53c5ab/12963c14-da81-48f4-bb5b-ae8486bae027
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC004
- **Test Name:** Login failure with invalid credentials
- **Test Code:** [TC004_Login_failure_with_invalid_credentials.py](./TC004_Login_failure_with_invalid_credentials.py)
- **Test Error:** Failed to go to the start URL. Err: Error executing action go_to_url: Page.goto: Timeout 60000ms exceeded.
Call log:
  - navigating to "http://localhost:3005/", waiting until "load"

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7ad57f97-1c78-4a5a-ab4a-27cb4d53c5ab/bf4732d8-f44a-4f6f-875b-127d768ebb7a
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC005
- **Test Name:** Guest mode access and restrictions
- **Test Code:** [TC005_Guest_mode_access_and_restrictions.py](./TC005_Guest_mode_access_and_restrictions.py)
- **Test Error:** 
Browser Console Logs:
[ERROR] Failed to load resource: net::ERR_CONTENT_LENGTH_MISMATCH (at http://localhost:3005/services/categoriesService.ts:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7ad57f97-1c78-4a5a-ab4a-27cb4d53c5ab/65e2e2a0-c3e3-4341-b9ad-0d5497d960ed
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC006
- **Test Name:** Create a new request using AI Assistant
- **Test Code:** [TC006_Create_a_new_request_using_AI_Assistant.py](./TC006_Create_a_new_request_using_AI_Assistant.py)
- **Test Error:** The user successfully logged in and navigated to the create request page. The request description and location were input, but the location selection from the dropdown could not be completed due to missing elements. The request was not submitted, and the creation was not verified. Therefore, the task to validate that users can create a service request using the AI-powered assistant is not fully completed due to UI interaction limitations and connection issues encountered during testing.
Browser Console Logs:
[WARNING] ⚠️ Supabase connection failed: Connection timeout (15s) (at http://localhost:3005/services/requestsService.ts:320:12)
[WARNING] ⚠️ Supabase connection failed: Connection timeout (15s) (at http://localhost:3005/services/requestsService.ts:320:12)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/functions/v1/ai-chat:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/functions/v1/ai-chat:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/rest/v1/requests?select=*%2Crequest_categories%28category_id%2Ccategories%28id%2Clabel%29%29&is_public=eq.true&order=created_at.desc&offset=0&limit=10:0:0)
[ERROR] ❌ Error fetching requests: {message: TypeError: Failed to fetch, details: TypeError: Failed to fetch
    at http://localhost…PublicData (http://localhost:3005/App.tsx:713:56), hint: , code: } (at http://localhost:3005/services/requestsService.ts:282:12)
[ERROR] Error details: {
  "message": "TypeError: Failed to fetch",
  "code": "",
  "details": "TypeError: Failed to fetch\n    at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:11441:23\n    at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:11455:12\n    at async fetchRequestsPaginated (http://localhost:3005/services/requestsService.ts:269:17)\n    at async loadPublicData (http://localhost:3005/App.tsx:713:56)",
  "hint": ""
} (at http://localhost:3005/services/requestsService.ts:283:12)
[ERROR] Error loading public data: {message: TypeError: Failed to fetch, details: TypeError: Failed to fetch
    at http://localhost…PublicData (http://localhost:3005/App.tsx:713:56), hint: , code: } (at http://localhost:3005/App.tsx:720:16)
[ERROR] WebSocket connection to 'wss://iwfvlrtmbixequntufjr.supabase.co/realtime/v1/websocket?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3ZnZscnRtYml4ZXF1bnR1ZmpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MzMxMjcsImV4cCI6MjA4MjAwOTEyN30.NCgLu7sP87odD-W3JW8Gp_6BTcI3w4VFgBhskZ5D0RA&vsn=1.0.0' failed: Error in connection establishment: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:1509:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/rest/v1/requests?select=id&limit=1:0:0)
[ERROR] ❌ Supabase query error: {
  "message": "TypeError: Failed to fetch",
  "code": "",
  "details": "TypeError: Failed to fetch\n    at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:11441:23\n    at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:11455:12\n    at async http://localhost:3005/services/requestsService.ts:306:31\n    at async checkSupabaseConnection (http://localhost:3005/services/requestsService.ts:319:12)\n    at async Promise.all (index 0)",
  "hint": ""
} (at http://localhost:3005/services/requestsService.ts:307:16)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/rest/v1/categories?select=id%2Clabel%2Clabel_en%2Clabel_ur%2Cicon%2Cemoji%2Cdescription&is_active=eq.true&order=sort_order.asc:0:0)
[WARNING] Error fetching categories from backend, using local fallback: TypeError: Failed to fetch (at http://localhost:3005/services/categoriesService.ts:22:14)
[WARNING] WebSocket connection to 'wss://iwfvlrtmbixequntufjr.supabase.co/realtime/v1/websocket?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3ZnZscnRtYml4ZXF1bnR1ZmpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MzMxMjcsImV4cCI6MjA4MjAwOTEyN30.NCgLu7sP87odD-W3JW8Gp_6BTcI3w4VFgBhskZ5D0RA&vsn=1.0.0' failed: WebSocket is closed before the connection is established. (at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:2999:0)
[ERROR] ❌ Supabase query error: {
  "message": "TypeError: Failed to fetch",
  "code": "",
  "details": "TypeError: Failed to fetch\n    at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:11441:23\n    at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:11455:12\n    at async http://localhost:3005/services/requestsService.ts:306:31\n    at async checkSupabaseConnection (http://localhost:3005/services/requestsService.ts:319:12)\n    at async Promise.all (index 0)",
  "hint": ""
} (at http://localhost:3005/services/requestsService.ts:307:16)
[WARNING] Error fetching categories from backend, using local fallback: TypeError: Failed to fetch (at http://localhost:3005/services/categoriesService.ts:22:14)
[WARNING] Error fetching categories from backend, using local fallback: TypeError: Failed to fetch (at http://localhost:3005/services/categoriesService.ts:22:14)
[WARNING] Error fetching categories from backend, using local fallback: TypeError: Failed to fetch (at http://localhost:3005/services/categoriesService.ts:22:14)
[WARNING] ⚠️ Supabase connection failed: Connection timeout (15s) (at http://localhost:3005/services/requestsService.ts:320:12)
[WARNING] ⚠️ Supabase connection failed: Connection timeout (15s) (at http://localhost:3005/services/requestsService.ts:320:12)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7ad57f97-1c78-4a5a-ab4a-27cb4d53c5ab/ba8ca800-c71f-4b0e-96b0-1be24ab4d16f
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC007
- **Test Name:** Edit existing request
- **Test Code:** [TC007_Edit_existing_request.py](./TC007_Edit_existing_request.py)
- **Test Error:** 
Browser Console Logs:
[WARNING] ⚠️ Supabase connection failed: Connection timeout (15s) (at http://localhost:3005/services/requestsService.ts:320:12)
[WARNING] ⚠️ Supabase connection failed: Connection timeout (15s) (at http://localhost:3005/services/requestsService.ts:320:12)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/functions/v1/ai-chat:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/functions/v1/ai-chat:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/rest/v1/requests?select=*%2Crequest_categories%28category_id%2Ccategories%28id%2Clabel%29%29&is_public=eq.true&order=created_at.desc&offset=0&limit=10:0:0)
[ERROR] ❌ Error fetching requests: {message: TypeError: Failed to fetch, details: TypeError: Failed to fetch
    at http://localhost…PublicData (http://localhost:3005/App.tsx:713:56), hint: , code: } (at http://localhost:3005/services/requestsService.ts:282:12)
[ERROR] Error details: {
  "message": "TypeError: Failed to fetch",
  "code": "",
  "details": "TypeError: Failed to fetch\n    at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:11441:23\n    at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:11455:12\n    at async fetchRequestsPaginated (http://localhost:3005/services/requestsService.ts:269:17)\n    at async loadPublicData (http://localhost:3005/App.tsx:713:56)",
  "hint": ""
} (at http://localhost:3005/services/requestsService.ts:283:12)
[ERROR] Error loading public data: {message: TypeError: Failed to fetch, details: TypeError: Failed to fetch
    at http://localhost…PublicData (http://localhost:3005/App.tsx:713:56), hint: , code: } (at http://localhost:3005/App.tsx:720:16)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/rest/v1/requests?select=id&limit=1:0:0)
[ERROR] ❌ Supabase query error: {
  "message": "TypeError: Failed to fetch",
  "code": "",
  "details": "TypeError: Failed to fetch\n    at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:11441:23\n    at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:11455:12\n    at async http://localhost:3005/services/requestsService.ts:306:31\n    at async checkSupabaseConnection (http://localhost:3005/services/requestsService.ts:319:12)\n    at async Promise.all (index 0)",
  "hint": ""
} (at http://localhost:3005/services/requestsService.ts:307:16)
[ERROR] WebSocket connection to 'wss://iwfvlrtmbixequntufjr.supabase.co/realtime/v1/websocket?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3ZnZscnRtYml4ZXF1bnR1ZmpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MzMxMjcsImV4cCI6MjA4MjAwOTEyN30.NCgLu7sP87odD-W3JW8Gp_6BTcI3w4VFgBhskZ5D0RA&vsn=1.0.0' failed: Error in connection establishment: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:1509:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/rest/v1/categories?select=id%2Clabel%2Clabel_en%2Clabel_ur%2Cicon%2Cemoji%2Cdescription&is_active=eq.true&order=sort_order.asc:0:0)
[WARNING] Error fetching categories from backend, using local fallback: TypeError: Failed to fetch (at http://localhost:3005/services/categoriesService.ts:22:14)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7ad57f97-1c78-4a5a-ab4a-27cb4d53c5ab/252f1f56-8e94-4ff8-a229-41b24c5bd2d8
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC008
- **Test Name:** Archive and unarchive a request
- **Test Code:** [TC008_Archive_and_unarchive_a_request.py](./TC008_Archive_and_unarchive_a_request.py)
- **Test Error:** 
Browser Console Logs:
[WARNING] ⚠️ Supabase connection failed: Connection timeout (15s) (at http://localhost:3005/services/requestsService.ts:320:12)
[WARNING] ⚠️ Supabase connection failed: Connection timeout (15s) (at http://localhost:3005/services/requestsService.ts:320:12)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/functions/v1/ai-chat:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/functions/v1/ai-chat:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/rest/v1/requests?select=*%2Crequest_categories%28category_id%2Ccategories%28id%2Clabel%29%29&is_public=eq.true&order=created_at.desc&offset=0&limit=10:0:0)
[ERROR] ❌ Error fetching requests: {message: TypeError: Failed to fetch, details: TypeError: Failed to fetch
    at http://localhost…PublicData (http://localhost:3005/App.tsx:713:56), hint: , code: } (at http://localhost:3005/services/requestsService.ts:282:12)
[ERROR] Error details: {
  "message": "TypeError: Failed to fetch",
  "code": "",
  "details": "TypeError: Failed to fetch\n    at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:11441:23\n    at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:11455:12\n    at async fetchRequestsPaginated (http://localhost:3005/services/requestsService.ts:269:17)\n    at async loadPublicData (http://localhost:3005/App.tsx:713:56)",
  "hint": ""
} (at http://localhost:3005/services/requestsService.ts:283:12)
[ERROR] Error loading public data: {message: TypeError: Failed to fetch, details: TypeError: Failed to fetch
    at http://localhost…PublicData (http://localhost:3005/App.tsx:713:56), hint: , code: } (at http://localhost:3005/App.tsx:720:16)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/rest/v1/requests?select=id&limit=1:0:0)
[ERROR] ❌ Supabase query error: {
  "message": "TypeError: Failed to fetch",
  "code": "",
  "details": "TypeError: Failed to fetch\n    at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:11441:23\n    at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:11455:12\n    at async http://localhost:3005/services/requestsService.ts:306:31\n    at async checkSupabaseConnection (http://localhost:3005/services/requestsService.ts:319:12)\n    at async Promise.all (index 0)",
  "hint": ""
} (at http://localhost:3005/services/requestsService.ts:307:16)
[ERROR] WebSocket connection to 'wss://iwfvlrtmbixequntufjr.supabase.co/realtime/v1/websocket?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3ZnZscnRtYml4ZXF1bnR1ZmpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MzMxMjcsImV4cCI6MjA4MjAwOTEyN30.NCgLu7sP87odD-W3JW8Gp_6BTcI3w4VFgBhskZ5D0RA&vsn=1.0.0' failed: Error in connection establishment: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:1509:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/rest/v1/categories?select=id%2Clabel%2Clabel_en%2Clabel_ur%2Cicon%2Cemoji%2Cdescription&is_active=eq.true&order=sort_order.asc:0:0)
[WARNING] Error fetching categories from backend, using local fallback: TypeError: Failed to fetch (at http://localhost:3005/services/categoriesService.ts:22:14)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7ad57f97-1c78-4a5a-ab4a-27cb4d53c5ab/5fcc5261-0721-4661-b92b-2048a4ebae5a
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC009
- **Test Name:** Hide and bump a request
- **Test Code:** [TC009_Hide_and_bump_a_request.py](./TC009_Hide_and_bump_a_request.py)
- **Test Error:** 
Browser Console Logs:
[WARNING] ⚠️ Supabase connection failed: Connection timeout (15s) (at http://localhost:3005/services/requestsService.ts:320:12)
[WARNING] ⚠️ Supabase connection failed: Connection timeout (15s) (at http://localhost:3005/services/requestsService.ts:320:12)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/functions/v1/ai-chat:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/functions/v1/ai-chat:0:0)
[ERROR] WebSocket connection to 'wss://iwfvlrtmbixequntufjr.supabase.co/realtime/v1/websocket?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3ZnZscnRtYml4ZXF1bnR1ZmpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MzMxMjcsImV4cCI6MjA4MjAwOTEyN30.NCgLu7sP87odD-W3JW8Gp_6BTcI3w4VFgBhskZ5D0RA&vsn=1.0.0' failed: Error in connection establishment: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:1509:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/rest/v1/requests?select=*%2Crequest_categories%28category_id%2Ccategories%28id%2Clabel%29%29&is_public=eq.true&order=created_at.desc&offset=0&limit=10:0:0)
[ERROR] ❌ Error fetching requests: {message: TypeError: Failed to fetch, details: TypeError: Failed to fetch
    at http://localhost…PublicData (http://localhost:3005/App.tsx:713:56), hint: , code: } (at http://localhost:3005/services/requestsService.ts:282:12)
[ERROR] Error details: {
  "message": "TypeError: Failed to fetch",
  "code": "",
  "details": "TypeError: Failed to fetch\n    at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:11441:23\n    at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:11455:12\n    at async fetchRequestsPaginated (http://localhost:3005/services/requestsService.ts:269:17)\n    at async loadPublicData (http://localhost:3005/App.tsx:713:56)",
  "hint": ""
} (at http://localhost:3005/services/requestsService.ts:283:12)
[ERROR] Error loading public data: {message: TypeError: Failed to fetch, details: TypeError: Failed to fetch
    at http://localhost…PublicData (http://localhost:3005/App.tsx:713:56), hint: , code: } (at http://localhost:3005/App.tsx:720:16)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/rest/v1/requests?select=id&limit=1:0:0)
[ERROR] ❌ Supabase query error: {
  "message": "TypeError: Failed to fetch",
  "code": "",
  "details": "TypeError: Failed to fetch\n    at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:11441:23\n    at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:11455:12\n    at async http://localhost:3005/services/requestsService.ts:306:31\n    at async checkSupabaseConnection (http://localhost:3005/services/requestsService.ts:319:12)\n    at async Promise.all (index 0)",
  "hint": ""
} (at http://localhost:3005/services/requestsService.ts:307:16)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/rest/v1/categories?select=id%2Clabel%2Clabel_en%2Clabel_ur%2Cicon%2Cemoji%2Cdescription&is_active=eq.true&order=sort_order.asc:0:0)
[WARNING] Error fetching categories from backend, using local fallback: TypeError: Failed to fetch (at http://localhost:3005/services/categoriesService.ts:22:14)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7ad57f97-1c78-4a5a-ab4a-27cb4d53c5ab/7197d02a-9274-43ef-be21-7b1ff9e1b7b8
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC010
- **Test Name:** Browse marketplace requests with filters
- **Test Code:** [TC010_Browse_marketplace_requests_with_filters.py](./TC010_Browse_marketplace_requests_with_filters.py)
- **Test Error:** 
Browser Console Logs:
[WARNING] ⚠️ Supabase connection failed: Connection timeout (15s) (at http://localhost:3005/services/requestsService.ts:320:12)
[WARNING] ⚠️ Supabase connection failed: Connection timeout (15s) (at http://localhost:3005/services/requestsService.ts:320:12)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/functions/v1/ai-chat:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/functions/v1/ai-chat:0:0)
[ERROR] WebSocket connection to 'wss://iwfvlrtmbixequntufjr.supabase.co/realtime/v1/websocket?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3ZnZscnRtYml4ZXF1bnR1ZmpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MzMxMjcsImV4cCI6MjA4MjAwOTEyN30.NCgLu7sP87odD-W3JW8Gp_6BTcI3w4VFgBhskZ5D0RA&vsn=1.0.0' failed: Error in connection establishment: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:1509:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/rest/v1/requests?select=*%2Crequest_categories%28category_id%2Ccategories%28id%2Clabel%29%29&is_public=eq.true&order=created_at.desc&offset=0&limit=10:0:0)
[ERROR] ❌ Error fetching requests: {message: TypeError: Failed to fetch, details: TypeError: Failed to fetch
    at http://localhost…PublicData (http://localhost:3005/App.tsx:713:56), hint: , code: } (at http://localhost:3005/services/requestsService.ts:282:12)
[ERROR] Error details: {
  "message": "TypeError: Failed to fetch",
  "code": "",
  "details": "TypeError: Failed to fetch\n    at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:11441:23\n    at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:11455:12\n    at async fetchRequestsPaginated (http://localhost:3005/services/requestsService.ts:269:17)\n    at async loadPublicData (http://localhost:3005/App.tsx:713:56)",
  "hint": ""
} (at http://localhost:3005/services/requestsService.ts:283:12)
[ERROR] Error loading public data: {message: TypeError: Failed to fetch, details: TypeError: Failed to fetch
    at http://localhost…PublicData (http://localhost:3005/App.tsx:713:56), hint: , code: } (at http://localhost:3005/App.tsx:720:16)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/rest/v1/requests?select=id&limit=1:0:0)
[ERROR] ❌ Supabase query error: {
  "message": "TypeError: Failed to fetch",
  "code": "",
  "details": "TypeError: Failed to fetch\n    at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:11441:23\n    at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:11455:12\n    at async http://localhost:3005/services/requestsService.ts:306:31\n    at async checkSupabaseConnection (http://localhost:3005/services/requestsService.ts:319:12)\n    at async Promise.all (index 0)",
  "hint": ""
} (at http://localhost:3005/services/requestsService.ts:307:16)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/rest/v1/categories?select=id%2Clabel%2Clabel_en%2Clabel_ur%2Cicon%2Cemoji%2Cdescription&is_active=eq.true&order=sort_order.asc:0:0)
[WARNING] Error fetching categories from backend, using local fallback: TypeError: Failed to fetch (at http://localhost:3005/services/categoriesService.ts:22:14)
[WARNING] Error fetching categories from backend, using local fallback: TypeError: Failed to fetch (at http://localhost:3005/services/categoriesService.ts:22:14)
[WARNING] Error fetching categories from backend, using local fallback: TypeError: Failed to fetch (at http://localhost:3005/services/categoriesService.ts:22:14)
[WARNING] Error fetching categories from backend, using local fallback: TypeError: Failed to fetch (at http://localhost:3005/services/categoriesService.ts:22:14)
[ERROR] ❌ Supabase query error: {
  "message": "TypeError: Failed to fetch",
  "code": "",
  "details": "TypeError: Failed to fetch\n    at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:11441:23\n    at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:11455:12\n    at async http://localhost:3005/services/requestsService.ts:306:31\n    at async checkSupabaseConnection (http://localhost:3005/services/requestsService.ts:319:12)\n    at async Promise.all (index 0)",
  "hint": ""
} (at http://localhost:3005/services/requestsService.ts:307:16)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/functions/v1/ai-chat:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7ad57f97-1c78-4a5a-ab4a-27cb4d53c5ab/55dc077b-422d-4b01-be60-5ba2018064cf
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC011
- **Test Name:** Create and submit an offer on a request
- **Test Code:** [TC011_Create_and_submit_an_offer_on_a_request.py](./TC011_Create_and_submit_an_offer_on_a_request.py)
- **Test Error:** 
Browser Console Logs:
[ERROR] Failed to load resource: net::ERR_CONNECTION_CLOSED (at https://accounts.google.com/gsi/client:0:0)
[WARNING] ⚠️ Supabase connection failed: Connection timeout (15s) (at http://localhost:3005/services/requestsService.ts:320:12)
[WARNING] ⚠️ Supabase connection failed: Connection timeout (15s) (at http://localhost:3005/services/requestsService.ts:320:12)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/functions/v1/ai-chat:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/functions/v1/ai-chat:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/rest/v1/requests?select=*%2Crequest_categories%28category_id%2Ccategories%28id%2Clabel%29%29&is_public=eq.true&order=created_at.desc&offset=0&limit=10:0:0)
[ERROR] ❌ Error fetching requests: {message: TypeError: Failed to fetch, details: TypeError: Failed to fetch
    at http://localhost…PublicData (http://localhost:3005/App.tsx:713:56), hint: , code: } (at http://localhost:3005/services/requestsService.ts:282:12)
[ERROR] Error details: {
  "message": "TypeError: Failed to fetch",
  "code": "",
  "details": "TypeError: Failed to fetch\n    at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:11441:23\n    at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:11455:12\n    at async fetchRequestsPaginated (http://localhost:3005/services/requestsService.ts:269:17)\n    at async loadPublicData (http://localhost:3005/App.tsx:713:56)",
  "hint": ""
} (at http://localhost:3005/services/requestsService.ts:283:12)
[ERROR] Error loading public data: {message: TypeError: Failed to fetch, details: TypeError: Failed to fetch
    at http://localhost…PublicData (http://localhost:3005/App.tsx:713:56), hint: , code: } (at http://localhost:3005/App.tsx:720:16)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/rest/v1/requests?select=id&limit=1:0:0)
[ERROR] ❌ Supabase query error: {
  "message": "TypeError: Failed to fetch",
  "code": "",
  "details": "TypeError: Failed to fetch\n    at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:11441:23\n    at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:11455:12\n    at async http://localhost:3005/services/requestsService.ts:306:31\n    at async checkSupabaseConnection (http://localhost:3005/services/requestsService.ts:319:12)\n    at async Promise.all (index 0)",
  "hint": ""
} (at http://localhost:3005/services/requestsService.ts:307:16)
[ERROR] WebSocket connection to 'wss://iwfvlrtmbixequntufjr.supabase.co/realtime/v1/websocket?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3ZnZscnRtYml4ZXF1bnR1ZmpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MzMxMjcsImV4cCI6MjA4MjAwOTEyN30.NCgLu7sP87odD-W3JW8Gp_6BTcI3w4VFgBhskZ5D0RA&vsn=1.0.0' failed: Error in connection establishment: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:1509:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/rest/v1/categories?select=id%2Clabel%2Clabel_en%2Clabel_ur%2Cicon%2Cemoji%2Cdescription&is_active=eq.true&order=sort_order.asc:0:0)
[WARNING] Error fetching categories from backend, using local fallback: TypeError: Failed to fetch (at http://localhost:3005/services/categoriesService.ts:22:14)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7ad57f97-1c78-4a5a-ab4a-27cb4d53c5ab/413466a9-d5e6-41c6-827a-c720abd0d6c0
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC012
- **Test Name:** Edit and archive offers
- **Test Code:** [TC012_Edit_and_archive_offers.py](./TC012_Edit_and_archive_offers.py)
- **Test Error:** 
Browser Console Logs:
[WARNING] ⚠️ Supabase connection failed: Connection timeout (15s) (at http://localhost:3005/services/requestsService.ts:320:12)
[WARNING] ⚠️ Supabase connection failed: Connection timeout (15s) (at http://localhost:3005/services/requestsService.ts:320:12)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/functions/v1/ai-chat:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/functions/v1/ai-chat:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/rest/v1/requests?select=*%2Crequest_categories%28category_id%2Ccategories%28id%2Clabel%29%29&is_public=eq.true&order=created_at.desc&offset=0&limit=10:0:0)
[ERROR] ❌ Error fetching requests: {message: TypeError: Failed to fetch, details: TypeError: Failed to fetch
    at http://localhost…PublicData (http://localhost:3005/App.tsx:713:56), hint: , code: } (at http://localhost:3005/services/requestsService.ts:282:12)
[ERROR] Error details: {
  "message": "TypeError: Failed to fetch",
  "code": "",
  "details": "TypeError: Failed to fetch\n    at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:11441:23\n    at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:11455:12\n    at async fetchRequestsPaginated (http://localhost:3005/services/requestsService.ts:269:17)\n    at async loadPublicData (http://localhost:3005/App.tsx:713:56)",
  "hint": ""
} (at http://localhost:3005/services/requestsService.ts:283:12)
[ERROR] Error loading public data: {message: TypeError: Failed to fetch, details: TypeError: Failed to fetch
    at http://localhost…PublicData (http://localhost:3005/App.tsx:713:56), hint: , code: } (at http://localhost:3005/App.tsx:720:16)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/rest/v1/requests?select=id&limit=1:0:0)
[ERROR] ❌ Supabase query error: {
  "message": "TypeError: Failed to fetch",
  "code": "",
  "details": "TypeError: Failed to fetch\n    at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:11441:23\n    at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:11455:12\n    at async http://localhost:3005/services/requestsService.ts:306:31\n    at async checkSupabaseConnection (http://localhost:3005/services/requestsService.ts:319:12)\n    at async Promise.all (index 0)",
  "hint": ""
} (at http://localhost:3005/services/requestsService.ts:307:16)
[ERROR] WebSocket connection to 'wss://iwfvlrtmbixequntufjr.supabase.co/realtime/v1/websocket?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3ZnZscnRtYml4ZXF1bnR1ZmpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MzMxMjcsImV4cCI6MjA4MjAwOTEyN30.NCgLu7sP87odD-W3JW8Gp_6BTcI3w4VFgBhskZ5D0RA&vsn=1.0.0' failed: Error in connection establishment: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:1509:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/rest/v1/categories?select=id%2Clabel%2Clabel_en%2Clabel_ur%2Cicon%2Cemoji%2Cdescription&is_active=eq.true&order=sort_order.asc:0:0)
[WARNING] Error fetching categories from backend, using local fallback: TypeError: Failed to fetch (at http://localhost:3005/services/categoriesService.ts:22:14)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7ad57f97-1c78-4a5a-ab4a-27cb4d53c5ab/8a52dcab-fa3e-48b8-8e9d-dc092b46db25
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC013
- **Test Name:** Real-time messaging between requester and provider
- **Test Code:** [TC013_Real_time_messaging_between_requester_and_provider.py](./TC013_Real_time_messaging_between_requester_and_provider.py)
- **Test Error:** Failed to go to the start URL. Err: Error executing action go_to_url: Page.goto: Timeout 60000ms exceeded.
Call log:
  - navigating to "http://localhost:3005/", waiting until "load"

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7ad57f97-1c78-4a5a-ab4a-27cb4d53c5ab/3a8d3fcf-35ba-45b5-8ada-47c4e0a1bf0d
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC014
- **Test Name:** Receive real-time notifications with correct sound alerts
- **Test Code:** [TC014_Receive_real_time_notifications_with_correct_sound_alerts.py](./TC014_Receive_real_time_notifications_with_correct_sound_alerts.py)
- **Test Error:** 
Browser Console Logs:
[ERROR] Failed to load resource: net::ERR_CONTENT_LENGTH_MISMATCH (at http://localhost:3005/node_modules/.vite/deps/chunk-KDCVS43I.js?v=83574dff:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7ad57f97-1c78-4a5a-ab4a-27cb4d53c5ab/8e0a4730-9a2f-4d27-af8a-1448d0edaaa5
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC015
- **Test Name:** User profile preferences update
- **Test Code:** [TC015_User_profile_preferences_update.py](./TC015_User_profile_preferences_update.py)
- **Test Error:** 
Browser Console Logs:
[WARNING] ⚠️ Supabase connection failed: Connection timeout (15s) (at http://localhost:3005/services/requestsService.ts:320:12)
[WARNING] ⚠️ Supabase connection failed: Connection timeout (15s) (at http://localhost:3005/services/requestsService.ts:320:12)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/functions/v1/ai-chat:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/functions/v1/ai-chat:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/rest/v1/requests?select=*%2Crequest_categories%28category_id%2Ccategories%28id%2Clabel%29%29&is_public=eq.true&order=created_at.desc&offset=0&limit=10:0:0)
[ERROR] ❌ Error fetching requests: {message: TypeError: Failed to fetch, details: TypeError: Failed to fetch
    at http://localhost…PublicData (http://localhost:3005/App.tsx:713:56), hint: , code: } (at http://localhost:3005/services/requestsService.ts:282:12)
[ERROR] Error details: {
  "message": "TypeError: Failed to fetch",
  "code": "",
  "details": "TypeError: Failed to fetch\n    at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:11441:23\n    at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:11455:12\n    at async fetchRequestsPaginated (http://localhost:3005/services/requestsService.ts:269:17)\n    at async loadPublicData (http://localhost:3005/App.tsx:713:56)",
  "hint": ""
} (at http://localhost:3005/services/requestsService.ts:283:12)
[ERROR] Error loading public data: {message: TypeError: Failed to fetch, details: TypeError: Failed to fetch
    at http://localhost…PublicData (http://localhost:3005/App.tsx:713:56), hint: , code: } (at http://localhost:3005/App.tsx:720:16)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/rest/v1/requests?select=id&limit=1:0:0)
[ERROR] ❌ Supabase query error: {
  "message": "TypeError: Failed to fetch",
  "code": "",
  "details": "TypeError: Failed to fetch\n    at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:11441:23\n    at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:11455:12\n    at async http://localhost:3005/services/requestsService.ts:306:31\n    at async checkSupabaseConnection (http://localhost:3005/services/requestsService.ts:319:12)\n    at async Promise.all (index 0)",
  "hint": ""
} (at http://localhost:3005/services/requestsService.ts:307:16)
[ERROR] WebSocket connection to 'wss://iwfvlrtmbixequntufjr.supabase.co/realtime/v1/websocket?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3ZnZscnRtYml4ZXF1bnR1ZmpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MzMxMjcsImV4cCI6MjA4MjAwOTEyN30.NCgLu7sP87odD-W3JW8Gp_6BTcI3w4VFgBhskZ5D0RA&vsn=1.0.0' failed: Error in connection establishment: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:1509:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/rest/v1/categories?select=id%2Clabel%2Clabel_en%2Clabel_ur%2Cicon%2Cemoji%2Cdescription&is_active=eq.true&order=sort_order.asc:0:0)
[WARNING] Error fetching categories from backend, using local fallback: TypeError: Failed to fetch (at http://localhost:3005/services/categoriesService.ts:22:14)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7ad57f97-1c78-4a5a-ab4a-27cb4d53c5ab/e67b0a80-e2d0-4fad-ab10-1fd23532e79a
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC016
- **Test Name:** Multi-language interface support and RTL layout
- **Test Code:** [TC016_Multi_language_interface_support_and_RTL_layout.py](./TC016_Multi_language_interface_support_and_RTL_layout.py)
- **Test Error:** Failed to go to the start URL. Err: Error executing action go_to_url: Page.goto: Timeout 60000ms exceeded.
Call log:
  - navigating to "http://localhost:3005/", waiting until "load"

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7ad57f97-1c78-4a5a-ab4a-27cb4d53c5ab/4b7b09f1-8cf2-46f0-a16b-21e71fef6b7d
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC017
- **Test Name:** Category management and color coding localized
- **Test Code:** [TC017_Category_management_and_color_coding_localized.py](./TC017_Category_management_and_color_coding_localized.py)
- **Test Error:** Failed to go to the start URL. Err: Error executing action go_to_url: Page.goto: Timeout 60000ms exceeded.
Call log:
  - navigating to "http://localhost:3005/", waiting until "load"

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7ad57f97-1c78-4a5a-ab4a-27cb4d53c5ab/6f56eaf0-8ffb-44b7-9486-e86a4c52ac6e
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC018
- **Test Name:** Location search with Google Maps integration
- **Test Code:** [TC018_Location_search_with_Google_Maps_integration.py](./TC018_Location_search_with_Google_Maps_integration.py)
- **Test Error:** Failed to go to the start URL. Err: Error executing action go_to_url: Page.goto: Timeout 60000ms exceeded.
Call log:
  - navigating to "http://localhost:3005/", waiting until "load"

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7ad57f97-1c78-4a5a-ab4a-27cb4d53c5ab/19a3a9ee-8d53-42dd-b558-51cefac8ee46
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC019
- **Test Name:** Security - Prevent unauthorized access to user data
- **Test Code:** [TC019_Security___Prevent_unauthorized_access_to_user_data.py](./TC019_Security___Prevent_unauthorized_access_to_user_data.py)
- **Test Error:** 
Browser Console Logs:
[WARNING] ⚠️ Supabase connection failed: Connection timeout (15s) (at http://localhost:3005/services/requestsService.ts:320:12)
[WARNING] ⚠️ Supabase connection failed: Connection timeout (15s) (at http://localhost:3005/services/requestsService.ts:320:12)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/functions/v1/ai-chat:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/functions/v1/ai-chat:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/rest/v1/requests?select=*%2Crequest_categories%28category_id%2Ccategories%28id%2Clabel%29%29&is_public=eq.true&order=created_at.desc&offset=0&limit=10:0:0)
[ERROR] ❌ Error fetching requests: {message: TypeError: Failed to fetch, details: TypeError: Failed to fetch
    at http://localhost…PublicData (http://localhost:3005/App.tsx:713:56), hint: , code: } (at http://localhost:3005/services/requestsService.ts:282:12)
[ERROR] Error details: {
  "message": "TypeError: Failed to fetch",
  "code": "",
  "details": "TypeError: Failed to fetch\n    at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:11441:23\n    at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:11455:12\n    at async fetchRequestsPaginated (http://localhost:3005/services/requestsService.ts:269:17)\n    at async loadPublicData (http://localhost:3005/App.tsx:713:56)",
  "hint": ""
} (at http://localhost:3005/services/requestsService.ts:283:12)
[ERROR] Error loading public data: {message: TypeError: Failed to fetch, details: TypeError: Failed to fetch
    at http://localhost…PublicData (http://localhost:3005/App.tsx:713:56), hint: , code: } (at http://localhost:3005/App.tsx:720:16)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/rest/v1/requests?select=id&limit=1:0:0)
[ERROR] ❌ Supabase query error: {
  "message": "TypeError: Failed to fetch",
  "code": "",
  "details": "TypeError: Failed to fetch\n    at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:11441:23\n    at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:11455:12\n    at async http://localhost:3005/services/requestsService.ts:306:31\n    at async checkSupabaseConnection (http://localhost:3005/services/requestsService.ts:319:12)\n    at async Promise.all (index 0)",
  "hint": ""
} (at http://localhost:3005/services/requestsService.ts:307:16)
[ERROR] WebSocket connection to 'wss://iwfvlrtmbixequntufjr.supabase.co/realtime/v1/websocket?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3ZnZscnRtYml4ZXF1bnR1ZmpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MzMxMjcsImV4cCI6MjA4MjAwOTEyN30.NCgLu7sP87odD-W3JW8Gp_6BTcI3w4VFgBhskZ5D0RA&vsn=1.0.0' failed: Error in connection establishment: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:1509:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/rest/v1/categories?select=id%2Clabel%2Clabel_en%2Clabel_ur%2Cicon%2Cemoji%2Cdescription&is_active=eq.true&order=sort_order.asc:0:0)
[WARNING] Error fetching categories from backend, using local fallback: TypeError: Failed to fetch (at http://localhost:3005/services/categoriesService.ts:22:14)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7ad57f97-1c78-4a5a-ab4a-27cb4d53c5ab/15fbba2e-f891-4a12-9923-43d5bbb9edca
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC020
- **Test Name:** Performance - Page load and response time under normal and high load
- **Test Code:** [TC020_Performance___Page_load_and_response_time_under_normal_and_high_load.py](./TC020_Performance___Page_load_and_response_time_under_normal_and_high_load.py)
- **Test Error:** 
Browser Console Logs:
[WARNING] ⚠️ Supabase connection failed: Connection timeout (15s) (at http://localhost:3005/services/requestsService.ts:320:12)
[WARNING] ⚠️ Supabase connection failed: Connection timeout (15s) (at http://localhost:3005/services/requestsService.ts:320:12)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/functions/v1/ai-chat:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/functions/v1/ai-chat:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/rest/v1/requests?select=*%2Crequest_categories%28category_id%2Ccategories%28id%2Clabel%29%29&is_public=eq.true&order=created_at.desc&offset=0&limit=10:0:0)
[ERROR] ❌ Error fetching requests: {message: TypeError: Failed to fetch, details: TypeError: Failed to fetch
    at http://localhost…PublicData (http://localhost:3005/App.tsx:713:56), hint: , code: } (at http://localhost:3005/services/requestsService.ts:282:12)
[ERROR] Error details: {
  "message": "TypeError: Failed to fetch",
  "code": "",
  "details": "TypeError: Failed to fetch\n    at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:11441:23\n    at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:11455:12\n    at async fetchRequestsPaginated (http://localhost:3005/services/requestsService.ts:269:17)\n    at async loadPublicData (http://localhost:3005/App.tsx:713:56)",
  "hint": ""
} (at http://localhost:3005/services/requestsService.ts:283:12)
[ERROR] Error loading public data: {message: TypeError: Failed to fetch, details: TypeError: Failed to fetch
    at http://localhost…PublicData (http://localhost:3005/App.tsx:713:56), hint: , code: } (at http://localhost:3005/App.tsx:720:16)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/rest/v1/requests?select=id&limit=1:0:0)
[ERROR] ❌ Supabase query error: {
  "message": "TypeError: Failed to fetch",
  "code": "",
  "details": "TypeError: Failed to fetch\n    at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:11441:23\n    at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:11455:12\n    at async http://localhost:3005/services/requestsService.ts:306:31\n    at async checkSupabaseConnection (http://localhost:3005/services/requestsService.ts:319:12)\n    at async Promise.all (index 0)",
  "hint": ""
} (at http://localhost:3005/services/requestsService.ts:307:16)
[ERROR] WebSocket connection to 'wss://iwfvlrtmbixequntufjr.supabase.co/realtime/v1/websocket?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3ZnZscnRtYml4ZXF1bnR1ZmpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MzMxMjcsImV4cCI6MjA4MjAwOTEyN30.NCgLu7sP87odD-W3JW8Gp_6BTcI3w4VFgBhskZ5D0RA&vsn=1.0.0' failed: Error in connection establishment: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:1509:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/rest/v1/categories?select=id%2Clabel%2Clabel_en%2Clabel_ur%2Cicon%2Cemoji%2Cdescription&is_active=eq.true&order=sort_order.asc:0:0)
[WARNING] Error fetching categories from backend, using local fallback: TypeError: Failed to fetch (at http://localhost:3005/services/categoriesService.ts:22:14)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/rest/v1/requests?select=id&limit=1:0:0)
[ERROR] ❌ Supabase query error: {
  "message": "TypeError: Failed to fetch",
  "code": "",
  "details": "TypeError: Failed to fetch\n    at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:11441:23\n    at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:11455:12\n    at async http://localhost:3005/services/requestsService.ts:306:31\n    at async checkSupabaseConnection (http://localhost:3005/services/requestsService.ts:319:12)\n    at async Promise.all (index 0)",
  "hint": ""
} (at http://localhost:3005/services/requestsService.ts:307:16)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7ad57f97-1c78-4a5a-ab4a-27cb4d53c5ab/623261dd-4061-4b42-b332-44991ce0250e
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC021
- **Test Name:** Error handling - Display global error boundary fallback UI
- **Test Code:** [TC021_Error_handling___Display_global_error_boundary_fallback_UI.py](./TC021_Error_handling___Display_global_error_boundary_fallback_UI.py)
- **Test Error:** 
Browser Console Logs:
[ERROR] Failed to load resource: net::ERR_CONTENT_LENGTH_MISMATCH (at http://localhost:3005/node_modules/.vite/deps/chunk-KDCVS43I.js?v=83574dff:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7ad57f97-1c78-4a5a-ab4a-27cb4d53c5ab/eb1d02fc-60a2-48e4-9fad-40044247c9a5
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC022
- **Test Name:** File upload and storage for messaging attachments
- **Test Code:** [TC022_File_upload_and_storage_for_messaging_attachments.py](./TC022_File_upload_and_storage_for_messaging_attachments.py)
- **Test Error:** 
Browser Console Logs:
[WARNING] ⚠️ Supabase connection failed: Connection timeout (15s) (at http://localhost:3005/services/requestsService.ts:320:12)
[WARNING] ⚠️ Supabase connection failed: Connection timeout (15s) (at http://localhost:3005/services/requestsService.ts:320:12)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/functions/v1/ai-chat:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/functions/v1/ai-chat:0:0)
[ERROR] WebSocket connection to 'wss://iwfvlrtmbixequntufjr.supabase.co/realtime/v1/websocket?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3ZnZscnRtYml4ZXF1bnR1ZmpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MzMxMjcsImV4cCI6MjA4MjAwOTEyN30.NCgLu7sP87odD-W3JW8Gp_6BTcI3w4VFgBhskZ5D0RA&vsn=1.0.0' failed: Error in connection establishment: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:1509:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/rest/v1/requests?select=*%2Crequest_categories%28category_id%2Ccategories%28id%2Clabel%29%29&is_public=eq.true&order=created_at.desc&offset=0&limit=10:0:0)
[ERROR] ❌ Error fetching requests: {message: TypeError: Failed to fetch, details: TypeError: Failed to fetch
    at http://localhost…PublicData (http://localhost:3005/App.tsx:713:56), hint: , code: } (at http://localhost:3005/services/requestsService.ts:282:12)
[ERROR] Error details: {
  "message": "TypeError: Failed to fetch",
  "code": "",
  "details": "TypeError: Failed to fetch\n    at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:11441:23\n    at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:11455:12\n    at async fetchRequestsPaginated (http://localhost:3005/services/requestsService.ts:269:17)\n    at async loadPublicData (http://localhost:3005/App.tsx:713:56)",
  "hint": ""
} (at http://localhost:3005/services/requestsService.ts:283:12)
[ERROR] Error loading public data: {message: TypeError: Failed to fetch, details: TypeError: Failed to fetch
    at http://localhost…PublicData (http://localhost:3005/App.tsx:713:56), hint: , code: } (at http://localhost:3005/App.tsx:720:16)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/rest/v1/requests?select=id&limit=1:0:0)
[ERROR] ❌ Supabase query error: {
  "message": "TypeError: Failed to fetch",
  "code": "",
  "details": "TypeError: Failed to fetch\n    at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:11441:23\n    at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:11455:12\n    at async http://localhost:3005/services/requestsService.ts:306:31\n    at async checkSupabaseConnection (http://localhost:3005/services/requestsService.ts:319:12)\n    at async Promise.all (index 0)",
  "hint": ""
} (at http://localhost:3005/services/requestsService.ts:307:16)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/rest/v1/categories?select=id%2Clabel%2Clabel_en%2Clabel_ur%2Cicon%2Cemoji%2Cdescription&is_active=eq.true&order=sort_order.asc:0:0)
[WARNING] Error fetching categories from backend, using local fallback: TypeError: Failed to fetch (at http://localhost:3005/services/categoriesService.ts:22:14)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/rest/v1/requests?select=id&limit=1:0:0)
[ERROR] ❌ Supabase query error: {
  "message": "TypeError: Failed to fetch",
  "code": "",
  "details": "TypeError: Failed to fetch\n    at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:11441:23\n    at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:11455:12\n    at async http://localhost:3005/services/requestsService.ts:306:31\n    at async checkSupabaseConnection (http://localhost:3005/services/requestsService.ts:319:12)\n    at async Promise.all (index 0)",
  "hint": ""
} (at http://localhost:3005/services/requestsService.ts:307:16)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7ad57f97-1c78-4a5a-ab4a-27cb4d53c5ab/15f1cd19-63e5-4fba-a9e4-512c6f1b5172
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC023
- **Test Name:** Routing and deep linking supports direct navigation
- **Test Code:** [TC023_Routing_and_deep_linking_supports_direct_navigation.py](./TC023_Routing_and_deep_linking_supports_direct_navigation.py)
- **Test Error:** 
Browser Console Logs:
[WARNING] ⚠️ Supabase connection failed: Connection timeout (15s) (at http://localhost:3005/services/requestsService.ts:320:12)
[WARNING] ⚠️ Supabase connection failed: Connection timeout (15s) (at http://localhost:3005/services/requestsService.ts:320:12)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/functions/v1/ai-chat:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/functions/v1/ai-chat:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/rest/v1/requests?select=*%2Crequest_categories%28category_id%2Ccategories%28id%2Clabel%29%29&is_public=eq.true&order=created_at.desc&offset=0&limit=10:0:0)
[ERROR] ❌ Error fetching requests: {message: TypeError: Failed to fetch, details: TypeError: Failed to fetch
    at http://localhost…PublicData (http://localhost:3005/App.tsx:713:56), hint: , code: } (at http://localhost:3005/services/requestsService.ts:282:12)
[ERROR] Error details: {
  "message": "TypeError: Failed to fetch",
  "code": "",
  "details": "TypeError: Failed to fetch\n    at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:11441:23\n    at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:11455:12\n    at async fetchRequestsPaginated (http://localhost:3005/services/requestsService.ts:269:17)\n    at async loadPublicData (http://localhost:3005/App.tsx:713:56)",
  "hint": ""
} (at http://localhost:3005/services/requestsService.ts:283:12)
[ERROR] Error loading public data: {message: TypeError: Failed to fetch, details: TypeError: Failed to fetch
    at http://localhost…PublicData (http://localhost:3005/App.tsx:713:56), hint: , code: } (at http://localhost:3005/App.tsx:720:16)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/rest/v1/requests?select=id&limit=1:0:0)
[ERROR] ❌ Supabase query error: {
  "message": "TypeError: Failed to fetch",
  "code": "",
  "details": "TypeError: Failed to fetch\n    at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:11441:23\n    at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:11455:12\n    at async http://localhost:3005/services/requestsService.ts:306:31\n    at async checkSupabaseConnection (http://localhost:3005/services/requestsService.ts:319:12)\n    at async Promise.all (index 0)",
  "hint": ""
} (at http://localhost:3005/services/requestsService.ts:307:16)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://iwfvlrtmbixequntufjr.supabase.co/rest/v1/categories?select=id%2Clabel%2Clabel_en%2Clabel_ur%2Cicon%2Cemoji%2Cdescription&is_active=eq.true&order=sort_order.asc:0:0)
[WARNING] Error fetching categories from backend, using local fallback: TypeError: Failed to fetch (at http://localhost:3005/services/categoriesService.ts:22:14)
[ERROR] WebSocket connection to 'wss://iwfvlrtmbixequntufjr.supabase.co/realtime/v1/websocket?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3ZnZscnRtYml4ZXF1bnR1ZmpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MzMxMjcsImV4cCI6MjA4MjAwOTEyN30.NCgLu7sP87odD-W3JW8Gp_6BTcI3w4VFgBhskZ5D0RA&vsn=1.0.0' failed: Error in connection establishment: net::ERR_EMPTY_RESPONSE (at http://localhost:3005/node_modules/.vite/deps/@supabase_supabase-js.js?v=83574dff:1509:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7ad57f97-1c78-4a5a-ab4a-27cb4d53c5ab/726ba442-a3d9-44cb-ba25-e3d40e5cb096
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC024
- **Test Name:** Onboarding flow for first-time users
- **Test Code:** [TC024_Onboarding_flow_for_first_time_users.py](./TC024_Onboarding_flow_for_first_time_users.py)
- **Test Error:** 
Browser Console Logs:
[ERROR] Failed to load resource: net::ERR_CONTENT_LENGTH_MISMATCH (at http://localhost:3005/node_modules/.vite/deps/chunk-KDCVS43I.js?v=83574dff:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7ad57f97-1c78-4a5a-ab4a-27cb4d53c5ab/0ce5dec8-b4d5-4db1-872c-7f559f8d1317
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC025
- **Test Name:** Haptic feedback on mobile devices
- **Test Code:** [TC025_Haptic_feedback_on_mobile_devices.py](./TC025_Haptic_feedback_on_mobile_devices.py)
- **Test Error:** Failed to go to the start URL. Err: Error executing action go_to_url: Page.goto: Timeout 60000ms exceeded.
Call log:
  - navigating to "http://localhost:3005/", waiting until "load"

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/7ad57f97-1c78-4a5a-ab4a-27cb4d53c5ab/1cb5fc2e-ee30-4463-a1fd-5b725d924854
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---


## 3️⃣ Coverage & Matching Metrics

- **0.00** of tests passed

| Requirement        | Total Tests | ✅ Passed | ❌ Failed  |
|--------------------|-------------|-----------|------------|
| ...                | ...         | ...       | ...        |
---


## 4️⃣ Key Gaps / Risks
{AI_GNERATED_KET_GAPS_AND_RISKS}
---