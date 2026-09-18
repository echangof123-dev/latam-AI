import Link from "next/link";
import { BrandLockup } from "@/components/mark";
import { PRODUCT_NAME } from "@/lib/brand";

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
    <main className="min-h-dvh flex items-center justify-center p-4">
      <form action="/api/auth/login" method="post" className="w-full max-w-[400px] card space-y-5">
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <BrandLockup compact href="/" />
          </div>
          <h1 className="text-2xl font-normal tracking-tight">Entrar a {PRODUCT_NAME}</h1>
          <p className="text-sm text-[#5f6368]">Usa el correo del dueño o de configuración.</p>
        </div>
        {q.e ? (
          <p className="text-sm text-[#c5221f] bg-[#fce8e6] rounded-xl px-3 py-2">Correo o clave incorrectos.</p>
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
        <Link href="/chat" className="block text-center text-sm text-[#0b57d0] font-medium">
          Probar la recepción
        </Link>
        {process.env.SHOW_DEMO_LOGIN === "true" ? (
          <ul className="text-xs text-[#80868b] space-y-1 pt-2 border-t border-[#e8eaed]">
            <li>Demostración · clave ejeuno123</li>
            <li>nathan.k@example.net — configuración</li>
            <li>tina.r@example.net — Barbería Norte</li>
            <li>iris.p@example.org — Clínica Alma</li>
          </ul>
        ) : null}
      </form>
    </main>
  );
}
