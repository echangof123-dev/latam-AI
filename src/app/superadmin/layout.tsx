import { prisma } from "@/lib/db";
import { requireSuperadmin } from "@/lib/guards";
import { Brand, LogoutButton, NavLink } from "@/components/nav";

export default async function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSuperadmin();
  const count = await prisma.tenant.count();
  return (
    <div className="min-h-screen grid lg:grid-cols-[260px_1fr]">
      <aside className="border-r border-white/10 p-6 space-y-6 bg-ink-900/50">
        <div>
          <Brand />
          <p className="text-sm text-slate-400 mt-2">Configuración</p>
          <p className="text-xs text-slate-500">{count} negocios</p>
        </div>
        <nav className="space-y-1">
          <NavLink href="/chat">Hablar con Sofía</NavLink>
          <NavLink href="/superadmin/whatsapp">WhatsApp</NavLink>
          <NavLink href="/superadmin/prueba">Prueba de escritorio</NavLink>
          <NavLink href="/superadmin">Negocios</NavLink>
          <NavLink href="/superadmin/canal">Probar IA</NavLink>
          <NavLink href="/superadmin/whatsapp">WhatsApp</NavLink>
        </nav>
        <div className="pt-8 text-sm text-slate-400">
          <p>{session.name}</p>
          <LogoutButton />
        </div>
      </aside>
      <div className="p-8">{children}</div>
    </div>
  );
}
