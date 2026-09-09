"use client";

import { useState } from "react";

export function WhatsappRepairButton() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState<boolean | null>(null);

  async function run() {
    setBusy(true);
    setMsg("");
    setOk(null);
    try {
      const res = await fetch("/api/superadmin/whatsapp/repair", {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; mensaje?: string };
      setOk(Boolean(data.ok));
      setMsg(data.mensaje || data.error || "No se pudo completar.");
    } catch {
      setOk(false);
      setMsg("No hay conexión con el servidor.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <button type="button" className="btn-gold w-full text-xl py-4" disabled={busy} onClick={() => void run()}>
        {busy ? "Conectando…" : "Arreglar conexión con Meta"}
      </button>
      {msg ? (
        <p className={ok ? "text-emerald-300" : "text-red-300"}>{msg}</p>
      ) : null}
    </div>
  );
}
