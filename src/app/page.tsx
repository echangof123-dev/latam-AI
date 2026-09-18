import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { BrandLockup } from "@/components/mark";
import { PRODUCT_NAME, PRODUCT_TAGLINE } from "@/lib/brand";
import { Sparkle } from "@/components/ai-mark";

export default async function Home() {
  const session = await getSession();
  if (session) {
    redirect(session.role === "SUPERADMIN" ? "/superadmin" : "/app");
  }

  return (
    <main className="min-h-dvh">
      <header className="site-wrap flex items-center justify-between py-5">
        <BrandLockup compact />
        <div className="flex gap-2">
          <Link href="/login" className="btn-ghost text-sm py-2">
            Entrar
          </Link>
          <Link href="/chat" className="btn-gold text-sm py-2">
            Probar la IA
          </Link>
        </div>
      </header>

      <section className="site-wrap py-16 sm:py-24 text-center max-w-3xl mx-auto">
        <div className="flex justify-center mb-6">
          <Sparkle size={56} />
        </div>
        <p className="text-sm text-[#5f6368]">{PRODUCT_TAGLINE}</p>
        <h1 className="mt-4 text-4xl sm:text-6xl font-normal tracking-tight leading-[1.1]">
          Una IA que atiende tu negocio
        </h1>
        <p className="mt-5 text-lg text-[#5f6368] max-w-xl mx-auto leading-relaxed">
          {PRODUCT_NAME} agenda, responde y consulta el CRM. La recepcionista habla con tus clientes; el
          asistente, contigo.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/chat" className="btn-gold text-base px-8 py-3">
            Hablar ahora
          </Link>
          <Link href="/login" className="btn-ghost text-base px-8 py-3">
            Abrir el panel
          </Link>
        </div>
      </section>

      <section className="site-wrap pb-20 grid sm:grid-cols-3 gap-4">
        {[
          ["Agenda real", "Huecos según horario, intervalo y citas ya ocupadas."],
          ["Un CRM por negocio", "Barbería, clínica u otro local: datos separados."],
          ["WhatsApp y voz", "Transcribe notas de audio y responde con voz natural."],
        ].map(([t, d]) => (
          <div key={t} className="card text-left">
            <p className="font-medium text-lg">{t}</p>
            <p className="text-sm text-[#5f6368] mt-2 leading-relaxed">{d}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
