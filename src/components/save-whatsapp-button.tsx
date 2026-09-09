"use client";

import { useFormStatus } from "react-dom";

export function SaveWhatsappButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-gold w-full text-xl py-4" disabled={pending}>
      {pending ? "Guardando…" : "Guardar WhatsApp"}
    </button>
  );
}
