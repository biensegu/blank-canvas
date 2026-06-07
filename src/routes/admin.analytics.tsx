import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { ReactNode } from "react";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  BookOpen,
  Clock,
  Disc3,
  Loader2,
  ShieldAlert,
  Sparkles,
  Users,
} from "lucide-react";

import { Header } from "@/components/Header";
import { RequireAdmin } from "@/components/RequireAdmin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAdminAnalytics } from "@/lib/admin-analytics.functions";

function AdminAnalyticsPage() {
  const loadAnalytics = useServerFn(getAdminAnalytics);
  const query = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: () => loadAnalytics(),
  });

  const analytics = query.data;
  const summary = analytics?.summary;

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
            <BarChart3 className="size-7 text-primary" />
            <div>
              <h1 className="text-3xl font-extrabold">Analítica de usuarios</h1>
              <p className="text-muted-foreground">
                Actividad reciente, progreso, matrículas, estrellas y ruleta.
              </p>
            </div>
          </div>
          {query.isFetching && <Loader2 className="size-5 animate-spin text-muted-foreground" />}
        </div>

        {query.isLoading && (
          <p className="mt-8 text-sm text-muted-foreground">Cargando analítica...</p>
        )}

        {analytics && summary && (
          <>
            <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <MetricCard icon={Users} label="Usuarios" value={summary.totalUsers} />
              <MetricCard icon={Activity} label="Activos 30 días" value={summary.activeUsers} />
              <MetricCard icon={ShieldAlert} label="Bloqueados" value={summary.blockedUsers} />
              <MetricCard icon={BookOpen} label="Matrículas" value={summary.totalEnrollments} />
              <MetricCard icon={Sparkles} label="Estrellas" value={summary.totalStars} />
              <MetricCard icon={Disc3} label="Giros" value={summary.totalSpins} />
              <MetricCard icon={BookOpen} label="Cursos" value={summary.totalCourses} />
              <MetricCard icon={Activity} label="Unidades completadas" value={summary.completedUnits} />
              <MetricCard icon={BarChart3} label="Eventos" value={summary.totalActivityEvents} />
              <MetricCard icon={Clock} label="Minutos registrados" value={summary.totalDurationMinutes} />
            </section>

            <section className="mt-8 grid gap-5 xl:grid-cols-3">
              <Panel title="Actividad por tipo">
                {analytics.eventTypes.length ? (
                  <StackedList
                    items={analytics.eventTypes.map((item) => ({
                      label: item.type,
                      value: item.count,
                    }))}
                  />
                ) : (
                  <EmptyText text="Aún no hay eventos." />
                )}
              </Panel>

              <Panel title="Matrículas por curso">
                {analytics.courseEnrollments.length ? (
                  <StackedList
                    items={analytics.courseEnrollments.map((item) => ({
                      label: item.title,
                      value: item.count,
                    }))}
                  />
                ) : (
                  <EmptyText text="Aún no hay matrículas." />
                )}
              </Panel>

              <Panel title="Actividad por curso">
                {analytics.courseActivity.length ? (
                  <StackedList
                    items={analytics.courseActivity.map((item) => ({
                      label: item.title,
                      value: item.count,
                    }))}
                  />
                ) : (
                  <EmptyText text="Aún no hay actividad asociada a cursos." />
                )}
              </Panel>
            </section>

            <section className="mt-8 grid gap-5 xl:grid-cols-2">
              <Panel title="Eventos recientes">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Evento</TableHead>
                      <TableHead>Curso</TableHead>
                      <TableHead>Fecha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics.recentEvents.length ? (
                      analytics.recentEvents.map((event) => (
                        <TableRow key={event.id}>
                          <TableCell className="max-w-[180px] truncate">
                            {event.user_name || event.user_email || "Sin usuario"}
                          </TableCell>
                          <TableCell><Badge variant="secondary">{event.type}</Badge></TableCell>
                          <TableCell className="max-w-[160px] truncate">
                            {event.course_title ?? "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(event.created_at).toLocaleString("es-ES")}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          Aún no hay eventos.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Panel>

              <Panel title="Giros recientes">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Premio</TableHead>
                      <TableHead>Fecha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics.recentSpins.length ? (
                      analytics.recentSpins.map((spin) => (
                        <TableRow key={spin.id}>
                          <TableCell className="max-w-[180px] truncate">
                            {spin.user_name || spin.user_email || "Sin usuario"}
                          </TableCell>
                          <TableCell className="max-w-[180px] truncate">
                            {spin.item_title ?? "Premio"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(spin.spun_at).toLocaleString("es-ES")}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                          Aún no hay giros.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Panel>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: number;
}) {
  return (
    <article className="rounded-xl border bg-card p-4 shadow-[var(--shadow-soft)]">
      <Icon className="size-5 text-primary" />
      <div className="mt-3 text-2xl font-extrabold tabular-nums">{value}</div>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
    </article>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-5 shadow-[var(--shadow-soft)]">
      <h2 className="text-lg font-bold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function StackedList({ items }: { items: Array<{ label: string; value: number }> }) {
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <div className="space-y-3">
      {items.slice(0, 8).map((item) => (
        <div key={item.label}>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate font-medium">{item.label}</span>
            <span className="tabular-nums text-muted-foreground">{item.value}</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.max(6, Math.round((item.value / max) * 100))}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyText({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground">{text}</p>;
}

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({ meta: [{ title: "Analítica — Admin" }] }),
  component: () => (
    <RequireAdmin>
      <AdminAnalyticsPage />
    </RequireAdmin>
  ),
});
