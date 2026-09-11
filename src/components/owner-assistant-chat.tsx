"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "ai"; text: string };

const SUGGESTIONS = [
  "¿Qué citas hay hoy?",
  "¿Quién viene esta semana?",
  "Resumen del negocio",
  "Horario y días cerrados",
  "Ventas y facturas",
  "Busca un cliente",
];

export function OwnerAssistantChat({
  tenantName,
  ownerName,
}: {
  tenantName: string;
  ownerName: string;
}) {
  const first = ownerName.split(" ")[0] || "tú";
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "ai",
      text: `Hola ${first}. Soy Elena, tu asistente de ${tenantName}. Pregúntame por citas, clientes, horarios, ventas, inventario o cómo va Sofía.`,
    },
  ]);
  const box = useRef<HTMLDivElement>(null);
  const loaded = useRef(false);

  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    void (async () => {
      try {
        const res = await fetch("/api/app/asistente");
        const data = await res.json().catch(() => null);
        if (Array.isArray(data?.messages) && data.messages.length) {
          setMsgs(data.messages as Msg[]);
        }
      } catch {
        /* saludo inicial */
      }
    })();
  }, []);

  async function send(raw: string) {
    const clean = raw.trim();
    if (!clean || busy) return;
    setBusy(true);
    setMsgs((m) => [...m, { role: "user", text: clean }]);
    setText("");
    try {
      const res = await fetch("/api/app/asistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: clean }),
      });
      const data = await res.json().catch(() => null);
      const reply = data?.reply || "No pude leer el CRM. Prueba otra vez.";
      setMsgs((m) => [...m, { role: "ai", text: reply }]);
    } catch {
      setMsgs((m) => [...m, { role: "ai", text: "Hay un problema de conexión." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card overflow-hidden p-0">
      <div className="px-6 py-5 border-b border-white/10">
        <p className="text-xl font-semibold">Elena</p>
        <p className="text-sm text-slate-400">Asistente del CRM · {tenantName}</p>
        <p className="text-xs text-emerald-400 mt-1">{busy ? "Consultando el negocio…" : "En línea"}</p>
      </div>

      <div className="px-4 pt-4 flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            className="text-xs rounded-full border border-white/15 px-3 py-1.5 text-slate-300 hover:border-gold-500/50 hover:text-gold-400"
            disabled={busy}
            onClick={() => void send(s)}
          >
            {s}
          </button>
        ))}
      </div>

      <div ref={box} className="h-[420px] overflow-y-auto px-6 py-4 space-y-3">
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <p
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === "user" ? "bg-gold-500 text-ink-950" : "bg-white/10 text-slate-100"
              }`}
            >
              {m.text}
            </p>
          </div>
        ))}
      </div>

      <form
        className="border-t border-white/10 p-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send(text);
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ej: ¿Qué citas hay el 16 de septiembre?"
          className="flex-1"
          disabled={busy}
        />
        <button type="submit" className="btn-gold" disabled={busy}>
          {busy ? "…" : "Preguntar"}
        </button>
      </form>
    </div>
  );
}
