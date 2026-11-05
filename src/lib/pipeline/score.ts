import { parsePhoneNumberFromString } from "libphonenumber-js";
import { CAMPAIGNS, COUNTRIES, type Filters } from "../filters";
import type { CompanyDraft } from "./dedupe";
import { normalizeCompanyName } from "./normalize";
import {
  CAMPAIGN_PATTERNS,
  CHECKS,
  DISQUALIFIERS,
  FIT_LABELS,
  MARKET_PATTERNS,
  MIN_NAME_LENGTH_FOR_MENTIONS,
  POINTS,
} from "./scoring-rules";

const EVIDENCE_RADIUS = 60;

export type ScoreReason = {
  label: string;
  points: number;
  evidence: string;
  url: string;
};

export type CompanySourceLink = { source: string; url: string };

export type Mention = { domain: string; url: string; text: string };

export type ScoredCompany = CompanyDraft & {
  campaigns: string[];
  score: number;
  fitLabel: string;
  reasons: ScoreReason[];
  sources: CompanySourceLink[];
};

type Evidence = { evidence: string; url: string };

function quote(text: string, pattern: RegExp) {
  const match = pattern.exec(text);
  if (!match) return null;
  const start = Math.max(0, match.index - EVIDENCE_RADIUS);
  const end = match.index + match[0].length + EVIDENCE_RADIUS;
  return text.slice(start, end).trim();
}

function findOnSite(company: CompanyDraft, pattern: RegExp): Evidence | null {
  for (const page of company.pages) {
    const evidence = quote(`${page.title} ${page.text}`, pattern);
    if (evidence) return { evidence, url: page.url };
  }
  return null;
}

function findInResults(
  company: CompanyDraft,
  pattern: RegExp,
): Evidence | null {
  for (const result of company.results) {
    const evidence = quote(`${result.title} ${result.snippet}`, pattern);
    if (evidence) return { evidence, url: result.url };
  }
  return null;
}

function buildCountryPattern(filters: Filters) {
  const country = COUNTRIES.find((item) => item.id === filters.countryId);
  return new RegExp(
    `\\b(${[country?.name, ...(country?.cities ?? [])].join("|")})\\b`,
    "i",
  );
}

function findCountryPhone(company: CompanyDraft, filters: Filters) {
  const country = COUNTRIES.find((item) => item.id === filters.countryId);
  return company.phones.find(
    (phone) => parsePhoneNumberFromString(phone)?.country === country?.isoCode,
  );
}

function findMentions(company: CompanyDraft, mentions: Mention[]) {
  const name = normalizeCompanyName(company.name);
  if (name.length < MIN_NAME_LENGTH_FOR_MENTIONS) return [];
  const namePattern = new RegExp(`\\b${name}\\b`);
  const byDomain = new Map<string, Mention>();
  for (const mention of mentions) {
    if (company.domains.includes(mention.domain)) continue;
    if (namePattern.test(mention.text)) byDomain.set(mention.domain, mention);
  }
  return [...byDomain.values()];
}

export function buildMention(result: {
  domain: string;
  url: string;
  title: string;
  snippet: string;
}): Mention {
  return {
    domain: result.domain,
    url: result.url,
    text: normalizeCompanyName(`${result.title} ${result.snippet}`),
  };
}

export function scoreCompany(
  company: CompanyDraft,
  filters: Filters,
  mentions: Mention[],
): ScoredCompany {
  const reasons: ScoreReason[] = [];
  function add(label: string, points: number, found: Evidence | null) {
    if (found) reasons.push({ label, points, ...found });
  }

  if (company.pages.length === 0) {
    const url = company.results[0]?.url ?? "";
    const label = company.isPreliminary
      ? "Website not read yet, so only search snippets were used"
      : "Website could not be read, so only search snippets were used";
    add(label, 0, {
      evidence: company.domains.join(", "),
      url,
    });
  }

  const campaign = CAMPAIGNS.find((item) => item.id === filters.campaignId);
  const campaignPattern = CAMPAIGN_PATTERNS[filters.campaignId];
  const campaignOnSite = findOnSite(company, campaignPattern);
  add(
    `Website mentions ${campaign?.name}`,
    POINTS.campaignOnSite,
    campaignOnSite,
  );
  if (!campaignOnSite) {
    add(
      `Search result mentions ${campaign?.name}`,
      POINTS.campaignInResults,
      findInResults(company, campaignPattern),
    );
  }

  for (const check of CHECKS) {
    const onSite = findOnSite(company, check.pattern);
    add(check.label, check.points, onSite);
    if (!onSite && check.pointsInResults) {
      add(
        `${check.label} (search result only)`,
        check.pointsInResults,
        findInResults(company, check.pattern),
      );
    }
  }

  add(
    "Website names the selected country or a city in it",
    POINTS.countryOnSite,
    findOnSite(company, buildCountryPattern(filters)),
  );

  const countryPhone = findCountryPhone(company, filters);
  if (countryPhone) {
    add("Phone number is in the selected country", POINTS.countryPhone, {
      evidence: countryPhone,
      url: company.pages[0]?.url ?? "",
    });
  }

  const market = MARKET_PATTERNS[filters.marketId];
  add(market.label, market.points, findOnSite(company, market.pattern));

  const companyMentions = findMentions(company, mentions);
  const mentionPoints = Math.min(
    companyMentions.length * POINTS.perMention,
    POINTS.maxMentions,
  );
  if (companyMentions.length > 0) {
    add(`Named on ${companyMentions.length} other site(s)`, mentionPoints, {
      evidence: companyMentions.map((mention) => mention.domain).join(", "),
      url: companyMentions[0].url,
    });
  }

  const titles = [
    company.name,
    ...company.pages.map((page) => page.title),
  ].join(" ");
  for (const disqualifier of DISQUALIFIERS) {
    const evidence = quote(titles, disqualifier.pattern);
    if (evidence) {
      add(disqualifier.label, disqualifier.points, {
        evidence,
        url: company.pages[0]?.url ?? company.results[0]?.url ?? "",
      });
    }
  }

  const total = reasons.reduce((sum, reason) => sum + reason.points, 0);
  const score = Math.max(0, Math.min(100, total));
  const fitLabel =
    FIT_LABELS.find((fit) => score >= fit.minScore)?.label ?? "Low fit";

  const campaigns = CAMPAIGNS.filter(
    (item) =>
      findOnSite(company, CAMPAIGN_PATTERNS[item.id]) ||
      findInResults(company, CAMPAIGN_PATTERNS[item.id]),
  ).map((item) => item.name);

  const sources = [
    ...company.results.map(({ source, url }) => ({ source, url })),
    ...companyMentions.map(({ url }) => ({ source: "mention", url })),
  ];

  return { ...company, campaigns, score, fitLabel, reasons, sources };
}
