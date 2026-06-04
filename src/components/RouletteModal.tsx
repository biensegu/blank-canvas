import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { spinRoulette } from "@/lib/gamification.functions";
import { Button } from "./ui/button";
import { Disc3, Gift, Sparkles, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const ICONS: Record<string, typeof Gift> = { surprise: Sparkles, chest: Gift, tutoring: Disc3 };

export function RouletteModal({ onClose }: { onClose: () => void }) {
  const spin = useServerFn(spinRoulette);
  const qc = useQueryClient();
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<{ kind: string; title: string; payload: unknown } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setSpinning(true);
    setError(null);
    try {
      const res = await spin();
      await new Promise((r) => setTimeout(r, 1500));
      if (res.item) {
        setResult({ kind: res.item.kind, title: res.item.title, payload: res.item.payload });
        qc.invalidateQueries({ queryKey: ["profile"] });
        qc.invalidateQueries({ queryKey: ["spins"] });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSpinning(false);
    }
  }

  const Icon = result ? (ICONS[result.kind] ?? Gift) : Disc3;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card rounded-3xl p-8 max-w-md w-full text-center relative shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground"><X /></button>
        <h2 className="text-2xl font-extrabold">🎡 Ruleta de premios</h2>
        <div className="my-8 flex justify-center">
          <div
            className={`size-32 rounded-full flex items-center justify-center text-white ${spinning ? "animate-spin" : ""}`}
            style={{ background: "var(--gradient-brand)" }}
          >
            <Icon className="size-14" />
          </div>
        </div>
        {result ? (
          <>
            <p className="text-sm uppercase tracking-wider text-muted-foreground">¡Has ganado!</p>
            <h3 className="text-xl font-bold mt-1">{result.title}</h3>
            <Button className="mt-6 rounded-full" onClick={onClose}>Guardar premio</Button>
          </>
        ) : (
          <>
            <p className="text-muted-foreground text-sm">Tienes un giro disponible. ¡Gíralo y descubre tu premio!</p>
            {error && <p className="text-destructive text-sm mt-2">{error}</p>}
            <Button className="mt-6 rounded-full" onClick={go} disabled={spinning}>
              {spinning ? "Girando…" : "Girar la ruleta"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}