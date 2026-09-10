"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Brand() {
  return (
    <Link href="/" className="font-display text-xl text-gold-400 tracking-tight">
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
  const path = usePathname();
  const active = href === "/app" ? path === "/app" : path === href || path.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      className={`block rounded-xl px-3 py-2 text-[14px] font-medium transition ${
        active ? "bg-gold-500/15 text-gold-400" : "text-slate-300 hover:bg-white/5 hover:text-white"
      }`}
    >
      {children}
    </Link>
  );
}

export function PageHeader({
  kicker,
  title,
  hint,
}: {
  kicker?: string;
  title: string;
  hint?: string;
}) {
  return (
    <header className="space-y-1">
      {kicker ? <p className="text-[11px] uppercase tracking-[0.22em] text-gold-500/80">{kicker}</p> : null}
      <h1 className="font-display text-4xl leading-tight">{title}</h1>
      {hint ? <p className="text-slate-400 text-sm max-w-2xl">{hint}</p> : null}
    </header>
  );
}
