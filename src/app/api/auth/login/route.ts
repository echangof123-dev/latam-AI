import { NextResponse } from "next/server";
import { login } from "@/lib/auth";

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const email = String(form?.get("email") || "");
  const password = String(form?.get("password") || "");
  const session = await login(email, password);
  if (!session) {
    return NextResponse.redirect(new URL("/login?e=1", req.url), 303);
  }
  const dest = session.role === "SUPERADMIN" ? "/superadmin" : "/app";
  return NextResponse.redirect(new URL(dest, req.url), 303);
}
