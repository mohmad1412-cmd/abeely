// Re-export from main supabaseClient to prevent multiple instances
// This file is for Android-specific builds but should use the same client instance
export { supabase } from '../../../../services/supabaseClient';
