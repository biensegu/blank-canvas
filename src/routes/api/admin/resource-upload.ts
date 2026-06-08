import { createFileRoute } from "@tanstack/react-router";

import { supabaseAdmin } from "@/integrations/supabase/client.server";

const BUCKET = "course-materials";
const MAX_FILE_SIZE = 50 * 1024 * 1024;

function sanitizeFileName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "material";
}

async function requireAdmin(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const token = authHeader.replace("Bearer ", "").trim();
  const { data: auth, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !auth.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { data: role, error: roleError } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", auth.user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (roleError || !role) {
    return new Response("Forbidden", { status: 403 });
  }

  return { userId: auth.user.id };
}

async function ensureBucket() {
  const { data } = await supabaseAdmin.storage.getBucket(BUCKET);
  if (data) return;

  const { error } = await supabaseAdmin.storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: MAX_FILE_SIZE,
    allowedMimeTypes: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "video/mp4",
      "image/png",
      "image/jpeg",
    ],
  });

  if (error && !error.message.toLowerCase().includes("already exists")) {
    throw new Error(error.message);
  }
}

export const Route = createFileRoute("/api/admin/resource-upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const admin = await requireAdmin(request);
        if (admin instanceof Response) return admin;

        const form = await request.formData();
        const file = form.get("file");
        const unitId = form.get("unitId");

        if (!(file instanceof File)) {
          return new Response("file required", { status: 400 });
        }
        if (typeof unitId !== "string" || !/^[0-9a-f-]{36}$/i.test(unitId)) {
          return new Response("unitId required", { status: 400 });
        }
        if (file.size > MAX_FILE_SIZE) {
          return new Response("file too large", { status: 413 });
        }

        await ensureBucket();

        const safeName = sanitizeFileName(file.name);
        const path = `${unitId}/${crypto.randomUUID()}-${safeName}`;
        const bytes = new Uint8Array(await file.arrayBuffer());
        const { error } = await supabaseAdmin.storage
          .from(BUCKET)
          .upload(path, bytes, {
            contentType: file.type || "application/octet-stream",
            upsert: false,
          });

        if (error) {
          return new Response(error.message, { status: 500 });
        }

        return Response.json({
          bucket: BUCKET,
          path,
          url: `storage://${BUCKET}/${path}`,
          fileName: file.name,
          contentType: file.type,
        });
      },
    },
  },
});
