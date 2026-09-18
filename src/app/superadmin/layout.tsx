import { prisma } from "@/lib/db";
import { requireSuperadmin } from "@/lib/guards";
import { Brand, LogoutButton, NavLink } from "@/components/nav";
import { ResponsiveShell } from "@/components/responsive-shell";

export default async function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSuperadmin();
  const count = await prisma.tenant.count();
  return (
    <ResponsiveShell
      sidebar={
        <>
          <div>
            <Brand />
            <p className="text-sm text-[#5f6368] mt-2">Configuración</p>
            <p className="text-xs text-slate-500">{count} negocios</p>
          </div>
          <nav className="space-y-0.5">
            <NavLink href="/chat">Recepción</NavLink>
            <NavLink href="/superadmin/whatsapp">WhatsApp</NavLink>
            <NavLink href="/superadmin/prueba">Prueba de escritorio</NavLink>
            <NavLink href="/superadmin">Negocios</NavLink>
            <NavLink href="/superadmin/canal">Probar recepción</NavLink>
          </nav>
          <div className="pt-4 text-sm text-[#5f6368] border-t border-[#e8eaed] mt-auto">
            <p>{session.name}</p>
            <LogoutButton />
          </div>
        </>
      }
    >
      {children}
    </ResponsiveShell>
  );
}
