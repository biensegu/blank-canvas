import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Error("forbidden");
}

const NullableText = z
  .string()
  .trim()
  .transform((value) => (value.length === 0 ? null : value));

const IdInput = z.object({ id: z.string().uuid() });

const VideoconferenceInput = z.object({
  id: z.string().uuid().optional(),
  course_id: z.string().uuid(),
  title: z.string().trim().min(2).max(160),
  description: NullableText.optional().default(null),
  scheduled_at: z.string().datetime(),
  bbb_url: z.string().trim().url().max(1000),
});

export const listAdminVideoconferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [
      { data: courses, error: coursesError },
      { data: videoconferences, error: videoconferencesError },
      { data: attendance, error: attendanceError },
    ] = await Promise.all([
      supabaseAdmin.from("courses").select("id, slug, title, position").order("position"),
      supabaseAdmin
        .from("videoconferences")
        .select("*")
        .order("scheduled_at", { ascending: false }),
      supabaseAdmin.from("vc_attendance").select("vc_id"),
    ]);

    for (const error of [coursesError, videoconferencesError, attendanceError]) {
      if (error) throw new Error(error.message);
    }

    const attendanceCounts = new Map<string, number>();
    (attendance ?? []).forEach((row) => {
      attendanceCounts.set(row.vc_id, (attendanceCounts.get(row.vc_id) ?? 0) + 1);
    });

    return {
      courses: courses ?? [],
      videoconferences: (videoconferences ?? []).map((vc) => ({
        ...vc,
        attendance_count: attendanceCounts.get(vc.id) ?? 0,
      })),
    };
  });

export const saveAdminVideoconference = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => VideoconferenceInput.parse(data))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const payload = {
      course_id: data.course_id,
      title: data.title,
      description: data.description,
      scheduled_at: data.scheduled_at,
      bbb_url: data.bbb_url,
      created_by: context.userId,
    };

    const query = data.id
      ? supabaseAdmin
          .from("videoconferences")
          .update(payload)
          .eq("id", data.id)
          .select("id")
          .single()
      : supabaseAdmin.from("videoconferences").insert(payload).select("id").single();

    const { data: saved, error } = await query;
    if (error) throw new Error(error.message);
    return { id: saved.id };
  });

export const deleteAdminVideoconference = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => IdInput.parse(data))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("videoconferences").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
