"use server";

import { readPasswordChange } from "@/lib/passwords";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type PasswordFormState = {
  error: string | null;
  message: string | null;
};

export async function changePassword(
  _previousState: PasswordFormState,
  formData: FormData,
): Promise<PasswordFormState> {
  const parsed = readPasswordChange(formData);
  if ("error" in parsed) return { error: parsed.error, message: null };

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user?.email) {
    return { error: "Please log in again.", message: null };
  }

  const { currentPassword, newPassword } = parsed.passwordChange;
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: data.user.email,
    password: currentPassword,
  });
  if (signInError) {
    return { error: "Your current password is incorrect.", message: null };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });
  if (updateError) return { error: updateError.message, message: null };

  await supabase.auth.signOut({ scope: "others" });
  return {
    error: null,
    message: "Password changed. You've been signed out everywhere else.",
  };
}
