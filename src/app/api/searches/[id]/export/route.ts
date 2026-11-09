import { companiesToCsv } from "@/lib/csv";
import { canViewSearch } from "@/lib/permissions";
import { getAllCompanies, getSearch } from "@/lib/searches";
import { getViewer } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const [search, viewer] = await Promise.all([
    getSearch(Number(id)),
    getViewer(),
  ]);
  if (!search || !viewer || !canViewSearch(viewer, search)) {
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
