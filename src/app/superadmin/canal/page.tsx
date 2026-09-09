import { handleInbound } from "@/lib/ai/engine";
import { prisma } from "@/lib/db";
import { requireSuperadmin } from "@/lib/guards";

export default async function CanalPage({
  searchParams,
}: {
  searchParams: Promise<{ reply?: string; tenant?: string }>;
}) {
  await requireSuperadmin();
  const q = await searchParams;
  const phones = await prisma.phoneNumber.findMany({
    include: { tenant: true },
    orderBy: { e164: "asc" },
  });

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <h1 className="font-display text-4xl">Probar canal</h1>
        <p className="text-slate-400 mt-2">
          Simula WhatsApp, audio transcrito o una llamada. El sistema identifica el negocio por el
          número destino. El dueño no ve este chat, solo reservas y avisos.
        </p>
      </header>
      <form action={probe} className="card space-y-3">
        <div className="space-y-1">
          <label>Número del negocio (destino)</label>
          <select name="to" className="w-full" required>
            {phones.map((p) => (
              <option key={p.id} value={p.e164}>
                {p.e164} — {p.tenant.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label>Teléfono del cliente</label>
          <input name="from" defaultValue="+573109998877" required className="w-full" />
        </div>
        <div className="space-y-1">
          <label>Canal</label>
          <select name="channel" className="w-full">
            <option value="WHATSAPP">WhatsApp / texto</option>
            <option value="VOICE_CALL">Llamada / audio</option>
            <option value="WEB">Web</option>
          </select>
        </div>
        <div className="space-y-1">
          <label>Mensaje del cliente</label>
          <textarea
            name="text"
            rows={4}
            className="w-full"
            defaultValue="Hola, quiero agendar un corte. Me llamo Carlos Ruiz"
          />
        </div>
        <button className="rounded-lg bg-gold-500 text-ink-950 font-semibold px-4 py-2">Enviar a la IA</button>
      </form>
      {q.reply ? (
        <div className="card">
          <p className="text-xs uppercase text-slate-500">Respuesta · {q.tenant || "—"}</p>
          <p className="mt-2 whitespace-pre-wrap">{q.reply}</p>
        </div>
      ) : null}
    </div>
  );
}

async function probe(formData: FormData) {
  "use server";
  const { redirect } = await import("next/navigation");
  const result = await handleInbound({
    to: String(formData.get("to")),
    from: String(formData.get("from")),
    text: String(formData.get("text")),
    channel: (String(formData.get("channel")) || "WHATSAPP") as never,
  });
  redirect(
    `/superadmin/canal?reply=${encodeURIComponent(result.reply)}&tenant=${encodeURIComponent(result.tenantName || "")}`,
  );
}
