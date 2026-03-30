import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Suporta tanto o padrão Vite quanto o padrão Next.js (conforme fornecido pelo usuário)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.warn("Supabase credentials not found. Please check your environment variables.");
}

export const supabase = createClient<Database>(
  SUPABASE_URL || "", 
  SUPABASE_PUBLISHABLE_KEY || "", 
  {
    auth: {
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    }
  }
);
