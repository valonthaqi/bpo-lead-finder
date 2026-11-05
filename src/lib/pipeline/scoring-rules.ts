export const POINTS = {
  campaignOnSite: 30,
  campaignInResults: 15,
  countryOnSite: 10,
  countryPhone: 10,
  perMention: 5,
  maxMentions: 10,
};

export const MIN_NAME_LENGTH_FOR_MENTIONS = 6;

export const FIT_LABELS = [
  { minScore: 60, label: "Strong fit" },
  { minScore: 35, label: "Possible fit" },
  { minScore: 0, label: "Low fit" },
];

export const CAMPAIGN_PATTERNS: Record<string, RegExp> = {
  medicare: /\bmedicare\b/i,
  aca: /\bACA\b|[Oo]bamacare|[Aa]ffordable [Cc]are [Aa]ct|[Hh]ealth [Ii]nsurance [Mm]arketplace/,
  "final-expense": /final[- ]expense|burial insurance|funeral insurance/i,
  life: /life insurance/i,
};

export const CHECKS: {
  label: string;
  points: number;
  pointsInResults?: number;
  pattern: RegExp;
}[] = [
  {
    label: "Describes itself as a call center or BPO",
    points: 20,
    pointsInResults: 10,
    pattern:
      /\b(call cent(er|re)s?|contact cent(er|re)s?|bpo|business process outsourcing|centro de (llamadas|contacto))\b/i,
  },
  {
    label: "Mentions US clients or the US market",
    points: 10,
    pattern:
      /\b(us|u\.s\.|usa|american) (clients?|agenc(y|ies)|market|insurance|carriers?|based)\b/i,
  },
  {
    label: "Mentions licensed agents",
    points: 5,
    pattern: /\blicensed (insurance )?agents?\b/i,
  },
  {
    label: "Mentions inbound or outbound calling",
    points: 5,
    pattern: /\b(inbound|outbound)\b/i,
  },
  {
    label: "Mentions live transfers",
    points: 5,
    pattern: /\blive transfers?\b/i,
  },
];

export const MARKET_PATTERNS: Record<
  string,
  { label: string; points: number; pattern: RegExp }
> = {
  english: {
    label: "Mentions English-speaking agents",
    points: 5,
    pattern: /\b(english[- ]speaking|native english|fluent english)\b/i,
  },
  spanish: {
    label: "Mentions Spanish or bilingual agents",
    points: 10,
    pattern: /\b(bilingual|biling[üu]e|spanish[- ]speaking|en español)\b/i,
  },
};

export const DISQUALIFIERS = [
  {
    label: "Looks like a job listing, not a company",
    points: -40,
    pattern: /\b(jobs? in|job openings|open positions|hiring)\b/i,
  },
  {
    label: "Looks like a funeral home or hospital",
    points: -40,
    pattern: /\b(funeral home|mortuary|hospital|medical center)\b/i,
  },
  {
    label: "Looks like an insurer, not a call center",
    points: -30,
    pattern:
      /\b(takaful|insurance company|life insurance limited|insurance ltd)\b/i,
  },
  {
    label: "Looks like an airline, school or publisher",
    points: -40,
    pattern: /\b(airlines?|university|school|journal|newspaper)\b/i,
  },
];
