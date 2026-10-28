import type { DemoAgent, DemoKnowledgeEntry } from "@/modules/agents/demo-data";
import { getDemoAgent } from "@/modules/agents/demo-data";
import {
  AgentResponseSchema,
  PlaygroundInputSchema,
  type AgentResponse,
  type LeadData,
  type PlaygroundInput,
} from "@/modules/engine/schemas";

const STOP_WORDS = new Set([
  "a",
  "ao",
  "as",
  "com",
  "da",
  "das",
  "de",
  "do",
  "dos",
  "e",
  "em",
  "eu",
  "me",
  "o",
  "os",
  "para",
  "por",
  "que",
  "um",
  "uma",
]);

const PROMPT_INJECTION_PATTERNS = [
  /ignore (todas |as )?(instrucoes|regras)/i,
  /esqueca (todas |as )?(instrucoes|regras)/i,
  /(mostre|revele|repita).*(prompt|mensagem de sistema|instrucoes internas)/i,
  /(system|developer)\s*(prompt|message)/i,
  /jailbreak/i,
  /finja que (nao|voce nao) (tem|possui) regras/i,
];

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function tokens(value: string): Set<string> {
  return new Set(
    normalize(value)
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 2 && !STOP_WORDS.has(token)),
  );
}

function detectPromptInjection(message: string): boolean {
  const normalized = normalize(message);
  return PROMPT_INJECTION_PATTERNS.some((pattern) => pattern.test(normalized));
}

