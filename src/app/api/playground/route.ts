import { requireSession } from "@/lib/server/auth";
import { appMode, ConfigurationError } from "@/lib/server/env";
import { errorResponse, json, parseJson } from "@/lib/server/http";
import { consumeRateLimit, requestIp } from "@/lib/server/rate-limit";
import { getDemoAgent } from "@/modules/agents/demo-data";
import { AuthorizationError, requirePermission } from "@/modules/auth/rbac";
import { runDemoEngine } from "@/modules/engine/demo-engine";
import { PlaygroundInputSchema } from "@/modules/engine/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  try {
    const session = await requireSession(request);
    requirePermission(session.role, "agent:read");
    const rate = consumeRateLimit(`playground:${session.organizationId}:${requestIp(request)}`, {
      limit: 60,
      windowMs: 60_000,
    });
    if (!rate.allowed) {
      return json(
        { error: "RATE_LIMITED", message: "Limite do playground atingido." },
        { status: 429, headers: { "retry-after": String(rate.retryAfterSeconds) } },
      );
    }

    const input = await parseJson(request, PlaygroundInputSchema);
    if (appMode() === "production") {
      // The persisted RAG runtime is intentionally fail-closed until its worker is enabled.
      throw new ConfigurationError("OPENAI_RUNTIME_ENGINE");
    }

    const agent = getDemoAgent(input.agentId);
    if (
      !agent ||
      agent.organizationId !== session.organizationId ||
      (session.clientCompanyId && agent.clientCompanyId !== session.clientCompanyId)
    ) {
      throw new AuthorizationError("Recurso não encontrado.");
    }
    const response = runDemoEngine(input);
    return json({ data: response, meta: { mode: "demo", agentId: input.agentId } });
  } catch (error) {
    return errorResponse(error);
  }
}
