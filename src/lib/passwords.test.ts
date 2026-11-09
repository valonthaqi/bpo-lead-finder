import { describe, expect, it } from "vitest";
import { readPasswordChange } from "./passwords";

function form(values: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }
  return formData;
}

describe("readPasswordChange", () => {
  it("returns the current and new passwords", () => {
    expect(
      readPasswordChange(
        form({
          currentPassword: "given by admin",
          newPassword: "my own secret",
          confirmPassword: "my own secret",
        }),
      ),
    ).toEqual({
      passwordChange: {
        currentPassword: "given by admin",
        newPassword: "my own secret",
      },
    });
  });

  it("requires the current password", () => {
    expect(
      readPasswordChange(
        form({
          currentPassword: "",
          newPassword: "my own secret",
          confirmPassword: "my own secret",
        }),
      ),
    ).toEqual({ error: "Enter your current password." });
  });

  it("rejects a short new password", () => {
    expect(
      readPasswordChange(
        form({
          currentPassword: "given by admin",
          newPassword: "short",
          confirmPassword: "short",
        }),
      ),
    ).toEqual({ error: "Use at least 8 characters for the password." });
  });

  it("rejects a confirmation that doesn't match", () => {
    expect(
      readPasswordChange(
        form({
          currentPassword: "given by admin",
          newPassword: "my own secret",
          confirmPassword: "my own secrte",
        }),
      ),
    ).toEqual({ error: "The new passwords don't match." });
  });

  it("rejects reusing the current password", () => {
    expect(
      readPasswordChange(
        form({
          currentPassword: "given by admin",
          newPassword: "given by admin",
          confirmPassword: "given by admin",
        }),
      ),
    ).toEqual({ error: "Choose a password different from your current one." });
  });
});
