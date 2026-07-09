import { createClient } from '@supabase/supabase-js';

// Anon keys are public by design (they already ship inside every app build —
// see brands/*/manifest.json). Real access control is Supabase Auth + RLS.
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ?? 'https://kkjjbjrebeoekindsihw.supabase.co';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrampianJlYmVvZWtpbmRzaWh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNjg4NDAsImV4cCI6MjA5MDY0NDg0MH0.i6s9I8IULUc6jLlTXLmGSmWMDBkDN0CsmMt5uG5I_2s';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export { SUPABASE_URL };
