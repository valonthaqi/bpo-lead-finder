"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { canManageUser, readMember, type Member } from "@/lib/permissions";
import { readNewUser, readRoleChange } from "@/lib/roles";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/server";

export type ActionState = { error: string | null; message: string | null };

const NOT_ALLOWED = "You don't have permission to change this user.";

async function findManageableUser(actor: Member, userId: string) {
  const { data, error } =
    await createSupabaseAdminClient().auth.admin.getUserById(userId);
  if (error || !data.user) return null;
  if (!canManageUser(actor, readMember(data.user))) return null;
  return data.user;
}

export async function addUser(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireAdmin();
  const parsed = readNewUser(formData);
  if ("error" in parsed) return { error: parsed.error, message: null };

  const { email, password, role } = parsed.newUser;
  const { error } = await createSupabaseAdminClient().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role, created_by: actor.id },
  });
  if (error) return { error: error.message, message: null };

  revalidatePath("/users");
  return { error: null, message: `Added ${email}.` };
}

export async function changeRole(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireAdmin();
  const parsed = readRoleChange(formData);
  if ("error" in parsed) return { error: parsed.error, message: null };

  const { userId, role } = parsed.roleChange;
  const target = await findManageableUser(actor, userId);
  if (!target) return { error: NOT_ALLOWED, message: null };

  const { error } = await createSupabaseAdminClient().auth.admin.updateUserById(
    userId,
    { app_metadata: { ...target.app_metadata, role } },
  );
  if (error) return { error: error.message, message: null };

  revalidatePath("/users");
  return { error: null, message: "Role saved." };
}

export async function removeUser(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireAdmin();
  const userId = z.uuid().safeParse(formData.get("userId"));
  if (!userId.success) return { error: "Choose a valid user.", message: null };

  const target = await findManageableUser(actor, userId.data);
  if (!target) return { error: NOT_ALLOWED, message: null };

  const { error } = await createSupabaseAdminClient().auth.admin.deleteUser(
    userId.data,
  );
  if (error) return { error: error.message, message: null };

  revalidatePath("/users");
  return { error: null, message: null };
}
