/** Convierte un teléfono local (ej. 0986899878) a +593... / +57... */
export function toE164(raw: string): string {
  let d = String(raw || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 10 && d.startsWith("0")) d = `593${d.slice(1)}`;
  else if (d.length === 9 && d.startsWith("9")) d = `593${d}`;
  else if (d.length === 10 && d.startsWith("3")) d = `57${d}`;
  return `+${d}`;
}

export function onlyDigits(raw: string) {
  return toE164(raw).replace(/\D/g, "");
}
