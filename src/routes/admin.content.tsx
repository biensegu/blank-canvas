import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  BookOpen,
  FileText,
  Loader2,
  Plus,
  Save,
  Trash2,
  Video,
} from "lucide-react";
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
  deleteAdminCourse,
  deleteAdminResource,
  deleteAdminTopic,
  deleteAdminUnit,
  listAdminContent,
  saveAdminCourse,
  saveAdminResource,
  saveAdminTopic,
  saveAdminUnit,
} from "@/lib/admin-content.functions";

type Course = Awaited<ReturnType<typeof listAdminContent>>["courses"][number];
type Topic = Awaited<ReturnType<typeof listAdminContent>>["topics"][number];
type Unit = Awaited<ReturnType<typeof listAdminContent>>["units"][number];
type Resource = Awaited<ReturnType<typeof listAdminContent>>["resources"][number];

const newCourse = {
  slug: "",
  title: "",
  description: "",
  price_cents: 0,
  cover_emoji: "🧩",
  accent_color: "teal",
  position: 0,
  objectives: "",
  materials_summary: "",
  duration_hours: 0,
  region: "Castilla-La Mancha",
};

function toCourseForm(course?: Course | null) {
  if (!course) return newCourse;
  return {
    id: course.id,
    slug: course.slug,
    title: course.title,
    description: course.description ?? "",
    price_cents: course.price_cents,
    cover_emoji: course.cover_emoji ?? "🧩",
    accent_color: course.accent_color,
    position: course.position,
    objectives: course.objectives ?? "",
    materials_summary: course.materials_summary ?? "",
    duration_hours: course.duration_hours,
    region: course.region,
  };
}

