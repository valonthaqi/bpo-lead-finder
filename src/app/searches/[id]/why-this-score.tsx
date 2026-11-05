import { ExternalLink } from "@/components/external-link";
import type { Company } from "./company-row";

const SOURCE_NAMES: Record<string, string> = {
  web: "Web search",
  directories: "Directory search",
  mention: "Named on another site",
};

function pointsStyle(points: number) {
  if (points > 0) return "text-green-700 dark:text-green-400";
  if (points < 0) return "text-red-700 dark:text-red-400";
  return "text-muted-foreground";
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="wrap-anywhere">{value}</dd>
    </div>
  );
}

export function WhyThisScore({ company }: { company: Company }) {
  return (
    <div className="grid gap-6 bg-muted/50 p-4 text-sm lg:grid-cols-[2fr_1fr]">
      <section className="min-w-0">
        <h4 className="font-medium">Why this score</h4>
        <ul className="mt-2 space-y-3">
          {company.reasons.map((reason) => (
            <li key={reason.label} className="flex gap-3">
              <span
                className={`w-8 shrink-0 text-right font-semibold tabular-nums ${pointsStyle(reason.points)}`}
              >
                {reason.points > 0 ? "+" : ""}
                {reason.points}
              </span>
              <div className="min-w-0">
                <p className="font-medium">{reason.label}</p>
                <p className="wrap-anywhere text-muted-foreground">
                  “{reason.evidence}”{" "}
                  {reason.url && (
                    <ExternalLink url={reason.url} label="source" />
                  )}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="min-w-0 space-y-6">
        <section>
          <h4 className="font-medium">Contact</h4>
          <dl className="mt-2 space-y-2">
            <Detail
              label="Works on"
              value={company.campaigns.join(", ") || "Not clear"}
            />
            <Detail
              label="Phone"
              value={company.phones.join(", ") || "Not found"}
            />
            <Detail
              label="Email"
              value={company.emails.join(", ") || "Not found"}
            />
            {company.address && (
              <Detail label="Address" value={company.address} />
            )}
            {company.socialLinks.length > 0 && (
              <div>
                <dt className="text-xs text-muted-foreground">Social pages</dt>
                <dd>
                  {company.socialLinks.map((link) => (
                    <span key={link} className="mr-2">
                      <ExternalLink url={link} label={new URL(link).hostname} />
                    </span>
                  ))}
                </dd>
              </div>
            )}
          </dl>
        </section>

        <section>
          <h4 className="font-medium">Sources</h4>
          <ul className="mt-2 space-y-1">
            {company.sources.map((source) => (
              <li key={source.url} className="wrap-anywhere">
                {SOURCE_NAMES[source.source]}:{" "}
                <ExternalLink url={source.url} label={source.url} />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
