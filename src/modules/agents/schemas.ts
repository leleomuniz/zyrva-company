import { z } from "zod";

const ClockSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const BusinessHoursSchema = z
  .object({
    timezone: z.string().min(1),
    monday: z.array(z.object({ start: ClockSchema, end: ClockSchema })),
    tuesday: z.array(z.object({ start: ClockSchema, end: ClockSchema })),
    wednesday: z.array(z.object({ start: ClockSchema, end: ClockSchema })),
    thursday: z.array(z.object({ start: ClockSchema, end: ClockSchema })),
    friday: z.array(z.object({ start: ClockSchema, end: ClockSchema })),
    saturday: z.array(z.object({ start: ClockSchema, end: ClockSchema })),
    sunday: z.array(z.object({ start: ClockSchema, end: ClockSchema })),
  })
  .strict();

export const AgentServiceSchema = z
  .object({
    id: z.string().min(1).max(80),
    name: z.string().min(1).max(120),
    description: z.string().min(1).max(800),
    priceNote: z.string().max(240).nullable(),
  })
  .strict();

export const QualificationQuestionSchema = z
  .object({
    id: z.string().min(1).max(80),
    field: z.string().min(1).max(80),
    question: z.string().min(1).max(300),
    required: z.boolean(),
  })
  .strict();

export const HandoffRuleSchema = z
  .object({
    id: z.string().min(1).max(80),
    trigger: z.enum([
      "human_requested",
      "low_confidence",
      "customer_angry",
      "sensitive_request",
      "tool_unavailable",
      "unsupported_media",
      "prompt_injection",
    ]),
    message: z.string().min(1).max(500),
    enabled: z.boolean(),
  })
  .strict();

export const AgentConfigSchema = z
  .object({
    name: z.string().min(2).max(120),
    description: z.string().min(10).max(1200),
    objective: z.string().min(10).max(1600),
    persona: z.string().min(10).max(1200),
    tone: z.array(z.string().min(1).max(60)).min(1).max(8),
    language: z.literal("pt-BR"),
    greeting: z.string().min(2).max(500),
    services: z.array(AgentServiceSchema).max(50),
    allowedTopics: z.array(z.string().min(1).max(160)).max(50),
    forbiddenTopics: z.array(z.string().min(1).max(160)).max(30),
    qualificationQuestions: z.array(QualificationQuestionSchema).max(20),
    requiredInformation: z.array(z.string().min(1).max(80)).max(20),
    businessHours: BusinessHoursSchema,
    responseRules: z.array(z.string().min(1).max(400)).min(1).max(30),
    maxMessageLength: z.number().int().min(80).max(2000),
    knowledgeSourceIds: z.array(z.string().min(1).max(120)).max(100),
    authorizedTools: z.array(z.string().min(1).max(80)).max(30),
    handoffRules: z.array(HandoffRuleSchema).max(12),
    minimumConfidence: z.number().min(0).max(1),
    privacyMessage: z.string().min(10).max(600),
    errorMessage: z.string().min(2).max(500),
    outsideHoursMessage: z.string().min(2).max(500),
    identifyAsVirtualAssistant: z.boolean(),
  })
  .strict();

export const AgentGenerationRequestSchema = z
  .object({
    description: z.string().trim().min(20).max(5000),
    businessName: z.string().trim().min(2).max(120).optional(),
    businessType: z.string().trim().min(2).max(120).optional(),
    companyId: z.string().trim().min(1).max(120).optional(),
    useAI: z.boolean().default(false),
  })
  .strict();

export const GeneratedAgentSchema = z
  .object({
    configuration: AgentConfigSchema,
    generatedBy: z.enum(["demo", "openai"]),
    requiresHumanReview: z.literal(true),
    warnings: z.array(z.string()).default([]),
  })
  .strict();

export type AgentConfig = z.infer<typeof AgentConfigSchema>;
export type AgentGenerationRequest = z.infer<typeof AgentGenerationRequestSchema>;
export type GeneratedAgent = z.infer<typeof GeneratedAgentSchema>;
