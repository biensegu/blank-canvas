import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Header } from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import { RouletteModal } from "@/components/RouletteModal";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Disc3, Sparkles } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Mi panel — Pieza a Pieza" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = useAuth();
  const [rouletteOpen, setRouletteOpen] = useState(false);
  const { data: enrollments, isLoading } = useQuery({
    queryKey: ["dashboard-enrollments", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("id, created_at, courses(id, slug, title, description, cover_emoji, duration_hours)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("stars")
        .eq("id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
  });
  const { data: spins } = useQuery({
    queryKey: ["spins", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roulette_spins")
        .select("id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const availableSpins = Math.max(0, Math.floor((profile?.stars ?? 0) / 10) - (spins?.length ?? 0));

  return (
    <RequireAuth>
      <div className="min-h-screen">
        <Header />
        <main className="container mx-auto px-4 py-12">
          <h1 className="text-4xl font-extrabold">Mi panel</h1>
          <p className="text-muted-foreground mt-2">Aquí verás tus cursos, progreso y estrellas.</p>

          {availableSpins > 0 && (
            <section className="mt-8 rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)]">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-accent/20 text-primary">
                    <Disc3 className="size-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold">Ruleta de premios</h2>
                    <p className="text-sm text-muted-foreground">
                      Tienes {availableSpins} giro{availableSpins === 1 ? "" : "s"} disponible
                      {availableSpins === 1 ? "" : "s"} por tus estrellas.
                    </p>
                  </div>
                </div>
                <Button className="rounded-full" onClick={() => setRouletteOpen(true)}>
                  Girar ruleta
                </Button>
              </div>
            </section>
          )}

          {isLoading && <p className="mt-10 text-muted-foreground">Cargando tus cursos...</p>}

          {!isLoading && (!enrollments || enrollments.length === 0) && (
            <div className="mt-10 rounded-2xl border-2 border-dashed p-12 text-center">
              <Sparkles className="size-10 mx-auto text-accent-foreground" />
              <p className="mt-4 text-muted-foreground">Aún no tienes cursos. Explora el catálogo para empezar.</p>
              <Button asChild className="mt-6 rounded-full"><Link to="/cursos">Ver cursos</Link></Button>
            </div>
          )}

          {!isLoading && enrollments && enrollments.length > 0 && (
            <section className="mt-10">
              <h2 className="text-2xl font-extrabold">Mis cursos</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {enrollments.map((enrollment) => {
                  const course = enrollment.courses;
                  if (!course) return null;
                  return (
                    <article key={enrollment.id} className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)]">
                      <div className="flex items-start gap-4">
                        <div className="size-12 rounded-xl bg-accent/20 flex items-center justify-center text-2xl">
                          {course.cover_emoji ?? <BookOpen className="size-6" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-lg">{course.title}</h3>
                          {course.description && (
                            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{course.description}</p>
                          )}
                          {course.duration_hours > 0 && (
                            <p className="mt-2 text-xs text-muted-foreground">{course.duration_hours} horas</p>
                          )}
                          <Button asChild size="sm" className="mt-4 rounded-full">
                            <Link to="/cursos/$slug" params={{ slug: course.slug }}>Entrar al curso</Link>
                          </Button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}
        </main>
        {rouletteOpen && <RouletteModal onClose={() => setRouletteOpen(false)} />}
      </div>
    </RequireAuth>
  );
}
