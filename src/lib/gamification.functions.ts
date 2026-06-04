import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

const AwardInput = z.object({
  reason: z.enum(["video", "quiz", "vc", "resource"]),
  ref: z.string().min(1).max(120),
  amount: z.number().int().min(1).max(10).default(1),
});

export const awardStar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => AwardInput.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: ok, error } = await supabaseAdmin.rpc("award_star_dedup", {
      _user: userId,
      _reason: data.reason,
      _ref: data.ref,
      _amount: data.amount,
    });
    if (error) throw new Error(error.message);
    return { awarded: !!ok };
  });

export const spinRoulette = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId, supabase } = context;
    const { data, error } = await supabase.rpc("spin_roulette", { _user: userId });
    if (error) throw new Error(error.message);
    if (!data) throw new Error("spin failed");
    const { data: item } = await supabase
      .from("roulette_items")
      .select("*")
      .eq("id", (data as { item_id: string }).item_id)
      .maybeSingle();
    return { spin: data, item };
  });

const EnrollInput = z.object({ courseId: z.string().uuid() });
export const enrollCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => EnrollInput.parse(d))
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;
    const { data: course } = await supabase
      .from("courses").select("price_cents").eq("id", data.courseId).maybeSingle();
    if (!course) throw new Error("Course not found");
    if (course.price_cents > 0) {
      throw new Error("Este curso es de pago. Próximamente disponible.");
    }
    const { error } = await supabaseAdmin
      .from("enrollments")
      .insert({ user_id: userId, course_id: data.courseId });
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    return { ok: true };
  });

const TopicInput = z.object({ topicId: z.string().uuid() });
export const claimTopicBonus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => TopicInput.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    // Fetch units of the topic and the bonus
    const { data: topic } = await supabaseAdmin
      .from("topics").select("id, bonus_points").eq("id", data.topicId).maybeSingle();
    if (!topic) throw new Error("Topic not found");
    const { data: units } = await supabaseAdmin
      .from("units").select("id").eq("topic_id", data.topicId);
    const unitIds = (units ?? []).map((u) => u.id);
    if (unitIds.length === 0) return { awarded: false };
    const { data: done } = await supabaseAdmin
      .from("unit_progress").select("unit_id")
      .eq("user_id", userId).eq("completed", true).in("unit_id", unitIds);
    if ((done?.length ?? 0) < unitIds.length) return { awarded: false };
    const { data: ok } = await supabaseAdmin.rpc("award_star_dedup", {
      _user: userId,
      _reason: "topic",
      _ref: topic.id,
      _amount: Math.max(1, topic.bonus_points ?? 20),
    });
    return { awarded: !!ok };
  });