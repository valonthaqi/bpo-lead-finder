import * as cheerio from "cheerio";
import { findPhoneNumbersInText, type CountryCode } from "libphonenumber-js";
import {
  cleanText,
  getRootDomain,
  normalizeDomain,
  normalizePhone,
} from "./normalize";

const MAX_TEXT_LENGTH = 20_000;
const MAX_PHONES = 5;
const MAX_CONTACT_LINKS = 2;

const EMAIL_PATTERN = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const COMPANY_EMAIL_NAMES = new Set([
  "admin",
  "bd",
  "business",
  "careers",
  "contact",
  "contacto",
  "enquiries",
  "hello",
  "hr",
  "info",
  "inquiries",
  "marketing",
  "office",
  "partnerships",
  "sales",
  "support",
  "team",
  "ventas",
]);
const CONTACT_LINK_PATTERN =
  /contact|about|service|contacto|nosotros|quienes|servicios/i;
const COMPANY_SOCIAL_PATTERN =
  /^https?:\/\/(www\.)?(linkedin\.com\/company\/|facebook\.com\/(?!sharer)|instagram\.com\/(?!p\/))[^?#]+/i;
const TITLE_SEPARATOR = /\s[|–—:-]\s/;

export type ExtractedPage = {
  url: string;
  title: string;
  companyName: string;
  text: string;
  phones: string[];
  emails: string[];
  address: string | null;
  socialLinks: string[];
  contactLinks: string[];
};

function extractCompanyName(
  siteName: string | undefined,
  title: string,
  rootDomain: string,
) {
  if (siteName && !siteName.startsWith("http")) {
    return cleanText(siteName).trim();
  }
  const domainLabel = rootDomain.split(".")[0];
  const matchingPart = title
    .split(TITLE_SEPARATOR)
    .find((part) =>
      domainLabel.includes(part.toLowerCase().replace(/[^a-z0-9]/g, "")),
    );
  return matchingPart?.trim() || domainLabel;
}

function extractPhones(
  telLinks: string[],
  text: string,
  countryCode: CountryCode,
) {
  const fromLinks = telLinks
    .map((phone) => normalizePhone(phone, countryCode))
    .filter((phone) => phone !== null);
  const fromText = findPhoneNumbersInText(text, countryCode)
    .map((found) =>
      normalizePhone(text.slice(found.startsAt, found.endsAt), countryCode),
    )
    .filter((phone) => phone !== null);
  return [...new Set([...fromLinks, ...fromText])].slice(0, MAX_PHONES);
}

function extractEmails(mailtoLinks: string[], text: string) {
  const found = [...mailtoLinks, ...(text.match(EMAIL_PATTERN) ?? [])];
  const companyEmails = found
    .map((email) => email.toLowerCase())
    .filter((email) => COMPANY_EMAIL_NAMES.has(email.split("@")[0]));
  return [...new Set(companyEmails)];
}

export function extractPage(
  html: string,
  url: string,
  countryCode: CountryCode,
): ExtractedPage {
  const $ = cheerio.load(html);
  const rootDomain = getRootDomain(normalizeDomain(url) ?? "");

  const title = cleanText($("title").first().text()).trim();
  const siteName = $('meta[property="og:site_name"]').attr("content");
  const hrefs = $("a[href]")
    .map((_, link) => ({
      href: $(link).attr("href") ?? "",
      label: $(link).text(),
    }))
    .get();

  $("script, style, noscript, svg").remove();
  const text = $("body").text().replace(/\s+/g, " ").trim();

  const telLinks = hrefs
    .filter(({ href }) => href.startsWith("tel:"))
    .map(({ href }) => href.slice("tel:".length));
  const mailtoLinks = hrefs
    .filter(({ href }) => href.startsWith("mailto:"))
    .map(({ href }) => href.slice("mailto:".length).split("?")[0]);

  const socialLinks = hrefs
    .map(({ href }) => href.match(COMPANY_SOCIAL_PATTERN)?.[0])
    .filter((link) => link !== undefined);

  const contactLinks = hrefs
    .filter(({ href, label }) => CONTACT_LINK_PATTERN.test(`${href} ${label}`))
    .map(({ href }) => {
      try {
        return new URL(href, url);
      } catch {
        return null;
      }
    })
    .filter((link) => link !== null)
    .filter((link) => link.protocol === "https:" || link.protocol === "http:")
    .filter(
      (link) => getRootDomain(normalizeDomain(link.href) ?? "") === rootDomain,
    )
    .map((link) => link.origin + link.pathname)
    .filter((link) => link !== url);

  return {
    url,
    title,
    companyName: extractCompanyName(siteName, title, rootDomain),
    text: cleanText(text.slice(0, MAX_TEXT_LENGTH)),
    phones: extractPhones(telLinks, text, countryCode),
    emails: extractEmails(mailtoLinks, text),
    address:
      cleanText($("address").first().text()).replace(/\s+/g, " ").trim() ||
      null,
    socialLinks: [...new Set(socialLinks)],
    contactLinks: [...new Set(contactLinks)].slice(0, MAX_CONTACT_LINKS),
  };
}
