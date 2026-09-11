import Link from "next/link";
import { BrandLockup } from "@/components/mark";
import { PRODUCT_NAME, PRODUCT_TAGLINE } from "@/lib/brand";

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  return <LoginInner searchParams={searchParams} />;
}

async function LoginInner({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const q = await searchParams;
  return (
    <main className="min-h-screen grid lg:grid-cols-2">
      <section className="hidden lg:flex flex-col justify-between p-12 border-r border-white/10 bg-[#080d16]">
        <BrandLockup />
        <div>
          <p className="text-gold-400 text-xs font-semibold tracking-[0.18em] uppercase">{PRODUCT_TAGLINE}</p>
          <h1 className="font-display text-5xl leading-tight max-w-md mt-4">
            Un panel para operar. Una recepción para atender.
          </h1>
          <p className="mt-6 max-w-md text-slate-300 text-lg leading-relaxed">
            El dueño ve agenda, clientes y dinero. La recepcionista habla con el público. El asistente del
            negocio consulta el CRM en voz de hombre.
          </p>
        </div>
        <Link href="/chat" className="text-gold-400 hover:underline text-sm">
          ← Probar la recepción
        </Link>
      </section>
      <section className="flex items-center justify-center p-8">
        <form action="/api/auth/login" method="post" className="w-full max-w-sm space-y-4 card">
          <div>
            <div className="lg:hidden mb-4">
              <BrandLockup compact />
            </div>
            <h2 className="text-2xl font-semibold">Entrar a {PRODUCT_NAME}</h2>
            <p className="text-sm text-slate-400 mt-1">Usa tu correo de dueño o de configuración.</p>
          </div>
          {q.e ? (
            <p className="text-sm text-red-300 bg-red-950/50 border border-red-900 rounded-lg px-3 py-2">
              Correo o clave incorrectos.
            </p>
          ) : null}
          <div className="space-y-1">
            <label htmlFor="email">Correo</label>
            <input id="email" name="email" type="email" required autoComplete="username" className="w-full" />
          </div>
          <div className="space-y-1">
            <label htmlFor="password">Clave</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full"
            />
          </div>
          <button type="submit" className="btn-gold w-full py-3">
            Continuar
          </button>
          <Link href="/chat" className="block text-center text-sm text-gold-400 lg:hidden">
            Probar recepción
          </Link>
          <ul className="text-xs text-slate-500 space-y-1 pt-2 border-t border-white/10">
            <li>Demostración · clave ejeuno123</li>
            <li>nathan.k@example.net — configuración</li>
            <li>tina.r@example.net — Barbería Norte</li>
            <li>iris.p@example.org — Clínica Alma</li>
          </ul>
        </form>
      </section>
    </main>
  );
}
