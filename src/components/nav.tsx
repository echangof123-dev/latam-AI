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
      className="block rounded-xl px-3 py-2.5 text-[15px] font-medium text-slate-200 hover:bg-white/5 hover:text-white"
    >
      {children}
    </Link>
  );
}
