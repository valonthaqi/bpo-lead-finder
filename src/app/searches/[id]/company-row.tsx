import type { companies } from "@/lib/db/schema";

const FIT_STYLES: Record<string, string> = {
  "Strong fit": "bg-green-100 text-green-900",
  "Possible fit": "bg-amber-100 text-amber-900",
  "Low fit": "bg-slate-200 text-slate-800",
};

const SOURCE_NAMES: Record<string, string> = {
  web: "Web search",
  directories: "Directory search",
  mention: "Named on another site",
};

function isWebLink(url: string) {
  return url.startsWith("https://") || url.startsWith("http://");
}

function ExternalLink({ url, label }: { url: string; label: string }) {
  if (!isWebLink(url)) return <span>{label}</span>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="break-all text-blue-800 hover:underline"
    >
      {label}
    </a>
  );
}

export function CompanyRow({
  company,
}: {
  company: typeof companies.$inferSelect;
}) {
  return (
    <li className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{company.name}</h3>
          <p className="text-sm">
            {company.domains.map((domain) => (
              <span key={domain} className="mr-3">
                <ExternalLink url={`https://${domain}`} label={domain} />
              </span>
            ))}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {company.isPreliminary && (
            <span className="rounded-full border border-slate-300 px-2.5 py-0.5 text-xs font-medium text-slate-700">
              Preliminary
            </span>
          )}
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${FIT_STYLES[company.fitLabel]}`}
          >
            {company.fitLabel}
          </span>
          <span className="text-lg font-semibold">{company.score}</span>
        </div>
      </div>

      <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        <div>
          <dt className="inline font-medium">Works on: </dt>
          <dd className="inline">
            {company.campaigns.join(", ") || "Not clear"}
          </dd>
        </div>
        <div>
          <dt className="inline font-medium">Phone: </dt>
          <dd className="inline">{company.phones.join(", ") || "Not found"}</dd>
        </div>
        <div>
          <dt className="inline font-medium">Email: </dt>
          <dd className="inline break-all">
            {company.emails.join(", ") || "Not found"}
          </dd>
        </div>
        {company.address && (
          <div>
            <dt className="inline font-medium">Address: </dt>
            <dd className="inline">{company.address}</dd>
          </div>
        )}
        {company.socialLinks.length > 0 && (
          <div>
            <dt className="inline font-medium">Social pages: </dt>
            <dd className="inline">
              {company.socialLinks.map((link) => (
                <span key={link} className="mr-2">
                  <ExternalLink url={link} label={new URL(link).hostname} />
                </span>
              ))}
            </dd>
          </div>
        )}
      </dl>

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer font-medium">
          Why this score, and where it came from
        </summary>
        <ul className="mt-2 space-y-2">
          {company.reasons.map((reason) => (
            <li key={reason.label}>
              <span className="font-medium">
                {reason.points > 0 ? "+" : ""}
                {reason.points} {reason.label}
              </span>
              <p className="text-slate-600">
                “{reason.evidence}”{" "}
                {reason.url && <ExternalLink url={reason.url} label="source" />}
              </p>
            </li>
          ))}
        </ul>
        <h4 className="mt-3 font-medium">Sources</h4>
        <ul className="mt-1 space-y-1">
          {company.sources.map((source) => (
            <li key={source.url}>
              {SOURCE_NAMES[source.source]}:{" "}
              <ExternalLink url={source.url} label={source.url} />
            </li>
          ))}
        </ul>
      </details>
    </li>
  );
}