function retrieve(message: string, knowledge: readonly DemoKnowledgeEntry[]): DemoKnowledgeEntry[] {
  const queryTokens = tokens(message);

  return knowledge
    .map((entry) => {
      const keywordTokens = tokens(entry.keywords.join(" "));
      const contentTokens = tokens(`${entry.title} ${entry.content}`);
      let score = 0;
      for (const token of queryTokens) {
        if (keywordTokens.has(token)) score += 3;
        if (contentTokens.has(token)) score += 1;
      }
      return { entry, score };
    })
    .filter(({ score }) => score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map(({ entry }) => entry);
}

function emptyLeadData(): LeadData {
  return {
    name: null,
    phone: null,
    email: null,
    desiredService: null,
    desiredProduct: null,
    approximateBudget: null,
    preferredDate: null,
    consent: null,
  };
}

function extractLeadData(message: string, agent: DemoAgent): LeadData {
  const data = emptyLeadData();
  const email = message.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/)?.[0];
  const phone = message.match(/(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?9?\d{4}[-\s]?\d{4}/)?.[0];
  const name = message.match(
    /(?:meu nome (?:e|é)|me chamo|sou (?:o|a)?\s*)\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ' -]{1,60}?)(?=\s+(?:e\s+)?(?:meu\s+)?(?:telefone|celular|e-?mail)\b|[,.!?]|$)/i,
  )?.[1];
  const preferredDate = message.match(
    /(?:dia|data|para|preferencia|preferência)\s+((?:\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?)|(?:segunda|terca|terça|quarta|quinta|sexta|sabado|sábado|domingo)(?:-feira)?)/i,
  )?.[1];

  if (name) data.name = name.trim().replace(/[,.!?]+$/, "");
  if (email) data.email = email.toLowerCase();
  if (phone) data.phone = phone.replace(/[^+\d]/g, "");
  if (preferredDate) data.preferredDate = preferredDate;

  const normalized = normalize(message);
  const service = agent.configuration.services.find((candidate) => {
    const serviceTokens = [...tokens(`${candidate.name} ${candidate.id}`)];
    return serviceTokens.some((token) => normalized.includes(token));
  });
  if (service) {
    if (agent.businessType.toLowerCase().includes("confeitaria")) data.desiredProduct = service.name;
    else data.desiredService = service.name;
  }

  if (/autorizo|pode (me )?(ligar|chamar|contactar)|aceito o contato/i.test(normalized)) {
    data.consent = true;
  }

  return data;
}

function isOutsideBusinessHours(agent: DemoAgent, isoDate: string): boolean {
  const date = new Date(isoDate);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: agent.configuration.businessHours.timezone,
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const day = values.weekday?.toLowerCase() as keyof typeof agent.configuration.businessHours;
  const slots = agent.configuration.businessHours[day];
  if (!Array.isArray(slots)) return true;
  const current = `${values.hour}:${values.minute}`;
  return !slots.some((slot) => current >= slot.start && current < slot.end);
}

function baseResponse(overrides: Partial<AgentResponse>): AgentResponse {
  return AgentResponseSchema.parse({
    reply: "Preciso confirmar essa informação com a equipe.",
    intent: "unknown",
    confidence: 0.25,
    leadData: emptyLeadData(),
    requestedAction: "handoff",
    handoffRequired: true,
    handoffReason: "Não há informação confiável na base de conhecimento.",
    sourceIds: [],
    shouldWaitForHuman: true,
    safetyFlags: { promptInjection: false, sensitiveData: false, outOfScope: false },
    ...overrides,
  });
}

function limitReply(response: AgentResponse, maxLength: number): AgentResponse {
  if (response.reply.length <= maxLength) return response;
  return { ...response, reply: `${response.reply.slice(0, Math.max(1, maxLength - 1)).trimEnd()}…` };
}

export class AgentNotFoundError extends Error {
  readonly status = 404;

  constructor() {
    super("Agente demonstrativo não encontrado.");
    this.name = "AgentNotFoundError";
  }
}

export function runDemoEngine(rawInput: PlaygroundInput): AgentResponse {
  const input = PlaygroundInputSchema.parse(rawInput);
  const agent = getDemoAgent(input.agentId);
  if (!agent) throw new AgentNotFoundError();

  const normalized = normalize(input.message);
  const customerContext = [
    ...input.history.filter((message) => message.role === "customer").map((message) => message.content),
    input.message,
  ].join(" ");
  const leadData = extractLeadData(customerContext, agent);
  const sources = retrieve(input.message, agent.knowledge);
  const sourceIds = sources.map((source) => source.id);

  if (detectPromptInjection(input.message)) {
    return limitReply(
      baseResponse({
        reply:
          "Não posso ignorar minhas regras nem revelar instruções internas. Vou manter o atendimento dentro das informações autorizadas.",
        intent: "prompt_injection",
        confidence: 1,
        requestedAction: "handoff",
        handoffRequired: true,
        handoffReason: "Tentativa de alterar ou revelar instruções internas.",
        shouldWaitForHuman: true,
        safetyFlags: { promptInjection: true, sensitiveData: false, outOfScope: true },
      }),
      agent.configuration.maxMessageLength,
    );
  }

  if (/\b(atendente|humano|pessoa|falar com alguem|falar com alguém)\b/.test(normalized)) {
    return baseResponse({
      reply: "Claro. Vou encaminhar a conversa para uma pessoa da equipe.",
      intent: "human_requested",
      confidence: 1,
      leadData,
      requestedAction: "handoff",
      handoffRequired: true,
      handoffReason: "Cliente solicitou atendimento humano.",
      shouldWaitForHuman: true,
    });
  }

  if (/absurdo|pessimo|péssimo|raiva|reclamacao|reclamação|processar|procon/.test(normalized)) {
    return baseResponse({
      reply: "Entendi que a situação precisa de atenção. Vou encaminhar agora para uma pessoa da equipe.",
      intent: "complaint",
      confidence: 0.98,
      leadData,
      requestedAction: "handoff",
      handoffRequired: true,
      handoffReason: "Cliente demonstrou insatisfação ou fez uma reclamação.",
      shouldWaitForHuman: true,
    });
  }

  const sensitiveData = /\b(cpf|rg|laudo|diagnostico|diagnóstico|cartao|cartão|senha)\b/.test(normalized);
  if (sensitiveData) {
    return baseResponse({
      reply: `${agent.configuration.privacyMessage} Vou encaminhar para a equipe orientar um canal adequado.`,
      intent: "sensitive_data",
      confidence: 0.99,
      leadData,
      requestedAction: "handoff",
      handoffRequired: true,
      handoffReason: "A solicitação envolve dado pessoal sensível ou desnecessário para o chat.",
      shouldWaitForHuman: true,
      safetyFlags: { promptInjection: false, sensitiveData: true, outOfScope: false },
    });
  }

  if (input.now && isOutsideBusinessHours(agent, input.now)) {
    return baseResponse({
      reply: agent.configuration.outsideHoursMessage,
      intent: "outside_business_hours",
      confidence: 1,
      leadData,
      requestedAction: "none",
      handoffRequired: false,
      handoffReason: null,
      shouldWaitForHuman: false,
    });
  }

  const isCommercialIntent = /orcamento|orçamento|quero|gostaria|interesse|agendar|encomendar|matricula|matrícula/.test(
    normalized,
  );
  if (isCommercialIntent && Object.values(leadData).some((value) => value !== null)) {
    const missingQuestion = agent.configuration.qualificationQuestions.find(
      (question) => !(leadData as Record<string, unknown>)[question.field],
    );
    const groundedContext = sources[0]?.content;
    const reply = [
      groundedContext,
      missingQuestion?.question ?? "Já tenho os dados básicos para encaminhar sua solicitação à equipe.",
    ]
      .filter(Boolean)
      .join("\n\n");

    return limitReply(
      baseResponse({
        reply,
        intent: /agendar|data|dia/.test(normalized) ? "appointment_interest" : "commercial_interest",
        confidence: sources.length > 0 ? 0.9 : 0.78,
        leadData,
        requestedAction: leadData.phone || leadData.email ? "register_lead" : "ask_clarification",
        handoffRequired: false,
        handoffReason: null,
        sourceIds,
        shouldWaitForHuman: false,
      }),
      agent.configuration.maxMessageLength,
    );
  }

  if (sources.length > 0) {
    const reply = sources.map((source) => source.content).join("\n\n");
    return limitReply(
      baseResponse({
        reply,
        intent: /preco|preço|valor|custa/.test(normalized)
          ? "pricing_question"
          : /horario|horário|abre|fecha/.test(normalized)
            ? "business_hours"
            : "knowledge_question",
        confidence: 0.92,
        leadData,
        requestedAction: "none",
        handoffRequired: false,
        handoffReason: null,
        sourceIds,
        shouldWaitForHuman: false,
      }),
      agent.configuration.maxMessageLength,
    );
  }

  const confidence = 0.28;
  const belowThreshold = confidence < agent.configuration.minimumConfidence;
  return limitReply(
    baseResponse({
      reply: belowThreshold
        ? "Não encontrei essa informação na base autorizada e não quero inventar. Vou pedir que a equipe confirme."
        : "Pode explicar um pouco mais o que você precisa?",
      intent: "unknown",
      confidence,
      leadData,
      requestedAction: belowThreshold ? "handoff" : "ask_clarification",
      handoffRequired: belowThreshold,
      handoffReason: belowThreshold ? "Confiança abaixo do limite configurado." : null,
      shouldWaitForHuman: belowThreshold,
      safetyFlags: { promptInjection: false, sensitiveData: false, outOfScope: true },
    }),
    agent.configuration.maxMessageLength,
  );
}
