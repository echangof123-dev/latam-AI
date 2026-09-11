import Link from "next/link";

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
      <section className="hidden lg:flex flex-col justify-between p-12 border-r border-white/10">
        <p className="font-display text-3xl text-gold-400">Eje Uno</p>
        <div>
          <h1 className="font-display text-5xl leading-tight max-w-md">Reservas, calendario y Sofía en un solo panel.</h1>
          <p className="mt-6 max-w-md text-slate-300 text-lg">
            El dueño gestiona la agenda. Sofía atiende con IA generativa por chat y WhatsApp.
          </p>
        </div>
        <Link href="/chat" className="text-gold-400 hover:underline">
          ← Hablar con Sofía
        </Link>
      </section>
      <section className="flex items-center justify-center p-8">
        <form action="/api/auth/login" method="post" className="w-full max-w-sm space-y-4 card">
          <div>
            <p className="lg:hidden font-display text-2xl text-gold-400 mb-2">Eje Uno</p>
            <h2 className="text-2xl font-semibold">Entrar</h2>
            <p className="text-sm text-slate-400 mt-1">Cuentas de demostración listas.</p>
          </div>
          {q.e ? (
            <p className="text-sm text-red-300 bg-red-950/50 border border-red-900 rounded-lg px-3 py-2">
              Correo o clave incorrectos.
            </p>
          ) : null}
          <div className="space-y-1">
            <label htmlFor="email">Correo</label>
            <input id="email" name="email" type="email" required defaultValue="nathan.k@example.net" className="w-full" />
          </div>
          <div className="space-y-1">
            <label htmlFor="password">Clave</label>
            <input id="password" name="password" type="password" required defaultValue="ejeuno123" className="w-full" />
          </div>
          <button type="submit" className="btn-gold w-full py-3">
            Continuar
          </button>
          <Link href="/chat" className="block text-center text-sm text-gold-400 lg:hidden">
            Probar chat con avatar
          </Link>
          <ul className="text-xs text-slate-500 space-y-1 pt-2">
            <li>nathan.k@example.net — configuración</li>
            <li>tina.r@example.net — Barbería Norte</li>
            <li>iris.p@example.org — Clínica Alma</li>
            <li>Clave: ejeuno123</li>
          </ul>
        </form>
      </section>
    </main>
  );
}
