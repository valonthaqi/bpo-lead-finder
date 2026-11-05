import { isCandidateDomain } from "../sources";
import type { Candidate } from "./discover";
import { getRootDomain } from "./normalize";

const CALL_CENTER_WORDS =
  /\b(call cent(er|re)s?|contact cent(er|re)s?|bpo|live transfers?|telemarketing|appointment setting|outsourc\w*|centro de (llamadas|contacto)|inbound|outbound)\b/i;

const CALL_CENTER_DOMAIN = /bpo|callcent|contactcent|telemarket/;

export function hasCallCenterEvidence(candidate: {
  domain: string;
  title: string;
  snippet: string;
}) {
  return (
    CALL_CENTER_DOMAIN.test(candidate.domain) ||
    CALL_CENTER_WORDS.test(`${candidate.title} ${candidate.snippet}`)
  );
}

export function groupCandidatesToFetch(candidates: Candidate[]) {
  const groups = new Map<string, Candidate[]>();
  for (const candidate of candidates) {
    const rootDomain = getRootDomain(candidate.domain);
    if (!isCandidateDomain(rootDomain)) continue;
    groups.set(rootDomain, [...(groups.get(rootDomain) ?? []), candidate]);
  }
  return new Map(
    [...groups].filter(([, group]) => group.some(hasCallCenterEvidence)),
  );
}
