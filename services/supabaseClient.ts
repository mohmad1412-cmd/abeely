import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase env vars missing!');
  console.error('Missing:', {
    url: !supabaseUrl ? 'VITE_SUPABASE_URL' : null,
    key: !supabaseAnonKey ? 'VITE_SUPABASE_ANON_KEY' : null
  });
} else {
  console.log('✅ Supabase env vars loaded:', {
    url: supabaseUrl,
    urlPreview: supabaseUrl.substring(0, 30) + '...',
    hasKey: !!supabaseAnonKey,
    keyPreview: supabaseAnonKey?.substring(0, 20) + '...'
  });
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
