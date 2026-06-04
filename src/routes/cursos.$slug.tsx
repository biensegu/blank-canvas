import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useActivityTracker } from "@/hooks/use-activity-tracker";
import { PiezinChat } from "@/components/PiezinChat";
import { Button } from "@/components/ui/button";
import { Lock, CheckCircle2, Play, FileText, Video } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { enrollCourse, awardStar } from "@/lib/gamification.functions";

export const Route = createFileRoute("/cursos/$slug")({
  head: ({ params }) => ({ meta: [{ title: `${params.slug} — Pieza a Pieza` }] }),
  component: CourseDetail,
});

function CourseDetail() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const enroll = useServerFn(enrollCourse);

  const { data: course } = useQuery({
    queryKey: ["course", slug],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("*").eq("slug", slug).maybeSingle();
      return data;
    },
  });

  useActivityTracker("course_view", course?.id);

  const { data: topics } = useQuery({
    queryKey: ["topics", course?.id],
    enabled: !!course,
    queryFn: async () => {
      const { data } = await supabase
        .from("topics").select("*, units(*)")
        .eq("course_id", course!.id).order("position");
      return data ?? [];
    },
  });

  const { data: enrolled } = useQuery({
    queryKey: ["enrolled", course?.id, user?.id],
    enabled: !!course && !!user,
    queryFn: async () => {
      const { data } = await supabase.from("enrollments")
        .select("id").eq("course_id", course!.id).eq("user_id", user!.id).maybeSingle();
      return !!data;
    },
  });

  if (!course) {
    return (
      <div className="min-h-screen"><Header />
        <main className="container mx-auto px-4 py-20 text-center">
          <p className="text-muted-foreground">Cargando o curso no encontrado…</p>
          <Button asChild className="mt-6 rounded-full"><Link to="/cursos">Volver al catálogo</Link></Button>
        </main>
      </div>
    );
  }

  const isFree = course.price_cents === 0;

  async function onEnroll() {
    if (!user) { window.location.href = "/login"; return; }
    await enroll({ data: { courseId: course!.id } });
    qc.invalidateQueries({ queryKey: ["enrolled"] });
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-10 max-w-5xl">
        <Link to="/cursos" className="text-sm text-muted-foreground hover:text-primary">← Catálogo</Link>
        <div className="mt-3 flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-extrabold flex items-center gap-3">
              <span className="text-5xl">{course.cover_emoji}</span>{course.title}
            </h1>
            <p className="text-muted-foreground mt-2 max-w-2xl">{course.description}</p>
          </div>
          {!enrolled && (
            <Button onClick={onEnroll} size="lg" className="rounded-full">
              {isFree ? "Inscribirme gratis" : `Inscribirme · ${(course.price_cents/100).toFixed(0)} €`}
            </Button>
          )}
        </div>

        {!enrolled ? (
          <div className="mt-10 rounded-2xl border-2 border-dashed p-10 text-center">
            <Lock className="size-10 mx-auto text-muted-foreground" />
            <p className="mt-3 text-muted-foreground">Inscríbete para acceder al contenido.</p>
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            {topics?.length === 0 && <p className="text-muted-foreground">Aún no hay temas publicados.</p>}
            {topics?.map((t, idx) => (
              <TopicBlock key={t.id} topic={t} index={idx} prevTopic={idx>0 ? topics[idx-1] : null} userId={user!.id} />
            ))}
          </div>
        )}
      </main>
      <PiezinChat scope={course.id} title={course.title} />
    </div>
  );
}

function TopicBlock({ topic, userId }: { topic: any; index: number; prevTopic: any; userId: string }) {
  const { data: unlocked } = useQuery({
    queryKey: ["topic-unlocked", topic.id, userId],
    queryFn: async () => {
      const { data } = await supabase.rpc("is_topic_unlocked", { _user: userId, _topic: topic.id });
      return !!data;
    },
  });
  return (
    <section className={`rounded-2xl border bg-card overflow-hidden ${!unlocked ? "opacity-60" : ""}`}>
      <header className="px-5 py-3 border-b flex items-center justify-between bg-muted/30">
        <h2 className="font-bold flex items-center gap-2">
          {unlocked ? <CheckCircle2 className="size-5 text-[var(--success)]" /> : <Lock className="size-4 text-muted-foreground" />}
          {topic.title}
        </h2>
        <span className="text-xs text-muted-foreground">{topic.units?.length ?? 0} unidades</span>
      </header>
      {unlocked && (
        <div className="divide-y">
          {(topic.units ?? []).sort((a:any,b:any)=>a.position-b.position).map((u: any) => (
            <UnitRow key={u.id} unit={u} userId={userId} />
          ))}
        </div>
      )}
    </section>
  );
}

