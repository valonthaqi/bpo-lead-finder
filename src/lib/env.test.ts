import { afterEach, describe, expect, it, vi } from "vitest";
import { readEnv } from "./env";

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