function AdminContentPage() {
  const qc = useQueryClient();
  const listContent = useServerFn(listAdminContent);
  const saveCourse = useServerFn(saveAdminCourse);
  const removeCourse = useServerFn(deleteAdminCourse);
  const saveTopic = useServerFn(saveAdminTopic);
  const removeTopic = useServerFn(deleteAdminTopic);
  const saveUnit = useServerFn(saveAdminUnit);
  const removeUnit = useServerFn(deleteAdminUnit);
  const saveResource = useServerFn(saveAdminResource);
  const removeResource = useServerFn(deleteAdminResource);

  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);

  const contentQuery = useQuery({
    queryKey: ["admin-content"],
    queryFn: () => listContent(),
  });

  const courses = useMemo(
    () => contentQuery.data?.courses ?? [],
    [contentQuery.data?.courses],
  );
  const selectedCourse = courses.find((course) => course.id === selectedCourseId) ?? null;
  const topics = useMemo(
    () =>
      (contentQuery.data?.topics ?? [])
        .filter((topic) => topic.course_id === selectedCourseId)
        .sort((a, b) => a.position - b.position),
    [contentQuery.data?.topics, selectedCourseId],
  );
  const units = contentQuery.data?.units ?? [];
  const resources = contentQuery.data?.resources ?? [];
  const enrollmentCounts = contentQuery.data?.enrollmentCounts ?? {};

  useEffect(() => {
    if (!selectedCourseId && courses.length > 0) setSelectedCourseId(courses[0].id);
  }, [courses, selectedCourseId]);

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["admin-content"] });
    qc.invalidateQueries({ queryKey: ["courses"] });
    qc.invalidateQueries({ queryKey: ["course"] });
    qc.invalidateQueries({ queryKey: ["topics"] });
  }

  const saveCourseMutation = useMutation({
    mutationFn: (data: any) => saveCourse({ data }),
    onSuccess: (result) => {
      toast.success("Curso guardado");
      setSelectedCourseId(result.id);
      invalidate();
    },
    onError: (error: any) => toast.error(error?.message ?? "No se pudo guardar el curso"),
  });

  const deleteCourseMutation = useMutation({
    mutationFn: (id: string) => removeCourse({ data: { id } }),
    onSuccess: () => {
      toast.success("Curso eliminado");
      setSelectedCourseId("");
      invalidate();
    },
    onError: (error: any) => toast.error(error?.message ?? "No se pudo eliminar el curso"),
  });

  const saveTopicMutation = useMutation({
    mutationFn: (data: any) => saveTopic({ data }),
    onSuccess: () => {
      toast.success("Tema guardado");
      setEditingTopic(null);
      invalidate();
    },
    onError: (error: any) => toast.error(error?.message ?? "No se pudo guardar el tema"),
  });

  const deleteTopicMutation = useMutation({
    mutationFn: (id: string) => removeTopic({ data: { id } }),
    onSuccess: () => {
      toast.success("Tema eliminado");
      invalidate();
    },
    onError: (error: any) => toast.error(error?.message ?? "No se pudo eliminar el tema"),
  });

  const saveUnitMutation = useMutation({
    mutationFn: (data: any) => saveUnit({ data }),
    onSuccess: () => {
      toast.success("Unidad guardada");
      setEditingUnit(null);
      invalidate();
    },
    onError: (error: any) => toast.error(error?.message ?? "No se pudo guardar la unidad"),
  });

  const deleteUnitMutation = useMutation({
    mutationFn: (id: string) => removeUnit({ data: { id } }),
    onSuccess: () => {
      toast.success("Unidad eliminada");
      invalidate();
    },
    onError: (error: any) => toast.error(error?.message ?? "No se pudo eliminar la unidad"),
  });

  const saveResourceMutation = useMutation({
    mutationFn: (data: any) => saveResource({ data }),
    onSuccess: () => {
      toast.success("Recurso guardado");
      setEditingResource(null);
      invalidate();
    },
    onError: (error: any) => toast.error(error?.message ?? "No se pudo guardar el recurso"),
  });

  const deleteResourceMutation = useMutation({
    mutationFn: (id: string) => removeResource({ data: { id } }),
    onSuccess: () => {
      toast.success("Recurso eliminado");
      invalidate();
    },
    onError: (error: any) => toast.error(error?.message ?? "No se pudo eliminar el recurso"),
  });

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
            <BookOpen className="size-7 text-primary" />
            <div>
              <h1 className="text-3xl font-extrabold">Cursos y contenido</h1>
              <p className="text-muted-foreground">
                Edita cursos, temas, unidades, vídeos y recursos sin tocar la base manualmente.
              </p>
            </div>
          </div>
          {contentQuery.isFetching && <Loader2 className="size-5 animate-spin text-muted-foreground" />}
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[320px,1fr]">
          <aside className="rounded-xl border bg-card overflow-hidden">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h2 className="font-bold">Cursos</h2>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedCourseId("");
                  setEditingTopic(null);
                  setEditingUnit(null);
                  setEditingResource(null);
                }}
              >
                <Plus className="size-4" /> Nuevo
              </Button>
            </div>

            {contentQuery.isLoading ? (
              <div className="p-6 text-sm text-muted-foreground">Cargando contenido...</div>
            ) : courses.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">No hay cursos creados.</div>
            ) : (
              <div className="divide-y">
                {courses.map((course) => (
                  <button
                    key={course.id}
                    onClick={() => {
                      setSelectedCourseId(course.id);
                      setEditingTopic(null);
                      setEditingUnit(null);
                      setEditingResource(null);
                    }}
                    className={`w-full px-4 py-3 text-left transition hover:bg-accent ${
                      selectedCourseId === course.id ? "bg-accent" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-sm">
                          {course.cover_emoji} {course.title}
                        </div>
                        <div className="text-xs text-muted-foreground">/{course.slug}</div>
                      </div>
                      <Badge variant="secondary">{enrollmentCounts[course.id] ?? 0}</Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </aside>

          <section className="space-y-6">
            <CourseForm
              key={selectedCourse?.id ?? "new-course"}
              course={selectedCourse}
              isSaving={saveCourseMutation.isPending}
              onSubmit={(data) => saveCourseMutation.mutate(data)}
              onDelete={
                selectedCourse
                  ? () => {
                      if (confirm("¿Eliminar este curso y su contenido?")) {
                        deleteCourseMutation.mutate(selectedCourse.id);
                      }
                    }
                  : undefined
              }
            />

            {selectedCourse && (
              <>
                <TopicSection
                  topics={topics}
                  units={units}
                  resources={resources}
                  selectedCourseId={selectedCourse.id}
                  editingTopic={editingTopic}
                  editingUnit={editingUnit}
                  editingResource={editingResource}
                  setEditingTopic={setEditingTopic}
                  setEditingUnit={setEditingUnit}
                  setEditingResource={setEditingResource}
                  onSaveTopic={(data) => saveTopicMutation.mutate(data)}
                  onDeleteTopic={(id) => {
                    if (confirm("¿Eliminar este tema y sus unidades?")) deleteTopicMutation.mutate(id);
                  }}
                  onSaveUnit={(data) => saveUnitMutation.mutate(data)}
                  onDeleteUnit={(id) => {
                    if (confirm("¿Eliminar esta unidad y sus recursos?")) deleteUnitMutation.mutate(id);
                  }}
                  onSaveResource={(data) => saveResourceMutation.mutate(data)}
                  onDeleteResource={(id) => {
                    if (confirm("¿Eliminar este recurso?")) deleteResourceMutation.mutate(id);
                  }}
                />
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function valueFromForm(form: HTMLFormElement, key: string) {
  const value = new FormData(form).get(key);
  return typeof value === "string" ? value : "";
}

function numberFromForm(form: HTMLFormElement, key: string) {
  return Number(valueFromForm(form, key) || "0");
}

function CourseForm({
  course,
  isSaving,
  onSubmit,
  onDelete,
}: {
  course: Course | null;
  isSaving: boolean;
  onSubmit: (data: any) => void;
  onDelete?: () => void;
}) {
  const form = toCourseForm(course);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const target = event.currentTarget;
    onSubmit({
      id: course?.id,
      slug: valueFromForm(target, "slug"),
      title: valueFromForm(target, "title"),
      description: valueFromForm(target, "description"),
      price_cents: numberFromForm(target, "price_cents"),
      cover_emoji: valueFromForm(target, "cover_emoji"),
      accent_color: valueFromForm(target, "accent_color"),
      position: numberFromForm(target, "position"),
      objectives: valueFromForm(target, "objectives"),
      materials_summary: valueFromForm(target, "materials_summary"),
      duration_hours: numberFromForm(target, "duration_hours"),
      region: valueFromForm(target, "region"),
    });
  }

  return (
    <form onSubmit={submit} className="rounded-xl border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{course ? "Editar curso" : "Nuevo curso"}</h2>
          <p className="text-sm text-muted-foreground">
            El precio se guarda en céntimos: 150 € = 15000.
          </p>
        </div>
        <div className="flex gap-2">
          {onDelete && (
            <Button type="button" variant="destructive" onClick={onDelete}>
              <Trash2 className="size-4" /> Eliminar
            </Button>
          )}
          <Button type="submit" disabled={isSaving}>
            <Save className="size-4" /> Guardar curso
          </Button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Título" name="title" defaultValue={form.title} className="xl:col-span-2" />
        <Field label="Slug" name="slug" defaultValue={form.slug} />
        <Field label="Posición" name="position" type="number" defaultValue={form.position} />
        <Field label="Precio céntimos" name="price_cents" type="number" defaultValue={form.price_cents} />
        <Field label="Horas" name="duration_hours" type="number" defaultValue={form.duration_hours} />
        <Field label="Emoji" name="cover_emoji" defaultValue={form.cover_emoji} />
        <Field label="Región" name="region" defaultValue={form.region} />
        <div>
          <Label>Color</Label>
          <Select name="accent_color" defaultValue={form.accent_color}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="teal">Teal</SelectItem>
              <SelectItem value="coral">Coral</SelectItem>
              <SelectItem value="amber">Amber</SelectItem>
              <SelectItem value="gray">Gray</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <TextAreaField label="Descripción" name="description" defaultValue={form.description} />
        <TextAreaField label="Objetivos" name="objectives" defaultValue={form.objectives} />
        <TextAreaField
          label="Materiales"
          name="materials_summary"
          defaultValue={form.materials_summary}
        />
      </div>
    </form>
  );
}

function TopicSection(props: {
  topics: Topic[];
  units: Unit[];
  resources: Resource[];
  selectedCourseId: string;
  editingTopic: Topic | null;
  editingUnit: Unit | null;
  editingResource: Resource | null;
  setEditingTopic: (topic: Topic | null) => void;
  setEditingUnit: (unit: Unit | null) => void;
  setEditingResource: (resource: Resource | null) => void;
  onSaveTopic: (data: any) => void;
  onDeleteTopic: (id: string) => void;
  onSaveUnit: (data: any) => void;
  onDeleteUnit: (id: string) => void;
  onSaveResource: (data: any) => void;
  onDeleteResource: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold">Temas</h2>
          <Button variant="outline" onClick={() => props.setEditingTopic(null)}>
            <Plus className="size-4" /> Nuevo tema
          </Button>
        </div>
        <TopicForm
          key={props.editingTopic?.id ?? "new-topic"}
          courseId={props.selectedCourseId}
          topic={props.editingTopic}
          nextPosition={props.topics.length}
          onSubmit={props.onSaveTopic}
        />
      </div>

      {props.topics.map((topic) => {
        const topicUnits = props.units
          .filter((unit) => unit.topic_id === topic.id)
          .sort((a, b) => a.position - b.position);
        return (
          <div key={topic.id} className="rounded-xl border bg-card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
              <div>
                <h3 className="font-bold">{topic.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {topicUnits.length} unidades · {topic.bonus_points} estrellas bonus
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => props.setEditingTopic(topic)}>
                  Editar
                </Button>
                <Button size="sm" variant="destructive" onClick={() => props.onDeleteTopic(topic.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
            <div className="grid gap-5 p-5 lg:grid-cols-[360px,1fr]">
              <UnitForm
                key={`${topic.id}-${props.editingUnit?.id ?? "new-unit"}`}
                topicId={topic.id}
                unit={props.editingUnit?.topic_id === topic.id ? props.editingUnit : null}
                nextPosition={topicUnits.length}
                onSubmit={props.onSaveUnit}
              />
              <div className="space-y-3">
                {topicUnits.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Este tema no tiene unidades.</p>
                ) : (
                  topicUnits.map((unit) => (
                    <UnitCard
                      key={unit.id}
                      unit={unit}
                      resources={props.resources
                        .filter((resource) => resource.unit_id === unit.id)
                        .sort((a, b) => a.position - b.position)}
                      editingResource={
                        props.editingResource?.unit_id === unit.id ? props.editingResource : null
                      }
                      onEdit={() => props.setEditingUnit(unit)}
                      onDelete={() => props.onDeleteUnit(unit.id)}
                      onNewResource={() => props.setEditingResource(null)}
                      onEditResource={props.setEditingResource}
                      onDeleteResource={props.onDeleteResource}
                      onSaveResource={props.onSaveResource}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TopicForm({
  courseId,
  topic,
  nextPosition,
  onSubmit,
}: {
  courseId: string;
  topic: Topic | null;
  nextPosition: number;
  onSubmit: (data: any) => void;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    onSubmit({
      id: topic?.id,
      course_id: courseId,
      title: valueFromForm(form, "title"),
      description: valueFromForm(form, "description"),
      position: numberFromForm(form, "position"),
      bonus_points: numberFromForm(form, "bonus_points"),
    });
  }
  return (
    <form onSubmit={submit} className="mt-4 grid gap-3 md:grid-cols-[1fr,120px,120px,auto]">
      <Field label="Título" name="title" defaultValue={topic?.title ?? ""} />
      <Field label="Posición" name="position" type="number" defaultValue={topic?.position ?? nextPosition} />
      <Field
        label="Bonus"
        name="bonus_points"
        type="number"
        defaultValue={topic?.bonus_points ?? 20}
      />
      <Button type="submit" className="self-end">
        <Save className="size-4" /> Guardar
      </Button>
      <TextAreaField
        label="Descripción"
        name="description"
        defaultValue={topic?.description ?? ""}
      />
    </form>
  );
}

function UnitForm({
  topicId,
  unit,
  nextPosition,
  onSubmit,
}: {
  topicId: string;
  unit: Unit | null;
  nextPosition: number;
  onSubmit: (data: any) => void;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    onSubmit({
      id: unit?.id,
      topic_id: topicId,
      title: valueFromForm(form, "title"),
      description: valueFromForm(form, "description"),
      position: numberFromForm(form, "position"),
      youtube_video_id: valueFromForm(form, "youtube_video_id"),
      min_watch_percent: numberFromForm(form, "min_watch_percent"),
      base_points: numberFromForm(form, "base_points"),
    });
  }
  return (
    <form onSubmit={submit} className="rounded-lg border bg-background p-4">
      <h4 className="font-bold">{unit ? "Editar unidad" : "Nueva unidad"}</h4>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="Título" name="title" defaultValue={unit?.title ?? ""} className="sm:col-span-2" />
        <Field label="Posición" name="position" type="number" defaultValue={unit?.position ?? nextPosition} />
        <Field label="Estrellas" name="base_points" type="number" defaultValue={unit?.base_points ?? 10} />
        <Field
          label="% mínimo vídeo"
          name="min_watch_percent"
          type="number"
          defaultValue={unit?.min_watch_percent ?? 90}
        />
        <Field
          label="YouTube ID"
          name="youtube_video_id"
          defaultValue={unit?.youtube_video_id ?? ""}
        />
        <TextAreaField label="Descripción" name="description" defaultValue={unit?.description ?? ""} />
        <Button type="submit" className="sm:col-span-2">
          <Save className="size-4" /> Guardar unidad
        </Button>
      </div>
    </form>
  );
}

function UnitCard({
  unit,
  resources,
  editingResource,
  onEdit,
  onDelete,
  onNewResource,
  onEditResource,
  onDeleteResource,
  onSaveResource,
}: {
  unit: Unit;
  resources: Resource[];
  editingResource: Resource | null;
  onEdit: () => void;
  onDelete: () => void;
  onNewResource: () => void;
  onEditResource: (resource: Resource | null) => void;
  onDeleteResource: (id: string) => void;
  onSaveResource: (data: any) => void;
}) {
  return (
    <article className="rounded-lg border bg-background p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="font-bold">{unit.title}</h4>
          <p className="text-xs text-muted-foreground">
            Pos. {unit.position} · {unit.base_points} estrellas · {unit.min_watch_percent}% vídeo
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onEdit}>Editar</Button>
          <Button size="sm" variant="destructive" onClick={onDelete}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between gap-3">
          <h5 className="text-sm font-semibold">Recursos</h5>
          <Button size="sm" variant="outline" onClick={onNewResource}>
            <Plus className="size-4" /> Nuevo recurso
          </Button>
        </div>
        {resources.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Sin recursos.</p>
        ) : (
          <div className="mt-2 divide-y rounded-md border">
            {resources.map((resource) => (
              <div key={resource.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                <div className="flex items-center gap-2 text-sm">
                  {resource.type === "video" ? <Video className="size-4" /> : <FileText className="size-4" />}
                  <div>
                    <div className="font-medium">{resource.title}</div>
                    <div className="text-xs text-muted-foreground">{resource.type} · {resource.url}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => onEditResource(resource)}>
                    Editar
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => onDeleteResource(resource.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <ResourceForm
          key={`${unit.id}-${editingResource?.id ?? "new-resource"}`}
          unitId={unit.id}
          resource={editingResource}
          nextPosition={resources.length}
          onSubmit={onSaveResource}
        />
      </div>
    </article>
  );
}

function ResourceForm({
  unitId,
  resource,
  nextPosition,
  onSubmit,
}: {
  unitId: string;
  resource: Resource | null;
  nextPosition: number;
  onSubmit: (data: any) => void;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    onSubmit({
      id: resource?.id,
      unit_id: unitId,
      type: valueFromForm(form, "type"),
      title: valueFromForm(form, "title"),
      url: valueFromForm(form, "url"),
      position: numberFromForm(form, "position"),
    });
  }

  return (
    <form onSubmit={submit} className="mt-3 grid gap-3 md:grid-cols-[120px,1fr,1fr,100px,auto]">
      <div>
        <Label>Tipo</Label>
        <Select name="type" defaultValue={resource?.type ?? "pdf"}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pdf">PDF</SelectItem>
            <SelectItem value="ppt">PPT</SelectItem>
            <SelectItem value="doc">DOC</SelectItem>
            <SelectItem value="video">Vídeo</SelectItem>
            <SelectItem value="link">Enlace</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Field label="Título" name="title" defaultValue={resource?.title ?? ""} />
      <Field label="URL" name="url" defaultValue={resource?.url ?? ""} />
      <Field label="Pos." name="position" type="number" defaultValue={resource?.position ?? nextPosition} />
      <Button type="submit" className="self-end">
        <Save className="size-4" /> Guardar
      </Button>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  className,
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  type?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} defaultValue={defaultValue ?? ""} />
    </div>
  );
}

function TextAreaField({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
}) {
  return (
    <div className="md:col-span-2 xl:col-span-4">
      <Label htmlFor={name}>{label}</Label>
      <Textarea id={name} name={name} defaultValue={defaultValue ?? ""} rows={3} />
    </div>
  );
}

export const Route = createFileRoute("/admin/content")({
  head: () => ({ meta: [{ title: "Cursos y contenido — Admin" }] }),
  component: () => (
    <RequireAdmin>
      <AdminContentPage />
    </RequireAdmin>
  ),
});
