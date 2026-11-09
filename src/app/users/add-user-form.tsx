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
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { MIN_PASSWORD_LENGTH, ROLE_LABELS, ROLES } from "@/lib/roles";
import { addUser } from "./actions";

export function AddUserForm() {
  const [state, formAction, isPending] = useActionState(addUser, {
    error: null,
    message: null,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Add a user</h2>
        </CardTitle>
        <CardDescription>
          Share the email and password with them. They can log in right away.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="new-email">Email</Label>
            <Input
              id="new-email"
              name="email"
              type="email"
              autoComplete="off"
              required
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">Password</Label>
            <Input
              id="new-password"
              name="password"
              type="text"
              autoComplete="off"
              minLength={MIN_PASSWORD_LENGTH}
              required
              className="h-10"
            />
            <p className="text-xs text-muted-foreground">
              At least {MIN_PASSWORD_LENGTH} characters. Shown as you type so
              you can copy it for them.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-role">Role</Label>
            <NativeSelect
              id="new-role"
              name="role"
              size="lg"
              className="w-full"
              defaultValue="user"
            >
              {ROLES.map((role) => (
                <NativeSelectOption key={role} value={role}>
                  {ROLE_LABELS[role]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          {state.error && (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}
          {state.message && (
            <p role="status" className="text-sm text-muted-foreground">
              {state.message}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Adding..." : "Add user"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
