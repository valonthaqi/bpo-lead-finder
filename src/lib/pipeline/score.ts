import { parsePhoneNumberFromString } from "libphonenumber-js";
import { CAMPAIGNS, getFilterOptions, type Filters } from "../filters";
import type { CompanyDraft } from "./dedupe";
import { cleanText, normalizeCompanyName } from "./normalize";
import {
  CAMPAIGN_PATTERNS,
  CHECKS,
  COUNTRY_NAME_PATTERN,
  DISQUALIFIERS,
  FIT_LABELS,
  MARKET_PATTERNS,
  MIN_COUNTRY_NAMES_IN_A_LIST,
  MIN_DIAL_CODES_IN_A_LIST,
  MIN_NAME_LENGTH_FOR_MENTIONS,
  NAME_WITH_DIAL_CODE_PATTERN,
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

function getSurroundingText(text: string, index: number, length: number) {
  const start = Math.max(0, index - EVIDENCE_RADIUS);
  return cleanText(text.slice(start, index + length + EVIDENCE_RADIUS)).trim();
}

function quote(text: string, pattern: RegExp) {
  const match = pattern.exec(text);
  if (!match) return null;
  return getSurroundingText(text, match.index, match[0].length);
}

function looksLikeCountryList(text: string) {
  const countryNames = new Set(text.match(COUNTRY_NAME_PATTERN));
  const dialCodes = text.match(NAME_WITH_DIAL_CODE_PATTERN) ?? [];
  return (
    countryNames.size >= MIN_COUNTRY_NAMES_IN_A_LIST ||
    dialCodes.length >= MIN_DIAL_CODES_IN_A_LIST
  );
}

function isUsStateNewMexico(text: string, match: RegExpExecArray) {
  const textBefore = text.slice(Math.max(0, match.index - 4), match.index);
  return (
    match[0].toLowerCase() === "mexico" &&
    (textBefore === "New " || textBefore === "NEW ")
  );
}

function findCountryOnSite(
  company: CompanyDraft,
  pattern: RegExp,
): Evidence | null {
  for (const page of company.pages) {
    const text = `${page.title} ${page.text}`;
    for (const match of text.matchAll(pattern)) {
      if (isUsStateNewMexico(text, match)) continue;
      const evidence = getSurroundingText(text, match.index, match[0].length);
      if (!looksLikeCountryList(evidence)) return { evidence, url: page.url };
    }
  }
  return null;
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
  const { country } = getFilterOptions(filters);
  const places = [country.name, ...country.cities].join("|");
  return new RegExp(`\\b(${places})\\b`, "gi");
}

function findCountryPhone(company: CompanyDraft, filters: Filters) {
  const { country } = getFilterOptions(filters);
  return company.phones.find(
    (phone) => parsePhoneNumberFromString(phone)?.country === country.isoCode,
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

function toReasons(
  label: string,
  points: number,
  found: Evidence | null,
): ScoreReason[] {
  return found ? [{ label, points, ...found }] : [];
}

function scoreWebsiteRead(company: CompanyDraft) {
  if (company.pages.length > 0) return [];
  const label = company.isPreliminary
    ? "Website not read yet, so only search snippets were used"
    : "Website could not be read, so only search snippets were used";
  return toReasons(label, 0, {
    evidence: company.domains.join(", "),
    url: company.results[0]?.url ?? "",
  });
}

function scoreCampaign(company: CompanyDraft, filters: Filters) {
  const { campaign } = getFilterOptions(filters);
  const pattern = CAMPAIGN_PATTERNS[filters.campaignId];
  const onSite = findOnSite(company, pattern);
  if (onSite) {
    return toReasons(
      `Website mentions ${campaign.name}`,
      POINTS.campaignOnSite,
      onSite,
    );
  }
  return toReasons(
    `Search result mentions ${campaign.name}`,
    POINTS.campaignInResults,
    findInResults(company, pattern),
  );
}

function scoreChecks(company: CompanyDraft) {
  return CHECKS.flatMap((check) => {
    const onSite = findOnSite(company, check.pattern);
    if (onSite) return toReasons(check.label, check.points, onSite);
    if (!check.pointsInResults) return [];
    return toReasons(
      `${check.label} (search result only)`,
      check.pointsInResults,
      findInResults(company, check.pattern),
    );
  });
}

function scoreCountry(company: CompanyDraft, filters: Filters) {
  const onSite = toReasons(
    "Website names the selected country or a city in it",
    POINTS.countryOnSite,
    findCountryOnSite(company, buildCountryPattern(filters)),
  );
  const countryPhone = findCountryPhone(company, filters);
  if (!countryPhone) return onSite;
  return [
    ...onSite,
    ...toReasons(
      "Phone number is in the selected country",
      POINTS.countryPhone,
      { evidence: countryPhone, url: company.pages[0]?.url ?? "" },
    ),
  ];
}

function scoreMarket(company: CompanyDraft, filters: Filters) {
  const market = MARKET_PATTERNS[filters.marketId];
  return toReasons(
    market.label,
    market.points,
    findOnSite(company, market.pattern),
  );
}

function scoreMentions(companyMentions: Mention[]) {
  if (companyMentions.length === 0) return [];
  return toReasons(
    `Named on ${companyMentions.length} other site(s)`,
    Math.min(companyMentions.length * POINTS.perMention, POINTS.maxMentions),
    {
      evidence: companyMentions.map((mention) => mention.domain).join(", "),
      url: companyMentions[0].url,
    },
  );
}

function scoreDisqualifiers(company: CompanyDraft) {
  const titles = [
    company.name,
    ...company.pages.map((page) => page.title),
  ].join(" ");
  const url = company.pages[0]?.url ?? company.results[0]?.url ?? "";
  return DISQUALIFIERS.flatMap((disqualifier) => {
    const evidence = quote(titles, disqualifier.pattern);
    return evidence
      ? toReasons(disqualifier.label, disqualifier.points, { evidence, url })
      : [];
  });
}

function findCampaignsWorkedOn(company: CompanyDraft) {
  return CAMPAIGNS.filter(
    (item) =>
      findOnSite(company, CAMPAIGN_PATTERNS[item.id]) ||
      findInResults(company, CAMPAIGN_PATTERNS[item.id]),
  ).map((item) => item.name);
}

export function scoreCompany(
  company: CompanyDraft,
  filters: Filters,
  mentions: Mention[],
): ScoredCompany {
  const companyMentions = findMentions(company, mentions);
  const reasons = [
    ...scoreWebsiteRead(company),
    ...scoreCampaign(company, filters),
    ...scoreChecks(company),
    ...scoreCountry(company, filters),
    ...scoreMarket(company, filters),
    ...scoreMentions(companyMentions),
    ...scoreDisqualifiers(company),
  ];

  const total = reasons.reduce((sum, reason) => sum + reason.points, 0);
  const score = Math.max(0, Math.min(100, total));
  const fitLabel =
    FIT_LABELS.find((fit) => score >= fit.minScore)?.label ?? "Low fit";

  const sources = [
    ...company.results.map(({ source, url }) => ({ source, url })),
    ...companyMentions.map(({ url }) => ({ source: "mention", url })),
  ];

  return {
    ...company,
    campaigns: findCampaignsWorkedOn(company),
    score,
    fitLabel,
    reasons,
    sources,
  };
}
