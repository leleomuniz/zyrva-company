import OpenAI from "openai";
import { afterEach, describe, expect, it, vi } from "vitest";

import { demoAgents } from "@/modules/agents/demo-data";
import type { AgentResponse } from "@/modules/engine/schemas";
import { MetaCloudApiAdapter, MetaCloudApiError } from "@/lib/server/meta-cloud-api";
import { enforceRuntimePolicy, OpenAIAdapterError, OpenAIResponsesAdapter } from "@/lib/server/openai-responses";

afterEach(() => vi.restoreAllMocks());

function runtimeResponse(overrides: Partial<AgentResponse> = {}): AgentResponse {
  return {
    reply: "Posso ajudar com base no catalogo autorizado.",
    intent: "information",
    confidence: 0.92,
    leadData: {
      name: null,
      phone: null,
      email: null,
      desiredService: null,
      desiredProduct: null,
      approximateBudget: null,
      preferredDate: null,
      consent: null,
    },
    requestedAction: "none",
    handoffRequired: false,
    handoffReason: null,
    sourceIds: ["source-real"],
    shouldWaitForHuman: false,
    safetyFlags: { promptInjection: false, sensitiveData: false, outOfScope: false },
    ...overrides,
  };
}

describe("adaptadores externos", () => {
  it("usa Responses API estruturada e valida a configuração retornada", async () => {
    const parse = vi.fn().mockResolvedValue({ output_parsed: demoAgents[0].configuration });
    const client = { responses: { parse } } as unknown as OpenAI;
    const adapter = new OpenAIResponsesAdapter({
      apiKey: "test-key-not-real",
      builderModel: "builder-from-env",
      runtimeModel: "runtime-from-env",
      client,
    });

    const result = await adapter.generateAgent({
      description: "Crie um agente de oficina que faça atendimento comercial seguro e encaminhe orçamentos.",
      useAI: true,
    });
    expect(result.generatedBy).toBe("openai");
    expect(parse).toHaveBeenCalledOnce();
    expect(parse.mock.calls[0][0].model).toBe("builder-from-env");
    expect(parse.mock.calls[0][0].text.format.type).toBe("json_schema");
  });

  it("converte falhas da OpenAI em erro sanitizado", async () => {
    const client = { responses: { parse: vi.fn().mockRejectedValue(new Error("contains-secret")) } } as unknown as OpenAI;
    const adapter = new OpenAIResponsesAdapter({
      apiKey: "test-key-not-real",
      builderModel: "builder",
      runtimeModel: "runtime",
      client,
    });
    await expect(
      adapter.generateAgent({ description: "Crie um agente válido para atendimento de uma empresa local.", useAI: true }),
    ).rejects.toBeInstanceOf(OpenAIAdapterError);
  });

  it("bloqueia ação não autorizada e fato comercial sem fonte", () => {
    const configuration = {
      ...demoAgents[0].configuration,
      authorizedTools: ["handoff_to_human"],
      maxMessageLength: 120,
    };
    const response = {
      reply: "O preço é R$ 10.",
      intent: "commercial_price",
      confidence: 0.98,
      leadData: {
        name: null,
        phone: null,
        email: null,
        desiredService: null,
        desiredProduct: null,
        approximateBudget: null,
        preferredDate: null,
        consent: null,
      },
      requestedAction: "request_quote" as const,
      handoffRequired: false,
      handoffReason: null,
      sourceIds: [],
      shouldWaitForHuman: false,
      safetyFlags: { promptInjection: false, sensitiveData: false, outOfScope: false },
    };

    const result = enforceRuntimePolicy(configuration, response, new Set());
    expect(result.requestedAction).toBe("handoff");
    expect(result.handoffRequired).toBe(true);
    expect(result.shouldWaitForHuman).toBe(true);
    expect(result.reply).toBe(configuration.errorMessage.slice(0, 120));
  });

  it("rejeita citacao de fonte inexistente no contexto autorizado", () => {
    const response = {
      reply: "Conforme o catalogo, o servico esta disponivel.",
      intent: "commercial_service",
      confidence: 0.92,
      leadData: {
        name: null,
        phone: null,
        email: null,
        desiredService: null,
        desiredProduct: null,
        approximateBudget: null,
        preferredDate: null,
        consent: null,
      },
      requestedAction: "none" as const,
      handoffRequired: false,
      handoffReason: null,
      sourceIds: ["source-invented"],
      shouldWaitForHuman: false,
      safetyFlags: { promptInjection: false, sensitiveData: false, outOfScope: false },
    };

    expect(() => enforceRuntimePolicy(demoAgents[0].configuration, response, new Set(["source-real"])))
      .toThrow(OpenAIAdapterError);
  });

  it("nao confia no intent do modelo e encaminha resposta sem fonte ou com flag de seguranca", () => {
    const configuration = demoAgents[0].configuration;
    const disguisedFact = enforceRuntimePolicy(
      configuration,
      runtimeResponse({ reply: "O preco garantido e R$ 10.", intent: "greeting", sourceIds: [] }),
      new Set(),
    );
    const sensitive = enforceRuntimePolicy(
      configuration,
      runtimeResponse({ safetyFlags: { promptInjection: false, sensitiveData: true, outOfScope: false } }),
      new Set(["source-real"]),
    );

    expect(disguisedFact.requestedAction).toBe("handoff");
    expect(sensitive.requestedAction).toBe("handoff");
  });

  it("rejeita fonte recuperada fora do tenant antes de chamar a OpenAI", async () => {
    const parse = vi.fn();
    const client = { responses: { parse } } as unknown as OpenAI;
    const adapter = new OpenAIResponsesAdapter({
      apiKey: "test-key-not-real",
      builderModel: "builder",
      runtimeModel: "runtime",
      client,
    });

    await expect(adapter.respond({
      organizationId: "org-a",
      clientCompanyId: "company-a",
      agentId: "agent-a",
      configuration: demoAgents[0].configuration,
      message: "Qual o preco?",
      recentHistory: [],
      sources: [{
        id: "source-other-tenant",
        organizationId: "org-b",
        clientCompanyId: "company-b",
        agentId: "agent-b",
        content: "Conteudo externo.",
      }],
    })).rejects.toBeInstanceOf(OpenAIAdapterError);
    expect(parse).not.toHaveBeenCalled();
  });

  it("envia texto pelo endpoint oficial da Graph API sem expor o token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ messages: [{ id: "wamid.sent" }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const adapter = new MetaCloudApiAdapter({
      accessToken: "meta-access-token-for-test",
      phoneNumberId: "1234567890",
      graphApiVersion: "v99.0",
      fetch: fetchMock,
    });

    await expect(adapter.sendText("5585999999999", "Olá")).resolves.toEqual({ messageId: "wamid.sent" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://graph.facebook.com/v99.0/1234567890/messages");
    expect(JSON.parse(init.body)).toMatchObject({ messaging_product: "whatsapp", type: "text" });
  });

  it("falha fechado quando a Meta rejeita a requisição", async () => {
    const adapter = new MetaCloudApiAdapter({
      accessToken: "meta-access-token-for-test",
      phoneNumberId: "1234567890",
      graphApiVersion: "v99.0",
      fetch: vi.fn().mockResolvedValue(new Response("token leaked by provider", { status: 401 })),
    });
    await expect(adapter.sendText("5585999999999", "Olá")).rejects.toEqual(
      expect.objectContaining<Partial<MetaCloudApiError>>({ message: "A Meta Cloud API não concluiu o envio." }),
    );
  });
});
