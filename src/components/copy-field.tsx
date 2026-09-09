"use client";

export function CopyField({ value }: { value: string }) {
  return (
    <div className="flex gap-2">
      <input readOnly value={value} className="flex-1 text-sm" />
      <button
        type="button"
        className="rounded-lg bg-ink-800 px-3 text-sm whitespace-nowrap"
        onClick={() => navigator.clipboard.writeText(value)}
      >
        Copiar
      </button>
    </div>
  );
}
