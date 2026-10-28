import { expiredSessionCookie } from "@/lib/server/auth";
import { json } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(): Response {
  return json({ signedOut: true }, { headers: { "set-cookie": expiredSessionCookie() } });
}
