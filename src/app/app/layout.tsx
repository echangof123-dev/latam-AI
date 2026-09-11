import { prisma } from "@/lib/db";
import { requireOwner } from "@/lib/guards";
import { moduleOn } from "@/lib/tenant";
import { MODULE_CATALOG } from "@/lib/modules";
import { Brand, LogoutButton, NavLink } from "@/components/nav";
import { agentsFor } from "@/lib/brand";

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
  const agents = agentsFor(tenant.vertical, tenant.name);

  return (
    <div className="app-shell">
      <aside className="app-aside">
        <div>
          <Brand />
          <p className="text-sm text-slate-200 mt-4 font-medium">{tenant.name}</p>
          <p className="text-xs text-slate-500 mt-1">
            {agents.client.name} · {agents.owner.name}
          </p>
        </div>
        <nav className="space-y-0.5">
          <p className="nav-label">Atención</p>
          <NavLink href="/chat">Recepción · {agents.client.name}</NavLink>
          <NavLink href="/app/asistente">{agents.owner.name}</NavLink>
          <p className="nav-label">Operación</p>
          <NavLink href="/app">Inicio {unread ? `(${unread})` : ""}</NavLink>
          <NavLink href="/app/parametros">Parametrización</NavLink>
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
