import { describe, expect, it } from "vitest";

import { demoAgents } from "@/modules/agents/demo-data";
import { generateDeclarativeAgent } from "@/modules/agents/demo-generator";
import { AgentConfigSchema } from "@/modules/agents/schemas";

describe("configuração declarativa de agentes", () => {
  it("mantém todos os agentes demo dentro do contrato estrito", () => {
    for (const agent of demoAgents) {
      expect(AgentConfigSchema.parse(agent.configuration)).toEqual(agent.configuration);
      expect(agent.organizationId).toBe("org-demo-zyrva");
    }
  });

  it("gera um rascunho automotivo revisável sem código arbitrário", () => {
    const result = generateDeclarativeAgent({
      description:
        "Crie um agente para uma oficina automotiva que explique lavagem, qualifique o veículo e encaminhe o orçamento.",
      businessName: "Oficina Exemplo",
      useAI: false,
    });

    expect(result.generatedBy).toBe("demo");
    expect(result.requiresHumanReview).toBe(true);
    expect(result.configuration.name).toBe("Assistente Oficina Exemplo");
    expect(result.configuration.services.some((service) => service.id === "lavagem-tecnica")).toBe(true);
    expect(result.configuration).not.toHaveProperty("code");
    expect(result.configuration).not.toHaveProperty("script");
  });

  it("gera configuração genérica conservadora quando o segmento não é reconhecido", () => {
    const result = generateDeclarativeAgent({
      description: "Atenda clientes de uma empresa de manutenção predial e registre pedidos de contato.",
      businessType: "manutenção predial",
      useAI: false,
    });

    expect(result.configuration.knowledgeSourceIds).toEqual([]);
    expect(result.configuration.responseRules.join(" ")).toMatch(/Nunca inventar/i);
    expect(result.warnings).toContain("Adicione fontes de conhecimento verificadas antes da publicação.");
  });
});
