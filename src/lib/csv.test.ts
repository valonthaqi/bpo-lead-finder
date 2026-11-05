import { describe, expect, it } from "vitest";
import { companiesToCsv, toCsvCell } from "./csv";

describe("toCsvCell", () => {
  it("leaves plain text alone", () => {
    expect(toCsvCell("Zards BPO")).toBe("Zards BPO");
  });

  it("quotes commas, quotes and new lines", () => {
    expect(toCsvCell('Zards, "BPO"')).toBe('"Zards, ""BPO"""');
    expect(toCsvCell("a\nb")).toBe('"a\nb"');
  });

  it("stops a website's text from running as a spreadsheet formula", () => {
    expect(toCsvCell('=HYPERLINK("http://bad.example")')).toBe(
      `"'=HYPERLINK(""http://bad.example"")"`,
    );
    expect(toCsvCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(toCsvCell("+923001234567")).toBe("'+923001234567");
  });

  it("writes numbers", () => {
    expect(toCsvCell(95)).toBe("95");
  });
});

describe("companiesToCsv", () => {
  it("writes a header and one line per company", () => {
    const csv = companiesToCsv([
      {
        id: 1,
        searchId: 1,
        name: "Zards BPO",
        domains: ["zardsbpo.com", "zards.pk"],
        phones: [],
        emails: ["info@zardsbpo.com"],
        address: null,
        socialLinks: [],
        campaigns: ["Final expense"],
        score: 75,
        fitLabel: "Strong fit",
        isPreliminary: false,
        reasons: [
          { label: "Website mentions X", points: 30, evidence: "x", url: "u" },
        ],
        sources: [{ source: "web", url: "https://zardsbpo.com" }],
      },
    ]);
    const [header, line] = csv.split("\n");
    expect(header.startsWith("Score,Fit,Preliminary,Company")).toBe(true);
    expect(line).toBe(
      "75,Strong fit,No,Zards BPO,zardsbpo.com; zards.pk,,info@zardsbpo.com,,,Final expense,30 Website mentions X,https://zardsbpo.com",
    );
  });
});
