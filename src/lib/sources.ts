export type Source = {
  id: string;
  name: string;
  enabled: boolean;
  domains: string[];
  maxQueries: number;
  countsForEarlyStop: boolean;
};

export const SOURCES: Source[] = [
  {
    id: "web",
    name: "Web search",
    enabled: true,
    domains: [],
    maxQueries: Infinity,
    countsForEarlyStop: true,
  },
  {
    id: "directories",
    name: "Business directories",
    enabled: true,
    domains: [
      "clutch.co",
      "goodfirms.co",
      "sortlist.com",
      "outsourceaccelerator.com",
    ],
    maxQueries: 2,
    countsForEarlyStop: false,
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    enabled: false,
    domains: ["linkedin.com"],
    maxQueries: 2,
    countsForEarlyStop: false,
  },
  {
    id: "facebook",
    name: "Facebook",
    enabled: false,
    domains: ["facebook.com"],
    maxQueries: 2,
    countsForEarlyStop: false,
  },
  {
    id: "instagram",
    name: "Instagram",
    enabled: false,
    domains: ["instagram.com"],
    maxQueries: 2,
    countsForEarlyStop: false,
  },
];

export const JOB_BOARD_DOMAINS = [
  "bebee.com",
  "bogotatrabaja.gov.co",
  "cazvid.com",
  "brightspyre.com",
  "computrabajo.com",
  "disnakerja.id",
  "elempleo.com",
  "evirtualassistants.com",
  "expertini.com",
  "getpakjob.com",
  "glassdoor.ca",
  "glassdoor.co.uk",
  "glassdoor.com",
  "glassdoor.com.br",
  "glassdoor.com.hk",
  "himalayas.app",
  "glassdoor.sg",
  "indeed.com",
  "jobgether.com",
  "jobleads.com",
  "jobrapido.com",
  "jooble.org",
  "lensa.com",
  "magneto365.com",
  "medellinjoven.com",
  "mustakbil.com",
  "olx.com.pk",
  "opcionempleo.com.co",
  "remoteanywherejob.com",
  "rozee.pk",
  "searchopal.com",
  "taraki.co",
  "trabajo.org",
  "upwork.com",
  "whatjobs.com",
  "workana.com",
];

const LISTING_DOMAINS = [
  "designrush.com",
  "techbehemoths.com",
  "themanifest.com",
];

const NOISE_DOMAINS = [
  "abcnews.com",
  "dawn.com",
  "ebay.com",
  "insurance-forums.com",
  "journalstar.com",
  "jotform.com",
  "kget.com",
  "monthlyreview.org",
  "portafolio.co",
  "pinterest.com",
  "reddit.com",
  "rocketreach.co",
  "scammer.info",
  "scribd.com",
  "semana.com",
  "studocu.com",
  "tiktok.com",
  "tribune.com.pk",
  "trustpilot.com",
  "twitter.com",
  "wa.me",
  "wlrn.org",
  "wsws.org",
  "x.com",
  "youtube.com",
];

const PUBLIC_INSTITUTION_DOMAIN = /\.(gov|edu|mil)(\.[a-z]{2})?$/;

export const DISABLED_DOMAINS = SOURCES.filter(
  (source) => !source.enabled,
).flatMap((source) => source.domains);

const DIRECTORY_DOMAINS = SOURCES.filter((source) => source.enabled).flatMap(
  (source) => source.domains,
);

const NOT_CANDIDATE_DOMAINS = [
  ...DISABLED_DOMAINS,
  ...NOISE_DOMAINS,
  ...JOB_BOARD_DOMAINS,
  ...LISTING_DOMAINS,
  ...DIRECTORY_DOMAINS,
];

export function isCandidateDomain(domain: string) {
  if (PUBLIC_INSTITUTION_DOMAIN.test(domain)) return false;
  return !NOT_CANDIDATE_DOMAINS.some(
    (blocked) => domain === blocked || domain.endsWith(`.${blocked}`),
  );
}
