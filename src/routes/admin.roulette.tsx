import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { type FormEvent } from "react";
import { ArrowLeft, Disc3, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { Header } from "@/components/Header";
import { RequireAdmin } from "@/components/RequireAdmin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { listAdminRoulette, saveAdminRouletteItem } from "@/lib/admin-roulette.functions";

type RouletteItem = Awaited<ReturnType<typeof listAdminRoulette>>["items"][number];

function AdminRoulettePage() {
  const qc = useQueryClient();
  const listRoulette = useServerFn(listAdminRoulette);
  const saveRouletteItem = useServerFn(saveAdminRouletteItem);

  const query = useQuery({
    queryKey: ["admin-roulette"],
    queryFn: () => listRoulette(),
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) => saveRouletteItem({ data }),
    onSuccess: () => {
      toast.success("Slot guardado");
      qc.invalidateQueries({ queryKey: ["admin-roulette"] });
    },
    onError: (error: any) => toast.error(error?.message ?? "No se pudo guardar"),
  });

  const itemsBySlot = new Map((query.data?.items ?? []).map((item) => [item.slot_index, item]));

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
            <Disc3 className="size-7 text-primary" />
            <div>
              <h1 className="text-3xl font-extrabold">Ruleta</h1>
              <p className="text-muted-foreground">
                Configura los 8 slots, pesos y payloads de premios.
              </p>
            </div>
          </div>
          {query.isFetching && <Loader2 className="size-5 animate-spin text-muted-foreground" />}
        </div>

        <div className="mt-8 grid gap-5 xl:grid-cols-2">
          {Array.from({ length: 8 }, (_, slot) => (
            <RouletteSlotForm
              key={slot}
              slot={slot}
              item={itemsBySlot.get(slot) ?? null}
              onSubmit={(data) => saveMutation.mutate(data)}
              disabled={saveMutation.isPending}
            />
          ))}
        </div>

        <section className="mt-8 rounded-xl border bg-card p-5">
          <h2 className="text-xl font-bold">Últimos giros</h2>
          {query.data?.recentSpins.length ? (
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {query.data.recentSpins.map((spin: any) => (
                <div key={spin.id} className="rounded-lg border bg-background p-3 text-sm">
                  <div className="font-medium">
                    Slot {spin.roulette_items?.slot_index ?? "?"} ·{" "}
                    {spin.roulette_items?.title ?? "Premio"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(spin.spun_at).toLocaleString("es-ES")}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Aún no hay giros registrados.</p>
          )}
        </section>
      </main>
    </div>
  );
}

function RouletteSlotForm({
  slot,
  item,
  onSubmit,
  disabled,
}: {
  slot: number;
  item: RouletteItem | null;
  onSubmit: (data: any) => void;
  disabled: boolean;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSubmit({
      id: item?.id,
      slot_index: slot,
      kind: String(form.get("kind") ?? "surprise"),
      title: String(form.get("title") ?? ""),
      weight: Number(form.get("weight") ?? 0),
      payload: String(form.get("payload") ?? "{}"),
    });
  }

  return (
    <form onSubmit={submit} className="rounded-xl border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Slot {slot}</Badge>
          <h2 className="font-bold">{item?.title ?? "Sin configurar"}</h2>
        </div>
        <Button type="submit" size="sm" disabled={disabled}>
          <Save className="size-4" /> Guardar
        </Button>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-[1fr,120px]">
        <div>
          <Label>Título</Label>
          <Input name="title" defaultValue={item?.title ?? `Premio ${slot + 1}`} />
        </div>
        <div>
          <Label>Peso</Label>
          <Input name="weight" type="number" min="0" defaultValue={item?.weight ?? 10} />
        </div>
        <div>
          <Label>Tipo</Label>
          <Select name="kind" defaultValue={item?.kind ?? "surprise"}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="surprise">Sorpresa</SelectItem>
              <SelectItem value="chest">Cofre</SelectItem>
              <SelectItem value="tutoring">Tutoría</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2">
          <Label>Payload JSON</Label>
          <Textarea
            name="payload"
            rows={5}
            defaultValue={JSON.stringify(item?.payload ?? {}, null, 2)}
            className="font-mono text-xs"
          />
        </div>
      </div>
    </form>
  );
}

export const Route = createFileRoute("/admin/roulette")({
  head: () => ({ meta: [{ title: "Ruleta — Admin" }] }),
  component: () => (
    <RequireAdmin>
      <AdminRoulettePage />
    </RequireAdmin>
  ),
});
