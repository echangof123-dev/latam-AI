import { prisma } from "@/lib/db";
import { requireSuperadmin } from "@/lib/guards";
import { MODULE_CATALOG, VERTICAL_LABEL } from "@/lib/modules";
import { addPhone, createTenant, setTenantActive, toggleModule } from "./actions";

export default async function SuperadminPage() {
  await requireSuperadmin();
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
              <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Números</p>
              <ul className="text-sm space-y-1">
                {t.phones.map((p) => (
                  <li key={p.id}>
                    <span className="text-gold-400">{p.e164}</span> — {p.label}
                  </li>
                ))}
              </ul>
              <form action={addPhone} className="mt-3 flex flex-wrap gap-2">
                <input type="hidden" name="tenantId" value={t.id} />
                <input name="e164" placeholder="+57..." required />
                <input name="label" placeholder="WhatsApp 2" />
                <button className="text-sm bg-ink-800 rounded-lg px-3">Añadir número</button>
              </form>
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
