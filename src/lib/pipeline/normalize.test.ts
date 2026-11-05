import { describe, expect, it } from "vitest";
import { getRootDomain, normalizeDomain } from "./normalize";

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

describe("getRootDomain", () => {
  it("removes subdomains", () => {
    expect(getRootDomain("crm.indus-bpo.com")).toBe("indus-bpo.com");
  });

  it("keeps country suffixes with two parts", () => {
    expect(getRootDomain("jobs.statelife.com.pk")).toBe("statelife.com.pk");
  });

  it("leaves a single-part country suffix alone", () => {
    expect(getRootDomain("roboconnect.pk")).toBe("roboconnect.pk");
  });
});
