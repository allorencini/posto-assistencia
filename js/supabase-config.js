// Supabase client setup
// Replace these with your actual Supabase project values
const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';

// Import Supabase client from CDN
let supabase = null;

export async function getSupabase() {
  if (supabase) return supabase;

  // Dynamic import from CDN
  const { createClient } = await import(
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'
  );
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return supabase;
}

export function isConfigured() {
  return !SUPABASE_URL.includes('YOUR_PROJECT_ID');
}
