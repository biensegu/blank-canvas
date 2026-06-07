import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState, type FormEvent } from "react";
import { ArrowLeft, CalendarClock, Loader2, Plus, Save, Trash2, Video } from "lucide-react";
import { toast } from "sonner";

import { Header } from "@/components/Header";
import { RequireAdmin } from "@/components/RequireAdmin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteAdminVideoconference,
  listAdminVideoconferences,
  saveAdminVideoconference,
} from "@/lib/admin-videoconferences.functions";

type Videoconference = Awaited<
  ReturnType<typeof listAdminVideoconferences>
>["videoconferences"][number];

function fmt(date: string) {
  return new Date(date).toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toDatetimeLocal(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function AdminVideoconferencesPage() {
  const qc = useQueryClient();
  const listVideoconferences = useServerFn(listAdminVideoconferences);
  const saveVideoconference = useServerFn(saveAdminVideoconference);
  const removeVideoconference = useServerFn(deleteAdminVideoconference);
  const [editing, setEditing] = useState<Videoconference | null>(null);
  const [courseFilter, setCourseFilter] = useState("all");

  const query = useQuery({
    queryKey: ["admin-videoconferences"],
    queryFn: () => listVideoconferences(),
  });

  const courses = query.data?.courses ?? [];
  const videoconferences = useMemo(() => {
    const rows = query.data?.videoconferences ?? [];
    return courseFilter === "all"
      ? rows
      : rows.filter((videoconference) => videoconference.course_id === courseFilter);
  }, [query.data?.videoconferences, courseFilter]);
  const courseById = new Map(courses.map((course) => [course.id, course]));

  const saveMutation = useMutation({
    mutationFn: (data: any) => saveVideoconference({ data }),
    onSuccess: () => {
      toast.success("Videoconferencia guardada");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin-videoconferences"] });
      qc.invalidateQueries({ queryKey: ["course-videoconferences"] });
    },
    onError: (error: any) => toast.error(error?.message ?? "No se pudo guardar"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => removeVideoconference({ data: { id } }),
    onSuccess: () => {
      toast.success("Videoconferencia eliminada");
      qc.invalidateQueries({ queryKey: ["admin-videoconferences"] });
      qc.invalidateQueries({ queryKey: ["course-videoconferences"] });
    },
    onError: (error: any) => toast.error(error?.message ?? "No se pudo eliminar"),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const scheduled = String(form.get("scheduled_at") ?? "");
    saveMutation.mutate({
      id: editing?.id,
      course_id: String(form.get("course_id") ?? ""),
      title: String(form.get("title") ?? ""),
      description: String(form.get("description") ?? ""),
      scheduled_at: new Date(scheduled).toISOString(),
      bbb_url: String(form.get("bbb_url") ?? ""),
    });
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-10">
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin">
            <ArrowLeft className="size-4" /> Volver
          </Link>
        </Button>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Video className="size-7 text-primary" />
            <div>
              <h1 className="text-3xl font-extrabold">Videoconferencias</h1>
              <p className="text-muted-foreground">
                Programa enlaces de BigBlueButton por curso.
              </p>
            </div>
          </div>
          {query.isFetching && <Loader2 className="size-5 animate-spin text-muted-foreground" />}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[420px,1fr]">
          <form onSubmit={submit} className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold">
                {editing ? "Editar videoconferencia" : "Nueva videoconferencia"}
              </h2>
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                <Plus className="size-4" /> Nueva
              </Button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <Label>Curso</Label>
                <Select name="course_id" defaultValue={editing?.course_id ?? courses[0]?.id}>
                  <SelectTrigger><SelectValue placeholder="Selecciona curso" /></SelectTrigger>
                  <SelectContent>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Field label="Título" name="title" defaultValue={editing?.title ?? ""} />
              <Field
                label="Fecha y hora"
                name="scheduled_at"
                type="datetime-local"
                defaultValue={toDatetimeLocal(editing?.scheduled_at)}
              />
              <Field label="URL BigBlueButton" name="bbb_url" defaultValue={editing?.bbb_url ?? ""} />
              <div>
                <Label>Descripción</Label>
                <Textarea name="description" defaultValue={editing?.description ?? ""} rows={4} />
              </div>
              <Button type="submit" disabled={saveMutation.isPending || courses.length === 0}>
                <Save className="size-4" /> Guardar
              </Button>
            </div>
          </form>

          <section className="rounded-xl border bg-card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
              <h2 className="text-xl font-bold">Programadas</h2>
              <Select value={courseFilter} onValueChange={setCourseFilter}>
                <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los cursos</SelectItem>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {query.isLoading ? (
              <div className="p-8 text-sm text-muted-foreground">Cargando...</div>
            ) : videoconferences.length === 0 ? (
              <div className="p-8 text-sm text-muted-foreground">
                No hay videoconferencias para este filtro.
              </div>
            ) : (
              <div className="divide-y">
                {videoconferences.map((videoconference) => (
                  <article key={videoconference.id} className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold">{videoconference.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {courseById.get(videoconference.course_id)?.title ?? "Curso"} ·{" "}
                          {fmt(videoconference.scheduled_at)}
                        </p>
                        {videoconference.description && (
                          <p className="mt-2 text-sm text-muted-foreground">
                            {videoconference.description}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge variant="secondary">
                            {videoconference.attendance_count} asistentes
                          </Badge>
                          <a
                            href={videoconference.bbb_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-medium text-primary hover:underline"
                          >
                            Abrir enlace
                          </a>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setEditing(videoconference)}>
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            if (confirm("¿Eliminar esta videoconferencia?")) {
                              deleteMutation.mutate(videoconference.id);
                            }
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input name={name} type={type} defaultValue={defaultValue ?? ""} />
    </div>
  );
}

export const Route = createFileRoute("/admin/videoconferences")({
  head: () => ({ meta: [{ title: "Videoconferencias — Admin" }] }),
  component: () => (
    <RequireAdmin>
      <AdminVideoconferencesPage />
    </RequireAdmin>
  ),
});
