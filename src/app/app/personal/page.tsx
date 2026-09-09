import { prisma } from "@/lib/db";
import { requireOwner } from "@/lib/guards";
import { createStaff } from "../actions";

export default async function PersonalPage() {
  const { tenantId } = await requireOwner();
  const rows = await prisma.staffMember.findMany({ where: { tenantId } });
  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl">Personal</h1>
      <form action={createStaff} className="card grid md:grid-cols-3 gap-3">
        <input name="name" placeholder="Nombre" required />
        <input name="roleTitle" placeholder="Rol" />
        <button className="rounded-lg bg-gold-500 text-ink-950 font-semibold">Añadir</button>
      </form>
      <ul className="card divide-y divide-ink-800">
        {rows.map((s) => (
          <li key={s.id} className="py-3">
            {s.name} <span className="text-slate-500">· {s.roleTitle}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
