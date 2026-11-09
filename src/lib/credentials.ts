import { z } from "zod";

const credentialsSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export type Credentials = z.infer<typeof credentialsSchema>;

export function readCredentials(
  formData: FormData,
): { credentials: Credentials } | { error: string } {
  const result = credentialsSchema.safeParse({
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  });
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }
  return { credentials: result.data };
}
