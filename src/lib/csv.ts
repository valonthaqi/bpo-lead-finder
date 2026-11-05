import type { companies } from "./db/schema";

type CompanyRow = typeof companies.$inferSelect;

const HEADER = [
  "Score",
  "Fit",
  "Company",
  "Websites",
  "Phones",
  "Emails",
  "Address",
  "Social pages",
  "Appears to work on",
  "Reasons",
  "Sources",
];

const SPREADSHEET_FORMULA_START = /^[=+\-@\t\r]/;

export function toCsvCell(value: string | number) {
  const text = String(value);
  const safeText = SPREADSHEET_FORMULA_START.test(text) ? `'${text}` : text;
  return /[",\n\r]/.test(safeText)
    ? `"${safeText.replaceAll('"', '""')}"`
    : safeText;
}

export function companiesToCsv(rows: CompanyRow[]) {
  const lines = rows.map((row) =>
    [
      row.score,
      row.fitLabel,
      row.name,
      row.domains.join("; "),
      row.phones.join("; "),
      row.emails.join("; "),
      row.address ?? "",
      row.socialLinks.join("; "),
      row.campaigns.join("; "),
      row.reasons
        .map((reason) => `${reason.points} ${reason.label}`)
        .join("; "),
      row.sources.map((source) => source.url).join("; "),
    ]
      .map(toCsvCell)
      .join(","),
  );
  return [HEADER.join(","), ...lines].join("\n");
}
