"use client";

import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";
import { ExternalLink } from "@/components/external-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import type { companies } from "@/lib/db/schema";
import { FitBadge } from "./fit-badge";
import { WhyThisScore } from "./why-this-score";

export type Company = typeof companies.$inferSelect;

const COLUMN_COUNT = 5;

export function CompanyRow({ company }: { company: Company }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <TableRow className="[&>td]:align-top">
        <TableCell className="whitespace-normal">
          <p className="font-medium">{company.name}</p>
          <p className="mt-1 text-xs">
            {company.domains.map((domain) => (
              <span key={domain} className="mr-2">
                <ExternalLink url={`https://${domain}`} label={domain} />
              </span>
            ))}
          </p>
          <div className="mt-2 sm:hidden">
            <FitBadge label={company.fitLabel} score={company.score} />
          </div>
          {company.isPreliminary && (
            <Badge variant="outline" className="mt-2">
              Preliminary
            </Badge>
          )}
        </TableCell>
        <TableCell className="hidden sm:table-cell">
          <FitBadge label={company.fitLabel} score={company.score} />
        </TableCell>
        <TableCell className="hidden whitespace-normal md:table-cell">
          {company.campaigns.join(", ") || "Not clear"}
        </TableCell>
        <TableCell className="hidden whitespace-normal lg:table-cell">
          <p>{company.phones[0] ?? "Not found"}</p>
          <p className="mt-1 wrap-anywhere text-muted-foreground">
            {company.emails[0] ?? "Not found"}
          </p>
        </TableCell>
        <TableCell className="text-right">
          <Button
            variant="ghost"
            size="sm"
            aria-expanded={isOpen}
            aria-label={`Why this score for ${company.name}`}
            onClick={() => setIsOpen(!isOpen)}
          >
            <span className="hidden sm:inline">Why this score</span>
            <ChevronDownIcon
              className={isOpen ? "rotate-180 transition" : "transition"}
              aria-hidden="true"
            />
          </Button>
        </TableCell>
      </TableRow>
      {isOpen && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={COLUMN_COUNT} className="whitespace-normal p-0">
            <WhyThisScore company={company} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
