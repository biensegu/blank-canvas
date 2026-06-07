import { Outlet, createFileRoute, Link, useLocation } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/cursos")({
  head: () => ({ meta: [{ title: "Cursos — Pieza a Pieza" }] }),
  component: CursosPage,
});

const ACCENT: Record<string, string> = {
  teal: "var(--brand-teal)", coral: "var(--brand-coral)",
  amber: "var(--brand-amber)", gray: "var(--brand-gray)",
};

function CursosPage() {
  const location = useLocation();
  if (location.pathname !== "/cursos") return <Outlet />;
  return <CursosCatalog />;
}

function CursosCatalog() {
  const { data: courses, isLoading } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").order("position");
      if (error) throw error;
      return data;
    },
  });
  const { data: bundles } = useQuery({
    queryKey: ["bundles"],
    queryFn: async () => {
      const { data } = await supabase.from("course_bundles").select("*").order("position");
      return data ?? [];
    },
  });

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-extrabold">Catálogo de cursos</h1>
        <p className="text-muted-foreground mt-2">Oposiciones de Orientación Educativa · Castilla-La Mancha. Elige un bloque o un pack mensual.</p>

        {isLoading && <p className="mt-10 text-muted-foreground">Cargando...</p>}

        {!isLoading && (!courses || courses.length === 0) && (
          <div className="mt-12 rounded-2xl border-2 border-dashed p-12 text-center">
            <p className="text-muted-foreground">Aún no hay cursos publicados. Vuelve pronto.</p>
          </div>
        )}

        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses?.map((c) => (
            <div key={c.id} className="rounded-2xl bg-card border shadow-[var(--shadow-soft)] overflow-hidden flex flex-col">
              <div className="h-32 flex items-center justify-center text-6xl" style={{ backgroundColor: ACCENT[c.accent_color] ?? "var(--brand-teal)" }}>
                <span>{c.cover_emoji}</span>
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <h3 className="font-bold text-lg">{c.title}</h3>
                <p className="text-sm text-muted-foreground mt-1 flex-1">{c.description}</p>
                {c.duration_hours > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">⏱ {c.duration_hours} horas</p>
                )}
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-lg font-bold">
                    {c.price_cents === 0 ? "Gratis" : `${(c.price_cents / 100).toFixed(0)} €`}
                  </span>
                  <Button asChild size="sm" className="rounded-full">
                    <Link to="/cursos/$slug" params={{ slug: c.slug }}>Ver curso</Link>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {bundles && bundles.length > 0 && (
          <div className="mt-16">
            <h2 className="text-2xl md:text-3xl font-extrabold">Packs mensuales</h2>
            <p className="text-muted-foreground mt-1">Combina varios bloques y ahorra.</p>
            <div className="mt-6 grid md:grid-cols-2 gap-5">
              {bundles.map((b) => (
                <div key={b.id} className="rounded-2xl p-6 border-2 border-primary/30 bg-card flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-lg">{b.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{b.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-2xl font-extrabold text-primary">{(b.price_cents / 100).toFixed(0)} €</div>
                    <div className="text-xs text-muted-foreground">al mes</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
