import { requireSuperadmin } from "@/lib/guards";
import { DesktopWhatsappTest } from "@/components/desktop-whatsapp-test";
import { whatsappTrace } from "@/lib/whatsapp-trace";

export default async function PruebaPage() {
  await requireSuperadmin();
  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <h1 className="font-display text-4xl">Prueba de escritorio</h1>
        <p className="text-slate-300 mt-2 text-lg">
          Escribes el mensaje aquí. El sistema recorre el mismo camino que WhatsApp y te dice dónde falla.
        </p>
      </header>
      <div className="card text-slate-300">
        <p>
          Avisos de Meta (cuando TÚ escribes en el celular):{" "}
          <b className="text-white">{whatsappTrace.lastHint}</b>
        </p>
      </div>
      <DesktopWhatsappTest />
    </div>
  );
}
