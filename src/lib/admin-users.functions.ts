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

export const listAdminUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        search: z.string().max(120).optional().default(""),
        status: z.enum(["all", "active", "blocked", "inactive"]).optional().default("all"),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Fetch auth users (paginated; first 1000)
    const { data: authList, error: authErr } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (authErr) throw new Error(authErr.message);

    const ids = authList.users.map((u) => u.id);
    if (ids.length === 0) return { users: [] };

    const [{ data: profiles }, { data: events }, { data: roles }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, full_name, blocked, stars, created_at").in("id", ids),
      supabaseAdmin.from("activity_events").select("user_id").in("user_id", ids),
      supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", ids),
    ]);

    const profById = new Map((profiles ?? []).map((p) => [p.id, p]));
    const rolesById = new Map<string, string[]>();
    (roles ?? []).forEach((r) => {
      const arr = rolesById.get(r.user_id) ?? [];
      arr.push(r.role);
      rolesById.set(r.user_id, arr);
    });
    const eventCounts = new Map<string, number>();
    (events ?? []).forEach((e) => {
      if (!e.user_id) return;
      eventCounts.set(e.user_id, (eventCounts.get(e.user_id) ?? 0) + 1);
    });

    const INACTIVE_DAYS = 30;
    const inactiveCutoff = Date.now() - INACTIVE_DAYS * 86_400_000;

    let users = authList.users.map((u) => {
      const p = profById.get(u.id);
      const last = u.last_sign_in_at ? new Date(u.last_sign_in_at).getTime() : 0;
      const blocked = !!p?.blocked;
      const inactive = !blocked && (last === 0 || last < inactiveCutoff);
      return {
        id: u.id,
        email: u.email ?? "",
        full_name: p?.full_name ?? null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        actions: eventCounts.get(u.id) ?? 0,
        stars: p?.stars ?? 0,
        blocked,
        inactive,
        roles: rolesById.get(u.id) ?? [],
      };
    });

    if (data.status === "blocked") users = users.filter((u) => u.blocked);
    else if (data.status === "active") users = users.filter((u) => !u.blocked && !u.inactive);
    else if (data.status === "inactive") users = users.filter((u) => u.inactive);

    const q = data.search.trim().toLowerCase();
    if (q) {
      users = users.filter(
        (u) =>
          u.email.toLowerCase().includes(q) ||
          (u.full_name ?? "").toLowerCase().includes(q),
      );
    }

    users.sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
    return { users };
  });

export const setUserBlocked = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ userId: z.string().uuid(), blocked: z.boolean() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ blocked: data.blocked, updated_at: new Date().toISOString() })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    // Best-effort: also revoke sessions when blocking
    if (data.blocked) {
      await supabaseAdmin.auth.admin.signOut(data.userId).catch(() => {});
    }
    return { ok: true };
  });