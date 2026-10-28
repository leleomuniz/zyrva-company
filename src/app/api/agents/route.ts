import { requireSession } from "@/lib/server/auth";
import { appMode, ConfigurationError } from "@/lib/server/env";
import { errorResponse, json } from "@/lib/server/http";
import { consumeRateLimit, requestIp } from "@/lib/server/rate-limit";
import { listDemoAgents } from "@/modules/agents/demo-data";
import { requirePermission } from "@/modules/auth/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  try {
    const rate = consumeRateLimit(`agents:list:${requestIp(request)}`, { limit: 120, windowMs: 60_000 });
    if (!rate.allowed) {
      return json({ error: "RATE_LIMITED", message: "Limite de consultas atingido." }, { status: 429 });
    }

    const session = await requireSession(request);
    requirePermission(session.role, "agent:read");
    if (appMode() === "production") {
      throw new ConfigurationError("PERSISTED_AGENT_REPOSITORY");
    }
    const agents = listDemoAgents().filter(
      (agent) =>
        agent.organizationId === session.organizationId &&
        (!session.clientCompanyId || agent.clientCompanyId === session.clientCompanyId),
    );
    return json({ data: agents, meta: { mode: "demo", total: agents.length } });
  } catch (error) {
    return errorResponse(error);
  }
}
