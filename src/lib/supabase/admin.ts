import { createClient } from "@supabase/supabase-js";
import { readSupabaseAdminEnv } from "@/lib/env";

export function createSupabaseAdminClient() {
  const env = readSupabaseAdminEnv();
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
