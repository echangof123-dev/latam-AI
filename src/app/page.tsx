import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { BrandLockup } from "@/components/mark";
import { PRODUCT_NAME, PRODUCT_TAGLINE } from "@/lib/brand";

export default async function Home() {
  const session = await getSession();
  if (session) {
    redirect(session.role === "SUPERADMIN" ? "/superadmin" : "/app");
  }

  return (
    <main className="min-h-screen">
      <header className="site-wrap flex items-center justify-between py-5">
        <BrandLockup compact />
        <div className="flex gap-3">
          <Link href="/chat" className="btn-ghost">
            Probar recepción
          </Link>
          <Link href="/login" className="btn-gold">
            Entrar
          </Link>
        </div>
      </header>

      <section className="site-wrap py-12 lg:py-20 grid lg:grid-cols-[1.15fr_0.85fr] gap-12 items-center">
        <div>
          <p className="text-gold-400 text-xs font-semibold tracking-[0.2em] uppercase">{PRODUCT_TAGLINE}</p>
          <h1 className="font-display text-5xl lg:text-[3.4rem] leading-[1.12] mt-4">
            Agenda, clientes y una recepción que atiende sola.
          </h1>
          <p className="mt-5 text-lg text-slate-300 max-w-xl leading-relaxed">
            {PRODUCT_NAME} opera el negocio por dentro y atiende al público por fuera. Cada empresa tiene su
            recepcionista (voz de mujer) y su asistente del dueño (voz de hombre), con los datos reales de ese CRM.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/chat" className="btn-gold text-lg px-6 py-3">
              Hablar con la recepción
            </Link>
            <Link href="/login" className="btn-ghost text-lg px-6 py-3">
              Abrir el panel
            </Link>
          </div>
        </div>
        <div className="grid gap-4">
          <article className="card flex gap-4 items-start">
            <span className="agent-face agent-face-client">S</span>
            <div>
              <p className="text-xs uppercase tracking-wider text-rose-300/80">Clientes · voz de mujer</p>
              <p className="text-xl font-display mt-1">Recepcionista</p>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                Sofía, Laura, Daniela… según el rubro. Agenda, precios y horarios sin mostrar el CRM interno.
              </p>
            </div>
          </article>
          <article className="card flex gap-4 items-start">
            <span className="agent-face agent-face-owner">M</span>
            <div>
              <p className="text-xs uppercase tracking-wider text-sky-300/80">Dueño · voz de hombre</p>
              <p className="text-xl font-display mt-1">Asistente del negocio</p>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                Mateo, Andrés, Martín… te dice citas, ventas, clientes e inventario de tu local.
              </p>
            </div>
          </article>
        </div>
      </section>

      <section className="site-wrap pb-20">
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            ["Agenda real", "Huecos según horario, intervalo y citas ya ocupadas."],
            ["Un CRM por negocio", "Barbería, clínica u otro local: datos separados."],
            ["WhatsApp y voz", "La recepción transcribe notas de audio y responde."],
          ].map(([t, d]) => (
            <div key={t} className="card">
              <p className="font-semibold">{t}</p>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-slate-600 mt-12">
          {PRODUCT_NAME} · producción
        </p>
      </section>
    </main>
  );
}
