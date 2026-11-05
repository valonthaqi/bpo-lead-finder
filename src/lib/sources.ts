export type Source = {
  id: string;
  name: string;
  enabled: boolean;
  domains: string[];
  maxQueries: number;
};

export const SOURCES: Source[] = [
  {
    id: "web",
    name: "Web search",
    enabled: true,
    domains: [],
    maxQueries: Infinity,
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
    maxQueries: 12,
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    enabled: false,
    domains: ["linkedin.com"],
    maxQueries: 12,
  },
  {
    id: "facebook",
    name: "Facebook",
    enabled: false,
    domains: ["facebook.com"],
    maxQueries: 12,
  },
  {
    id: "instagram",
    name: "Instagram",
    enabled: false,
    domains: ["instagram.com"],
    maxQueries: 12,
  },
];

export const DISABLED_DOMAINS = SOURCES.filter(
  (source) => !source.enabled,
).flatMap((source) => source.domains);
