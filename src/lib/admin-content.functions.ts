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

const UnitInput = z.object({
  id: z.string().uuid().optional(),
  course_id: z.string().uuid(),
  title: z.string().trim().min(2).max(160),
  description: NullableText.optional().default(null),
  position: z.coerce.number().int().min(0).max(999),
  base_points: z.coerce.number().int().min(0).max(1000),
});

const ResourceInput = z.object({
  id: z.string().uuid().optional(),
  unit_id: z.string().uuid(),
  type: z.enum(["pdf", "image", "video", "file", "videoconference", "ppt", "doc", "link"]),
  title: z.string().trim().min(2).max(160),
  url: z
    .string()
    .trim()
    .max(1000)
    .refine((value) => {
      if (value.startsWith("storage://course-materials/")) return true;
      if (/^[a-zA-Z0-9_-]{11}$/.test(value)) return true;
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    }, "URL o ruta de Storage no válida"),
  position: z.coerce.number().int().min(0).max(999),
});

type ResourceType = z.infer<typeof ResourceInput>["type"];

const LEGACY_RESOURCE_TYPE_FALLBACK: Partial<Record<ResourceType, ResourceType>> = {
  image: "link",
  file: "doc",
  videoconference: "link",
};

const DEFAULT_COURSES = [
  {
    slug: "normativa",
    title: "Normativa",
    description: "Normativa de Castilla-La Mancha para Orientación Educativa. Curso gratuito.",
    price_cents: 0,
    accent_color: "teal",
    cover_emoji: "📜",
    position: 0,
    objectives:
      "Conocer la normativa vigente de educación en Castilla-La Mancha aplicable a la especialidad de Orientación Educativa.",
    materials_summary:
      "Legislación estatal y autonómica, decretos, órdenes y resoluciones actualizadas.",
    duration_hours: 30,
    region: "Castilla-La Mancha",
  },
  {
    slug: "programacion",
    title: "Programación",
    description: "Elaboración de la programación didáctica para Orientación Educativa.",
    price_cents: 15000,
    accent_color: "coral",
    cover_emoji: "📝",
    position: 1,
    objectives:
      "Diseñar una programación didáctica defendible, alineada con la normativa de Castilla-La Mancha.",
    materials_summary: "Plantillas, ejemplos, criterios de evaluación y rúbricas.",
    duration_hours: 60,
    region: "Castilla-La Mancha",
  },
  {
    slug: "supuestos",
    title: "Supuestos",
    description: "Resolución de supuestos prácticos de Orientación Educativa.",
    price_cents: 15000,
    accent_color: "amber",
    cover_emoji: "🧩",
    position: 2,
    objectives: "Aprender a resolver supuestos prácticos con un esquema reproducible.",
    materials_summary: "Banco de supuestos, soluciones comentadas y vídeos de resolución.",
    duration_hours: 60,
    region: "Castilla-La Mancha",
  },
  {
    slug: "temas",
    title: "Temas",
    description: "Desarrollo del temario oficial de Orientación Educativa.",
    price_cents: 15000,
    accent_color: "teal",
    cover_emoji: "📚",
    position: 3,
    objectives: "Dominar el temario oficial con esquemas, resúmenes y vídeos explicativos.",
    materials_summary: "Temario completo en PDF, esquemas, vídeos y cuestionarios.",
    duration_hours: 120,
    region: "Castilla-La Mancha",
  },
];

async function ensureCourseContentTopic(supabaseAdmin: any, courseId: string) {
  const { data: existing, error: existingError } = await supabaseAdmin
    .from("topics")
    .select("id")
    .eq("course_id", courseId)
    .order("position")
    .limit(1)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);
  if (existing?.id) return existing.id;

  const { data: topic, error } = await supabaseAdmin
    .from("topics")
    .insert({
      course_id: courseId,
      title: "Contenido",
      description: "Contenedor técnico de unidades.",
      position: 0,
      bonus_points: 0,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return topic.id;
}

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

export const restoreDefaultCourses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("courses")
      .upsert(DEFAULT_COURSES, { onConflict: "slug" })
      .select("id, slug");
    if (error) throw new Error(error.message);

    const normativa = data?.find((course) => course.slug === "normativa");
    if (normativa) {
      const topicId = await ensureCourseContentTopic(supabaseAdmin, normativa.id);

      const { data: existingUnit, error: existingUnitError } = await supabaseAdmin
        .from("units")
        .select("id")
        .eq("topic_id", topicId)
        .eq("position", 0)
        .maybeSingle();
      if (existingUnitError) throw new Error(existingUnitError.message);

      if (!existingUnit) {
        const { error: unitError } = await supabaseAdmin.from("units").insert({
          topic_id: topicId,
          title: "Unidad 1",
          description: "Unidad inicial de Normativa.",
          position: 0,
          youtube_video_id: null,
          min_watch_percent: 0,
          base_points: 10,
        });
        if (unitError) throw new Error(unitError.message);
      }
    }

    return { courses: data ?? [] };
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

export const saveAdminUnit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => UnitInput.parse(data))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const topicId = await ensureCourseContentTopic(supabaseAdmin, data.course_id);
    const payload = {
      topic_id: topicId,
      title: data.title,
      description: data.description,
      position: data.position,
      youtube_video_id: null,
      min_watch_percent: 0,
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
    const runSave = (resourcePayload: typeof payload) =>
      data.id
        ? supabaseAdmin.from("resources").update(resourcePayload).eq("id", data.id).select("id").single()
        : supabaseAdmin.from("resources").insert(resourcePayload).select("id").single();

    let { data: saved, error } = await runSave(payload);

    if (error?.message?.includes("resources_type_check")) {
      const fallbackType = LEGACY_RESOURCE_TYPE_FALLBACK[data.type];
      if (fallbackType) {
        const retry = await runSave({ ...payload, type: fallbackType });
        saved = retry.data;
        error = retry.error;
      }
    }

    if (error) throw new Error(error.message);
    if (!saved) throw new Error("No se pudo guardar el recurso.");
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
