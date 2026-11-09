import { describe, expect, it } from "vitest";
import { readCredentials } from "./credentials";

function form(values: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }
  return formData;
}

describe("readCredentials", () => {
  it("returns a trimmed email, the password and the intent", () => {
    expect(
      readCredentials(
        form({
          email: "  team@example.com ",
          password: "long enough",
          intent: "signup",
        }),
      ),
    ).toEqual({
      credentials: {
        email: "team@example.com",
        password: "long enough",
        intent: "signup",
      },
    });
  });

  it("rejects an invalid email", () => {
    expect(
      readCredentials(
        form({
          email: "not-an-email",
          password: "long enough",
          intent: "login",
        }),
      ),
    ).toEqual({ error: "Enter a valid email address." });
  });

  it("rejects a short password", () => {
    expect(
      readCredentials(
        form({ email: "team@example.com", password: "short", intent: "login" }),
      ),
    ).toEqual({ error: "Use at least 8 characters for the password." });
  });

  it("rejects an unknown intent", () => {
    expect(
      readCredentials(
        form({
          email: "team@example.com",
          password: "long enough",
          intent: "delete",
        }),
      ),
    ).toHaveProperty("error");
  });
});
