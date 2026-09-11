import Link from "next/link";
import { PRODUCT_NAME } from "@/lib/brand";

export function Mark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const box = size === "lg" ? "h-11 w-11 text-base" : size === "sm" ? "h-8 w-8 text-[11px]" : "h-9 w-9 text-xs";
  return (
    <span
      className={`inline-grid place-items-center rounded-2xl bg-gold-500 text-ink-950 font-semibold tracking-tight ${box}`}
      aria-hidden
    >
      E1
    </span>
  );
}

export function BrandLockup({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 no-underline">
      <Mark size={compact ? "sm" : "md"} />
      <span>
        <span className="block font-display text-lg leading-none text-white">{PRODUCT_NAME}</span>
        {compact ? null : <span className="block text-[11px] text-slate-500 mt-1">Operación y recepción</span>}
      </span>
    </Link>
  );
}
