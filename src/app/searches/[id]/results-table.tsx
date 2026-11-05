import { DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CompanyRow, type Company } from "./company-row";
import { Pagination } from "./pagination";

export function ResultsTable({
  searchId,
  rows,
  total,
  isRunning,
  page,
  pageCount,
}: {
  searchId: number;
  rows: Company[];
  total: number;
  isRunning: boolean;
  page: number;
  pageCount: number;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2">
        <CardTitle>
          <h2>
            {total} companies{isRunning ? " so far" : ""}, best fit first
          </h2>
        </CardTitle>
        <Button variant="outline" size="sm" asChild>
          <a href={`/api/searches/${searchId}/export`}>
            <DownloadIcon aria-hidden="true" />
            Export CSV
          </a>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.some((company) => company.isPreliminary) && (
          <p className="text-sm text-muted-foreground">
            Preliminary rows are scored from search snippets only. Their scores
            update as each website is read.
          </p>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Fit</TableHead>
              <TableHead className="hidden md:table-cell">Works on</TableHead>
              <TableHead className="hidden lg:table-cell">Contact</TableHead>
              <TableHead>
                <span className="sr-only">Details</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((company) => (
              <CompanyRow key={company.domains[0]} company={company} />
            ))}
          </TableBody>
        </Table>
        <Pagination searchId={searchId} page={page} pageCount={pageCount} />
      </CardContent>
    </Card>
  );
}
