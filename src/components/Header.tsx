import { Link, useNavigate } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { Button } from "./ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useUserRole } from "@/hooks/use-role";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Star, LogOut, LayoutDashboard, Shield } from "lucide-react";

export function Header() {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const navigate = useNavigate();
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("stars, full_name").eq("id", user!.id).single();
      return data;
    },
  });

  return (
    <header className="sticky top-0 z-40 backdrop-blur bg-background/80 border-b border-border">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Logo />
        <nav className="flex items-center gap-2">
          <Link to="/cursos" className="text-sm font-medium px-3 py-2 hover:text-primary transition-colors">
            Cursos
          </Link>
          {user ? (
            <>
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/20 border border-accent/40">
                <Star className="size-4 text-accent-foreground" />
                <span className="text-sm font-semibold tabular-nums">{profile?.stars ?? 0}</span>
                <span className="text-xs text-muted-foreground">estrellas</span>
              </div>
              {isAdmin && (
                <Link
                  to="/admin"
                  className="inline-flex items-center gap-2 h-8 px-3 rounded-md text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Shield className="size-4" /> Admin
                </Link>
              )}
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 h-8 px-3 rounded-md text-xs font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <LayoutDashboard className="size-4" /> Mi panel
              </Link>
              <Button variant="ghost" size="sm" onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/" });
              }}>
                <LogOut className="size-4" />
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm"><Link to="/login">Entrar</Link></Button>
              <Button asChild size="sm" className="rounded-full"><Link to="/login">Empezar</Link></Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}