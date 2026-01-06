/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Supabase
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  
  // Google
  readonly VITE_GOOGLE_CLIENT_ID: string
  readonly VITE_GOOGLE_MAPS_API_KEY: string
  readonly VITE_GOOGLE_MAPS_MAP_ID: string
  
  // AI Services
  readonly VITE_ANTHROPIC_API_KEY: string
  readonly VITE_OPENAI_API_KEY: string
  readonly VITE_GEMINI_API_KEY: string
  
  // Twilio (for SMS verification)
  readonly VITE_TWILIO_ACCOUNT_SID: string
  readonly VITE_TWILIO_AUTH_TOKEN: string
  readonly VITE_TWILIO_VERIFY_SERVICE_SID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
