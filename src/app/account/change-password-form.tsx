"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MIN_PASSWORD_LENGTH } from "@/lib/passwords";
import { changePassword } from "./actions";

const FIELDS = [
  {
    name: "currentPassword",
    label: "Current password",
    autoComplete: "current-password",
  },
  { name: "newPassword", label: "New password", autoComplete: "new-password" },
  {
    name: "confirmPassword",
    label: "Confirm new password",
    autoComplete: "new-password",
  },
];

export function ChangePasswordForm() {
  const [state, formAction, isPending] = useActionState(changePassword, {
    error: null,
    message: null,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Change password</h2>
        </CardTitle>
        <CardDescription>
          Replace the password your admin gave you with one only you know. At
          least {MIN_PASSWORD_LENGTH} characters.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-5">
          {FIELDS.map((field) => (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={field.name}>{field.label}</Label>
              <Input
                id={field.name}
                name={field.name}
                type="password"
                autoComplete={field.autoComplete}
                minLength={
                  field.name === "currentPassword"
                    ? undefined
                    : MIN_PASSWORD_LENGTH
                }
                required
                className="h-10"
              />
            </div>
          ))}
          {state.error && (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}
          {state.message && (
            <p
              role="status"
              className="text-sm text-green-700 dark:text-green-400"
            >
              {state.message}
            </p>
          )}
          <Button type="submit" disabled={isPending}>
            {isPending ? "Changing..." : "Change password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