function UnitRow({ unit, userId }: { unit: any; userId: string }) {
  const qc = useQueryClient();
  const award = useServerFn(awardStar);
  const [open, setOpen] = useState(false);
  const { data: unlocked } = useQuery({
    queryKey: ["unit-unlocked", unit.id, userId],
    queryFn: async () => {
      const { data } = await supabase.rpc("is_unit_unlocked", { _user: userId, _unit: unit.id });
      return !!data;
    },
  });
  const { data: progress } = useQuery({
    queryKey: ["unit-progress", unit.id, userId],
    queryFn: async () => {
      const { data } = await supabase.from("unit_progress").select("*")
        .eq("unit_id", unit.id).eq("user_id", userId).maybeSingle();
      return data;
    },
  });
  const { data: resources } = useQuery({
    queryKey: ["resources", unit.id],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase.from("resources").select("*").eq("unit_id", unit.id).order("position");
      return data ?? [];
    },
  });

  const completed = !!progress?.completed;
  const lastSent = useRef(0);

  async function onVideoMessage(percent: number) {
    // Throttle updates
    if (Date.now() - lastSent.current < 5000 && percent < unit.min_watch_percent) return;
    lastSent.current = Date.now();
    const finalPercent = Math.max(progress?.video_percent ?? 0, Math.min(100, Math.round(percent)));
    const shouldComplete = finalPercent >= unit.min_watch_percent;
    await supabase.from("unit_progress").upsert({
      user_id: userId,
      unit_id: unit.id,
      video_percent: finalPercent,
      completed: shouldComplete,
      completed_at: shouldComplete ? new Date().toISOString() : null,
    }, { onConflict: "user_id,unit_id" } as any);
    if (shouldComplete && !completed) {
      await award({ data: { reason: "video", ref: unit.id } });
      qc.invalidateQueries({ queryKey: ["topic-unlocked"] });
      qc.invalidateQueries({ queryKey: ["unit-unlocked"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
    }
    qc.invalidateQueries({ queryKey: ["unit-progress", unit.id] });
  }

  return (
    <div className="px-5 py-4">
      <button
        onClick={() => unlocked && setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 text-left"
        disabled={!unlocked}
      >
        <div className="flex items-center gap-3">
          {!unlocked ? <Lock className="size-4 text-muted-foreground" />
            : completed ? <CheckCircle2 className="size-5 text-[var(--success)]" />
            : <Play className="size-4 text-primary" />}
          <div>
            <div className="font-semibold text-sm">{unit.title}</div>
            {unit.description && <div className="text-xs text-muted-foreground">{unit.description}</div>}
          </div>
        </div>
        {unlocked && (progress?.video_percent ?? 0) > 0 && !completed && (
          <span className="text-xs text-muted-foreground tabular-nums">{progress?.video_percent}%</span>
        )}
      </button>
      {open && unlocked && (
        <div className="mt-4 space-y-4">
          {unit.youtube_video_id && (
            <YouTubePlayer videoId={unit.youtube_video_id} onProgress={onVideoMessage} />
          )}
          {resources && resources.length > 0 && (
            <div className="space-y-1">
              <h4 className="text-xs uppercase tracking-wide text-muted-foreground">Recursos</h4>
              {resources.map((r) => (
                <a key={r.id} href={r.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm hover:text-primary py-1">
                  {r.type === "video" ? <Video className="size-4" /> : <FileText className="size-4" />}
                  {r.title}
                </a>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Necesitas ver al menos el {unit.min_watch_percent}% del vídeo para desbloquear la siguiente unidad.
          </p>
        </div>
      )}
    </div>
  );
}

function YouTubePlayer({ videoId, onProgress }: { videoId: string; onProgress: (p: number) => void }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    const interval = setInterval(() => {
      iframeRef.current?.contentWindow?.postMessage(
        '{"event":"listening","id":1}', "*"
      );
      iframeRef.current?.contentWindow?.postMessage(
        '{"event":"command","func":"getCurrentTime","args":""}', "*"
      );
      iframeRef.current?.contentWindow?.postMessage(
        '{"event":"command","func":"getDuration","args":""}', "*"
      );
    }, 3000);
    let current = 0, duration = 0;
    function handler(e: MessageEvent) {
      try {
        const d = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (d?.info?.currentTime) current = d.info.currentTime;
        if (d?.info?.duration) duration = d.info.duration;
        if (typeof d?.info === "number") current = d.info;
        if (duration > 0) onProgress((current / duration) * 100);
      } catch {}
    }
    window.addEventListener("message", handler);
    return () => { clearInterval(interval); window.removeEventListener("message", handler); };
  }, [onProgress]);
  return (
    <div className="aspect-video rounded-xl overflow-hidden bg-black">
      <iframe
        ref={iframeRef}
        src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&rel=0`}
        className="w-full h-full"
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="Vídeo de la unidad"
      />
    </div>
  );
}