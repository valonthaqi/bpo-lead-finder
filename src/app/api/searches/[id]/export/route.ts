import { companiesToCsv } from "@/lib/csv";
import { getAllCompanies, getSearch } from "@/lib/searches";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const search = await getSearch(Number(id));
  if (!search) {
    return Response.json({ error: "Search not found." }, { status: 404 });
  }

  const csv = companiesToCsv(await getAllCompanies(search.id));
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="search-${search.id}.csv"`,
    },
  });
}
