import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { awardStarsDedup } from "@/lib/gamification.functions";

const ResourceAccessInput = z.object({
  resourceId: z.string().uuid(),
});

const UnitResourcesInput = z.object({
  unitId: z.string().uuid(),
});

function parseStorageUrl(url: string) {
  const match = url.match(/^storage:\/\/([^/]+)\/(.+)$/);
  if (!match) return null;
  return { bucket: match[1], path: match[2] };
}

async function assertUnitAccess(supabaseAdmin: any, userId: string, unitId: string) {
  const { data: unit, error } = await supabaseAdmin
    .from("units")
    .select("id, topics(id, course_id)")
    .eq("id", unitId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!unit) throw new Error("Unidad no encontrada.");

  const courseId = unit.topics?.course_id;
  if (!courseId) throw new Error("Unidad sin curso asociado.");

  const [{ data: role }, { data: enrollment }] = await Promise.all([
    supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle(),
    supabaseAdmin
      .from("enrollments")
      .select("id")
      .eq("user_id", userId)
      .eq("course_id", courseId)
      .maybeSingle(),
  ]);

  if (!role && !enrollment) {
    throw new Error("No tienes acceso a esta unidad.");
  }

  return { courseId };
}

export const listUnitResources = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => UnitResourcesInput.parse(data))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertUnitAccess(supabaseAdmin, context.userId, data.unitId);

    const { data: resources, error } = await supabaseAdmin
      .from("resources")
      .select("id, unit_id, type, title, url, position")
      .eq("unit_id", data.unitId)
      .order("position");
    if (error) throw new Error(error.message);

    return resources ?? [];
  });

export const getResourceAccessUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => ResourceAccessInput.parse(data))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: resource, error } = await supabaseAdmin
      .from("resources")
      .select("id, title, url, units(id, topics(id, course_id))")
      .eq("id", data.resourceId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!resource) throw new Error("Recurso no encontrado.");

    const courseId = resource.units?.topics?.course_id;
    if (!courseId) throw new Error("Recurso sin curso asociado.");

    const [{ data: role }, { data: enrollment }] = await Promise.all([
      supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", context.userId)
        .eq("role", "admin")
        .maybeSingle(),
      supabaseAdmin
        .from("enrollments")
        .select("id")
        .eq("user_id", context.userId)
        .eq("course_id", courseId)
        .maybeSingle(),
    ]);

    if (!role && !enrollment) {
      throw new Error("No tienes acceso a este recurso.");
    }

    await supabaseAdmin.from("activity_events").insert({
      user_id: context.userId,
      course_id: courseId,
      type: "resource_opened",
      metadata: { resource_id: resource.id, title: resource.title },
    });
    const awarded = await awardStarsDedup(context.userId, "resource", resource.id, 1);

    const storageRef = parseStorageUrl(resource.url);
    if (!storageRef) {
      return { url: resource.url, awarded, stars: awarded ? 1 : 0 };
    }

    const { data: signed, error: signedError } = await supabaseAdmin.storage
      .from(storageRef.bucket)
      .createSignedUrl(storageRef.path, 60 * 10);
    if (signedError) throw new Error(signedError.message);

    return { url: signed.signedUrl, awarded, stars: awarded ? 1 : 0 };
  });
