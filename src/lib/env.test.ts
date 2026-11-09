import { afterEach, describe, expect, it, vi } from "vitest";
import { readEnv, readSupabaseAdminEnv, readSupabaseEnv } from "./env";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("readEnv", () => {
  it("returns valid values", () => {
    vi.stubEnv("DATABASE_URL", "postgresql://user:secret@host:5432/postgres");
    vi.stubEnv("SEARCH_API_KEY", "tvly-abc");
    expect(readEnv().SEARCH_API_KEY).toBe("tvly-abc");
  });

  it("names every missing value", () => {
    vi.stubEnv("DATABASE_URL", undefined);
    vi.stubEnv("SEARCH_API_KEY", undefined);
    expect(() => readEnv()).toThrow(
      "DATABASE_URL is missing. SEARCH_API_KEY is missing",
    );
  });

  it("does not repeat a bad value in the error", () => {
    vi.stubEnv("DATABASE_URL", "mysql://user:secret@host/db");
    vi.stubEnv("SEARCH_API_KEY", "tvly-abc");
    expect(() => readEnv()).toThrow("DATABASE_URL must be a Postgres URL");
    expect(() => readEnv()).not.toThrow("secret");
  });
});

describe("readSupabaseEnv", () => {
  it("returns valid values", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abcdef.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "public-key");
    expect(readSupabaseEnv().NEXT_PUBLIC_SUPABASE_URL).toBe(
      "https://abcdef.supabase.co",
    );
  });

  it("names every missing value", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", undefined);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", undefined);
    expect(() => readSupabaseEnv()).toThrow(
      "NEXT_PUBLIC_SUPABASE_URL is missing. NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing",
    );
  });

  it("rejects a database URL pasted as the project URL", () => {
    vi.stubEnv(
      "NEXT_PUBLIC_SUPABASE_URL",
      "postgresql://user:secret@host:5432/postgres",
    );
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "public-key");
    expect(() => readSupabaseEnv()).toThrow("must look like");
    expect(() => readSupabaseEnv()).not.toThrow("secret");
  });

  it("refuses a secret key in a public setting without repeating it", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abcdef.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_secret_abc123");
    expect(() => readSupabaseEnv()).toThrow("not a secret key");
    expect(() => readSupabaseEnv()).not.toThrow("abc123");
  });
});

describe("readSupabaseAdminEnv", () => {
  it("returns the URL and the secret key", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abcdef.supabase.co");
    vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_abc123");
    expect(readSupabaseAdminEnv().SUPABASE_SECRET_KEY).toBe("sb_secret_abc123");
  });

  it("names a missing secret key", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abcdef.supabase.co");
    vi.stubEnv("SUPABASE_SECRET_KEY", undefined);
    expect(() => readSupabaseAdminEnv()).toThrow(
      "SUPABASE_SECRET_KEY is missing",
    );
  });

  it("refuses a publishable key without repeating it", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abcdef.supabase.co");
    vi.stubEnv("SUPABASE_SECRET_KEY", "sb_publishable_xyz789");
    expect(() => readSupabaseAdminEnv()).toThrow("must be a secret key");
    expect(() => readSupabaseAdminEnv()).not.toThrow("xyz789");
  });
});
