import { describe, expect, it } from "vitest";
import { dedupeCompanies, type CompanyDraft } from "./dedupe";

function draft(overrides: Partial<CompanyDraft>): CompanyDraft {
  return {
    name: "Some Company",
    domains: ["some.com"],
    phones: [],
    emails: [],
    address: null,
    socialLinks: [],
    pages: [],
    results: [],
    ...overrides,
  };
}

describe("dedupeCompanies", () => {
  it("keeps different companies apart", () => {
    const companies = dedupeCompanies([
      draft({ name: "Zards BPO", domains: ["zardsbpo.com"] }),
      draft({ name: "Prime BPO", domains: ["primebpo.com"] }),
    ]);
    expect(companies).toHaveLength(2);
  });

  it("merges on a shared phone number and combines details", () => {
    const [company, ...rest] = dedupeCompanies([
      draft({
        name: "Alpha Calls",
        domains: ["alpha.com"],
        phones: ["+923001234567"],
        emails: ["info@alpha.com"],
      }),
      draft({
        name: "Beta Contact",
        domains: ["beta.pk"],
        phones: ["+923001234567"],
        address: "Karachi",
      }),
    ]);
    expect(rest).toHaveLength(0);
    expect(company.domains.sort()).toEqual(["alpha.com", "beta.pk"]);
    expect(company.emails).toEqual(["info@alpha.com"]);
    expect(company.address).toBe("Karachi");
  });

  it("merges on a similar name despite legal words", () => {
    const companies = dedupeCompanies([
      draft({ name: "Zards BPO", domains: ["zardsbpo.com"] }),
      draft({ name: "Zards BPO (Pvt) Ltd", domains: ["zards.pk"] }),
    ]);
    expect(companies).toHaveLength(1);
  });

  it("does not merge on a shared generic word", () => {
    const companies = dedupeCompanies([
      draft({ name: "Zards BPO", domains: ["a.com"] }),
      draft({ name: "Nextel BPO", domains: ["b.com"] }),
    ]);
    expect(companies).toHaveLength(2);
  });

  it("joins two groups when a later company links them", () => {
    const companies = dedupeCompanies([
      draft({ name: "One", domains: ["a.com"], phones: ["+1"] }),
      draft({ name: "Two", domains: ["b.com"], phones: ["+2"] }),
      draft({ name: "Three", domains: ["c.com"], phones: ["+1", "+2"] }),
    ]);
    expect(companies).toHaveLength(1);
    expect(companies[0].domains).toHaveLength(3);
  });
});
