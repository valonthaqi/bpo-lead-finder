import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readSupabaseEnv } from "@/lib/env";
import { readMember } from "@/lib/permissions";
import { isAdminRole, readRole } from "@/lib/roles";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const env = readSupabaseEnv();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            return;
          }
        },
      },
    },
  );
}

export async function getSignedInUser() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  if (!data) return null;
  return {
    email: data.claims.email ?? "",
    role: readRole(data.claims.app_metadata),
  };
}

export async function getViewer() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  if (!data) return null;
  return readMember({
    id: data.claims.sub,
    app_metadata: data.claims.app_metadata,
  });
}

export async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/");
  const member = readMember(data.user);
  if (!isAdminRole(member.role)) redirect("/");
  return member;
}
