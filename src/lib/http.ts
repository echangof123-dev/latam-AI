import { NextResponse } from "next/server";

export function publicOrigin(req: Request) {
  const forwardedHost = req.headers.get("x-forwarded-host");
  const host = forwardedHost || req.headers.get("host") || "";
  const proto = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const invalid = !host || host.startsWith("0.0.0.0") || host.startsWith("[::]");
  if (!invalid) return `${proto}://${host.split(",")[0].trim()}`;
  const ext = process.env.RENDER_EXTERNAL_URL || process.env.APP_URL || "";
  if (ext && !ext.includes("0.0.0.0")) return ext.replace(/\/$/, "");
  return "http://localhost:3000";
}

export function redirectTo(req: Request, path: string) {
  return NextResponse.redirect(new URL(path, `${publicOrigin(req)}/`), 303);
}
