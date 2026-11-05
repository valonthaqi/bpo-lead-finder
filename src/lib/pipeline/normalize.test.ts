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

  it("reads a US toll-free number as US, not as the selected country", () => {
    expect(normalizePhone("888.766.4482", "PK")).toBe("+18887664482");
    expect(normalizePhone("(866) 728-0264", "CO")).toBe("+18667280264");
    expect(normalizePhone("1.888.420.3282", "CO")).toBe("+18884203282");
  });

  it("reads an unprefixed US number as US where local numbers start with 0", () => {
    expect(normalizePhone("(817) 900-8030", "PK")).toBe("+18179008030");
  });

  it("keeps a Pakistani mobile written without its leading zero", () => {
    expect(normalizePhone("300 1234567", "PK")).toBe("+923001234567");
  });

  it("keeps a Colombian mobile that also looks like a US number", () => {
    expect(normalizePhone("304 450 8102", "CO")).toBe("+573044508102");
  });

  it("trusts an explicit country code", () => {
    expect(normalizePhone("+1 470 767 3784", "CO")).toBe("+14707673784");
    expect(normalizePhone("+57 304 450 8102", "PK")).toBe("+573044508102");
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
