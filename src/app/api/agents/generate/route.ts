import { requireSession } from "@/lib/server/auth";
import { appMode } from "@/lib/server/env";
import { errorResponse, json, parseJson } from "@/lib/server/http";
import { createOpenAIResponsesAdapter } from "@/lib/server/openai-responses";
import { consumeRateLimit, requestIp } from "@/lib/server/rate-limit";
import { generateDeclarativeAgent } from "@/modules/agents/demo-generator";
import { AgentGenerationRequestSchema } from "@/modules/agents/schemas";
import { AuthorizationError, requirePermission } from "@/modules/auth/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  try {
    const session = await requireSession(request);
    requirePermission(session.role, "agent:write");
    const rate = consumeRateLimit(`agents:generate:${session.organizationId}:${requestIp(request)}`, {
      limit: 12,
      windowMs: 60_000,
    });
    if (!rate.allowed) {
      return json(
        { error: "RATE_LIMITED", message: "Limite de gerações atingido." },
        { status: 429, headers: { "retry-after": String(rate.retryAfterSeconds) } },
      );
    }

    const input = await parseJson(request, AgentGenerationRequestSchema);
    if (
      session.clientCompanyId &&
      input.companyId &&
      input.companyId !== session.clientCompanyId
    ) {
      throw new AuthorizationError("A empresa informada esta fora do escopo da sessao.");
    }

    // Production must never silently substitute the deterministic demo generator.
    const openai = appMode() === "production" || input.useAI
      ? createOpenAIResponsesAdapter()
      : null;
    const result = openai ? await openai.generateAgent(input) : generateDeclarativeAgent(input);
    const configuration = result.configuration;
    const draft = {
      name: configuration.name,
      role: configuration.persona,
      description: configuration.description,
      config: {
        objective: configuration.objective,
        persona: configuration.persona,
        tone: configuration.tone.join(", "),
        language: "Português do Brasil",
        greeting: configuration.greeting,
        services: configuration.services.map((service) => service.name),
        allowedTopics: configuration.allowedTopics,
        forbiddenTopics: configuration.forbiddenTopics,
        qualificationQuestions: configuration.qualificationQuestions.map((question) => question.question),
        requiredInformation: configuration.requiredInformation,
        businessHours: "Consulte os horários estruturados do rascunho antes de publicar.",
        responseRules: configuration.responseRules,
        maxMessageLength: configuration.maxMessageLength,
        knowledgeSourceIds: configuration.knowledgeSourceIds,
        allowedTools: configuration.authorizedTools,
        handoffRules: configuration.handoffRules.map((rule) => rule.message),
        confidenceThreshold: configuration.minimumConfidence,
        privacyMessage: configuration.privacyMessage,
        errorMessage: configuration.errorMessage,
        outOfHoursMessage: configuration.outsideHoursMessage,
      },
    };
    return json({ draft, data: result }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
