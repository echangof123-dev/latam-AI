import { prisma } from "@/lib/db";
import { requireSuperadmin } from "@/lib/guards";
import { Brand, LogoutButton, NavLink } from "@/components/nav";

export default async function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSuperadmin();
  const count = await prisma.tenant.count();
  return (
    <div className="min-h-screen grid lg:grid-cols-[240px_1fr]">
      <aside className="border-r border-ink-800 p-5 space-y-6 bg-ink-900/40">
        <Brand />
        <p className="text-xs text-slate-500">Panel central · {count} negocios</p>
        <nav className="space-y-1">
          <NavLink href="/superadmin/whatsapp">1. Conectar WhatsApp</NavLink>
          <NavLink href="/superadmin/canal">2. Probar IA aquí</NavLink>
          <NavLink href="/superadmin">3. Negocios</NavLink>
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
