import { describe, expect, it } from "vitest";
import type { Candidate } from "./discover";
import { groupCandidatesToFetch, hasCallCenterEvidence } from "./evidence";

function candidate(domain: string, title: string, snippet = ""): Candidate {
  return { url: `https://${domain}`, domain, title, snippet, source: "web" };
}

describe("hasCallCenterEvidence", () => {
  it("accepts call center words in the title or snippet", () => {
    expect(hasCallCenterEvidence(candidate("a.com", "Top Call Centers"))).toBe(
      true,
    );
    expect(
      hasCallCenterEvidence(
        candidate("a.com", "Home", "Final expense live transfers"),
      ),
    ).toBe(true);
    expect(
      hasCallCenterEvidence(candidate("a.com", "Centro de contacto")),
    ).toBe(true);
  });

  it("accepts a telling domain name", () => {
    expect(
      hasCallCenterEvidence(candidate("nextwavebpo.com", "Debt costs")),
    ).toBe(true);
  });

  it("rejects unrelated pages", () => {
    expect(
      hasCallCenterEvidence(candidate("cigna.com", "Health insurance plans")),
    ).toBe(false);
  });
});

describe("groupCandidatesToFetch", () => {
  it("groups subdomains under one root domain", () => {
    const groups = groupCandidatesToFetch([
      candidate("crm.indus-bpo.com", "Payroll"),
      candidate("indus-bpo.com", "Home"),
    ]);
    expect([...groups.keys()]).toEqual(["indus-bpo.com"]);
    expect(groups.get("indus-bpo.com")).toHaveLength(2);
  });

  it("drops domains without evidence and blocked root domains", () => {
    const groups = groupCandidatesToFetch([
      candidate("cigna.com", "Health plans"),
      candidate("jobs.indeed.com", "Call center jobs"),
    ]);
    expect(groups.size).toBe(0);
  });
});
