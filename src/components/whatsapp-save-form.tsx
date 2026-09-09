"use client";

import { useState } from "react";

type Tenant = { id: string; name: string };

const ERRORS: Record<string, string> = {
  faltan: "Falta el negocio, el teléfono o el código de Meta.",
  negocio: "Ese negocio no existe. Elige otro en la lista.",
  bd: "No se pudo guardar. Revisa que el teléfono no esté repetido.",
  login: "Tu sesión caducó. Entra otra vez.",
};

export function WhatsappSaveForm({
  tenants,
  defaultTenantId,
}: {
  tenants: Tenant[];
  defaultTenantId?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    e.stopPropagation();
    setBusy(true);
    setOk(false);
    setError("");
    try {
      const res = await fetch("/api/superadmin/whatsapp", {
        method: "POST",
        body: new FormData(e.currentTarget),
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (res.ok && data?.ok) {
        setOk(true);
        return;
      }
      setError(ERRORS[data?.error || ""] || "No se pudo guardar. Intenta otra vez.");
    } catch {
      setError("No hay conexión con el servidor.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {ok ? (
        <p className="rounded-2xl border border-emerald-600 bg-emerald-950/40 px-4 py-3 text-lg text-emerald-300">
          Guardado. Ya puedes escribir Hola al +1 (555) 661-3653.
        </p>
      ) : null}
      {error ? (
        <p className="rounded-2xl border border-red-700 bg-red-950/40 px-4 py-3 text-lg text-red-200">{error}</p>
      ) : null}
      <div className="space-y-1">
        <label>Negocio</label>
        <select name="tenantId" defaultValue={defaultTenantId} className="w-full text-lg py-3" required>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label>Teléfono (déjalo así)</label>
        <input name="e164" defaultValue="+15556613653" className="w-full text-lg py-3" required />
      </div>
      <div className="space-y-1">
        <label>Código largo de Meta (Phone number ID)</label>
        <input name="metaId" defaultValue="1344096055445731" className="w-full text-lg py-3" required />
      </div>
      <button type="submit" className="btn-gold w-full text-xl py-4" disabled={busy}>
        {busy ? "Guardando…" : "Guardar WhatsApp"}
      </button>
    </form>
  );
}
