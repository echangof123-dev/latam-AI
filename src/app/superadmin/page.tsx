import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { requireSuperadmin } from "@/lib/guards";
import { MODULE_CATALOG, VERTICAL_LABEL } from "@/lib/modules";
import { createTenant, setTenantActive, toggleModule } from "./actions";

export default async function SuperadminPage() {
  await requireSuperadmin();
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "";
  const proto = h.get("x-forwarded-proto") || "https";
  const webhook = host ? `${proto}://${host}/api/channels/whatsapp/webhook` : "/api/channels/whatsapp/webhook";
  const waReady = Boolean(process.env.WHATSAPP_ACCESS_TOKEN);
  const tenants = await prisma.tenant.findMany({
    include: { phones: true, modules: true, memberships: { include: { user: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-4xl">Negocios</h1>
        <p className="text-slate-400 mt-2">
          Crea empresas, asígnales teléfonos y enciende módulos. Los datos nunca se mezclan.
        </p>
      </header>

      <div className="card space-y-2 text-sm">
        <h2 className="font-semibold text-base">WhatsApp en vivo</h2>
        <p className="text-slate-400">
          En Meta for Developers → tu app → WhatsApp → Configuración, pega este webhook. Token de
          verificación: <code className="text-gold-400">ejeuno-whatsapp</code>. Suscríbete a{" "}
          <code>messages</code>.
        </p>
        <p className="break-all text-gold-400">{webhook}</p>
        <p className={waReady ? "text-emerald-400" : "text-amber-400"}>
          {waReady
            ? "Token de WhatsApp detectado en Render."
            : "Falta WHATSAPP_ACCESS_TOKEN en Render. Sin eso la IA no responde al chat."}
        </p>
      </div>

      <form action={createTenant} className="card grid md:grid-cols-3 gap-4">
        <h2 className="md:col-span-3 font-semibold">Nuevo negocio</h2>
        <div className="space-y-1">
          <label>Nombre comercial</label>
          <input name="name" required placeholder="Veterinaria Luna" className="w-full" />
        </div>
        <div className="space-y-1">
          <label>Slug</label>
          <input name="slug" required placeholder="vet-luna" className="w-full" />
        </div>
        <div className="space-y-1">
          <label>Vertical</label>
          <select name="vertical" className="w-full">
            {Object.entries(VERTICAL_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label>Número E.164</label>
          <input name="phone" required placeholder="+57300..." className="w-full" />
        </div>
        <div className="space-y-1">
          <label>Correo del dueño</label>
          <input name="ownerEmail" type="email" required placeholder="dueño@negocio.com" className="w-full" />
        </div>
        <div className="space-y-1">
          <label>Nombre del dueño</label>
          <input name="ownerName" placeholder="Ana Pérez" className="w-full" />
        </div>
        <div className="md:col-span-3">
          <button className="rounded-lg bg-gold-500 text-ink-950 font-semibold px-4 py-2">Crear</button>
          <p className="text-xs text-slate-500 mt-2">Clave inicial del dueño: ejeuno123</p>
        </div>
      </form>

      <div className="space-y-6">
        {tenants.map((t) => (
          <article key={t.id} className="card space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold">{t.name}</h3>
                <p className="text-sm text-slate-400">
                  {VERTICAL_LABEL[t.vertical]} · {t.slug} · {t.active ? "activo" : "pausado"}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Dueños: {t.memberships.map((m) => m.user.email).join(", ") || "—"}
                </p>
              </div>
              <form action={setTenantActive}>
                <input type="hidden" name="id" value={t.id} />
                <input type="hidden" name="active" value={String(t.active)} />
                <button className="text-sm border border-ink-700 rounded-lg px-3 py-1.5">
                  {t.active ? "Pausar" : "Activar"}
                </button>
              </form>
            </div>

            <div>
              <p className="text-sm text-white mb-2">Teléfonos de este negocio</p>
              <ul className="space-y-2">
                {t.phones.map((p) => (
                  <li key={p.id} className="rounded-xl bg-ink-950/80 p-3">
                    <p className="text-lg text-gold-400">{p.e164}</p>
                    <p className="text-sm text-slate-400">
                      {p.e164.includes("555")
                        ? "Este es el WhatsApp de prueba de Meta. Úsalo para escribir Hola."
                        : "Número de demostración. No lo uses para las pruebas de Meta."}
                    </p>
                    {p.whatsappPhoneNumberId ? (
                      <p className="text-sm text-emerald-400 mt-1">Conectado a Meta</p>
                    ) : (
                      <p className="text-sm text-slate-500 mt-1">Sin ID de Meta</p>
                    )}
                  </li>
                ))}
              </ul>
              <p className="text-sm text-slate-400 mt-3">
                Para conectar WhatsApp abre el menú <b>1. Conectar WhatsApp</b>.
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Módulos</p>
              <div className="flex flex-wrap gap-2">
                {MODULE_CATALOG.map((cat) => {
                  const row = t.modules.find((m) => m.key === cat.key);
                  const on = row?.enabled ?? false;
                  return (
                    <form action={toggleModule} key={cat.key}>
                      <input type="hidden" name="id" value={row?.id || ""} />
                      <input type="hidden" name="enabled" value={String(on)} />
                      <button
                        disabled={!row}
                        className={`text-xs rounded-full px-3 py-1 border ${
                          on
                            ? "border-gold-600 bg-gold-500/10 text-gold-400"
                            : "border-ink-700 text-slate-500"
                        }`}
                      >
                        {cat.name}
                      </button>
                    </form>
                  );
                })}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
