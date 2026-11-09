"use client";

import { useActionState, useState } from "react";
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
import { MIN_PASSWORD_LENGTH } from "@/lib/credentials";
import { authenticate } from "./actions";

type Mode = "login" | "signup";

const COPY: Record<
  Mode,
  {
    title: string;
    description: string;
    submit: string;
    submitting: string;
    switchPrompt: string;
    switchLabel: string;
  }
> = {
  login: {
    title: "Log in",
    description: "Sign in to find and review call center leads.",
    submit: "Log in",
    submitting: "Logging in...",
    switchPrompt: "No account yet?",
    switchLabel: "Create one",
  },
  signup: {
    title: "Create an account",
    description: "Everyone on the team sees the same searches and results.",
    submit: "Create account",
    submitting: "Creating account...",
    switchPrompt: "Already have an account?",
    switchLabel: "Log in",
  },
};

export function AuthForm() {
  const [mode, setMode] = useState<Mode>("login");
  const [state, formAction, isPending] = useActionState(authenticate, {
    error: null,
  });
  const copy = COPY[mode];

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1 className="text-xl">{copy.title}</h1>
        </CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-5">
          <input type="hidden" name="intent" value={mode} />
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              minLength={MIN_PASSWORD_LENGTH}
              required
              className="h-10"
            />
            {mode === "signup" && (
              <p className="text-xs text-muted-foreground">
                At least {MIN_PASSWORD_LENGTH} characters.
              </p>
            )}
          </div>
          {state.error && (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={isPending}
          >
            {isPending ? copy.submitting : copy.submit}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {copy.switchPrompt}{" "}
          <button
            type="button"
            className="font-medium text-foreground underline-offset-4 hover:underline"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
          >
            {copy.switchLabel}
          </button>
        </p>
      </CardContent>
    </Card>
  );
}
