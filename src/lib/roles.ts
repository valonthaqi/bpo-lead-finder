import { z } from "zod";

export const ROLES = ["admin", "user"] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  user: "User",
};

export const MIN_PASSWORD_LENGTH = 8;

const roleSchema = z.enum(ROLES);

export function readRole(appMetadata: unknown): Role {
  const result = z.object({ role: roleSchema }).safeParse(appMetadata);
  return result.success ? result.data.role : "user";
}

const newUserSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z
    .string()
    .min(
      MIN_PASSWORD_LENGTH,
      `Use at least ${MIN_PASSWORD_LENGTH} characters for the password.`,
    ),
  role: roleSchema,
});

export type NewUser = z.infer<typeof newUserSchema>;

export function readNewUser(
  formData: FormData,
): { newUser: NewUser } | { error: string } {
  const result = newUserSchema.safeParse({
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
    role: formData.get("role"),
  });
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }
  return { newUser: result.data };
}

const roleChangeSchema = z.object({
  userId: z.uuid("Choose a valid user."),
  role: roleSchema,
});

export type RoleChange = z.infer<typeof roleChangeSchema>;

export function readRoleChange(
  formData: FormData,
): { roleChange: RoleChange } | { error: string } {
  const result = roleChangeSchema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
  });
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }
  return { roleChange: result.data };
}
