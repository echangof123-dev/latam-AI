export default function NotFound() {
  return (
    <main className="min-h-screen grid place-items-center p-8">
      <div className="text-center">
        <p className="font-display text-3xl text-gold-400">Eje Uno</p>
        <p className="mt-4 text-slate-400">Esa pantalla no existe o el módulo está apagado para este negocio.</p>
        <a href="/chat" className="btn-gold inline-block mt-6">
          Ir al chat
        </a>
      </div>
    </main>
  );
}
