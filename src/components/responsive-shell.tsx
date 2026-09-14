"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function ResponsiveShell({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const path = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [path]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[260px_1fr]">
      <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10 bg-[#080d16]/95 backdrop-blur-md">
        <p className="font-display text-lg text-white">Eje Uno</p>
        <div className="flex gap-2">
          <Link href="/chat" className="btn-gold py-2 px-3 text-sm">
            Hablar
          </Link>
          <button type="button" className="btn-ghost py-2 px-3 text-sm" onClick={() => setOpen(true)}>
            Menú
          </button>
        </div>
      </header>

      {open ? (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="lg:hidden fixed inset-0 z-40 bg-black/60"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <aside
        className={`app-aside ${
          open
            ? "fixed inset-y-0 left-0 z-50 w-[min(86vw,280px)] overflow-y-auto shadow-2xl flex flex-col"
            : "hidden"
        } lg:flex lg:flex-col lg:sticky lg:top-0 lg:h-dvh lg:overflow-y-auto`}
      >
        <div className="lg:hidden flex justify-end">
          <button type="button" className="text-sm text-slate-400" onClick={() => setOpen(false)}>
            Cerrar
          </button>
        </div>
        {sidebar}
      </aside>
      <div className="app-main">{children}</div>
    </div>
  );
}
