"use client";

import { useState } from "react";

type Step = { n: number; title: string; ok: boolean; detail: string };

export function DesktopWhatsappTest() {
  const [text, setText] = useState("Hola");
  const [from, setFrom] = useState("");
  const [sendToPhone, setSendToPhone] = useState(true);
  const [busy, setBusy] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setSteps([]);
    try {
      const res = await fetch("/api/superadmin/whatsapp/desktop-test", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ text, from, sendToPhone }),
      });
      const data = (await res.json()) as { steps?: Step[] };
      setSteps(data.steps || []);
    } catch {
      setSteps([{ n: 0, title: "Conexión", ok: false, detail: "No se pudo hablar con el servidor." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(e) => void run(e)} className="card space-y-4">
      <p className="text-slate-300">
        Escribe aquí, como si fuera WhatsApp. Verás en qué paso se rompe. No hace falta el celular para el paso 2.
      </p>
      <div className="space-y-1">
        <label>Mensaje</label>
        <input className="w-full text-lg py-3" value={text} onChange={(e) => setText(e.target.value)} required />
      </div>
      <div className="space-y-1">
        <label>Tu WhatsApp (el que hizo join al sandbox)</label>
        <input
          className="w-full text-lg py-3"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          placeholder="5939xxxxxxx"
        />
      </div>
      <label className="flex items-center gap-2 text-slate-200">
        <input type="checkbox" checked={sendToPhone} onChange={(e) => setSendToPhone(e.target.checked)} />
          Enviar también la respuesta a mi WhatsApp (sandbox Twilio)
      </label>
      <button type="submit" className="btn-gold w-full text-xl py-4" disabled={busy}>
        {busy ? "Probando…" : "Probar desde aquí"}
      </button>
      {steps.length ? (
        <ol className="space-y-3">
          {steps.map((s) => (
            <li
              key={s.n}
              className={`rounded-2xl border px-4 py-3 ${s.ok ? "border-emerald-700 text-emerald-200" : "border-red-700 text-red-200"}`}
            >
              <p className="font-semibold">
                {s.ok ? "Bien" : "Error"} · {s.title}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-slate-200">{s.detail}</p>
            </li>
          ))}
        </ol>
      ) : null}
    </form>
  );
}
