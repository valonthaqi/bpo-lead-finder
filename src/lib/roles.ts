import { z } from "zod";
import { newPasswordSchema } from "./passwords";

export const ASSIGNABLE_ROLES = ["admin", "user"] as const;

export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

export type Role = AssignableRole | "owner";

export const ROLE_LABELS: Record<Role, string> = {
  owner: "Owner",
  admin: "Admin",
  user: "User",
};

const roleSchema = z.enum(ASSIGNABLE_ROLES);

const storedRoleSchema = z.enum(["owner", ...ASSIGNABLE_ROLES]);

export function readRole(appMetadata: unknown): Role {
  const result = z.object({ role: storedRoleSchema }).safeParse(appMetadata);
  return result.success ? result.data.role : "user";
}

export function isAdminRole(role: Role) {
  return role === "owner" || role === "admin";
}

const newUserSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: newPasswordSchema,
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
