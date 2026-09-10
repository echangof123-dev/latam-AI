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
    <div className="app-shell">
      <aside className="app-aside">
        <div>
          <Brand />
          <p className="text-sm text-slate-200 mt-3">{tenant.name}</p>
          <p className="text-xs text-slate-500">Reservas · recepción IA</p>
        </div>
        <nav className="space-y-0.5">
          <NavLink href="/chat">Hablar con Sofía</NavLink>
          <NavLink href="/app">Inicio {unread ? `(${unread})` : ""}</NavLink>
          {MODULE_CATALOG.filter((m) => moduleOn(tenant.modules, m.key) && HREF[m.key]).map((m) => (
            <NavLink key={m.key} href={HREF[m.key]}>
              {m.name}
            </NavLink>
          ))}
        </nav>
        <div className="pt-4 text-sm text-slate-400 border-t border-white/10">
          <p>{session.name}</p>
          <LogoutButton />
        </div>
      </aside>
      <div className="app-main">{children}</div>
    </div>
  );
}
