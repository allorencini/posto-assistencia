// Supabase client setup
// Replace these with your actual Supabase project values
const SUPABASE_URL = 'https://hhtxaeauuutmuwwkotgf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhodHhhZWF1dXV0bXV3d2tvdGdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzY2MzAsImV4cCI6MjA5MTQxMjYzMH0.owJaGtcTBUXpzGboXIcXnDPlYMddQ7jcXNE0hoFTP8s';

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
