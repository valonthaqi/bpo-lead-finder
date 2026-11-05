import { describe, expect, it } from "vitest";
import type { Filters } from "../filters";
import type { CompanyDraft } from "./dedupe";
import type { ExtractedPage } from "./extract";
import { buildMention, scoreCompany } from "./score";

const filters: Filters = {
  countryId: "pakistan",
  marketId: "english",
  campaignId: "final-expense",
};

function page(text: string, title = "Home"): ExtractedPage {
  return {
    url: "https://zardsbpo.com/",
    title,
    companyName: "Zards BPO",
    text,
    phones: [],
    emails: [],
    address: null,
    socialLinks: [],
    contactLinks: [],
  };
}

function company(overrides: Partial<CompanyDraft> = {}): CompanyDraft {
  return {
    name: "Zards BPO",
    domains: ["zardsbpo.com"],
    phones: [],
    emails: [],
    address: null,
    socialLinks: [],
    pages: [],
    results: [],
    ...overrides,
  };
}

function labels(result: ReturnType<typeof scoreCompany>) {
  return result.reasons.map((reason) => reason.label);
}

describe("scoreCompany", () => {
  it("rates a clear match as a strong fit, with a reason for every point", () => {
    const result = scoreCompany(
      company({
        phones: ["+923001234567"],
        pages: [
          page(
            "Final expense BPO in Karachi. Outbound live transfers for US agencies with licensed agents.",
          ),
        ],
      }),
      filters,
      [],
    );

    expect(result.fitLabel).toBe("Strong fit");
    expect(result.score).toBe(
      result.reasons.reduce((sum, reason) => sum + reason.points, 0),
    );
    for (const reason of result.reasons) {
      expect(reason.evidence).not.toBe("");
      expect(reason.url).toContain("zardsbpo.com");
    }
  });

  it("gives fewer points when the campaign appears only in a search result", () => {
    const result = scoreCompany(
      company({
        results: [
          {
            url: "https://zardsbpo.com/x",
            domain: "zardsbpo.com",
            title: "Final expense closers",
            snippet: "",
            source: "web",
          },
        ],
      }),
      filters,
      [],
    );
    expect(result.score).toBe(15);
    expect(labels(result)).toContain(
      "Website could not be read, so only search snippets were used",
    );
    expect(result.fitLabel).toBe("Low fit");
  });

  it("gives no campaign points for a different campaign", () => {
    const result = scoreCompany(
      company({ pages: [page("We run Medicare campaigns.")] }),
      filters,
      [],
    );
    expect(result.score).toBe(0);
    expect(result.campaigns).toEqual(["Medicare"]);
  });

  it("matches the ACA abbreviation only in capitals", () => {
    const aca = { ...filters, campaignId: "aca" } as const;
    const lower = scoreCompany(
      company({ pages: [page("Our placa and caca")] }),
      aca,
      [],
    );
    const upper = scoreCompany(
      company({ pages: [page("We enroll ACA members")] }),
      aca,
      [],
    );
    expect(lower.score).toBe(0);
    expect(upper.score).toBe(30);
  });

  it("awards points for a phone in the selected country only", () => {
    const local = scoreCompany(
      company({ phones: ["+923001234567"] }),
      filters,
      [],
    );
    const foreign = scoreCompany(
      company({ phones: ["+12025550123"] }),
      filters,
      [],
    );
    expect(local.score).toBe(10);
    expect(foreign.score).toBe(0);
  });

  it("uses the Spanish rule for the Spanish market", () => {
    const spanish = { ...filters, marketId: "spanish" } as const;
    const result = scoreCompany(
      company({ pages: [page("Bilingual agents ready")] }),
      spanish,
      [],
    );
    expect(result.score).toBe(10);
  });

  it("counts mentions on other sites, capped, and ignores its own site", () => {
    const mention = (domain: string) =>
      buildMention({
        domain,
        url: `https://${domain}/job`,
        title: "Closer at Zards BPO (Pvt) Ltd",
        snippet: "",
      });

    const result = scoreCompany(company(), filters, [
      mention("indeed.com"),
      mention("rozee.pk"),
      mention("glassdoor.com"),
      mention("zardsbpo.com"),
    ]);

    expect(result.score).toBe(10);
    expect(labels(result)).toContain("Named on 3 other site(s)");
    expect(result.sources).toHaveLength(3);
  });

  it("ignores mentions of a very short name", () => {
    const result = scoreCompany(company({ name: "ABC" }), filters, [
      buildMention({
        domain: "indeed.com",
        url: "https://indeed.com",
        title: "ABC jobs",
        snippet: "",
      }),
    ]);
    expect(result.score).toBe(0);
  });

  it("applies disqualifiers from page titles and never goes below zero", () => {
    const result = scoreCompany(
      company({
        name: "Palmer",
        pages: [page("Final expense plans", "Palmer Funeral Home")],
      }),
      filters,
      [],
    );
    expect(labels(result)).toContain("Looks like a funeral home or hospital");
    expect(result.score).toBe(0);
    expect(result.fitLabel).toBe("Low fit");
  });

  it.each([
    ["Outbound Voice Bots for Call Centers", "software vendor"],
    ["Leading Call Center Software & Dialers", "software vendor"],
    ["Buy Exclusive Insurance Leads for Agents", "lead seller"],
    ["Final Expense Inbound Calls for Licensed Agents", "lead seller"],
    ["Top 25 BPO Companies in Pakistan", "directory"],
    ["Real Reviews & Public Opinions", "directory"],
    ["Largest Life & Health Insurer in Pakistan", "insurer"],
  ])("flags the title %s as a %s", (title, kind) => {
    const result = scoreCompany(
      company({ name: "Example", pages: [page("Text", title)] }),
      filters,
      [],
    );
    expect(labels(result).join(" ")).toContain(kind);
  });

  it.each([
    "Zards BPO — Final Expense Call Center & Live Transfers for US Agencies",
    "Nexa Global LLC | Insurance Lead Generation, Qualified Calls & Live Transfers",
    "BALITECH | Professional BPO & Call Center Services in Pakistan",
    "Nexus-Tel | Outbound Sales & Support Agency",
  ])("does not flag the real call center title %s", (title) => {
    const result = scoreCompany(
      company({ name: "Example", pages: [page("Text", title)] }),
      filters,
      [],
    );
    expect(result.reasons.filter((reason) => reason.points < 0)).toEqual([]);
  });

  it("never goes above 100", () => {
    const result = scoreCompany(
      company({
        phones: ["+923001234567"],
        pages: [
          page(
            "Final expense call center Karachi US clients licensed agents outbound live transfers fluent english",
          ),
        ],
      }),
      filters,
      ["a.com", "b.com", "c.com"].map((domain) =>
        buildMention({
          domain,
          url: `https://${domain}`,
          title: "Zards BPO",
          snippet: "",
        }),
      ),
    );
    expect(result.score).toBeLessThanOrEqual(100);
  });
});
