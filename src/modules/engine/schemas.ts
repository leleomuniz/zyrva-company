import { z } from "zod";

export const LeadDataSchema = z
  .object({
    name: z.string().max(120).nullable(),
    phone: z.string().max(24).nullable(),
    email: z.string().email().max(200).nullable(),
    desiredService: z.string().max(160).nullable(),
    desiredProduct: z.string().max(160).nullable(),
    approximateBudget: z.number().nonnegative().nullable(),
    preferredDate: z.string().max(80).nullable(),
    consent: z.boolean().nullable(),
  })
  .strict();

export const AgentResponseSchema = z
  .object({
    reply: z.string().min(1).max(4000),
    intent: z.string().min(1).max(100),
    confidence: z.number().min(0).max(1),
    leadData: LeadDataSchema,
    requestedAction: z.enum([
      "none",
      "ask_clarification",
      "register_lead",
      "request_quote",
      "request_appointment",
      "handoff",
    ]),
    handoffRequired: z.boolean(),
    handoffReason: z.string().max(500).nullable(),
    sourceIds: z.array(z.string().min(1).max(120)).max(30),
    shouldWaitForHuman: z.boolean(),
    safetyFlags: z
      .object({
        promptInjection: z.boolean(),
        sensitiveData: z.boolean(),
        outOfScope: z.boolean(),
      })
      .strict(),
  })
  .strict();

export const PlaygroundMessageSchema = z
  .object({
    role: z.enum(["customer", "assistant"]),
    content: z.string().min(1).max(4000),
  })
  .strict();

export const PlaygroundInputSchema = z
  .object({
    agentId: z.string().min(1).default("rbr-garage-agent"),
    companyId: z.string().min(1).max(120).optional(),
    mode: z.enum(["draft", "published"]).optional(),
    agentConfig: z.unknown().optional(),
    message: z.string().trim().min(1).max(4000),
    history: z.array(PlaygroundMessageSchema).max(20).default([]),
    now: z.string().datetime({ offset: true }).optional(),
  })
  .strict();

export type AgentResponse = z.infer<typeof AgentResponseSchema>;
export type LeadData = z.infer<typeof LeadDataSchema>;
export type PlaygroundInput = z.infer<typeof PlaygroundInputSchema>;
