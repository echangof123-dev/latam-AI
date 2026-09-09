import { clearSessionCookie } from "@/lib/auth";
import { redirectTo } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  await clearSessionCookie();
  return redirectTo(req, "/login");
}
