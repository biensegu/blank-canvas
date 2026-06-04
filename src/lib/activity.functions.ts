import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

const LogInput = z.object({
  type: z.string().min(1).max(40).regex(/^[a-z_]+$/),
  courseId: z.string().uuid().nullable().optional(),
  durationMs: z.number().int().min(0).max(86_400_000).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const logActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => LogInput.parse(d))
  .handler(async ({ data, context }) => {
    await supabaseAdmin.from("activity_events").insert({
      user_id: context.userId,
      type: data.type,
      course_id: data.courseId ?? null,
      duration_ms: data.durationMs ?? null,
      metadata: (data.metadata ?? {}) as never,
    });
    return { ok: true };
  });