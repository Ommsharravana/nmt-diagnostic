import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Public client — for anon reads/writes (public API routes, client-side). */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Admin client — bypasses RLS. Use ONLY in `/api/admin/**` server routes after
 * the `x-admin-password` check passes. Never import into client components.
 *
 * Falls back to anon key if SUPABASE_SERVICE_ROLE_KEY is not set so local dev
 * continues to work, but DELETE/UPDATE will silently fail the same way the
 * production bug did. Set the env var in Vercel + .env.local.
 */
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRoleKey ?? supabaseAnonKey,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
