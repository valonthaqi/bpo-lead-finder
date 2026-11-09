"use server";

import { redirect } from "next/navigation";
import { readCredentials } from "@/lib/credentials";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AuthFormState = { error: string | null };

export async function authenticate(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = readCredentials(formData);
  if ("error" in parsed) return { error: parsed.error };

  const { email, password, intent } = parsed.credentials;
  const supabase = await createSupabaseServerClient();

  if (intent === "login") {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return { error: error.message };
  } else {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    if (!data.session) {
      return {
        error:
          "Account created, but Supabase is asking for email confirmation. Turn off Confirm email in the Supabase dashboard, or confirm from your inbox.",
      };
    }
  }

  redirect("/");
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
