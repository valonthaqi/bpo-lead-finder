import { z } from "zod";
import { saveSettings } from "@/lib/searches";

const settingsSchema = z.object({
  perSearchCreditCap: z.number().int().min(0).max(1000),
  fetchConcurrency: z.number().int().min(1).max(20),
});

export async function PUT(request: Request) {
  const settings = settingsSchema.safeParse(await request.json());
  if (!settings.success) {
    return Response.json(
      {
        error:
          "The credit cap must be 0 to 1000, and websites at once must be 1 to 20.",
      },
      { status: 400 },
    );
  }

  await saveSettings(settings.data);
  return Response.json(settings.data);
}
