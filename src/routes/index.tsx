import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Your App" },
      { name: "description", content: "Replace this with a one-sentence description of your app." },
      { property: "og:title", content: "Your App" },
      { property: "og:description", content: "Replace this with a one-sentence description of your app." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-muted-foreground">Proyecto vacío listo para empezar</p>
    </div>
  );
}
