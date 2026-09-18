"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLockup } from "./mark";

export function Brand() {
  return <BrandLockup href="/" compact />;
}

export function LogoutButton() {
  return (
    <form action="/api/auth/logout" method="post">
      <button className="text-sm text-[#5f6368] hover:text-[#1f1f1f]">Salir</button>
    </form>
  );
}

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const path = usePathname();
  const active = href === "/app" ? path === "/app" : path === href || path.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      className={`block rounded-xl px-3 py-2 text-[13.5px] font-medium transition ${
        active ? "bg-[#e8f0fe] text-[#0b57d0]" : "text-[#3c4043] hover:bg-[#f1f3f4]"
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
    <header className="space-y-1.5">
      {kicker ? <p className="text-[12px] font-medium text-[#0b57d0]">{kicker}</p> : null}
      <h1 className="text-3xl sm:text-4xl font-normal tracking-tight leading-tight">{title}</h1>
      {hint ? <p className="text-[#5f6368] text-sm max-w-2xl leading-relaxed">{hint}</p> : null}
    </header>
  );
}
