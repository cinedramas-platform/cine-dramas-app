import { createClient } from '@supabase/supabase-js';

// Anon keys are public by design (they already ship inside every app build —
// see brands/*/manifest.json). Real access control is Supabase Auth + RLS.
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ?? 'https://qbwrqfajnpgfesmndskt.supabase.co';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFid3JxZmFqbnBnZmVzbW5kc2t0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQyNDM2MzgsImV4cCI6MjEwOTgxOTYzOH0.-Vvp33pxE4X7nzy_Df4QxxEB3DeMrXYBNXzdh4RxRxU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export { SUPABASE_URL };
