import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function Home() {
  const session = await getSession();
  if (session) {
    redirect(session.role === "SUPERADMIN" ? "/superadmin" : "/app");
  }

  return (
    <main className="min-h-screen">
      <header className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <p className="font-display text-2xl text-gold-400">Eje Uno</p>
        <div className="flex gap-3">
          <Link href="/chat" className="btn-gold">
            Hablar con Sofía
          </Link>
          <Link href="/login" className="btn-ghost">
            Entrar
          </Link>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 py-10 grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-center">
        <div>
          <p className="text-gold-400 text-sm font-semibold tracking-wide uppercase">ERP + reservas + recepción IA</p>
          <h1 className="font-display text-5xl leading-tight mt-3">
            Agenda profesional y una recepcionista que atiende sola.
          </h1>
          <p className="mt-5 text-lg text-slate-300 max-w-xl">
            Sofía responde por texto, voz y notas de audio en WhatsApp. El dueño ve el calendario, huecos y avisos — no las charlas.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/chat" className="btn-gold text-lg px-6 py-3">
              Probar ahora
            </Link>
            <Link href="/login" className="btn-ghost text-lg px-6 py-3">
              Abrir el panel
            </Link>
          </div>
          <ul className="mt-8 grid sm:grid-cols-3 gap-3 text-sm text-slate-400">
            <li className="card py-4">Calendario y disponibilidad</li>
            <li className="card py-4">Voz en el chat y WhatsApp</li>
            <li className="card py-4">Reprogramar, cancelar, no-show</li>
          </ul>
        </div>
        <div className="relative">
          <div className="absolute -inset-6 rounded-[2.5rem] bg-gold-500/10 blur-2xl" />
          <img
            src="/sofia.png"
            alt="Sofía, recepcionista de Eje Uno"
            className="relative rounded-[2rem] border border-white/10 w-full max-w-md mx-auto object-cover shadow-2xl"
          />
        </div>
      </section>
    </main>
  );
}
