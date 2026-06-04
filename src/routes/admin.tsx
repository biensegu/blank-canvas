import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { RequireAdmin } from "@/components/RequireAdmin";
import { Shield, BookOpen, Video, BarChart3, Disc3, Megaphone, Users } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Pieza a Pieza" }] }),
  component: () => (
    <RequireAdmin>
      <div className="min-h-screen">
        <Header />
        <main className="container mx-auto px-4 py-12">
          <div className="flex items-center gap-3">
            <Shield className="size-8 text-primary" />
            <h1 className="text-4xl font-extrabold">Panel de administración</h1>
          </div>
          <p className="text-muted-foreground mt-2">Gestiona cursos, contenido, ruleta, videoconferencias, analítica y anuncios.</p>

          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Users, title: "Usuarios registrados", desc: "Tabla con alta, último acceso, acciones y bloqueo.", to: "/admin/users", ready: true },
              { icon: BookOpen, title: "Cursos y contenido", desc: "Crear/editar cursos, temas, unidades, vídeos y recursos.", to: "/admin" },
              { icon: Video, title: "Videoconferencias", desc: "Programa enlaces de BigBlueButton por curso.", to: "/admin" },
              { icon: Disc3, title: "Ruleta", desc: "Configura los 8 slots, cofres y la tutoría individualizada.", to: "/admin" },
              { icon: BarChart3, title: "Analítica de usuarios", desc: "Navegación, tiempo, cursos, estrellas y ruletas giradas.", to: "/admin" },
              { icon: Megaphone, title: "Anuncios sociales", desc: "Instagram y TikTok Ads (próximamente).", to: "/admin" },
            ].map((card) => (
              <Link key={card.title} to={card.to} className="rounded-2xl border bg-card p-6 hover:-translate-y-1 transition shadow-[var(--shadow-soft)]">
                <card.icon className="size-8 text-primary" />
                <h3 className="font-bold mt-3">{card.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{card.desc}</p>
                <span className="inline-block mt-3 text-xs font-semibold text-primary">{(card as any).ready ? "Abrir →" : "Próximamente"}</span>
              </Link>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border bg-muted/40 p-6">
            <h3 className="font-bold">Cuentas de administrador creadas</h3>
            <ul className="mt-2 text-sm space-y-1 font-mono">
              <li>admin1@piezaapieza.local · Manuel-021269</li>
              <li>admin2@piezaapieza.local · Mariloli-111113</li>
              <li>admin3@piezaapieza.local · Conchita-1268</li>
            </ul>
            <p className="text-xs text-muted-foreground mt-3">Usa estos correos para iniciar sesión desde la pantalla de Entrar.</p>
          </div>
        </main>
      </div>
    </RequireAdmin>
  ),
});