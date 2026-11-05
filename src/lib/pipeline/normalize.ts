const TWO_PART_SUFFIX = /\.(com|co|org|net|gov|edu|ac)\.[a-z]{2}$/;

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
