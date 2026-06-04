import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Header } from "@/components/Header";
import { RequireAdmin } from "@/components/RequireAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAdminUsers, setUserBlocked } from "@/lib/admin-users.functions";
import { ArrowLeft, Shield, Lock, Unlock, Loader2 } from "lucide-react";
import { toast } from "sonner";

function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("es-ES", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "blocked" | "inactive">("all");
  const list = useServerFn(listAdminUsers);
  const block = useServerFn(setUserBlocked);
  const qc = useQueryClient();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin-users", search, status],
    queryFn: () => list({ data: { search, status } }),
  });

  const mut = useMutation({
    mutationFn: (v: { userId: string; blocked: boolean }) => block({ data: v }),
    onSuccess: (_d, v) => {
      toast.success(v.blocked ? "Usuario bloqueado" : "Usuario desbloqueado");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Error"),
  });

  const users = data?.users ?? [];

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-10">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/admin"><ArrowLeft className="size-4" /> Volver</Link>
          </Button>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Shield className="size-7 text-primary" />
          <h1 className="text-3xl font-extrabold">Usuarios registrados</h1>
        </div>
        <p className="text-muted-foreground mt-1">
          Listado de cuentas, accesos y actividad. Bloquea usuarios cuando sea necesario.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="Buscar por email o nombre…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:max-w-sm"
          />
          <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
            <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Activos</SelectItem>
              <SelectItem value="inactive">Inactivos (30d)</SelectItem>
              <SelectItem value="blocked">Bloqueados</SelectItem>
            </SelectContent>
          </Select>
          {isFetching && <Loader2 className="size-5 animate-spin self-center text-muted-foreground" />}
        </div>

        <div className="mt-6 rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Alta</TableHead>
                <TableHead>Último acceso</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Operación</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Cargando…</TableCell></TableRow>
              ) : users.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Sin resultados</TableCell></TableRow>
              ) : users.map((u) => {
                const isAdmin = u.roles.includes("admin");
                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="font-medium">{u.full_name || u.email.split("@")[0]}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                      {isAdmin && <Badge variant="secondary" className="mt-1">admin</Badge>}
                    </TableCell>
                    <TableCell className="text-sm">{fmt(u.created_at)}</TableCell>
                    <TableCell className="text-sm">{fmt(u.last_sign_in_at)}</TableCell>
                    <TableCell className="text-right tabular-nums">{u.actions}</TableCell>
                    <TableCell>
                      {u.blocked ? (
                        <Badge variant="destructive">Bloqueado</Badge>
                      ) : u.inactive ? (
                        <Badge variant="outline">Inactivo</Badge>
                      ) : (
                        <Badge className="bg-emerald-600 hover:bg-emerald-600">Activo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant={u.blocked ? "outline" : "destructive"}
                        disabled={isAdmin || mut.isPending}
                        onClick={() => mut.mutate({ userId: u.id, blocked: !u.blocked })}
                      >
                        {u.blocked ? <><Unlock className="size-4" /> Desbloquear</> : <><Lock className="size-4" /> Bloquear</>}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <p className="text-xs text-muted-foreground mt-3">
          Total: {users.length} usuarios. "Inactivo" = sin acceso en los últimos 30 días.
        </p>
      </main>
    </div>
  );
}

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [{ title: "Usuarios — Admin" }] }),
  component: () => (
    <RequireAdmin>
      <AdminUsersPage />
    </RequireAdmin>
  ),
});