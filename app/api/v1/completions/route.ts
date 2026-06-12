import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { completeTask } from "@/lib/services/instance-service";
import { z } from "zod";

const completionSchema = z.object({
  instanceId: z.string().min(1),
  instanceTaskId: z.string().min(1),
  value: z.any(),
  photoUrls: z.array(z.string()).optional(),
  signatureUrl: z.string().optional(),
  notes: z.string().optional(),
});

export const POST = withAuth(async (req, _ctx, user) => {
  const body = await req.json();
  const parsed = completionSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  try {
    const completion = await completeTask(
      parsed.data.instanceId,
      parsed.data.instanceTaskId,
      user.id,
      user.organizationId,
      {
        value: parsed.data.value,
        photoUrls: parsed.data.photoUrls,
        signatureUrl: parsed.data.signatureUrl,
        notes: parsed.data.notes,
      }
    );
    return apiSuccess(completion, 201);
  } catch (e: any) {
    if (e.message.includes("not found")) return apiError(e.message, 404);
    if (e.message.includes("Cannot complete")) return apiError(e.message, 409);
    throw e;
  }
}, PERMISSIONS.CHECKLISTS_COMPLETE);
