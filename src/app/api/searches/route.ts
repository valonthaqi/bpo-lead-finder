import { filtersSchema } from "@/lib/filters";
import { runSearch } from "@/lib/pipeline";
import { createSearch, hasActiveSearch } from "@/lib/searches";

export async function POST(request: Request) {
  const filters = filtersSchema.safeParse(await request.json());
  if (!filters.success) {
    return Response.json({ error: "Choose valid filters." }, { status: 400 });
  }

  if (await hasActiveSearch()) {
    return Response.json(
      { error: "A search is already running. Wait for it to finish." },
      { status: 409 },
    );
  }

  const search = await createSearch(filters.data);
  void runSearch(search.id);
  return Response.json({ id: search.id }, { status: 201 });
}
