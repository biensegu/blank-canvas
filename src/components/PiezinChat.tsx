import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Bot, Send, X, MessageCircle } from "lucide-react";
import { Button } from "./ui/button";
import ReactMarkdown from "react-markdown";

export function PiezinChat({ scope = "home", title }: { scope?: string; title?: string }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const storageKey = `piezin:${scope}`;
  const [initial] = useState<UIMessage[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem(storageKey) ?? "[]"); } catch { return []; }
  });

  const { messages, sendMessage, status } = useChat({
    id: scope,
    messages: initial,
    transport: new DefaultChatTransport({
      api: "/api/piezin",
      prepareSendMessagesRequest: ({ messages, id }) => ({
        body: { messages, scope: id },
      }),
    }),
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    }
  }, [messages, storageKey]);

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => { scrollRef.current?.scrollTo({ top: 9e9 }); }, [messages, status]);

  const busy = status === "submitted" || status === "streaming";

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 rounded-full shadow-2xl size-14 flex items-center justify-center text-white"
          style={{ background: "var(--gradient-brand)" }}
          aria-label="Abrir Piezin"
        >
          <MessageCircle className="size-6" />
        </button>
      )}
      {open && (
        <div className="fixed bottom-5 right-5 z-50 w-[min(380px,calc(100vw-2rem))] h-[min(560px,calc(100vh-2rem))] bg-card border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <header className="flex items-center justify-between gap-2 px-4 py-3 border-b" style={{ background: "var(--gradient-brand)" }}>
            <div className="flex items-center gap-2 text-white">
              <Bot className="size-5" />
              <div>
                <div className="font-bold text-sm">Piezin</div>
                <div className="text-[10px] opacity-90">{title ?? "Asistente de Pieza a Pieza"}</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/90 hover:text-white">
              <X className="size-5" />
            </button>
          </header>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 text-sm">
            {messages.length === 0 && (
              <div className="text-muted-foreground text-center mt-8">
                <Bot className="size-10 mx-auto opacity-50" />
                <p className="mt-3">{scope === "home"
                  ? "Hola, soy Piezin. Pregúntame por precios, objetivos o materiales de los cursos."
                  : "Hola, soy Piezin de este curso. Pregúntame dudas del contenido."}</p>
              </div>
            )}
            {messages.map((m) => {
              const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
              const isUser = m.role === "user";
              return (
                <div key={m.id} className={isUser ? "flex justify-end" : ""}>
                  <div className={isUser
                    ? "max-w-[85%] rounded-2xl px-3 py-2 bg-primary text-primary-foreground"
                    : "max-w-[95%] prose prose-sm dark:prose-invert"}>
                    <ReactMarkdown>{text}</ReactMarkdown>
                  </div>
                </div>
              );
            })}
            {status === "submitted" && (
              <div className="text-muted-foreground text-xs italic">Piezin está pensando…</div>
            )}
          </div>
          <form
            className="flex gap-2 p-3 border-t"
            onSubmit={(e) => {
              e.preventDefault();
              if (!input.trim() || busy) return;
              sendMessage({ text: input.trim() });
              setInput("");
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu pregunta…"
              className="flex-1 rounded-full border px-4 py-2 text-sm bg-background"
              disabled={busy}
            />
            <Button type="submit" size="icon" disabled={busy || !input.trim()} className="rounded-full">
              <Send className="size-4" />
            </Button>
          </form>
        </div>
      )}
    </>
  );
}