import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { requireSuperadmin } from "@/lib/guards";
import { CopyField } from "@/components/copy-field";
import { WhatsappSaveForm } from "@/components/whatsapp-save-form";
import { whatsappTrace } from "@/lib/whatsapp-trace";
import { twilioReady } from "@/lib/twilio";

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
  const webhook = `${proto}://${host.split(",")[0].trim()}/api/channels/twilio/whatsapp`;
  const ready = twilioReady();
  const tenants = await prisma.tenant.findMany({ orderBy: { name: "asc" } });
  const barber = tenants.find((t) => t.slug === "barberia-norte") || tenants[0];

  return (
    <div className="max-w-3xl space-y-6">
      <header>
        <h1 className="font-display text-4xl">WhatsApp (Twilio)</h1>
        <p className="text-slate-300 mt-2 text-lg">
          Dejamos Facebook. Twilio es más simple: cuenta, sandbox y un webhook.
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

      <Step n="1" title="Cuenta Twilio y claves en Render">
        <ol className="list-decimal pl-6 space-y-2">
          <li>
            Crea cuenta en{" "}
            <a className="text-gold-400 underline" href="https://www.twilio.com/try-twilio" target="_blank" rel="noreferrer">
              twilio.com/try-twilio
            </a>
          </li>
          <li>En la consola, copia <b>Account SID</b> y <b>Auth Token</b>.</li>
          <li>
            Render → ejeuno → Environment. Añade:
            <CopyField value="TWILIO_ACCOUNT_SID" />
            <CopyField value="TWILIO_AUTH_TOKEN" />
            <CopyField value="TWILIO_WHATSAPP_FROM" />
            Value del último, si usas sandbox: <b>+14155238886</b>
          </li>
          <li>Save Changes y espera el deploy.</li>
        </ol>
        <p className={ready ? "text-emerald-400 font-medium" : "text-amber-400 font-medium"}>
          {ready ? "Bien: Twilio ya está en el servidor." : "Faltan las claves de Twilio en Render."}
        </p>
      </Step>

      <Step n="2" title="Avisar a Twilio (webhook)">
        <p>
          En Twilio: Messaging → Try it out →{" "}
          <a
            className="text-gold-400 underline"
            href="https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn"
            target="_blank"
            rel="noreferrer"
          >
            WhatsApp sandbox
          </a>
          .
        </p>
        <p>En “When a message comes in”, pega esta URL (método HTTP POST):</p>
        <CopyField value={webhook} />
        <p>Guarda. No hay token de verificación tipo Facebook.</p>
      </Step>

      <Step n="3" title="Unir tu celular al sandbox">
        <p>
          Abre WhatsApp. Escribe al <b>+1 415 523 8886</b> el código que Twilio muestra (algo como{" "}
          <b>join xxx-xxxx</b>).
        </p>
        <p>Twilio debe responder que ya estás unido. Sin ese join, no llega ningún Hola.</p>
      </Step>

      <Step n="4" title="Guardar el número aquí">
        <WhatsappSaveForm tenants={tenants.map((t) => ({ id: t.id, name: t.name }))} defaultTenantId={barber?.id} />
      </Step>

      <Step n="5" title="Escribe Hola">
        <p>En el mismo chat del sandbox, escribe: Hola.</p>
        <p>Sofía debe contestar. También puedes usar Prueba de escritorio.</p>
      </Step>
    </div>
  );
}
