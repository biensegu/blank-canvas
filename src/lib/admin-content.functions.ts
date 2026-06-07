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

const CourseInput = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().trim().min(2).max(160),
  description: NullableText.optional().default(null),
  price_cents: z.coerce.number().int().min(0).max(999_999),
  cover_emoji: z.string().trim().max(8).optional().default("🧩"),
  accent_color: z.enum(["teal", "coral", "gray", "amber"]).optional().default("teal"),
  position: z.coerce.number().int().min(0).max(999),
  objectives: NullableText.optional().default(null),
  materials_summary: NullableText.optional().default(null),
  duration_hours: z.coerce.number().int().min(0).max(500),
  region: z.string().trim().min(2).max(120).optional().default("Castilla-La Mancha"),
});

const TopicInput = z.object({
  id: z.string().uuid().optional(),
  course_id: z.string().uuid(),
  title: z.string().trim().min(2).max(160),
  description: NullableText.optional().default(null),
  position: z.coerce.number().int().min(0).max(999),
  bonus_points: z.coerce.number().int().min(0).max(1000),
});

const UnitInput = z.object({
  id: z.string().uuid().optional(),
  topic_id: z.string().uuid(),
  title: z.string().trim().min(2).max(160),
  description: NullableText.optional().default(null),
  position: z.coerce.number().int().min(0).max(999),
  youtube_video_id: NullableText.optional().default(null),
  min_watch_percent: z.coerce.number().int().min(0).max(100),
  base_points: z.coerce.number().int().min(0).max(1000),
});

const ResourceInput = z.object({
  id: z.string().uuid().optional(),
  unit_id: z.string().uuid(),
  type: z.enum(["pdf", "ppt", "doc", "video", "link"]),
  title: z.string().trim().min(2).max(160),
  url: z.string().trim().url().max(1000),
  position: z.coerce.number().int().min(0).max(999),
});

export const listAdminContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [
      { data: courses, error: coursesError },
      { data: topics, error: topicsError },
      { data: units, error: unitsError },
      { data: resources, error: resourcesError },
      { data: enrollments, error: enrollmentsError },
    ] = await Promise.all([
      supabaseAdmin.from("courses").select("*").order("position"),
      supabaseAdmin.from("topics").select("*").order("position"),
      supabaseAdmin.from("units").select("*").order("position"),
      supabaseAdmin.from("resources").select("*").order("position"),
      supabaseAdmin.from("enrollments").select("course_id"),
    ]);

    for (const error of [coursesError, topicsError, unitsError, resourcesError, enrollmentsError]) {
      if (error) throw new Error(error.message);
    }

    const enrollmentCounts = new Map<string, number>();
    (enrollments ?? []).forEach((enrollment) => {
      enrollmentCounts.set(
        enrollment.course_id,
        (enrollmentCounts.get(enrollment.course_id) ?? 0) + 1,
      );
    });

    return {
      courses: courses ?? [],
      topics: topics ?? [],
      units: units ?? [],
      resources: resources ?? [],
      enrollmentCounts: Object.fromEntries(enrollmentCounts),
    };
  });

export const saveAdminCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => CourseInput.parse(data))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = {
      slug: data.slug,
      title: data.title,
      description: data.description,
      price_cents: data.price_cents,
      cover_emoji: data.cover_emoji || "🧩",
      accent_color: data.accent_color,
      position: data.position,
      objectives: data.objectives,
      materials_summary: data.materials_summary,
      duration_hours: data.duration_hours,
      region: data.region,
    };

    const query = data.id
      ? supabaseAdmin.from("courses").update(payload).eq("id", data.id).select("id").single()
      : supabaseAdmin.from("courses").insert(payload).select("id").single();
    const { data: saved, error } = await query;
    if (error) throw new Error(error.message);
    return { id: saved.id };
  });

export const deleteAdminCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => IdInput.parse(data))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count, error: countError } = await supabaseAdmin
      .from("enrollments")
      .select("id", { count: "exact", head: true })
      .eq("course_id", data.id);
    if (countError) throw new Error(countError.message);
    if ((count ?? 0) > 0) {
      throw new Error("No se puede borrar un curso con alumnos matriculados.");
    }
    const { error } = await supabaseAdmin.from("courses").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveAdminTopic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => TopicInput.parse(data))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = {
      course_id: data.course_id,
      title: data.title,
      description: data.description,
      position: data.position,
      bonus_points: data.bonus_points,
    };
    const query = data.id
      ? supabaseAdmin.from("topics").update(payload).eq("id", data.id).select("id").single()
      : supabaseAdmin.from("topics").insert(payload).select("id").single();
    const { data: saved, error } = await query;
    if (error) throw new Error(error.message);
    return { id: saved.id };
  });

export const deleteAdminTopic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => IdInput.parse(data))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("topics").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveAdminUnit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => UnitInput.parse(data))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = {
      topic_id: data.topic_id,
      title: data.title,
      description: data.description,
      position: data.position,
      youtube_video_id: data.youtube_video_id,
      min_watch_percent: data.min_watch_percent,
      base_points: data.base_points,
    };
    const query = data.id
      ? supabaseAdmin.from("units").update(payload).eq("id", data.id).select("id").single()
      : supabaseAdmin.from("units").insert(payload).select("id").single();
    const { data: saved, error } = await query;
    if (error) throw new Error(error.message);
    return { id: saved.id };
  });

export const deleteAdminUnit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => IdInput.parse(data))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("units").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveAdminResource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => ResourceInput.parse(data))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = {
      unit_id: data.unit_id,
      type: data.type,
      title: data.title,
      url: data.url,
      position: data.position,
    };
    const query = data.id
      ? supabaseAdmin.from("resources").update(payload).eq("id", data.id).select("id").single()
      : supabaseAdmin.from("resources").insert(payload).select("id").single();
    const { data: saved, error } = await query;
    if (error) throw new Error(error.message);
    return { id: saved.id };
  });

export const deleteAdminResource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => IdInput.parse(data))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("resources").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
