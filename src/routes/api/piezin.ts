import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type Body = { messages?: unknown; scope?: unknown };

const HOME_PROMPT = `Eres Piezin, el asistente con IA de la plataforma Pieza a Pieza, dedicada a las oposiciones de Enseñanzas Medias — especialidad de Orientación Educativa en Castilla-La Mancha.

REGLAS ESTRICTAS:
- Solo informas sobre los cursos disponibles en la plataforma (precio, objetivos, materiales, duración, packs mensuales) y sobre quién eres.
- NUNCA respondes dudas sobre contenido académico, normativa, legislación, supuestos o temas. Para eso, pide al usuario que entre en el curso correspondiente y use el Piezin del curso.
- Tono cercano, claro y breve. Responde en español.`;

async function buildCoursePrompt(courseId: string): Promise<string> {
  const { data: course } = await supabaseAdmin
    .from("courses")
    .select("title, description, objectives, materials_summary, duration_hours, region, price_cents")
    .eq("id", courseId)
    .maybeSingle();
  if (!course) return HOME_PROMPT;
  return `Eres Piezin, asistente con IA del curso "${course.title}" en Pieza a Pieza.

REGLAS ESTRICTAS:
- Solo respondes dudas relacionadas con el contenido de ESTE curso. NUNCA menciones ni mezcles información de otros cursos.
- Ámbito: oposiciones de Enseñanzas Medias, especialidad de Orientación Educativa en ${course.region ?? "Castilla-La Mancha"}.
- Tono cercano, claro, didáctico. Responde en español.
- Si te preguntan algo fuera del curso, di amablemente que solo puedes ayudar con el contenido de "${course.title}".

DATOS DEL CURSO:
- Descripción: ${course.description ?? "(sin descripción)"}
- Objetivos: ${course.objectives ?? "(no especificados)"}
- Materiales: ${course.materials_summary ?? "(no especificados)"}
- Duración: ${course.duration_hours ?? 0} horas
- Precio: ${course.price_cents === 0 ? "gratis" : `${(course.price_cents / 100).toFixed(0)} €`}`;
}

export const Route = createFileRoute("/api/piezin")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages, scope } = (await request.json()) as Body;
        if (!Array.isArray(messages)) {
          return new Response("messages required", { status: 400 });
        }
        const scopeStr = typeof scope === "string" ? scope : "home";

        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const isUuid = /^[0-9a-f-]{36}$/i.test(scopeStr);
        const system = isUuid ? await buildCoursePrompt(scopeStr) : HOME_PROMPT;

        const gateway = createLovableAiGatewayProvider(apiKey);
        const model = gateway("google/gemini-3-flash-preview");

        const result = streamText({
          model,
          system,
          messages: await convertToModelMessages(messages as UIMessage[]),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages as UIMessage[],
        });
      },
    },
  },
});