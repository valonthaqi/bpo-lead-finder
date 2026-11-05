import { describe, expect, it } from "vitest";
import {
  getNameSimilarity,
  getRootDomain,
  normalizeCompanyName,
  normalizeDomain,
  normalizePhone,
} from "./normalize";

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

  it("keeps less common country suffixes with two parts", () => {
    expect(getRootDomain("nru.uncst.go.ug")).toBe("uncst.go.ug");
  });

  it("leaves a single-part country suffix alone", () => {
    expect(getRootDomain("roboconnect.pk")).toBe("roboconnect.pk");
  });
});

describe("normalizePhone", () => {
  it("converts a local number to E.164 using the country", () => {
    expect(normalizePhone("0300 1234567", "PK")).toBe("+923001234567");
  });

  it("gives the same result for different formats", () => {
    expect(normalizePhone("+92 300 123-4567", "PK")).toBe(
      normalizePhone("03001234567", "PK"),
    );
  });

  it("returns null for an invalid number", () => {
    expect(normalizePhone("12345", "PK")).toBeNull();
  });
});

describe("normalizeCompanyName", () => {
  it("removes case, punctuation and legal words", () => {
    expect(normalizeCompanyName("Zards BPO (Pvt.) Ltd.")).toBe("zards bpo");
  });

  it("removes accents", () => {
    expect(normalizeCompanyName("Atención Bogotá")).toBe("atencion bogota");
  });
});

describe("getNameSimilarity", () => {
  it("scores the same company 1 despite legal words", () => {
    expect(getNameSimilarity("Zards BPO", "Zards BPO LLC")).toBe(1);
  });

  it("scores companies sharing only a generic word low", () => {
    expect(getNameSimilarity("Zards BPO", "Prime BPO")).toBeLessThan(0.5);
  });

  it("scores an empty name 0", () => {
    expect(getNameSimilarity("", "Zards BPO")).toBe(0);
  });
});
