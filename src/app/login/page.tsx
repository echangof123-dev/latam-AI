export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  return (
    <LoginInner searchParams={searchParams} />
  );
}

async function LoginInner({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const q = await searchParams;
  return (
    <main className="min-h-screen grid lg:grid-cols-2">
      <section className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-ink-900 via-ink-950 to-black border-r border-ink-800">
        <p className="font-display text-3xl text-gold-400">Eje Uno</p>
        <div>
          <h1 className="font-display text-5xl leading-tight max-w-md">
            Una casa. Varios negocios. Atención que no duerme.
          </h1>
          <p className="mt-6 max-w-md text-slate-400">
            El superadministrador crea empresas, asigna números y módulos. Cada
            cliente habla o llama a un número: la IA carga ese negocio y agenda
            sola. El dueño ve resultados, no el chat.
          </p>
        </div>
        <p className="text-sm text-slate-500">Producto ERP · Atención IA en camino</p>
      </section>
      <section className="flex items-center justify-center p-8">
        <form action="/api/auth/login" method="post" className="w-full max-w-sm space-y-4">
          <div>
            <p className="lg:hidden font-display text-2xl text-gold-400 mb-2">Eje Uno</p>
            <h2 className="text-2xl font-semibold">Entrar</h2>
            <p className="text-sm text-slate-400 mt-1">Usa las cuentas de demostración.</p>
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
          <button
            type="submit"
            className="w-full rounded-lg bg-gold-500 text-ink-950 font-semibold py-2.5 hover:bg-gold-400"
          >
            Continuar
          </button>
          <ul className="text-xs text-slate-500 space-y-1 pt-2">
            <li>nathan.k@example.net — panel central</li>
            <li>tina.r@example.net — Barbería Norte</li>
            <li>iris.p@example.org — Clínica Alma</li>
            <li>Clave: ejeuno123</li>
          </ul>
        </form>
      </section>
    </main>
  );
}
