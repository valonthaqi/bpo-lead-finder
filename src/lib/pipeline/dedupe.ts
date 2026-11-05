import type { Candidate } from "./discover";
import type { ExtractedPage } from "./extract";
import { getNameSimilarity } from "./normalize";

const SAME_NAME_THRESHOLD = 0.8;

export type CompanyDraft = {
  name: string;
  domains: string[];
  phones: string[];
  emails: string[];
  address: string | null;
  socialLinks: string[];
  pages: ExtractedPage[];
  results: Candidate[];
};

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

export function buildDraft(
  domain: string,
  results: Candidate[],
  pages: ExtractedPage[],
): CompanyDraft {
  return {
    name: pages[0]?.companyName ?? domain.split(".")[0],
    domains: [domain],
    phones: unique(pages.flatMap((page) => page.phones)),
    emails: unique(pages.flatMap((page) => page.emails)),
    address: pages.find((page) => page.address)?.address ?? null,
    socialLinks: unique(pages.flatMap((page) => page.socialLinks)),
    pages,
    results,
  };
}

function isSameCompany(a: CompanyDraft, b: CompanyDraft) {
  const sharesDomain = a.domains.some((domain) => b.domains.includes(domain));
  const sharesPhone = a.phones.some((phone) => b.phones.includes(phone));
  const hasSameName = getNameSimilarity(a.name, b.name) >= SAME_NAME_THRESHOLD;
  return sharesDomain || sharesPhone || hasSameName;
}

function merge(a: CompanyDraft, b: CompanyDraft): CompanyDraft {
  return {
    name: a.name,
    domains: unique([...a.domains, ...b.domains]),
    phones: unique([...a.phones, ...b.phones]),
    emails: unique([...a.emails, ...b.emails]),
    address: a.address ?? b.address,
    socialLinks: unique([...a.socialLinks, ...b.socialLinks]),
    pages: [...a.pages, ...b.pages],
    results: [...a.results, ...b.results],
  };
}

export function dedupeCompanies(drafts: CompanyDraft[]) {
  let companies: CompanyDraft[] = [];
  for (const draft of drafts) {
    const matches = companies.filter((company) =>
      isSameCompany(company, draft),
    );
    const merged = matches.reduce(merge, draft);
    companies = [
      ...companies.filter((company) => !matches.includes(company)),
      merged,
    ];
  }
  return companies;
}
