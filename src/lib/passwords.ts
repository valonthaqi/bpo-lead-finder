import { z } from "zod";

export const MIN_PASSWORD_LENGTH = 8;

export const newPasswordSchema = z
  .string()
  .min(
    MIN_PASSWORD_LENGTH,
    `Use at least ${MIN_PASSWORD_LENGTH} characters for the password.`,
  );

const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: newPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((change) => change.newPassword === change.confirmPassword, {
    message: "The new passwords don't match.",
  })
  .refine((change) => change.newPassword !== change.currentPassword, {
    message: "Choose a password different from your current one.",
  });

export type PasswordChange = { currentPassword: string; newPassword: string };

export function readPasswordChange(
  formData: FormData,
): { passwordChange: PasswordChange } | { error: string } {
  const result = passwordChangeSchema.safeParse({
    currentPassword: String(formData.get("currentPassword") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  });
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }
  const { currentPassword, newPassword } = result.data;
  return { passwordChange: { currentPassword, newPassword } };
}
