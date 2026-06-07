import { createServerFn } from "@tanstack/react-start";

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

function daysAgo(days: number) {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

export const getAdminAnalytics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const cutoff30 = daysAgo(30);
    const [
      authUsers,
      profiles,
      courses,
      enrollments,
      progress,
      spins,
      events,
    ] = await Promise.all([
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      supabaseAdmin.from("profiles").select("id, full_name, blocked, stars"),
      supabaseAdmin.from("courses").select("id, slug, title"),
      supabaseAdmin.from("enrollments").select("id, user_id, course_id, courses(id, slug, title)"),
      supabaseAdmin.from("unit_progress").select("id, user_id, completed").eq("completed", true),
      supabaseAdmin
        .from("roulette_spins")
        .select("id, user_id, spun_at, roulette_items(title)")
        .order("spun_at", { ascending: false })
        .limit(500),
      supabaseAdmin
        .from("activity_events")
        .select("id, user_id, type, course_id, duration_ms, created_at, courses(id, slug, title)")
        .order("created_at", { ascending: false })
        .limit(1000),
    ]);

    if (authUsers.error) throw new Error(authUsers.error.message);
    if (profiles.error) throw new Error(profiles.error.message);
    if (courses.error) throw new Error(courses.error.message);
    if (enrollments.error) throw new Error(enrollments.error.message);
    if (progress.error) throw new Error(progress.error.message);
    if (spins.error) throw new Error(spins.error.message);
    if (events.error) throw new Error(events.error.message);

    const profileById = new Map((profiles.data ?? []).map((profile) => [profile.id, profile]));
    const authById = new Map(authUsers.data.users.map((user) => [user.id, user]));
    const activeUsers = authUsers.data.users.filter(
      (user) => user.last_sign_in_at && user.last_sign_in_at >= cutoff30,
    ).length;
    const blockedUsers = (profiles.data ?? []).filter((profile) => profile.blocked).length;
    const totalStars = (profiles.data ?? []).reduce((sum, profile) => sum + (profile.stars ?? 0), 0);
    const totalDurationMs = (events.data ?? []).reduce(
      (sum, event) => sum + (event.duration_ms ?? 0),
      0,
    );

    const eventTypeCounts = new Map<string, number>();
    const courseActivityCounts = new Map<string, { slug: string; title: string; count: number }>();
    const enrollmentsByCourse = new Map<string, { slug: string; title: string; count: number }>();

    for (const event of events.data ?? []) {
      eventTypeCounts.set(event.type, (eventTypeCounts.get(event.type) ?? 0) + 1);
      const course = event.courses;
      if (course) {
        const current = courseActivityCounts.get(course.id) ?? {
          slug: course.slug,
          title: course.title,
          count: 0,
        };
        current.count += 1;
        courseActivityCounts.set(course.id, current);
      }
    }

    for (const enrollment of enrollments.data ?? []) {
      const course = enrollment.courses;
      if (course) {
        const current = enrollmentsByCourse.get(course.id) ?? {
          slug: course.slug,
          title: course.title,
          count: 0,
        };
        current.count += 1;
        enrollmentsByCourse.set(course.id, current);
      }
    }

    return {
      summary: {
        totalUsers: authUsers.data.users.length,
        activeUsers,
        blockedUsers,
        totalCourses: courses.data?.length ?? 0,
        totalEnrollments: enrollments.data?.length ?? 0,
        completedUnits: progress.data?.length ?? 0,
        totalStars,
        totalSpins: spins.data?.length ?? 0,
        totalActivityEvents: events.data?.length ?? 0,
        totalDurationMinutes: Math.round(totalDurationMs / 60_000),
      },
      eventTypes: [...eventTypeCounts.entries()]
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count),
      courseActivity: [...courseActivityCounts.values()].sort((a, b) => b.count - a.count),
      courseEnrollments: [...enrollmentsByCourse.values()].sort((a, b) => b.count - a.count),
      recentEvents: (events.data ?? []).slice(0, 25).map((event) => {
        const authUser = event.user_id ? authById.get(event.user_id) : null;
        const profile = event.user_id ? profileById.get(event.user_id) : null;
        return {
          id: event.id,
          type: event.type,
          created_at: event.created_at,
          duration_ms: event.duration_ms,
          user_email: authUser?.email ?? null,
          user_name: profile?.full_name ?? null,
          course_title: event.courses?.title ?? null,
        };
      }),
      recentSpins: (spins.data ?? []).slice(0, 20).map((spin) => {
        const authUser = authById.get(spin.user_id);
        const profile = profileById.get(spin.user_id);
        return {
          id: spin.id,
          spun_at: spin.spun_at,
          user_email: authUser?.email ?? null,
          user_name: profile?.full_name ?? null,
          item_title: spin.roulette_items?.title ?? null,
        };
      }),
    };
  });
