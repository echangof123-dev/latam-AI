import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { requireSuperadmin } from "@/lib/guards";
import { conectarWhatsAppMeta } from "../actions";
import { CopyField } from "@/components/copy-field";

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="card space-y-3">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-500 text-ink-950 text-xl font-bold">
          {n}
        </span>
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>
      <div className="pl-0 sm:pl-13 space-y-3 text-slate-300">{children}</div>
    </section>
  );
}

export default async function WhatsappGuidePage() {
  await requireSuperadmin();
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "ejeuno.onrender.com";
  const proto = h.get("x-forwarded-proto") || "https";
  const webhook = `${proto}://${host.split(",")[0].trim()}/api/channels/whatsapp/webhook`;
  const tokenOk = Boolean(process.env.WHATSAPP_ACCESS_TOKEN);
  const tenants = await prisma.tenant.findMany({ orderBy: { name: "asc" } });
  const barber = tenants.find((t) => t.slug === "barberia-norte") || tenants[0];
  const connected = await prisma.phoneNumber.findFirst({
    where: { e164: "+15556613653" },
  });

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <h1 className="font-display text-4xl">Conectar WhatsApp</h1>
        <p className="text-slate-400 mt-2 text-lg">Sigue los 4 pasos. No mezcles números.</p>
      </header>

      <div
        className={`card text-lg ${connected?.whatsappPhoneNumberId ? "border-emerald-700" : "border-amber-700"}`}
      >
        {connected?.whatsappPhoneNumberId
          ? "WhatsApp de prueba ya está guardado en Barbería Norte."
          : "WhatsApp de prueba aún no está guardado. Completa el paso 3."}
      </div>

      <Step n="1" title="Token en Render">
        <p>
          En Render, servicio <b>ejeuno</b>, entra a <b>Settings</b> y luego a las variables
          (Environment).
        </p>
        <p>
          Debe existir <b>WHATSAPP_ACCESS_TOKEN</b> (el token largo de Meta).
        </p>
        <p className={tokenOk ? "text-emerald-400 font-medium" : "text-amber-400 font-medium"}>
          {tokenOk ? "Listo: el token ya está en el servidor." : "Falta el token. Sin eso WhatsApp no responde."}
        </p>
      </Step>

      <Step n="2" title="Avisar a Meta (webhook)">
        <p>En Facebook Developers, Paso 2, busca “Configurar webhooks” (no la tabla de email).</p>
        <p className="font-medium text-white">Pega esta dirección:</p>
        <CopyField value={webhook} />
        <p className="font-medium text-white">Token de verificación:</p>
        <CopyField value={process.env.WHATSAPP_VERIFY_TOKEN || "ejeuno-whatsapp"} />
        <p>Pulsa Verificar y guardar. Luego activa la casilla que dice messages.</p>
      </Step>

      <Step n="3" title="Guardar el número de Meta aquí">
        <p>
          El chat de prueba de Meta es <b>+1 555 661-3653</b>. Aquí se guarda junto, sin espacios.
        </p>
        <form action={conectarWhatsAppMeta} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm normal-case tracking-normal text-white">Negocio</label>
            <select name="tenantId" defaultValue={barber?.id} className="w-full" required>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm normal-case tracking-normal text-white">
              Teléfono de WhatsApp de Meta (con el +)
            </label>
            <input name="e164" defaultValue="+15556613653" className="w-full text-lg" required />
          </div>
          <div className="space-y-1">
            <label className="text-sm normal-case tracking-normal text-white">
              Phone number ID (el número largo de Meta)
            </label>
            <input name="metaId" defaultValue="1344096055445731" className="w-full text-lg" required />
          </div>
          <button className="w-full rounded-xl bg-gold-500 text-ink-950 font-bold text-lg py-3">
            Guardar WhatsApp
          </button>
        </form>
      </Step>

      <Step n="4" title="Escribe Hola">
        <p>Abre WhatsApp en tu celular.</p>
        <p>
          Entra al chat <b>+1 (555) 661-3653</b>.
        </p>
        <p>Escribe: Hola</p>
        <p>Debe responder la recepción de la barbería.</p>
        <p className="text-slate-500 text-sm">
          Si no responde: el paso 2 (webhook) todavía no está verificado en Meta.
        </p>
      </Step>
    </div>
  );
}
