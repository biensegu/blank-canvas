import { useAuth } from "@/hooks/use-auth";
import { useUserRole } from "@/hooks/use-role";
import { Navigate } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const { isAdmin, loading: roleLoading, roles } = useUserRole();
  // Wait until both auth and role queries have resolved
  if (loading || (user && roleLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="size-10 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" />;
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-4">
        <div>
          <h1 className="text-2xl font-bold">Acceso restringido</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Esta sección es solo para administradores. Roles detectados: {roles.join(", ") || "ninguno"}.
          </p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}