import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { requireSuperadmin } from "@/lib/guards";
import { CopyField } from "@/components/copy-field";
import { WhatsappSaveForm } from "@/components/whatsapp-save-form";
import { whatsappTrace } from "@/lib/whatsapp-trace";
import { gupshupReady } from "@/lib/gupshup";

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="card space-y-4">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold-500 text-ink-950 text-xl font-bold">
          {n}
        </span>
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>
      <div className="space-y-3 text-slate-200">{children}</div>
    </section>
  );
}

export default async function WhatsappGuidePage() {
  await requireSuperadmin();
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "ejeuno.onrender.com";
  const proto = h.get("x-forwarded-proto") || "https";
  const webhook = `${proto}://${host.split(",")[0].trim()}/api/channels/gupshup/whatsapp`;
  const ready = gupshupReady();
  const tenants = await prisma.tenant.findMany({ orderBy: { name: "asc" } });
  const barber = tenants.find((t) => t.slug === "barberia-norte") || tenants[0];
  const appName = process.env.GUPSHUP_APP_NAME || "EjeUno";

  return (
    <div className="max-w-3xl space-y-6">
      <header>
        <h1 className="font-display text-4xl">WhatsApp (Gupshup)</h1>
        <p className="text-slate-300 mt-2 text-lg">
          Mismo tipo de servicio que Twilio, pero se crea con correo. Los mensajes llegan a WhatsApp.
        </p>
      </header>

      <div className="card space-y-2">
        <p className="font-semibold">¿Llegó tu Hola?</p>
        <p className="text-slate-300">{whatsappTrace.lastHint}</p>
        {whatsappTrace.lastText ? (
          <p className="text-sm text-slate-400">
            Escribiste: “{whatsappTrace.lastText}” · Respondí: “{whatsappTrace.lastReply.slice(0, 160)}”
          </p>
        ) : null}
        {whatsappTrace.lastSendError ? (
          <p className="text-sm text-red-300">{whatsappTrace.lastSendError}</p>
        ) : null}
      </div>

      <Step n="1" title="Crear cuenta Gupshup">
        <ol className="list-decimal pl-6 space-y-2">
          <li>
            Entra a{" "}
            <a className="text-gold-400 underline" href="https://www.gupshup.io/" target="_blank" rel="noreferrer">
              gupshup.io
            </a>{" "}
            y regístrate con <b>correo</b> (no pide el SMS de Ecuador de Twilio).
          </li>
          <li>Crea una app de WhatsApp (Access / sandbox).</li>
          <li>Copia el <b>API key</b> y el <b>nombre de la app</b> (sin espacios raros).</li>
        </ol>
      </Step>

      <Step n="2" title="Pegar claves en Render">
        <p>Render → ejeuno → Environment:</p>
        <CopyField value="GUPSHUP_API_KEY" />
        <CopyField value="GUPSHUP_APP_NAME" />
        <CopyField value="GUPSHUP_SOURCE" />
        <p>
          El SOURCE, si usas sandbox, es <b>917834811114</b> (sin +).
        </p>
        <p>Save Changes y espera el deploy.</p>
        <p className={ready ? "text-emerald-400 font-medium" : "text-amber-400 font-medium"}>
          {ready ? "Bien: Gupshup ya está en el servidor." : "Faltan las claves de Gupshup en Render."}
        </p>
      </Step>

      <Step n="3" title="Avisar a Gupshup (callback)">
        <p>En la app de Gupshup, pega esta URL de callback / webhook:</p>
        <CopyField value={webhook} />
      </Step>

      <Step n="4" title="Unir tu WhatsApp">
        <p>
          Abre WhatsApp y escribe al <b>+91 78348 11114</b>:
        </p>
        <CopyField value={`proxy ${appName}`} />
        <p>Debe confirmar que ya estás en el sandbox. Luego escribe: Hola.</p>
      </Step>

      <Step n="5" title="Guardar el número aquí">
        <WhatsappSaveForm tenants={tenants.map((t) => ({ id: t.id, name: t.name }))} defaultTenantId={barber?.id} />
      </Step>
    </div>
  );
}
