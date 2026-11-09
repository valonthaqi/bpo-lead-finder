"use server";

import { redirect } from "next/navigation";
import { readCredentials } from "@/lib/credentials";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type LoginFormState = { error: string | null; email: string };

export async function logIn(
  _previousState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const email = String(formData.get("email") ?? "");
  const parsed = readCredentials(formData);
  if ("error" in parsed) return { error: parsed.error, email };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.credentials);
  if (error) return { error: error.message, email };

  redirect("/");
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
