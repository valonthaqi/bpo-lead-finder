import { getSearch } from "@/lib/searches";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const search = await getSearch(Number(id));
  if (!search) {
    return Response.json({ error: "Search not found." }, { status: 404 });
  }
  return Response.json(search);
}
