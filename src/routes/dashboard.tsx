import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Mi panel — Pieza a Pieza" }] }),
  component: () => (
    <RequireAuth>
      <div className="min-h-screen">
        <Header />
        <main className="container mx-auto px-4 py-12">
          <h1 className="text-4xl font-extrabold">Mi panel</h1>
          <p className="text-muted-foreground mt-2">Aquí verás tus cursos, progreso y estrellas.</p>
          <div className="mt-10 rounded-2xl border-2 border-dashed p-12 text-center">
            <Sparkles className="size-10 mx-auto text-accent-foreground" />
            <p className="mt-4 text-muted-foreground">Aún no tienes cursos. Explora el catálogo para empezar.</p>
            <Button asChild className="mt-6 rounded-full"><Link to="/cursos">Ver cursos</Link></Button>
          </div>
        </main>
      </div>
    </RequireAuth>
  ),
});