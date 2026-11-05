import { describe, expect, it } from "vitest";
import { normalizeDomain } from "./normalize";

describe("normalizeDomain", () => {
  it("removes www and the path", () => {
    expect(normalizeDomain("https://www.Example.com/contact?x=1")).toBe(
      "example.com",
    );
  });

  it("keeps other subdomains", () => {
    expect(normalizeDomain("https://careers.example.com")).toBe(
      "careers.example.com",
    );
  });

  it("returns null for an invalid URL", () => {
    expect(normalizeDomain("not a url")).toBeNull();
  });
});
