import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseKey = (import.meta as any).env.VITE_SUPABASE_KEY;

// Check if variables are available and not placeholder/empty
export const isSupabaseConfigured = 
  !!supabaseUrl && 
  !!supabaseKey && 
  supabaseUrl !== 'YOUR_SUPABASE_URL' && 
  supabaseKey !== 'YOUR_SUPABASE_KEY';

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : null;
