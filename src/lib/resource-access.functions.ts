import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ResourceAccessInput = z.object({
  resourceId: z.string().uuid(),
});

function parseStorageUrl(url: string) {
  const match = url.match(/^storage:\/\/([^/]+)\/(.+)$/);
  if (!match) return null;
  return { bucket: match[1], path: match[2] };
}

export const getResourceAccessUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => ResourceAccessInput.parse(data))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: resource, error } = await supabaseAdmin
      .from("resources")
      .select("id, url, units(id, topics(id, course_id))")
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

    const storageRef = parseStorageUrl(resource.url);
    if (!storageRef) {
      return { url: resource.url };
    }

    const { data: signed, error: signedError } = await supabaseAdmin.storage
      .from(storageRef.bucket)
      .createSignedUrl(storageRef.path, 60 * 10);
    if (signedError) throw new Error(signedError.message);

    return { url: signed.signedUrl };
  });
