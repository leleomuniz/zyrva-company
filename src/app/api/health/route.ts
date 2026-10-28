import { appMode, integrationAvailability } from "@/lib/server/env";
import { json } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(): Response {
  return json({
    status: "ok",
    service: "zyrva-agents",
    mode: appMode(),
    integrations: integrationAvailability(),
    timestamp: new Date().toISOString(),
  });
}
