import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Entrar — Pieza a Pieza" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s) navigate({ to: "/dashboard" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: name }, emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Cuenta creada. Revisa tu correo si te pide confirmación.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      toast.error(err.message ?? "Error");
    } finally { setLoading(false); }
  }

  async function handleGoogle() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error("No se pudo iniciar sesión con Google");
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex items-center justify-center p-12" style={{ background: "var(--gradient-brand)" }}>
        <div className="text-center text-white max-w-md">
          <h1 className="text-4xl font-extrabold">Bienvenido a tu próximo aprendizaje.</h1>
          <p className="mt-4 text-white/90">Cursos paso a paso, con desbloqueos, recursos y puntos.</p>
        </div>
      </div>
      <div className="flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="mb-8"><Logo /></div>
          <h2 className="text-2xl font-bold">{mode === "signin" ? "Entrar" : "Crear cuenta"}</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {mode === "signin" ? "Accede a tus cursos y progreso." : "Únete y empieza a aprender."}
          </p>

          <Button onClick={handleGoogle} variant="outline" className="w-full mt-6 rounded-full">
            Continuar con Google
          </Button>
          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px bg-border flex-1" /> o con email <div className="h-px bg-border flex-1" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div><Label>Nombre</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
            )}
            <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
            <div><Label>Contraseña</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} /></div>
            <Button type="submit" disabled={loading} className="w-full rounded-full">
              {loading ? "..." : mode === "signin" ? "Entrar" : "Crear cuenta"}
            </Button>
          </form>

          <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="mt-4 text-sm text-muted-foreground hover:text-foreground w-full text-center">
            {mode === "signin" ? "¿No tienes cuenta? Crea una" : "¿Ya tienes cuenta? Entra"}
          </button>
          <div className="mt-6 text-center"><Link to="/" className="text-xs text-muted-foreground hover:underline">← Volver</Link></div>
        </div>
      </div>
    </div>
  );
}