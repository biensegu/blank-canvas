import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Error("forbidden");
}

const CourseInput = z.object({ courseId: z.string().uuid() });
const SearchUsersInput = z.object({
  courseId: z.string().uuid(),
  search: z.string().max(120).optional().default(""),
});
const EnrollmentInput = z.object({
  courseId: z.string().uuid(),
  userId: z.string().uuid(),
});

export const listEnrollmentCourses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: courses, error: coursesErr }, { data: enrollments, error: enrollmentsErr }] =
      await Promise.all([
        supabaseAdmin
          .from("courses")
          .select("id, slug, title, price_cents, position")
          .order("position"),
        supabaseAdmin.from("enrollments").select("course_id"),
      ]);

    if (coursesErr) throw new Error(coursesErr.message);
    if (enrollmentsErr) throw new Error(enrollmentsErr.message);

    const counts = new Map<string, number>();
    (enrollments ?? []).forEach((e) => {
      counts.set(e.course_id, (counts.get(e.course_id) ?? 0) + 1);
    });

    return {
      courses: (courses ?? []).map((course) => ({
        ...course,
        enrolled_count: counts.get(course.id) ?? 0,
      })),
    };
  });

export const listCourseEnrollments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CourseInput.parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: enrollments, error } = await supabaseAdmin
      .from("enrollments")
      .select("id, user_id, course_id, created_at")
      .eq("course_id", data.courseId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const userIds = (enrollments ?? []).map((e) => e.user_id);
    if (userIds.length === 0) return { enrollments: [] };

    const [{ data: profiles }, { data: authList, error: authErr }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, full_name, blocked, stars").in("id", userIds),
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);
    if (authErr) throw new Error(authErr.message);

    const profilesById = new Map((profiles ?? []).map((p) => [p.id, p]));
    const authById = new Map(authList.users.map((u) => [u.id, u]));

    return {
      enrollments: (enrollments ?? []).map((enrollment) => {
        const profile = profilesById.get(enrollment.user_id);
        const authUser = authById.get(enrollment.user_id);
        return {
          id: enrollment.id,
          user_id: enrollment.user_id,
          email: authUser?.email ?? "",
          full_name: profile?.full_name ?? null,
          blocked: !!profile?.blocked,
          stars: profile?.stars ?? 0,
          created_at: enrollment.created_at,
          last_sign_in_at: authUser?.last_sign_in_at ?? null,
        };
      }),
    };
  });

export const searchEnrollmentUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SearchUsersInput.parse(d ?? {}))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const query = data.search.trim().toLowerCase();
    if (query.length < 2) return { users: [] };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: authList, error: authErr } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (authErr) throw new Error(authErr.message);

    const ids = authList.users.map((u) => u.id);
    const [{ data: profiles }, { data: existing }] = await Promise.all([
      ids.length
        ? supabaseAdmin.from("profiles").select("id, full_name, blocked").in("id", ids)
        : Promise.resolve({ data: [] }),
      supabaseAdmin.from("enrollments").select("user_id").eq("course_id", data.courseId),
    ]);

    const profilesById = new Map((profiles ?? []).map((p) => [p.id, p]));
    const enrolled = new Set((existing ?? []).map((e) => e.user_id));

    const users = authList.users
      .map((user) => {
        const profile = profilesById.get(user.id);
        return {
          id: user.id,
          email: user.email ?? "",
          full_name: profile?.full_name ?? null,
          blocked: !!profile?.blocked,
          enrolled: enrolled.has(user.id),
        };
      })
      .filter((user) => {
        return (
          user.email.toLowerCase().includes(query) ||
          (user.full_name ?? "").toLowerCase().includes(query)
        );
      })
      .slice(0, 20);

    return { users };
  });

export const createManualEnrollment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => EnrollmentInput.parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("enrollments")
      .insert({ course_id: data.courseId, user_id: data.userId });
    if (error && !error.message.toLowerCase().includes("duplicate")) {
      throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteManualEnrollment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => EnrollmentInput.parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("enrollments")
      .delete()
      .eq("course_id", data.courseId)
      .eq("user_id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
