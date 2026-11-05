import { z } from "zod";

export const COUNTRIES = [
  {
    id: "pakistan",
    isoCode: "PK",
    name: "Pakistan",
    cities: ["Karachi", "Lahore", "Islamabad", "Faisalabad", "Multan"],
  },
  {
    id: "india",
    isoCode: "IN",
    name: "India",
    cities: ["Noida", "Gurugram", "Mohali", "Mumbai", "Ahmedabad"],
  },
  {
    id: "philippines",
    isoCode: "PH",
    name: "Philippines",
    cities: ["Manila", "Cebu", "Davao", "Quezon City", "Makati"],
  },
  {
    id: "colombia",
    isoCode: "CO",
    name: "Colombia",
    cities: ["Bogotá", "Medellín", "Cali", "Barranquilla", "Bucaramanga"],
  },
  {
    id: "mexico",
    isoCode: "MX",
    name: "Mexico",
    cities: [
      "Mexico City",
      "Guadalajara",
      "Monterrey",
      "Tijuana",
      "Hermosillo",
    ],
  },
  {
    id: "dominican-republic",
    isoCode: "DO",
    name: "Dominican Republic",
    cities: ["Santo Domingo", "Santiago"],
  },
  {
    id: "south-africa",
    isoCode: "ZA",
    name: "South Africa",
    cities: ["Cape Town", "Johannesburg", "Durban"],
  },
  {
    id: "jamaica",
    isoCode: "JM",
    name: "Jamaica",
    cities: ["Kingston", "Montego Bay"],
  },
  {
    id: "guatemala",
    isoCode: "GT",
    name: "Guatemala",
    cities: ["Guatemala City"],
  },
  {
    id: "el-salvador",
    isoCode: "SV",
    name: "El Salvador",
    cities: ["San Salvador"],
  },
  {
    id: "honduras",
    isoCode: "HN",
    name: "Honduras",
    cities: ["Tegucigalpa", "San Pedro Sula"],
  },
  {
    id: "bangladesh",
    isoCode: "BD",
    name: "Bangladesh",
    cities: ["Dhaka", "Chittagong"],
  },
] as const;

export const MARKETS = [
  {
    id: "english",
    name: "English market",
    servicePhrases: [
      "call center",
      "BPO",
      "live transfers",
      "outbound call center",
      "inbound call center",
      "licensed agents call center",
      "insurance call center",
      "US clients call center",
      "insurance lead generation",
    ],
  },
  {
    id: "spanish",
    name: "Spanish market",
    servicePhrases: [
      "bilingual call center",
      "call center",
      "BPO",
      "live transfers",
      "centro de llamadas",
      "call center bilingüe",
      "centro de contacto",
      "agentes en español call center",
    ],
  },
] as const;

export const CAMPAIGNS = [
  {
    id: "medicare",
    name: "Medicare",
    searchTerms: [
      "Medicare",
      "Medicare Advantage",
      "Medicare supplement",
      "Medicare enrollment",
    ],
  },
  {
    id: "aca",
    name: "ACA (Obamacare)",
    searchTerms: [
      "ACA health insurance",
      "Obamacare",
      "Affordable Care Act",
      "ACA",
    ],
  },
  {
    id: "final-expense",
    name: "Final expense",
    searchTerms: [
      "final expense",
      "final expense life insurance",
      "burial insurance",
      "funeral insurance",
    ],
  },
  {
    id: "life",
    name: "Life insurance",
    searchTerms: [
      "life insurance",
      "term life insurance",
      "whole life insurance",
      "life insurance leads",
    ],
  },
] as const;

export const filtersSchema = z.object({
  countryId: z.enum(COUNTRIES.map((country) => country.id)),
  marketId: z.enum(MARKETS.map((market) => market.id)),
  campaignId: z.enum(CAMPAIGNS.map((campaign) => campaign.id)),
});

export type Filters = z.infer<typeof filtersSchema>;

export function describeFilters(filters: {
  countryId: string;
  marketId: string;
  campaignId: string;
}) {
  const country = COUNTRIES.find((item) => item.id === filters.countryId);
  const market = MARKETS.find((item) => item.id === filters.marketId);
  const campaign = CAMPAIGNS.find((item) => item.id === filters.campaignId);
  return [country?.name, market?.name, campaign?.name].join(", ");
}
