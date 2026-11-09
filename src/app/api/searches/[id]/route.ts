import { canViewSearch } from "@/lib/permissions";
import { getSearch } from "@/lib/searches";
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
  return Response.json(search);
}
