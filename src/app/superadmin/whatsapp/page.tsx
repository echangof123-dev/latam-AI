import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { requireSuperadmin } from "@/lib/guards";
import { CopyField } from "@/components/copy-field";
import { WhatsappSaveForm } from "@/components/whatsapp-save-form";

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

export default async function WhatsappGuidePage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; e?: string }>;
}) {
  await requireSuperadmin();
  const q = await searchParams;
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

  const errors: Record<string, string> = {
    faltan: "Falta el negocio, el teléfono o el código de Meta.",
    negocio: "Ese negocio no existe. Elige otro en la lista.",
    bd: "No se pudo guardar. Revisa que el teléfono no esté repetido.",
  };

  return (
    <div className="max-w-3xl space-y-6">
      <header>
        <h1 className="font-display text-4xl">WhatsApp</h1>
        <p className="text-slate-300 mt-2 text-lg">
          Cuatro pasos. Primero prueba a Sofía en el chat; esto es solo para el celular.
        </p>
      </header>

      {q.ok ? (
        <div className="card border-emerald-600 text-lg text-emerald-300">
          Guardado. Ya puedes escribir Hola al +1 (555) 661-3653.
        </div>
      ) : null}
      {q.e ? (
        <div className="card border-red-700 text-lg text-red-200">{errors[q.e] || "No se pudo guardar."}</div>
      ) : null}

      <div className={`card text-lg ${connected?.whatsappPhoneNumberId ? "border-emerald-700" : "border-amber-700"}`}>
        {connected?.whatsappPhoneNumberId
          ? "El WhatsApp de prueba ya está guardado."
          : "Falta guardar el WhatsApp de prueba (paso 3)."}
      </div>

      <Step n="1" title="Poner el token en Render">
        <p>Entra a Render → servicio ejeuno → Environment.</p>
        <p>
          Debe existir <b>WHATSAPP_ACCESS_TOKEN</b>.
        </p>
        <p className={tokenOk ? "text-emerald-400 font-medium" : "text-amber-400 font-medium"}>
          {tokenOk ? "Bien: el token ya está en el servidor." : "Falta el token. Sin eso no responde."}
        </p>
      </Step>

      <Step n="2" title="Avisar a Meta">
        <p>En Facebook Developers, Paso 2, busca Configurar webhooks (no la tabla de email).</p>
        <p className="font-medium text-white">Copia esta dirección:</p>
        <CopyField value={webhook} />
        <p className="font-medium text-white">Copia este token:</p>
        <CopyField value={process.env.WHATSAPP_VERIFY_TOKEN || "ejeuno-whatsapp"} />
        <p>Pulsa Verificar y guardar. Luego marca la casilla messages.</p>
      </Step>

      <Step n="3" title="Guardar el número aquí">
        <p>Usa solo el WhatsApp de prueba de Meta (+1 555). No uses el de Colombia.</p>
        <WhatsappSaveForm tenants={tenants.map((t) => ({ id: t.id, name: t.name }))} defaultTenantId={barber?.id} />
      </Step>

      <Step n="4" title="Escribe Hola en tu celular">
        <p>
          Abre WhatsApp y entra al chat <b>+1 (555) 661-3653</b>.
        </p>
        <p>Escribe: Hola. Debe contestar la barbería.</p>
        <p className="text-slate-400">Si no contesta, el paso 2 todavía no está listo en Meta.</p>
      </Step>
    </div>
  );
}
