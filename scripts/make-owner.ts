import { createClient } from "@supabase/supabase-js";
import { readSupabaseAdminEnv } from "../src/lib/env";
import { readRole } from "../src/lib/roles";

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    throw new Error("Usage: npm run users:make-owner -- you@example.com");
  }

  const env = readSupabaseAdminEnv();
  const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SECRET_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { data, error } = await supabase.auth.admin.listUsers({
    perPage: 1000,
  });
  if (error) throw error;

  const user = data.users.find((candidate) => candidate.email === email);
  if (!user) {
    throw new Error(
      `No user with the email ${email}. Add it in Supabase under Authentication > Users first.`,
    );
  }

  const otherOwner = data.users.find(
    (candidate) =>
      candidate.id !== user.id && readRole(candidate.app_metadata) === "owner",
  );
  if (otherOwner) {
    throw new Error(
      `${otherOwner.email} is already the owner. There can only be one.`,
    );
  }

  const { error: updateError } = await supabase.auth.admin.updateUserById(
    user.id,
    { app_metadata: { ...user.app_metadata, role: "owner" } },
  );
  if (updateError) throw updateError;

  console.log(
    `${email} is now the owner. Sign out and back in to see everyone on the Users page.`,
  );
}

main().catch((error: Error) => {
  console.error(error.message);
  process.exit(1);
});
