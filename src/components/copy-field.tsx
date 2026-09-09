"use client";

export function CopyField({ value }: { value: string }) {
  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <input readOnly value={value} className="flex-1 text-base py-3 break-all" />
      <button
        type="button"
        className="btn-gold whitespace-nowrap"
        onClick={() => navigator.clipboard.writeText(value)}
      >
        Copiar
      </button>
    </div>
  );
}
