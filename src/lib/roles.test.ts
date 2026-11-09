import { describe, expect, it } from "vitest";
import { isAdminRole, readNewUser, readRole, readRoleChange } from "./roles";

function form(values: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }
  return formData;
}

const USER_ID = "3f2b8c4e-1d2a-4b5c-9e8f-0a1b2c3d4e5f";

describe("readRole", () => {
  it("reads an admin role", () => {
    expect(readRole({ role: "admin", provider: "email" })).toBe("admin");
  });

  it("reads a user role", () => {
    expect(readRole({ role: "user" })).toBe("user");
  });

  it("reads the owner role", () => {
    expect(readRole({ role: "owner" })).toBe("owner");
  });

  it("treats a missing or unknown role as a user", () => {
    expect(readRole({ provider: "email" })).toBe("user");
    expect(readRole({ role: "superuser" })).toBe("user");
    expect(readRole(undefined)).toBe("user");
  });
});

describe("readNewUser", () => {
  it("returns a trimmed email, the password and the role", () => {
    expect(
      readNewUser(
        form({
          email: " new@example.com ",
          password: "long enough",
          role: "admin",
        }),
      ),
    ).toEqual({
      newUser: {
        email: "new@example.com",
        password: "long enough",
        role: "admin",
      },
    });
  });

  it("rejects a short password", () => {
    expect(
      readNewUser(
        form({ email: "new@example.com", password: "short", role: "user" }),
      ),
    ).toEqual({ error: "Use at least 8 characters for the password." });
  });

  it("refuses to create an owner", () => {
    expect(
      readNewUser(
        form({
          email: "new@example.com",
          password: "long enough",
          role: "owner",
        }),
      ),
    ).toHaveProperty("error");
  });

  it("rejects an unknown role", () => {
    expect(
      readNewUser(
        form({
          email: "new@example.com",
          password: "long enough",
          role: "superuser",
        }),
      ),
    ).toHaveProperty("error");
  });
});

describe("readRoleChange", () => {
  it("returns the user id and the new role", () => {
    expect(readRoleChange(form({ userId: USER_ID, role: "admin" }))).toEqual({
      roleChange: { userId: USER_ID, role: "admin" },
    });
  });

  it("refuses to make anyone the owner", () => {
    expect(
      readRoleChange(form({ userId: USER_ID, role: "owner" })),
    ).toHaveProperty("error");
  });

  it("rejects an id that isn't a uuid", () => {
    expect(readRoleChange(form({ userId: "1", role: "admin" }))).toEqual({
      error: "Choose a valid user.",
    });
  });
});

describe("isAdminRole", () => {
  it("counts the owner and admins as admins", () => {
    expect(isAdminRole("owner")).toBe(true);
    expect(isAdminRole("admin")).toBe(true);
    expect(isAdminRole("user")).toBe(false);
  });
});
