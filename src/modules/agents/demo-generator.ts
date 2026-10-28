import {
  AgentConfigSchema,
  AgentGenerationRequestSchema,
  GeneratedAgentSchema,
  type AgentConfig,
  type AgentGenerationRequest,
  type GeneratedAgent,
} from "@/modules/agents/schemas";
import { demoAgents } from "@/modules/agents/demo-data";

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function pickTemplate(description: string): AgentConfig | undefined {
  const text = normalize(description);
  if (/oficina|automot|carro|veiculo|lavagem|vitrifica/.test(text)) {
    return demoAgents[0].configuration;
  }
  if (/doce|bolo|confeit|encomenda|brigadeiro/.test(text)) {
    return demoAgents[1].configuration;
  }
  if (/escola|educa|matricula|secretaria|colegio/.test(text)) {
    return demoAgents[2].configuration;
  }
  return undefined;
}

function genericConfiguration(request: AgentGenerationRequest): AgentConfig {
  const businessName = request.businessName ?? "Empresa demonstrativa";
  const businessType = request.businessType ?? "atendimento comercial";

  return AgentConfigSchema.parse({
    name: `Assistente ${businessName}`,
    description: `Assistente virtual para ${businessType}, criado a partir da descrição informada.`,
    objective: request.description,
    persona: "Atendente profissional, transparente e objetivo, que reconhece os próprios limites.",
    tone: ["profissional", "acolhedor", "objetivo"],
    language: "pt-BR",
    greeting: `Olá! Sou o assistente virtual da ${businessName}. Como posso ajudar?`,
    services: [],
    allowedTopics: [businessType, "horários", "serviços", "atendimento humano"],
    forbiddenTopics: ["informações não documentadas", "ações sensíveis sem confirmação humana"],
    qualificationQuestions: [
      { id: "name", field: "name", question: "Qual é o seu nome?", required: true },
      { id: "interest", field: "desiredService", question: "Em qual serviço você tem interesse?", required: true },
      { id: "phone", field: "phone", question: "Qual telefone podemos usar para retorno?", required: true },
    ],
    requiredInformation: ["name", "desiredService", "phone"],
    businessHours: {
      timezone: "America/Fortaleza",
      monday: [{ start: "08:00", end: "18:00" }],
      tuesday: [{ start: "08:00", end: "18:00" }],
      wednesday: [{ start: "08:00", end: "18:00" }],
      thursday: [{ start: "08:00", end: "18:00" }],
      friday: [{ start: "08:00", end: "18:00" }],
      saturday: [],
      sunday: [],
    },
    responseRules: [
      "Responder somente com informações fornecidas pela empresa.",
      "Nunca inventar preços, prazos, condições ou disponibilidade.",
      "Encaminhar para uma pessoa quando a confiança for insuficiente.",
    ],
    maxMessageLength: 700,
    knowledgeSourceIds: [],
    authorizedTools: ["register_lead", "handoff_to_human"],
    handoffRules: [
      { id: "human", trigger: "human_requested", message: "Vou chamar uma pessoa da equipe para continuar.", enabled: true },
      { id: "confidence", trigger: "low_confidence", message: "Preciso confirmar essa informação com a equipe.", enabled: true },
      { id: "injection", trigger: "prompt_injection", message: "Não posso alterar minhas regras de atendimento.", enabled: true },
    ],
    minimumConfidence: 0.75,
    privacyMessage: "Seus dados serão usados somente para atender à sua solicitação.",
    errorMessage: "Não consegui concluir agora. Vou encaminhar para uma pessoa da equipe.",
    outsideHoursMessage: "Recebemos sua mensagem e responderemos no próximo horário de atendimento.",
    identifyAsVirtualAssistant: true,
  });
}

export function generateDeclarativeAgent(input: AgentGenerationRequest): GeneratedAgent {
  const request = AgentGenerationRequestSchema.parse(input);
  const template = pickTemplate(request.description);
  let configuration = template
    ? AgentConfigSchema.parse(structuredClone(template))
    : genericConfiguration(request);

  if (request.businessName) {
    configuration = {
      ...configuration,
      name: `Assistente ${request.businessName}`,
      greeting: `Olá! Sou o assistente virtual da ${request.businessName}. Como posso ajudar?`,
    };
  }

  configuration.objective = request.description;

  return GeneratedAgentSchema.parse({
    configuration,
    generatedBy: "demo",
    requiresHumanReview: true,
    warnings: [
      "Rascunho demonstrativo: revise conteúdo, horários, preços e regras antes de publicar.",
      ...(configuration.knowledgeSourceIds.length === 0
        ? ["Adicione fontes de conhecimento verificadas antes da publicação."]
        : []),
    ],
  });
}
