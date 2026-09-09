import Link from "next/link";

export function Brand() {
  return (
    <Link href="/" className="font-display text-xl text-gold-400">
      Eje Uno
    </Link>
  );
}

export function LogoutButton() {
  return (
    <form action="/api/auth/logout" method="post">
      <button className="text-sm text-slate-400 hover:text-white">Salir</button>
    </form>
  );
}

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="block rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-ink-800 hover:text-white"
    >
      {children}
    </Link>
  );
}
