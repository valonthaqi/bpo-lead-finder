import {
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";

const LEGAL_WORDS = new Set([
  "co",
  "company",
  "corp",
  "inc",
  "limited",
  "llc",
  "ltd",
  "private",
  "pvt",
  "sa",
  "sas",
  "srl",
  "the",
]);

const US_TOLL_FREE = /^1?(800|833|844|855|866|877|888)\d{7}$/;
const WRITTEN_WITH_PREFIX = /^\s*(\+|00|0)/;
const COUNTRIES_DIALING_LOCALLY_WITH_ZERO = new Set([
  "BD",
  "IN",
  "PH",
  "PK",
  "ZA",
]);

const TWO_PART_SUFFIX = /\.(com|co|org|net|gov|edu|ac|go|ne|or)\.[a-z]{2}$/;

export function normalizeDomain(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function getRootDomain(domain: string) {
  const labelsToKeep = TWO_PART_SUFFIX.test(domain) ? 3 : 2;
  return domain.split(".").slice(-labelsToKeep).join(".");
}

function looksLikeUsNumber(phone: string, countryCode: CountryCode) {
  if (WRITTEN_WITH_PREFIX.test(phone)) return false;
  if (!parsePhoneNumberFromString(phone, "US")?.isValid()) return false;
  return (
    US_TOLL_FREE.test(phone.replace(/\D/g, "")) ||
    COUNTRIES_DIALING_LOCALLY_WITH_ZERO.has(countryCode)
  );
}

export function normalizePhone(phone: string, countryCode: CountryCode) {
  if (looksLikeUsNumber(phone, countryCode)) {
    return parsePhoneNumberFromString(phone, "US")?.number ?? null;
  }
  const parsed = parsePhoneNumberFromString(phone, countryCode);
  return parsed?.isValid() ? parsed.number : null;
}

export function normalizeCompanyName(name: string) {
  const words = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ");
  return words.filter((word) => word && !LEGAL_WORDS.has(word)).join(" ");
}

export function getNameSimilarity(nameA: string, nameB: string) {
  const wordsA = new Set(
    normalizeCompanyName(nameA).split(" ").filter(Boolean),
  );
  const wordsB = new Set(
    normalizeCompanyName(nameB).split(" ").filter(Boolean),
  );
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  const shared = [...wordsA].filter((word) => wordsB.has(word)).length;
  return shared / new Set([...wordsA, ...wordsB]).size;
}
