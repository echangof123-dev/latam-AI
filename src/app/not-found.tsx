import { BrandLockup } from "@/components/mark";

export default function NotFound() {
  return (
    <main className="min-h-screen grid place-items-center p-8">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <BrandLockup compact />
        </div>
        <p className="text-slate-400">Esa pantalla no existe o el módulo está apagado para este negocio.</p>
        <a href="/login" className="btn-gold inline-block">
          Ir al panel
        </a>
      </div>
    </main>
  );
}
