import { prisma } from "@/lib/db";
import { requireOwner } from "@/lib/guards";
import { moduleOn } from "@/lib/tenant";
import { MODULE_CATALOG } from "@/lib/modules";
import { Brand, LogoutButton, NavLink } from "@/components/nav";

const HREF: Record<string, string> = {
  agenda: "/app/agenda",
  clientes: "/app/clientes",
  servicios: "/app/servicios",
  personal: "/app/personal",
  sucursales: "/app/sucursales",
  inventario: "/app/inventario",
  facturacion: "/app/facturacion",
  ventas: "/app/ventas",
  reportes: "/app/reportes",
  ia: "/app/ia",
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireOwner();
  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenantId },
    include: { modules: true },
  });
  if (!tenant) return null;
  const unread = await prisma.ownerNotification.count({
    where: { tenantId: tenant.id, read: false },
  });

  return (
    <div className="min-h-screen grid lg:grid-cols-[240px_1fr]">
      <aside className="border-r border-white/10 p-6 space-y-6 bg-ink-900/50">
        <div>
          <Brand />
          <p className="text-sm text-slate-200 mt-3">{tenant.name}</p>
          <p className="text-xs text-slate-500">Panel del dueño</p>
        </div>
        <nav className="space-y-1">
          <NavLink href="/chat">Hablar con Sofía</NavLink>
          <NavLink href="/app">Inicio y avisos {unread ? `(${unread})` : ""}</NavLink>
          {MODULE_CATALOG.filter((m) => moduleOn(tenant.modules, m.key) && HREF[m.key]).map((m) => (
            <NavLink key={m.key} href={HREF[m.key]}>
              {m.name}
            </NavLink>
          ))}
        </nav>
        <div className="pt-6 text-sm text-slate-400">
          <p>{session.name}</p>
          <LogoutButton />
        </div>
      </aside>
      <div className="p-8">{children}</div>
    </div>
  );
}
