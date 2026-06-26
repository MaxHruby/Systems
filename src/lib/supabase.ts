import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Server-only klient se service-role klíčem. RLS je zapnuté bez policy,
// takže veškerý přístup jde přes tento server klient. NIKDY neimportovat
// do client komponent.
let cached: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Chybí SUPABASE_URL nebo SUPABASE_SERVICE_ROLE_KEY v prostředí. Doplň .env.local (viz .env.example)."
    );
  }

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
