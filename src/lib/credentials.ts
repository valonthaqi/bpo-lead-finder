import { z } from "zod";

export const MIN_PASSWORD_LENGTH = 8;

const credentialsSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z
    .string()
    .min(
      MIN_PASSWORD_LENGTH,
      `Use at least ${MIN_PASSWORD_LENGTH} characters for the password.`,
    ),
  intent: z.enum(["login", "signup"]),
});

export type Credentials = z.infer<typeof credentialsSchema>;

export function readCredentials(
  formData: FormData,
): { credentials: Credentials } | { error: string } {
  const result = credentialsSchema.safeParse({
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
    intent: formData.get("intent"),
  });
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }
  return { credentials: result.data };
}
