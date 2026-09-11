"use client";

import { BrandLockup } from "@/components/mark";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen grid place-items-center p-8">
      <div className="max-w-md space-y-4 text-center">
        <div className="flex justify-center">
          <BrandLockup compact />
        </div>
        <p className="text-slate-300">Hubo un error al cargar la página.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" className="btn-gold" onClick={() => reset()}>
            Reintentar
          </button>
          <form action="/api/auth/logout" method="post">
            <button className="btn-ghost">Salir</button>
          </form>
        </div>
      </div>
    </main>
  );
}
