import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpenCheck, Loader2, Search, UserPlus, UserMinus } from "lucide-react";
import { toast } from "sonner";

import { Header } from "@/components/Header";
import { RequireAdmin } from "@/components/RequireAdmin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createManualEnrollment,
  deleteManualEnrollment,
  listCourseEnrollments,
  listEnrollmentCourses,
  searchEnrollmentUsers,
} from "@/lib/admin-enrollments.functions";

function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AdminEnrollmentsPage() {
  const qc = useQueryClient();
  const listCourses = useServerFn(listEnrollmentCourses);
  const listEnrollments = useServerFn(listCourseEnrollments);
  const searchUsers = useServerFn(searchEnrollmentUsers);
  const enrollUser = useServerFn(createManualEnrollment);
  const removeEnrollment = useServerFn(deleteManualEnrollment);

  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [search, setSearch] = useState("");

  const coursesQuery = useQuery({
    queryKey: ["admin-enrollment-courses"],
    queryFn: () => listCourses(),
  });

  const courses = useMemo(() => coursesQuery.data?.courses ?? [], [coursesQuery.data?.courses]);
  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId) ?? null,
    [courses, selectedCourseId],
  );

  useEffect(() => {
    if (!selectedCourseId && courses.length > 0) {
      setSelectedCourseId(courses[0].id);
    }
  }, [courses, selectedCourseId]);

  const enrollmentsQuery = useQuery({
    queryKey: ["admin-course-enrollments", selectedCourseId],
    enabled: !!selectedCourseId,
    queryFn: () => listEnrollments({ data: { courseId: selectedCourseId } }),
  });

  const userSearchQuery = useQuery({
    queryKey: ["admin-enrollment-user-search", selectedCourseId, search],
    enabled: !!selectedCourseId && search.trim().length >= 2,
    queryFn: () => searchUsers({ data: { courseId: selectedCourseId, search } }),
  });

  const enrollMutation = useMutation({
    mutationFn: (userId: string) => enrollUser({ data: { courseId: selectedCourseId, userId } }),
    onSuccess: () => {
      toast.success("Alumno matriculado");
      setSearch("");
      qc.invalidateQueries({ queryKey: ["admin-enrollment-courses"] });
      qc.invalidateQueries({ queryKey: ["admin-course-enrollments", selectedCourseId] });
      qc.invalidateQueries({ queryKey: ["admin-enrollment-user-search"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "No se pudo matricular"),
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) =>
      removeEnrollment({ data: { courseId: selectedCourseId, userId } }),
    onSuccess: () => {
      toast.success("Matrícula eliminada");
      qc.invalidateQueries({ queryKey: ["admin-enrollment-courses"] });
      qc.invalidateQueries({ queryKey: ["admin-course-enrollments", selectedCourseId] });
      qc.invalidateQueries({ queryKey: ["admin-enrollment-user-search"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "No se pudo eliminar la matrícula"),
  });

  const enrollments = enrollmentsQuery.data?.enrollments ?? [];
  const foundUsers = userSearchQuery.data?.users ?? [];

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-10">
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin">
            <ArrowLeft className="size-4" /> Volver
          </Link>
        </Button>

        <div className="mt-4 flex items-center gap-3">
          <BookOpenCheck className="size-7 text-primary" />
          <h1 className="text-3xl font-extrabold">Matrículas</h1>
        </div>
        <p className="text-muted-foreground mt-1">
          Gestiona el acceso manual de alumnos a los cursos. Los pagos se tratarán en otro módulo.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[320px,1fr]">
          <aside className="rounded-xl border bg-card overflow-hidden">
            <div className="border-b px-4 py-3">
              <h2 className="font-bold">Cursos</h2>
            </div>
            <div className="divide-y">
              {coursesQuery.isLoading ? (
                <div className="p-6 text-sm text-muted-foreground">Cargando cursos…</div>
              ) : courses.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground">No hay cursos publicados.</div>
              ) : (
                courses.map((course) => (
                  <button
                    key={course.id}
                    onClick={() => setSelectedCourseId(course.id)}
                    className={`w-full px-4 py-3 text-left transition hover:bg-accent ${
                      selectedCourseId === course.id ? "bg-accent" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-sm">{course.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {course.price_cents === 0
                            ? "Gratis"
                            : `${(course.price_cents / 100).toFixed(0)} €`}
                        </div>
                      </div>
                      <Badge variant="secondary">{course.enrolled_count}</Badge>
                    </div>
                  </button>
                ))
              )}
            </div>
          </aside>

          <section className="space-y-6">
            <div className="rounded-xl border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold">
                    {selectedCourse?.title ?? "Selecciona un curso"}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {enrollments.length} alumnos matriculados
                  </p>
                </div>
                {enrollmentsQuery.isFetching && (
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                )}
              </div>

              <div className="mt-5 flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar usuario por email o nombre"
                    className="pl-9"
                    disabled={!selectedCourseId}
                  />
                </div>
              </div>

              {search.trim().length > 0 && search.trim().length < 2 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Escribe al menos 2 caracteres para buscar.
                </p>
              )}

              {search.trim().length >= 2 && (
                <div className="mt-4 rounded-lg border overflow-hidden">
                  {userSearchQuery.isFetching ? (
                    <div className="p-4 text-sm text-muted-foreground">Buscando usuarios…</div>
                  ) : foundUsers.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground">Sin resultados.</div>
                  ) : (
                    <div className="divide-y">
                      {foundUsers.map((user) => (
                        <div
                          key={user.id}
                          className="flex flex-wrap items-center justify-between gap-3 p-3"
                        >
                          <div>
                            <div className="font-medium text-sm">
                              {user.full_name || user.email.split("@")[0]}
                            </div>
                            <div className="text-xs text-muted-foreground">{user.email}</div>
                            <div className="mt-1 flex gap-2">
                              {user.blocked && <Badge variant="destructive">Bloqueado</Badge>}
                              {user.enrolled && <Badge variant="secondary">Ya matriculado</Badge>}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            disabled={user.enrolled || user.blocked || enrollMutation.isPending}
                            onClick={() => enrollMutation.mutate(user.id)}
                          >
                            <UserPlus className="size-4" /> Matricular
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-xl border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Alumno</TableHead>
                    <TableHead>Fecha matrícula</TableHead>
                    <TableHead>Último acceso</TableHead>
                    <TableHead className="text-right">Estrellas</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!selectedCourseId ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                        Selecciona un curso.
                      </TableCell>
                    </TableRow>
                  ) : enrollmentsQuery.isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                        Cargando matrículas…
                      </TableCell>
                    </TableRow>
                  ) : enrollments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                        Este curso todavía no tiene alumnos matriculados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    enrollments.map((enrollment) => (
                      <TableRow key={enrollment.id}>
                        <TableCell>
                          <div className="font-medium">
                            {enrollment.full_name || enrollment.email.split("@")[0]}
                          </div>
                          <div className="text-xs text-muted-foreground">{enrollment.email}</div>
                          {enrollment.blocked && (
                            <Badge variant="destructive" className="mt-1">
                              Bloqueado
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{fmt(enrollment.created_at)}</TableCell>
                        <TableCell className="text-sm">{fmt(enrollment.last_sign_in_at)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {enrollment.stars}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={removeMutation.isPending}
                            onClick={() => removeMutation.mutate(enrollment.user_id)}
                          >
                            <UserMinus className="size-4" /> Quitar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export const Route = createFileRoute("/admin/enrollments")({
  head: () => ({ meta: [{ title: "Matrículas — Admin" }] }),
  component: () => (
    <RequireAdmin>
      <AdminEnrollmentsPage />
    </RequireAdmin>
  ),
});
