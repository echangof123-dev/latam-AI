import { login } from "@/lib/auth";
import { redirectTo } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const email = String(form?.get("email") || "");
  const password = String(form?.get("password") || "");
  const session = await login(email, password);
  if (!session) {
    return redirectTo(req, "/login?e=1");
  }
  const dest = session.role === "SUPERADMIN" ? "/superadmin/whatsapp" : "/app";
  return redirectTo(req, dest);
}
