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

export function normalizePhone(phone: string, countryCode: CountryCode) {
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
