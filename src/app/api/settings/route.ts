import { z } from "zod";
import { setPerSearchCreditCap } from "@/lib/searches";

const settingsSchema = z.object({
  perSearchCreditCap: z.number().int().min(0).max(1000),
});

export async function PUT(request: Request) {
  const settings = settingsSchema.safeParse(await request.json());
  if (!settings.success) {
    return Response.json(
      { error: "The credit cap must be a whole number from 0 to 1000." },
      { status: 400 },
    );
  }

  await setPerSearchCreditCap(settings.data.perSearchCreditCap);
  return Response.json(settings.data);
}
