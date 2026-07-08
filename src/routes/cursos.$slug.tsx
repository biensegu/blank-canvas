import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useActivityTracker } from "@/hooks/use-activity-tracker";
import { PiezinChat } from "@/components/PiezinChat";
import { Button } from "@/components/ui/button";
import {
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  FileText,
  Image,
  LinkIcon,
  Lock,
  Play,
  Video,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  claimUnitStars,
  completeUnitTask,
  enrollCourse,
  reopenUnitTask,
} from "@/lib/gamification.functions";
import { getResourceAccessUrl, listUnitResources } from "@/lib/resource-access.functions";
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

  const { data: courseUnits } = useQuery({
    queryKey: ["course-units", course?.id],
    enabled: !!course,
    queryFn: async () => {
      const { data } = await supabase
        .from("topics")
        .select("id, position, units(*)")
        .eq("course_id", course!.id)
        .order("position");
      return (data ?? [])
        .flatMap((topic: any) => topic.units ?? [])
        .sort((a: any, b: any) => a.position - b.position);
    },
  });

  const unitIds = useMemo(() => (courseUnits ?? []).map((unit: any) => unit.id), [courseUnits]);

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
      const { data } = await supabase
        .from("enrollments")
        .select("id")
        .eq("course_id", course!.id)
        .eq("user_id", user!.id)
        .maybeSingle();
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
      <div className="min-h-screen">
        <Header />
        <main className="container mx-auto px-4 py-20 text-center">
          <p className="text-muted-foreground">Cargando o curso no encontrado…</p>
          <Button asChild className="mt-6 rounded-full">
            <Link to="/cursos">Volver al catálogo</Link>
          </Button>
        </main>
      </div>
    );
  }

  const isFree = course.price_cents === 0;

  async function onEnroll() {
    if (!user) {
      window.location.href = "/login";
      return;
    }
    await enroll({ data: { courseId: course!.id } });
    qc.invalidateQueries({ queryKey: ["enrolled"] });
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-10 max-w-5xl">
        <Link to="/cursos" className="text-sm text-muted-foreground hover:text-primary">
          ← Catálogo
        </Link>
        <div className="mt-3 flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-extrabold flex items-center gap-3">
              <span className="text-5xl">{course.cover_emoji}</span>
              {course.title}
            </h1>
            <p className="text-muted-foreground mt-2 max-w-2xl">{course.description}</p>
          </div>
          {!enrolled && (
            <Button onClick={onEnroll} size="lg" className="rounded-full">
              {isFree
                ? "Inscribirme gratis"
                : `Inscribirme · ${(course.price_cents / 100).toFixed(0)} €`}
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
            {courseUnits?.length === 0 && (
              <p className="text-muted-foreground">Aún no hay unidades publicadas.</p>
            )}
            {courseUnits && courseUnits.length > 0 && (
              <UnitsBlock units={courseUnits} userId={user!.id} progressByUnit={progressByUnit} />
            )}
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

function UnitsBlock({
  units,
  userId,
  progressByUnit,
}: {
  units: any[];
  userId: string;
  progressByUnit: Map<string, any>;
}) {
  return (
    <section className="rounded-2xl border bg-card overflow-hidden">
      <header className="px-5 py-3 border-b flex items-center justify-between bg-muted/30">
        <h2 className="font-bold flex items-center gap-2">
          <CheckCircle2 className="size-5 text-[var(--success)]" />
          Unidades
        </h2>
        <span className="text-xs text-muted-foreground">{units.length} unidades</span>
      </header>
      <div className="divide-y">
        {units.map((unit: any, unitIndex: number) => (
          <UnitRow
            key={unit.id}
            unit={unit}
            userId={userId}
            unlocked={unitIndex === 0 || isUnitCompleted(units[unitIndex - 1], progressByUnit)}
            progress={progressByUnit.get(unit.id) ?? null}
            defaultOpen={unitIndex === 0}
          />
        ))}
      </div>
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
  const completeUnitOnServer = useServerFn(completeUnitTask);
  const reopenUnitOnServer = useServerFn(reopenUnitTask);
  const claimUnitStarsOnServer = useServerFn(claimUnitStars);
  const loadResources = useServerFn(listUnitResources);
  const [open, setOpen] = useState(defaultOpen && unlocked);
  const [savingProgress, setSavingProgress] = useState(false);
  const [locallyCompleted, setLocallyCompleted] = useState(false);
  const [locallyAwardedRefs, setLocallyAwardedRefs] = useState<Set<string>>(() => new Set());
  const unitStars = Math.max(0, Math.min(1000, Number(unit.base_points ?? 1)));
  const { data: resources, error: resourcesError } = useQuery({
    queryKey: ["resources", unit.id],
    enabled: open,
    queryFn: () => loadResources({ data: { unitId: unit.id } }),
  });
  const { data: starAwards } = useQuery({
    queryKey: ["unit-star-awards", unit.id, userId],
    enabled: unlocked,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("star_awards")
        .select("reason, ref_id, amount")
        .in("reason", ["unit", "resource"]);
      if (error) throw error;
      return data ?? [];
    },
  });

  const completed = !!progress?.completed;
  const isCompleted = completed || locallyCompleted;
  const awardRefs = useMemo(() => {
    const refs = new Set((starAwards ?? []).map((award) => `${award.reason}:${award.ref_id}`));
    for (const ref of locallyAwardedRefs) refs.add(ref);
    return refs;
  }, [starAwards, locallyAwardedRefs]);
  const hasStarAward = unitStars === 0 || awardRefs.has(`unit:${unit.id}`);
  const resourceCount = resources?.length ?? 0;
  const openedResourceCount =
    resources?.filter((resource) => awardRefs.has(`resource:${resource.id}`)).length ?? 0;

  useEffect(() => {
    setLocallyCompleted(completed);
  }, [completed]);

  function markAwarded(reason: string, refId: string) {
    setLocallyAwardedRefs((current) => {
      const next = new Set(current);
      next.add(`${reason}:${refId}`);
      return next;
    });
  }

  async function completeUnit() {
    if (savingProgress || isCompleted) return;
    setSavingProgress(true);
    try {
      const result = await completeUnitOnServer({ data: { unitId: unit.id } });
      if (result.awarded) markAwarded("unit", unit.id);
      setLocallyCompleted(true);
      toast.success(
        result.awarded
          ? `Unidad completada. Has ganado ${result.amount} estrella${
              result.amount === 1 ? "" : "s"
            }.`
          : "Unidad marcada como completada",
      );
      qc.invalidateQueries({ queryKey: ["unit-star-awards", unit.id, userId] });
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["course-progress"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo completar la unidad");
    } finally {
      setSavingProgress(false);
    }
  }

  async function claimMissingStars() {
    if (savingProgress || !isCompleted || hasStarAward) return;
    setSavingProgress(true);
    try {
      const result = await claimUnitStarsOnServer({ data: { unitId: unit.id } });
      if (result.awarded) markAwarded("unit", unit.id);
      toast.success(
        result.awarded
          ? `Has ganado ${result.amount} estrella${result.amount === 1 ? "" : "s"}.`
          : "Las estrellas de esta unidad ya estaban registradas.",
      );
      qc.invalidateQueries({ queryKey: ["unit-star-awards", unit.id, userId] });
      qc.invalidateQueries({ queryKey: ["profile"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudieron sumar las estrellas");
    } finally {
      setSavingProgress(false);
    }
  }

  async function reopenUnitProgress() {
    if (savingProgress || !isCompleted) return;
    setSavingProgress(true);
    try {
      await reopenUnitOnServer({ data: { unitId: unit.id } });
      setLocallyCompleted(false);
      toast.success("Unidad marcada como pendiente");
      qc.invalidateQueries({ queryKey: ["course-progress"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo revertir la unidad");
    } finally {
      setSavingProgress(false);
    }
  }

  return (
    <div className="px-5 py-4">
      <div
        className={`flex flex-wrap items-center justify-between gap-3 rounded-lg ${
          unlocked ? "cursor-pointer hover:bg-muted/40" : ""
        }`}
        role={unlocked ? "button" : undefined}
        tabIndex={unlocked ? 0 : undefined}
        onClick={() => {
          if (unlocked) setOpen(!open);
        }}
        onKeyDown={(event) => {
          if (!unlocked) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen(!open);
          }
        }}
      >
        <div className="flex items-center gap-3 p-2">
          {!unlocked ? (
            <Lock className="size-4 text-muted-foreground" />
          ) : isCompleted ? (
            <CheckCircle2 className="size-5 text-[var(--success)]" />
          ) : (
            <Play className="size-4 text-primary" />
          )}
          <div>
            <div className="font-semibold text-sm">{unit.title}</div>
            {unit.description && (
              <div className="text-xs text-muted-foreground">{unit.description}</div>
            )}
          </div>
        </div>
        {unlocked && (
          <div className="flex items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                isCompleted
                  ? "bg-[var(--success)]/10 text-[var(--success)]"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {isCompleted ? "Completada" : "Pendiente"}
            </span>
            <Button
              type="button"
              size="sm"
              variant={open ? "secondary" : "outline"}
              className="rounded-full"
              onClick={(event) => {
                event.stopPropagation();
                setOpen(!open);
              }}
            >
              {open ? "Cerrar unidad" : "Abrir unidad"}
            </Button>
          </div>
        )}
      </div>
      {open && unlocked && (
        <div className="mt-4 space-y-4 rounded-xl border bg-background p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/40 p-3">
            <div>
              <p className="text-sm font-semibold">
                {isCompleted ? "Unidad completada" : "Completar unidad"}
              </p>
              <p className="text-xs text-muted-foreground">
                {isCompleted
                  ? hasStarAward
                    ? "Tu progreso y tus estrellas ya están guardados."
                    : "Tu progreso está guardado, pero aún puedes reclamar las estrellas de esta unidad."
                  : `Marca la unidad cuando hayas revisado sus materiales para ganar ${unitStars} estrella${
                      unitStars === 1 ? "" : "s"
                    }.`}
              </p>
            </div>
            {isCompleted ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--success)]/10 px-3 py-1 text-xs font-semibold text-[var(--success)]">
                  <CheckCircle2 className="size-4" />
                  Completada
                </span>
                {!hasStarAward && (
                  <Button
                    type="button"
                    size="sm"
                    className="rounded-full"
                    onClick={claimMissingStars}
                    disabled={savingProgress}
                  >
                    {savingProgress
                      ? "Guardando..."
                      : `Sumar ${unitStars} estrella${unitStars === 1 ? "" : "s"}`}
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={reopenUnitProgress}
                  disabled={savingProgress}
                >
                  {savingProgress ? "Guardando..." : "Marcar como pendiente"}
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                className="rounded-full"
                onClick={completeUnit}
                disabled={savingProgress}
              >
                {savingProgress ? "Guardando..." : "Marcar como completada"}
              </Button>
            )}
          </div>
          <div className="grid gap-2 rounded-lg border bg-card/60 p-3 text-sm sm:grid-cols-3">
            <TaskStatus
              done={isCompleted}
              label="Unidad completada"
              detail={`${unitStars} estrella${unitStars === 1 ? "" : "s"}`}
            />
            <TaskStatus
              done={hasStarAward}
              label="Estrellas de unidad"
              detail={hasStarAward ? "Registradas" : "Pendientes"}
            />
            <TaskStatus
              done={resourceCount > 0 && openedResourceCount === resourceCount}
              label="Recursos abiertos"
              detail={`${openedResourceCount}/${resourceCount}`}
            />
          </div>
          <div className="space-y-2">
            <h4 className="text-xs uppercase tracking-wide text-muted-foreground">Recursos</h4>
            {resources === undefined ? (
              <p className="text-sm text-muted-foreground">Cargando materiales...</p>
            ) : resourcesError ? (
              <p className="text-sm text-destructive">
                No se pudieron cargar los recursos de esta unidad.
              </p>
            ) : resources.length > 0 ? (
              resources.map((r) => (
                <ResourceLink
                  key={r.id}
                  resource={r}
                  awarded={awardRefs.has(`resource:${r.id}`)}
                  onAwarded={() => {
                    markAwarded("resource", r.id);
                    qc.invalidateQueries({ queryKey: ["unit-star-awards", unit.id, userId] });
                  }}
                />
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                Esta unidad todavía no tiene materiales subidos.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TaskStatus({
  done,
  label,
  detail,
}: {
  done: boolean;
  label: string;
  detail: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-background px-3 py-2">
      {done ? (
        <CheckCircle2 className="size-4 text-[var(--success)]" />
      ) : (
        <Lock className="size-4 text-muted-foreground" />
      )}
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

function ResourceLink({
  resource,
  awarded,
  onAwarded,
}: {
  resource: any;
  awarded: boolean;
  onAwarded: () => void;
}) {
  const getAccessUrl = useServerFn(getResourceAccessUrl);
  const qc = useQueryClient();
  const [opening, setOpening] = useState(false);
  const type = inferResourceType(resource);
  const youtubeId = type === "video" ? parseYouTubeId(resource.url) : null;

  async function openResource() {
    const target = window.open("about:blank", "_blank");
    setOpening(true);
    try {
      const result = await getAccessUrl({ data: { resourceId: resource.id } });
      const url = youtubeId ? `https://www.youtube.com/watch?v=${youtubeId}` : result.url;
      if (target) target.location.href = url;
      else window.location.href = url;
      if (result.awarded) {
        onAwarded();
        qc.invalidateQueries({ queryKey: ["profile"] });
        toast.success(`Recurso abierto. Has ganado ${result.stars} estrella.`);
      }
    } catch (error) {
      target?.close();
      toast.error(error instanceof Error ? error.message : "No se pudo abrir el recurso");
    } finally {
      setOpening(false);
    }
  }

  return (
    <div className="rounded-lg border bg-card/60 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <ResourceIcon type={type} />
          <div>
            <div className="font-medium">{resource.title}</div>
            <div className="text-xs text-muted-foreground">
              {resourceTypeLabel(type)} · {awarded ? "estrella conseguida" : "1 estrella al abrir"}
            </div>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={openResource}
          disabled={opening}
          className="rounded-full"
        >
          {type === "videoconference" ? "Entrar" : youtubeId ? "Ver en YouTube" : "Abrir"}
          <ExternalLink className="size-4" />
        </Button>
      </div>
      {youtubeId && (
        <div className="mt-3 aspect-video overflow-hidden rounded-xl bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}?rel=0`}
            className="h-full w-full"
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={resource.title}
          />
        </div>
      )}
    </div>
  );
}

function ResourceIcon({ type }: { type: string }) {
  if (type === "video" || type === "videoconference") return <Video className="size-4" />;
  if (type === "image") return <Image className="size-4" />;
  if (type === "link") return <LinkIcon className="size-4" />;
  return <FileText className="size-4" />;
}

function parseYouTubeId(value: string) {
  const raw = value.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) return raw;
  try {
    const url = new URL(raw);
    if (url.hostname.includes("youtu.be")) return url.pathname.slice(1) || null;
    if (url.hostname.includes("youtube.com")) {
      return url.searchParams.get("v") ?? url.pathname.match(/\/embed\/([^/]+)/)?.[1] ?? null;
    }
  } catch {
    return null;
  }
  return null;
}

function inferResourceType(resource: { type: string; url: string }) {
  if (resource.type !== "link" && resource.type !== "doc") return resource.type;
  const url = resource.url.toLowerCase();
  if (/\.(png|jpe?g|webp|gif|svg)(\?|#|$)/.test(url)) return "image";
  if (url.includes("bigbluebutton") || url.includes("/bbb/")) return "videoconference";
  if (/\.(xls|xlsx|csv|zip)(\?|#|$)/.test(url)) return "file";
  return resource.type;
}

function resourceTypeLabel(type: string) {
  const labels: Record<string, string> = {
    pdf: "PDF",
    image: "Imagen",
    video: "Vídeo",
    file: "Archivo",
    videoconference: "Videoconferencia",
    ppt: "PowerPoint",
    doc: "Documento",
    link: "Enlace",
  };
  return labels[type] ?? type;
}
