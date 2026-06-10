import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  BookOpen,
  FileText,
  Image,
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
  deleteAdminUnit,
  listAdminContent,
  restoreDefaultCourses,
  saveAdminCourse,
  saveAdminResource,
  saveAdminUnit,
} from "@/lib/admin-content.functions";
import { supabase } from "@/integrations/supabase/client";

type Course = Awaited<ReturnType<typeof listAdminContent>>["courses"][number];
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
  const restoreCourses = useServerFn(restoreDefaultCourses);
  const removeCourse = useServerFn(deleteAdminCourse);
  const saveUnit = useServerFn(saveAdminUnit);
  const removeUnit = useServerFn(deleteAdminUnit);
  const saveResource = useServerFn(saveAdminResource);
  const removeResource = useServerFn(deleteAdminResource);

  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [isCreatingCourse, setIsCreatingCourse] = useState(false);
  const [unitFormOpen, setUnitFormOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [resourceFormUnitId, setResourceFormUnitId] = useState("");

  const contentQuery = useQuery({
    queryKey: ["admin-content"],
    queryFn: () => listContent(),
  });

  const courses = useMemo(() => contentQuery.data?.courses ?? [], [contentQuery.data?.courses]);
  const selectedCourse = courses.find((course) => course.id === selectedCourseId) ?? null;
  const units = useMemo(() => contentQuery.data?.units ?? [], [contentQuery.data?.units]);
  const courseUnits = useMemo(
    () =>
      units
        .filter((unit) => unit.course_id === selectedCourseId)
        .sort((a, b) => a.position - b.position),
    [selectedCourseId, units],
  );
  const resources = contentQuery.data?.resources ?? [];
  const enrollmentCounts = contentQuery.data?.enrollmentCounts ?? {};

  useEffect(() => {
    if (!isCreatingCourse && !selectedCourseId && courses.length > 0) {
      setSelectedCourseId(courses[0].id);
    }
  }, [courses, isCreatingCourse, selectedCourseId]);

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["admin-content"] });
    qc.invalidateQueries({ queryKey: ["courses"] });
    qc.invalidateQueries({ queryKey: ["course"] });
    qc.invalidateQueries({ queryKey: ["course-units"] });
  }

  const saveCourseMutation = useMutation({
    mutationFn: (data: any) => saveCourse({ data }),
    onSuccess: (result) => {
      toast.success("Curso guardado");
      setIsCreatingCourse(false);
      setSelectedCourseId(result.id);
      setUnitFormOpen(false);
      setEditingUnit(null);
      setEditingResource(null);
      setResourceFormUnitId("");
      invalidate();
    },
    onError: (error: any) => toast.error(error?.message ?? "No se pudo guardar el curso"),
  });

  const restoreCoursesMutation = useMutation({
    mutationFn: () => restoreCourses(),
    onSuccess: (result) => {
      toast.success("Cursos base restaurados");
      setIsCreatingCourse(false);
      setSelectedCourseId(
        result.courses.find((course: any) => course.slug === "normativa")?.id ?? "",
      );
      setUnitFormOpen(false);
      setEditingUnit(null);
      setEditingResource(null);
      setResourceFormUnitId("");
      invalidate();
    },
    onError: (error: any) =>
      toast.error(error?.message ?? "No se pudieron restaurar los cursos base"),
  });

  const deleteCourseMutation = useMutation({
    mutationFn: (id: string) => removeCourse({ data: { id } }),
    onSuccess: () => {
      toast.success("Curso eliminado");
      setIsCreatingCourse(false);
      setSelectedCourseId("");
      setUnitFormOpen(false);
      setEditingUnit(null);
      setEditingResource(null);
      setResourceFormUnitId("");
      invalidate();
    },
    onError: (error: any) => toast.error(error?.message ?? "No se pudo eliminar el curso"),
  });

  const saveUnitMutation = useMutation({
    mutationFn: (data: any) => saveUnit({ data }),
    onSuccess: () => {
      toast.success("Unidad guardada");
      setEditingUnit(null);
      setUnitFormOpen(false);
      invalidate();
    },
    onError: (error: any) => toast.error(error?.message ?? "No se pudo guardar la unidad"),
  });

  const deleteUnitMutation = useMutation({
    mutationFn: (id: string) => removeUnit({ data: { id } }),
    onSuccess: () => {
      toast.success("Unidad eliminada");
      setEditingUnit(null);
      setUnitFormOpen(false);
      setEditingResource(null);
      setResourceFormUnitId("");
      invalidate();
    },
    onError: (error: any) => toast.error(error?.message ?? "No se pudo eliminar la unidad"),
  });

  const saveResourceMutation = useMutation({
    mutationFn: (data: any) => saveResource({ data }),
    onSuccess: () => {
      toast.success("Recurso guardado");
      setEditingResource(null);
      setResourceFormUnitId("");
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
                Edita bloques o cursos, sus unidades y los recursos de cada unidad sin tocar la base
                manualmente.
              </p>
            </div>
          </div>
          {contentQuery.isFetching && (
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          )}
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[320px,1fr]">
          <aside className="rounded-xl border bg-card overflow-hidden">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h2 className="font-bold">Bloques y cursos</h2>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => restoreCoursesMutation.mutate()}
                  disabled={restoreCoursesMutation.isPending}
                >
                  Restaurar base
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsCreatingCourse(true);
                    setSelectedCourseId("");
                    setUnitFormOpen(false);
                    setEditingUnit(null);
                    setEditingResource(null);
                    setResourceFormUnitId("");
                  }}
                >
                  <Plus className="size-4" /> Nuevo
                </Button>
              </div>
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
                      setIsCreatingCourse(false);
                      setSelectedCourseId(course.id);
                      setUnitFormOpen(false);
                      setEditingUnit(null);
                      setEditingResource(null);
                      setResourceFormUnitId("");
                    }}
                    className={`w-full px-4 py-3 text-left transition hover:bg-accent ${
                      !isCreatingCourse && selectedCourseId === course.id ? "bg-accent" : ""
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
              key={isCreatingCourse ? "new-course" : (selectedCourse?.id ?? "new-course")}
              course={isCreatingCourse ? null : selectedCourse}
              isSaving={saveCourseMutation.isPending}
              onSubmit={(data) => saveCourseMutation.mutate(data)}
              onDelete={
                selectedCourse && !isCreatingCourse
                  ? () => {
                      if (confirm("¿Eliminar este curso y su contenido?")) {
                        deleteCourseMutation.mutate(selectedCourse.id);
                      }
                    }
                  : undefined
              }
            />

            {selectedCourse && !isCreatingCourse && (
              <>
                <UnitSection
                  units={courseUnits}
                  resources={resources}
                  selectedCourseId={selectedCourse.id}
                  selectedCourseTitle={selectedCourse.title}
                  unitFormOpen={unitFormOpen}
                  editingUnit={editingUnit}
                  editingResource={editingResource}
                  resourceFormUnitId={resourceFormUnitId}
                  setEditingUnit={(unit) => {
                    setEditingUnit(unit);
                    setUnitFormOpen(true);
                  }}
                  onNewUnit={() => {
                    setEditingUnit(null);
                    setUnitFormOpen(true);
                    setEditingResource(null);
                    setResourceFormUnitId("");
                  }}
                  onCancelUnitForm={() => {
                    setEditingUnit(null);
                    setUnitFormOpen(false);
                  }}
                  setEditingResource={(resource) => {
                    setEditingResource(resource);
                    setResourceFormUnitId(resource?.unit_id ?? "");
                  }}
                  setResourceFormUnitId={setResourceFormUnitId}
                  onSaveUnit={(data) => saveUnitMutation.mutate(data)}
                  onDeleteUnit={(id) => {
                    if (confirm("¿Eliminar esta unidad y sus recursos?"))
                      deleteUnitMutation.mutate(id);
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

function inferResourceType(resource: Pick<Resource, "type" | "url">) {
  if (resource.type !== "link" && resource.type !== "doc") return resource.type;
  const url = resource.url.toLowerCase();
  if (/\.(png|jpe?g|webp|gif|svg)(\?|#|$)/.test(url)) return "image";
  if (url.includes("bigbluebutton") || url.includes("/bbb/")) return "videoconference";
  if (/\.(xls|xlsx|csv|zip)(\?|#|$)/.test(url)) return "file";
  return resource.type;
}

function ResourceIcon({ type }: { type: string }) {
  if (type === "video" || type === "videoconference") return <Video className="size-4" />;
  if (type === "image") return <Image className="size-4" />;
  return <FileText className="size-4" />;
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
          <h2 className="text-xl font-bold">
            {course ? "Editar bloque/curso" : "Nuevo curso adicional"}
          </h2>
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
        <Field
          label="Precio céntimos"
          name="price_cents"
          type="number"
          defaultValue={form.price_cents}
        />
        <Field
          label="Horas"
          name="duration_hours"
          type="number"
          defaultValue={form.duration_hours}
        />
        <Field label="Emoji" name="cover_emoji" defaultValue={form.cover_emoji} />
        <Field label="Región" name="region" defaultValue={form.region} />
        <div>
          <Label>Color</Label>
          <Select name="accent_color" defaultValue={form.accent_color}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
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

function UnitSection(props: {
  units: Unit[];
  resources: Resource[];
  selectedCourseId: string;
  selectedCourseTitle: string;
  unitFormOpen: boolean;
  editingUnit: Unit | null;
  editingResource: Resource | null;
  resourceFormUnitId: string;
  setEditingUnit: (unit: Unit | null) => void;
  onNewUnit: () => void;
  onCancelUnitForm: () => void;
  setEditingResource: (resource: Resource | null) => void;
  setResourceFormUnitId: (unitId: string) => void;
  onSaveUnit: (data: any) => void;
  onDeleteUnit: (id: string) => void;
  onSaveResource: (data: any) => void;
  onDeleteResource: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Unidades</h2>
            <p className="text-sm text-muted-foreground">
              {props.selectedCourseTitle} contiene unidades. Cada unidad agrupa sus PDF, imágenes,
              vídeos, archivos, enlaces o videoconferencias.
            </p>
          </div>
          <Button variant="outline" onClick={props.onNewUnit}>
            <Plus className="size-4" /> Nueva unidad
          </Button>
        </div>

        {props.unitFormOpen && (
          <UnitForm
            key={props.editingUnit?.id ?? "new-unit"}
            courseId={props.selectedCourseId}
            unit={props.editingUnit}
            nextPosition={props.units.length}
            onSubmit={props.onSaveUnit}
            onCancel={props.onCancelUnitForm}
          />
        )}
      </div>

      {props.units.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-sm text-muted-foreground">
          Este curso no tiene unidades todavía.
        </div>
      ) : (
        <div className="space-y-3">
          {props.units.map((unit) => (
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
              onNewResource={() => {
                props.setEditingResource(null);
                props.setResourceFormUnitId(unit.id);
              }}
              onEditResource={props.setEditingResource}
              onDeleteResource={props.onDeleteResource}
              onSaveResource={props.onSaveResource}
              showResourceForm={props.resourceFormUnitId === unit.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function UnitForm({
  courseId,
  unit,
  nextPosition,
  onSubmit,
  onCancel,
}: {
  courseId: string;
  unit: Unit | null;
  nextPosition: number;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    onSubmit({
      id: unit?.id,
      course_id: courseId,
      title: valueFromForm(form, "title"),
      description: valueFromForm(form, "description"),
      position: numberFromForm(form, "position"),
      base_points: numberFromForm(form, "base_points"),
    });
  }
  return (
    <form onSubmit={submit} className="mt-4 rounded-lg border bg-background p-4">
      <h4 className="font-bold">{unit ? "Editar unidad" : "Nueva unidad"}</h4>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field
          label="Título"
          name="title"
          defaultValue={unit?.title ?? ""}
          className="sm:col-span-2"
        />
        <Field
          label="Posición"
          name="position"
          type="number"
          defaultValue={unit?.position ?? nextPosition}
        />
        <Field
          label="Estrellas"
          name="base_points"
          type="number"
          defaultValue={unit?.base_points ?? 10}
        />
        <TextAreaField
          label="Descripción"
          name="description"
          defaultValue={unit?.description ?? ""}
        />
        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit">
            <Save className="size-4" /> Guardar unidad
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
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
  showResourceForm,
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
  showResourceForm: boolean;
}) {
  return (
    <article className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="font-bold">{unit.title}</h4>
          <p className="text-xs text-muted-foreground">
            Pos. {unit.position} · {unit.base_points} estrellas
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onEdit}>
            Editar
          </Button>
          <Button size="sm" variant="destructive" onClick={onDelete}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <div className="mt-4 rounded-lg border bg-background p-3">
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
              <div
                key={resource.id}
                className="flex flex-wrap items-center justify-between gap-3 p-3"
              >
                <div className="flex items-center gap-2 text-sm">
                  <ResourceIcon type={inferResourceType(resource)} />
                  <div>
                    <div className="font-medium">{resource.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {resourceTypeLabel(inferResourceType(resource))} · {resource.url}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => onEditResource(resource)}>
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onDeleteResource(resource.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {(showResourceForm || editingResource) && (
          <ResourceForm
            key={`${unit.id}-${editingResource?.id ?? "new-resource"}`}
            unitId={unit.id}
            resource={editingResource}
            nextPosition={resources.length}
            onSubmit={onSaveResource}
          />
        )}
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
  const [uploading, setUploading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    let url = valueFromForm(form, "url");
    const file = new FormData(form).get("file");

    if (file instanceof File && file.size > 0) {
      setUploading(true);
      try {
        const { data: session } = await supabase.auth.getSession();
        const token = session.session?.access_token;
        if (!token) throw new Error("Sesión no disponible.");

        const uploadForm = new FormData();
        uploadForm.set("file", file);
        uploadForm.set("unitId", unitId);
        const response = await fetch("/api/admin/resource-upload", {
          method: "POST",
          headers: { authorization: `Bearer ${token}` },
          body: uploadForm,
        });
        if (!response.ok) throw new Error(await response.text());
        const uploaded = (await response.json()) as { url: string; fileName: string };
        url = uploaded.url;
        if (!valueFromForm(form, "title")) {
          (form.elements.namedItem("title") as HTMLInputElement | null)!.value = uploaded.fileName;
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo subir el archivo");
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    onSubmit({
      id: resource?.id,
      unit_id: unitId,
      type: valueFromForm(form, "type"),
      title: valueFromForm(form, "title"),
      url,
      position: numberFromForm(form, "position"),
    });
  }

  return (
    <form onSubmit={submit} className="mt-3 grid gap-3 md:grid-cols-[120px,1fr,1fr,100px,auto]">
      <div>
        <Label>Tipo</Label>
        <Select name="type" defaultValue={resource?.type ?? "pdf"}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pdf">PDF</SelectItem>
            <SelectItem value="image">Imagen</SelectItem>
            <SelectItem value="video">Vídeo / YouTube</SelectItem>
            <SelectItem value="file">Archivo / Excel / ZIP</SelectItem>
            <SelectItem value="ppt">PowerPoint</SelectItem>
            <SelectItem value="doc">Documento</SelectItem>
            <SelectItem value="videoconference">Videoconferencia BBB</SelectItem>
            <SelectItem value="link">Enlace</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Field label="Título" name="title" defaultValue={resource?.title ?? ""} />
      <Field label="URL, YouTube ID o enlace BBB" name="url" defaultValue={resource?.url ?? ""} />
      <Field
        label="Pos."
        name="position"
        type="number"
        defaultValue={resource?.position ?? nextPosition}
      />
      <Button type="submit" className="self-end" disabled={uploading}>
        {uploading ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
        Guardar
      </Button>
      <div className="md:col-span-5">
        <Label htmlFor={`file-${unitId}`}>Subir material</Label>
        <Input
          id={`file-${unitId}`}
          name="file"
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.mp4,.mov,.png,.jpg,.jpeg,.webp,.zip"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Si subes un archivo, se guardará como recurso privado. Si prefieres un enlace externo,
          deja el archivo vacío y escribe la URL.
        </p>
      </div>
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
