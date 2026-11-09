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
  it("returns a trimmed email and the password", () => {
    expect(
      readCredentials(
        form({ email: "  team@example.com ", password: "secret" }),
      ),
    ).toEqual({
      credentials: { email: "team@example.com", password: "secret" },
    });
  });

  it("rejects an invalid email", () => {
    expect(
      readCredentials(form({ email: "not-an-email", password: "secret" })),
    ).toEqual({ error: "Enter a valid email address." });
  });

  it("rejects an empty password", () => {
    expect(
      readCredentials(form({ email: "team@example.com", password: "" })),
    ).toEqual({ error: "Enter your password." });
  });

  it("ignores a signup intent sent by a modified form", () => {
    expect(
      readCredentials(
        form({
          email: "team@example.com",
          password: "secret",
          intent: "signup",
        }),
      ),
    ).toEqual({
      credentials: { email: "team@example.com", password: "secret" },
    });
  });
});
