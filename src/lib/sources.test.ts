import { describe, expect, it } from "vitest";
import {
  JOB_BOARD_DOMAINS,
  SEARCH_EXCLUDED_DOMAINS,
  isCandidateDomain,
} from "./sources";

describe("isCandidateDomain", () => {
  it("keeps a company website", () => {
    expect(isCandidateDomain("zardsbpo.com")).toBe(true);
  });

  it("rejects job boards, including country subdomains", () => {
    expect(isCandidateDomain("glassdoor.sg")).toBe(false);
    expect(isCandidateDomain("pk.indeed.com")).toBe(false);
  });

  it("rejects directories, disabled sources and noise", () => {
    expect(isCandidateDomain("clutch.co")).toBe(false);
    expect(isCandidateDomain("news.outsourceaccelerator.com")).toBe(false);
    expect(isCandidateDomain("linkedin.com")).toBe(false);
    expect(isCandidateDomain("rocketreach.co")).toBe(false);
  });

  it("rejects public institutions", () => {
    expect(isCandidateDomain("uscis.gov")).toBe(false);
    expect(isCandidateDomain("pakpost.gov.pk")).toBe(false);
    expect(isCandidateDomain("uwsuper.edu")).toBe(false);
  });

  it("does not match a company whose name only ends like a blocked domain", () => {
    expect(isCandidateDomain("myindeed.com")).toBe(true);
  });
});

describe("SEARCH_EXCLUDED_DOMAINS", () => {
  it("only excludes disabled sources, because long lists cause empty results", () => {
    expect(SEARCH_EXCLUDED_DOMAINS).toEqual([
      "linkedin.com",
      "facebook.com",
      "instagram.com",
    ]);
  });

  it("keeps job boards searchable so their raw results are stored", () => {
    for (const domain of JOB_BOARD_DOMAINS) {
      expect(SEARCH_EXCLUDED_DOMAINS).not.toContain(domain);
    }
  });
});
