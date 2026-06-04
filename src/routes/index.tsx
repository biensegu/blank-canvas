import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";
import { CheckCircle2, Lock, Sparkles, Video, FileText, Star, Bot } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useUserRole } from "@/hooks/use-role";
import { PiezinChat } from "@/components/PiezinChat";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pieza a Pieza — Oposiciones Orientación Educativa CLM" },
      { name: "description", content: "Plataforma e-learning para oposiciones de Orientación Educativa en Castilla-La Mancha. Bloques: Normativa, Programación, Supuestos y Temas." },
      { property: "og:title", content: "Pieza a Pieza — Oposiciones Orientación Educativa CLM" },
      { property: "og:description", content: "Cursos por bloques con vídeos, videoconferencias y estrellas." },
    ],
  }),
  component: Index,
});

const ACCENT: Record<string, string> = {
  teal: "var(--brand-teal)", coral: "var(--brand-coral)",
  amber: "var(--brand-amber)", gray: "var(--brand-gray)",
};

function Index() {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const { data: courses } = useQuery({
    queryKey: ["courses-home"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("*").order("position");
      return data ?? [];
    },
  });
  const { data: bundles } = useQuery({
    queryKey: ["bundles-home"],
    queryFn: async () => {
      const { data } = await supabase.from("course_bundles").select("*").order("position");
      return data ?? [];
    },
  });

  return (
    <div className="min-h-screen">
      <Header />
      <main>
        {/* Hero */}
        <section className="container mx-auto px-4 pt-16 pb-20 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/20 border border-accent/40 mb-6">
              <Sparkles className="size-4" />
              <span className="text-xs font-semibold tracking-wide">ORIENTACIÓN EDUCATIVA · CASTILLA-LA MANCHA</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.05]">
              Aprende <span className="text-primary">pieza</span>
              <br /> a <span className="text-destructive">pieza</span>.
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-md">
              Preparación de oposiciones de Enseñanzas Medias, especialidad de Orientación Educativa en Castilla-La Mancha. Cursos por bloques con vídeos, videoconferencias y estrellas.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full shadow-[var(--shadow-pop)]">
                <Link to="/cursos">Ver cursos</Link>
              </Button>
              {!user && (
                <Button asChild size="lg" variant="outline" className="rounded-full">
                  <Link to="/login">Crear cuenta gratis</Link>
                </Button>
              )}
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-0 -z-10 blur-3xl opacity-40" style={{ background: "var(--gradient-brand)" }} />
            <img src={logo} alt="" className="w-full max-w-md mx-auto drop-shadow-2xl animate-[spin_30s_linear_infinite]" />
          </div>
        </section>

        {/* Cursos (bloques) */}
        <section id="cursos" className="container mx-auto px-4 py-12">
          <div className="flex items-end justify-between mb-8 flex-wrap gap-3">
            <div>
              <h2 className="text-3xl md:text-4xl font-extrabold">Los 4 bloques</h2>
              <p className="text-muted-foreground mt-1">Cada bloque es un curso independiente. Empieza por Normativa, que es gratis.</p>
            </div>
            <Button asChild variant="outline" className="rounded-full"><Link to="/cursos">Ver todos</Link></Button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {courses?.map((c) => (
              <Link key={c.id} to="/cursos/$slug" params={{ slug: c.slug }} className="group rounded-2xl bg-card border shadow-[var(--shadow-soft)] overflow-hidden flex flex-col transition hover:-translate-y-1">
                <div className="h-28 flex items-center justify-center text-5xl" style={{ backgroundColor: ACCENT[c.accent_color] ?? "var(--brand-teal)" }}>
                  <span>{c.cover_emoji}</span>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="font-bold text-lg">{c.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 flex-1 line-clamp-2">{c.description}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-lg font-bold">
                      {c.price_cents === 0 ? "Gratis" : `${(c.price_cents / 100).toFixed(0)} €`}
                    </span>
                    {c.duration_hours > 0 && (
                      <span className="text-xs text-muted-foreground">{c.duration_hours} h</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Bundles */}
          {bundles && bundles.length > 0 && (
            <div className="mt-10">
              <h3 className="text-xl font-bold mb-4">Packs mensuales</h3>
              <div className="grid md:grid-cols-2 gap-5">
                {bundles.map((b) => (
                  <div key={b.id} className="rounded-2xl p-6 border-2 border-primary/30 bg-card flex items-center justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-lg">{b.title}</h4>
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
        </section>

        {/* Features */}
        <section className="container mx-auto px-4 py-16 grid md:grid-cols-3 gap-6">
          {[
            { icon: Video, color: "var(--brand-teal)", title: "Vídeos y videoconferencias", desc: "Vídeos integrados y videoconferencias en directo por BigBlueButton." },
            { icon: FileText, color: "var(--brand-amber)", title: "Recursos por unidad", desc: "PDFs, Words y PowerPoints integrados en la web para estudiar." },
            { icon: Star, color: "var(--brand-coral)", title: "Estrellas y ruleta", desc: "Gana estrellas y, cada 10, gira la ruleta para obtener premios sorpresa." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl bg-card p-6 border shadow-[var(--shadow-soft)]">
              <div className="size-12 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: f.color }}>
                <f.icon className="size-6 text-white" />
              </div>
              <h3 className="font-bold text-lg">{f.title}</h3>
              <p className="text-muted-foreground mt-1 text-sm">{f.desc}</p>
            </div>
          ))}
        </section>

        {/* Piezin intro */}
        <section className="container mx-auto px-4 py-12">
          <div className="rounded-3xl p-8 md:p-12 border bg-card grid md:grid-cols-[auto,1fr] gap-6 items-center">
            <div className="size-24 rounded-3xl flex items-center justify-center" style={{ background: "var(--gradient-brand)" }}>
              <Bot className="size-12 text-white" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold">Hola, soy <span className="text-primary">Piezin</span> 👋</h2>
              <p className="text-muted-foreground mt-2">
                Soy el asistente con IA de Pieza a Pieza. Aquí, en la página principal, te informo sobre los cursos: <strong>precio, objetivos, materiales y horas</strong>. Dentro de cada curso tengo una versión específica que resuelve dudas de <strong>su contenido</strong> (legislación, normativa y temario), sin mezclar información con otros cursos.
              </p>
              <p className="text-xs text-muted-foreground mt-3">Próximamente abriré la ventana de chat aquí mismo.</p>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="container mx-auto px-4 py-16">
          <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-12">¿Cómo funciona?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { step: "01", title: "Elige tu bloque", desc: "Inscríbete en el bloque que quieras dominar." },
              { step: "02", title: "Suma estrellas", desc: "Vídeos, videoconferencias, materiales y quizzes. Cada acción suma una estrella." },
              { step: "03", title: "Gira la ruleta", desc: "Cada 10 estrellas se abre la ruleta con premios sorpresa, cofres y tutorías." },
            ].map((s) => (
              <div key={s.step} className="rounded-2xl p-8 border bg-card relative overflow-hidden">
                <span className="absolute -right-2 -top-4 text-8xl font-black text-primary/10">{s.step}</span>
                <h3 className="font-bold text-xl">{s.title}</h3>
                <p className="text-muted-foreground mt-2">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Visual lock/unlock */}
        <section className="container mx-auto px-4 py-16">
          <div className="rounded-3xl p-10 md:p-16 text-center" style={{ background: "var(--gradient-brand)" }}>
            <div className="flex justify-center gap-6 mb-8 flex-wrap">
              <div className="bg-white/95 rounded-2xl p-5 flex items-center gap-3 shadow-xl">
                <CheckCircle2 className="size-7" style={{ color: "var(--success)" }} />
                <span className="font-semibold">Unidad completada</span>
              </div>
              <div className="bg-white/95 rounded-2xl p-5 flex items-center gap-3 shadow-xl opacity-80">
                <Lock className="size-7 text-muted-foreground" />
                <span className="font-semibold text-muted-foreground">Bloqueada</span>
              </div>
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white">Avanza con sentido.</h2>
            <p className="mt-3 text-white/90 max-w-xl mx-auto">Nada de saltarse pasos: cada unidad prepara la siguiente.</p>
            <Button asChild size="lg" variant="secondary" className="mt-8 rounded-full">
              <Link to="/cursos">Explorar cursos</Link>
            </Button>
          </div>
        </section>

        {/* Admin-only promo slot */}
        {isAdmin && (
          <section className="container mx-auto px-4 py-16">
            <div className="rounded-3xl border-2 border-dashed border-primary/40 p-10 text-center bg-primary/5">
              <p className="text-xs font-semibold tracking-wide text-primary mb-2">SOLO ADMINISTRADORES</p>
              <h3 className="text-2xl font-extrabold">Vídeo promocional</h3>
              <p className="text-muted-foreground mt-2">Espacio reservado para incrustar el vídeo promocional de la web y los cursos.</p>
              <Button asChild className="mt-6 rounded-full"><Link to="/admin">Gestionar desde Admin</Link></Button>
            </div>
          </section>
        )}

        <footer className="border-t mt-20 py-8 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Pieza a Pieza — Oposiciones Orientación Educativa · Castilla-La Mancha
        </footer>
      </main>
      <PiezinChat scope="home" />
    </div>
  );
}