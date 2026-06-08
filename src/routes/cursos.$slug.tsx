import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useActivityTracker } from "@/hooks/use-activity-tracker";
import { PiezinChat } from "@/components/PiezinChat";
import { Button } from "@/components/ui/button";
import { CalendarClock, CheckCircle2, ExternalLink, FileText, Lock, Play, Video } from "lucide-react";
import { useMemo, useState, useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { enrollCourse, awardStar } from "@/lib/gamification.functions";
import { getResourceAccessUrl } from "@/lib/resource-access.functions";
import { toast } from "sonner";

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

  const unitIds = useMemo(
    () =>
      (topics ?? [])
        .flatMap((topic: any) => topic.units ?? [])
        .map((unit: any) => unit.id),
    [topics],
  );

  const { data: progressRows } = useQuery({
    queryKey: ["course-progress", course?.id, user?.id, unitIds.join(",")],
    enabled: !!course && !!user && unitIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("unit_progress")
        .select("*")
        .eq("user_id", user!.id)
        .in("unit_id", unitIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  const progressByUnit = useMemo(() => {
    const map = new Map<string, any>();
    for (const row of progressRows ?? []) map.set(row.unit_id, row);
    return map;
  }, [progressRows]);

  const { data: enrolled } = useQuery({
    queryKey: ["enrolled", course?.id, user?.id],
    enabled: !!course && !!user,
    queryFn: async () => {
      const { data } = await supabase.from("enrollments")
        .select("id").eq("course_id", course!.id).eq("user_id", user!.id).maybeSingle();
      return !!data;
    },
  });

  const { data: videoconferences } = useQuery({
    queryKey: ["course-videoconferences", course?.id, user?.id],
    enabled: !!course && !!user && !!enrolled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("videoconferences")
        .select("*")
        .eq("course_id", course!.id)
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
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
            {videoconferences && videoconferences.length > 0 && (
              <section className="rounded-2xl border bg-card p-5">
                <div className="flex items-center gap-2">
                  <CalendarClock className="size-5 text-primary" />
                  <h2 className="font-bold">Videoconferencias</h2>
                </div>
                <div className="mt-4 grid gap-3">
                  {videoconferences.map((vc) => (
                    <article
                      key={vc.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background p-4"
                    >
                      <div>
                        <h3 className="font-semibold">{vc.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {new Date(vc.scheduled_at).toLocaleString("es-ES", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                        {vc.description && (
                          <p className="mt-1 text-sm text-muted-foreground">{vc.description}</p>
                        )}
                      </div>
                      <Button asChild size="sm" className="rounded-full">
                        <a href={vc.bbb_url} target="_blank" rel="noopener noreferrer">
                          Entrar <ExternalLink className="size-4" />
                        </a>
                      </Button>
                    </article>
                  ))}
                </div>
              </section>
            )}
            {topics?.length === 0 && <p className="text-muted-foreground">Aún no hay temas publicados.</p>}
            {topics?.map((t, idx) => (
              <TopicBlock
                key={t.id}
                topic={t}
                index={idx}
                prevTopic={idx > 0 ? topics[idx - 1] : null}
                userId={user!.id}
                progressByUnit={progressByUnit}
              />
            ))}
          </div>
        )}
      </main>
      <PiezinChat scope={course.id} title={course.title} />
    </div>
  );
}

function isUnitCompleted(unit: any, progressByUnit: Map<string, any>) {
  return !!progressByUnit.get(unit.id)?.completed;
}

function TopicBlock({
  topic,
  index,
  prevTopic,
  userId,
  progressByUnit,
}: {
  topic: any;
  index: number;
  prevTopic: any;
  userId: string;
  progressByUnit: Map<string, any>;
}) {
  const previousUnits = (prevTopic?.units ?? []).sort((a: any, b: any) => a.position - b.position);
  const unlocked =
    index === 0 || previousUnits.length === 0 || previousUnits.every((unit: any) => isUnitCompleted(unit, progressByUnit));
  const units = (topic.units ?? []).sort((a: any, b: any) => a.position - b.position);
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
          {units.map((unit: any, unitIndex: number) => (
            <UnitRow
              key={unit.id}
              unit={unit}
              userId={userId}
              unlocked={
                unitIndex === 0 ||
                isUnitCompleted(units[unitIndex - 1], progressByUnit)
              }
              progress={progressByUnit.get(unit.id) ?? null}
              defaultOpen={unitIndex === 0}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function UnitRow({
  unit,
  userId,
  unlocked,
  progress,
  defaultOpen,
}: {
  unit: any;
  userId: string;
  unlocked: boolean;
  progress: any;
  defaultOpen: boolean;
}) {
  const qc = useQueryClient();
  const award = useServerFn(awardStar);
  const [open, setOpen] = useState(defaultOpen && unlocked);
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
      qc.invalidateQueries({ queryKey: ["profile"] });
    }
    qc.invalidateQueries({ queryKey: ["course-progress"] });
  }

  async function completeUnit() {
    await supabase.from("unit_progress").upsert({
      user_id: userId,
      unit_id: unit.id,
      video_percent: 100,
      completed: true,
      completed_at: new Date().toISOString(),
    }, { onConflict: "user_id,unit_id" } as any);
    if (!completed) {
      await award({ data: { reason: "unit", ref: unit.id } });
      qc.invalidateQueries({ queryKey: ["profile"] });
    }
    qc.invalidateQueries({ queryKey: ["course-progress"] });
  }

  return (
    <div className="px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {!unlocked ? <Lock className="size-4 text-muted-foreground" />
            : completed ? <CheckCircle2 className="size-5 text-[var(--success)]" />
            : <Play className="size-4 text-primary" />}
          <div>
            <div className="font-semibold text-sm">{unit.title}</div>
            {unit.description && <div className="text-xs text-muted-foreground">{unit.description}</div>}
          </div>
        </div>
        {unlocked && (
          <div className="flex items-center gap-3">
            {(progress?.video_percent ?? 0) > 0 && !completed && (
              <span className="text-xs text-muted-foreground tabular-nums">{progress?.video_percent}%</span>
            )}
            <Button
              type="button"
              size="sm"
              variant={open ? "secondary" : "outline"}
              className="rounded-full"
              onClick={() => setOpen(!open)}
            >
              {open ? "Cerrar unidad" : "Abrir unidad"}
            </Button>
          </div>
        )}
      </div>
      {open && unlocked && (
        <div className="mt-4 space-y-4 rounded-xl border bg-background p-4">
          {unit.youtube_video_id && (
            <YouTubePlayer videoId={unit.youtube_video_id} onProgress={onVideoMessage} />
          )}
          <div className="space-y-2">
            <h4 className="text-xs uppercase tracking-wide text-muted-foreground">Recursos</h4>
            {resources === undefined ? (
              <p className="text-sm text-muted-foreground">Cargando materiales...</p>
            ) : resources.length > 0 ? (
              resources.map((r) => (
                <ResourceLink key={r.id} resource={r} />
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                Esta unidad todavía no tiene materiales subidos.
              </p>
            )}
          </div>
          {!unit.youtube_video_id && !completed && (
            <Button size="sm" className="rounded-full" onClick={completeUnit}>
              Marcar unidad como completada
            </Button>
          )}
          {unit.youtube_video_id && (
            <p className="text-xs text-muted-foreground">
              Necesitas ver al menos el {unit.min_watch_percent}% del vídeo para desbloquear la siguiente unidad.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ResourceLink({ resource }: { resource: any }) {
  const getAccessUrl = useServerFn(getResourceAccessUrl);
  const [opening, setOpening] = useState(false);

  async function openResource() {
    const target = window.open("about:blank", "_blank");
    setOpening(true);
    try {
      const { url } = await getAccessUrl({ data: { resourceId: resource.id } });
      if (target) target.location.href = url;
      else window.location.href = url;
    } catch (error) {
      target?.close();
      toast.error(error instanceof Error ? error.message : "No se pudo abrir el recurso");
    } finally {
      setOpening(false);
    }
  }

  return (
    <button
      type="button"
      onClick={openResource}
      disabled={opening}
      className="flex items-center gap-2 py-1 text-left text-sm hover:text-primary disabled:opacity-60"
    >
      {resource.type === "video" ? <Video className="size-4" /> : <FileText className="size-4" />}
      {resource.title}
    </button>
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
