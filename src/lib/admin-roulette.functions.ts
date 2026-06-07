import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database, Json } from "@/integrations/supabase/types";

type RouletteItemInsert = Database["public"]["Tables"]["roulette_items"]["Insert"];

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Error("forbidden");
}

const RouletteItemInput = z.object({
  id: z.string().uuid().optional(),
  slot_index: z.coerce.number().int().min(0).max(7),
  kind: z.enum(["surprise", "chest", "tutoring"]),
  title: z.string().trim().min(2).max(160),
  weight: z.coerce.number().int().min(0).max(1000),
  payload: z.string().trim().default("{}"),
});

export const listAdminRoulette = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: items, error: itemsError }, { data: spins, error: spinsError }] =
      await Promise.all([
        supabaseAdmin.from("roulette_items").select("*").order("slot_index"),
        supabaseAdmin
          .from("roulette_spins")
          .select("id, item_id, spun_at, roulette_items(title, slot_index)")
          .order("spun_at", { ascending: false })
          .limit(20),
      ]);
    if (itemsError) throw new Error(itemsError.message);
    if (spinsError) throw new Error(spinsError.message);
    return { items: items ?? [], recentSpins: spins ?? [] };
  });

export const saveAdminRouletteItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => RouletteItemInput.parse(data))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let parsedPayload: Json;
    try {
      parsedPayload = JSON.parse(data.payload || "{}") as Json;
    } catch {
      throw new Error("Payload JSON no válido.");
    }

    const payload: RouletteItemInsert = {
      slot_index: data.slot_index,
      kind: data.kind,
      title: data.title,
      weight: data.weight,
      payload: parsedPayload,
    };
    if (data.id) payload.id = data.id;

    const { data: saved, error } = await supabaseAdmin
      .from("roulette_items")
      .upsert(payload, { onConflict: "slot_index" })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: saved.id };
  });
