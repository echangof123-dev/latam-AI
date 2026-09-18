import Link from "next/link";
import { PRODUCT_NAME } from "@/lib/brand";
import { Sparkle } from "./ai-mark";

export function Mark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const box = size === "lg" ? 36 : size === "sm" ? 28 : 32;
  return (
    <span className="inline-grid place-items-center" aria-hidden>
      <Sparkle size={box} />
    </span>
  );
}

export function BrandLockup({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 no-underline text-[#1f1f1f]">
      <Mark size={compact ? "sm" : "md"} />
      <span>
        <span className="block text-[17px] font-medium leading-none tracking-tight">{PRODUCT_NAME}</span>
        {compact ? null : <span className="block text-[12px] text-[#5f6368] mt-1">Operación y recepción</span>}
      </span>
    </Link>
  );
}
