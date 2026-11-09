"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { readNewUser, readRoleChange } from "@/lib/roles";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/server";

export type ActionState = { error: string | null; message: string | null };

export async function addUser(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const parsed = readNewUser(formData);
  if ("error" in parsed) return { error: parsed.error, message: null };

  const { email, password, role } = parsed.newUser;
  const { error } = await createSupabaseAdminClient().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role },
  });
  if (error) return { error: error.message, message: null };

  revalidatePath("/users");
  return { error: null, message: `Added ${email}.` };
}

export async function changeRole(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = readRoleChange(formData);
  if ("error" in parsed) return { error: parsed.error, message: null };

  const { userId, role } = parsed.roleChange;
  if (userId === admin.id) {
    return { error: "You can't change your own role.", message: null };
  }

  const { error } = await createSupabaseAdminClient().auth.admin.updateUserById(
    userId,
    { app_metadata: { role } },
  );
  if (error) return { error: error.message, message: null };

  revalidatePath("/users");
  return { error: null, message: "Role saved." };
}

export async function removeUser(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();
  const userId = z.uuid().safeParse(formData.get("userId"));
  if (!userId.success) return { error: "Choose a valid user.", message: null };
  if (userId.data === admin.id) {
    return { error: "You can't remove yourself.", message: null };
  }

  const { error } = await createSupabaseAdminClient().auth.admin.deleteUser(
    userId.data,
  );
  if (error) return { error: error.message, message: null };

  revalidatePath("/users");
  return { error: null, message: null };
}
