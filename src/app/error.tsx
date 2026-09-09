"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen grid place-items-center p-8">
      <div className="max-w-md space-y-4 text-center">
        <p className="font-display text-3xl text-gold-400">Eje Uno</p>
        <p className="text-slate-300">Hubo un error al cargar la página.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            className="rounded-lg bg-gold-500 text-ink-950 font-semibold px-4 py-2"
            onClick={() => reset()}
          >
            Reintentar
          </button>
          <form action="/api/auth/logout" method="post">
            <button className="rounded-lg border border-ink-700 px-4 py-2">Salir e ir al login</button>
          </form>
        </div>
        <p className="text-xs text-slate-500">
          Luego entra otra vez a https://ejeuno.onrender.com/login
        </p>
      </div>
    </main>
  );
}
