"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";
import {
  demoAgents,
  demoAutomations,
  demoCompanies,
  demoConversations,
  demoKnowledge,
  demoLeads,
} from "@/data/demo";
import type {
  Agent,
  Automation,
  ChatMessage,
  Company,
  Conversation,
  KnowledgeSource,
  Lead,
  LeadStage,
  ToastMessage,
} from "@/types";

interface AppState {
  selectedCompanyId: string;
  companies: Company[];
  agents: Agent[];
  conversations: Conversation[];
  leads: Lead[];
  knowledge: KnowledgeSource[];
  automations: Automation[];
  toasts: ToastMessage[];
  setSelectedCompany: (companyId: string) => void;
  addCompany: (company: Company) => void;
  addAgent: (agent: Agent) => void;
  updateAgent: (agentId: string, patch: Partial<Agent>) => void;
  takeoverConversation: (conversationId: string) => void;
  returnConversationToAi: (conversationId: string) => void;
  resolveConversation: (conversationId: string) => void;
  sendMessage: (conversationId: string, body: string) => void;
  addConversationNote: (conversationId: string, note: string) => void;
  addLead: (lead: Lead) => void;
  updateLeadStage: (leadId: string, stage: LeadStage) => void;
  addKnowledge: (source: KnowledgeSource) => void;
  toggleAutomation: (automationId: string) => void;
  addAutomation: (automation: Automation) => void;
  notify: (toast: Omit<ToastMessage, "id">) => void;
  dismissToast: (toastId: string) => void;
  resetDemo: () => void;
}

const cloneDemo = () => ({
  companies: structuredClone(demoCompanies),
  agents: structuredClone(demoAgents),
  conversations: structuredClone(demoConversations),
  leads: structuredClone(demoLeads),
  knowledge: structuredClone(demoKnowledge),
  automations: structuredClone(demoAutomations),
});

const StoredAgentConfigSchema = z.object({
  objective: z.string(),
  persona: z.string(),
  tone: z.string(),
  language: z.string(),
  greeting: z.string(),
  services: z.array(z.string()),
  allowedTopics: z.array(z.string()),
  forbiddenTopics: z.array(z.string()),
  qualificationQuestions: z.array(z.string()),
  requiredInformation: z.array(z.string()),
  businessHours: z.string(),
  responseRules: z.array(z.string()),
  maxMessageLength: z.number(),
  knowledgeSourceIds: z.array(z.string()),
  allowedTools: z.array(z.string()),
  handoffRules: z.array(z.string()),
  confidenceThreshold: z.number(),
  privacyMessage: z.string(),
  errorMessage: z.string(),
  outOfHoursMessage: z.string(),
}).passthrough();

const StoredStateSchema = z.object({
  selectedCompanyId: z.string(),
  companies: z.array(z.object({
    id: z.string(), name: z.string(), initials: z.string(), segment: z.string(),
    legalName: z.string(), document: z.string(), phone: z.string(), email: z.string(),
    city: z.string(), status: z.string(), channelStatus: z.string(), accent: z.string(),
    createdAt: z.string(),
  }).passthrough()),
  agents: z.array(z.object({
    id: z.string(), companyId: z.string(), name: z.string(), role: z.string(),
    description: z.string(), status: z.string(), version: z.number(), model: z.string(),
    channel: z.string(), updatedAt: z.string(), conversations: z.number(),
    resolutionRate: z.number(), config: StoredAgentConfigSchema,
  }).passthrough()),
  conversations: z.array(z.object({
    id: z.string(), companyId: z.string(), agentId: z.string(), contactName: z.string(),
    contactPhone: z.string(), contactInitials: z.string(), status: z.string(), unread: z.number(),
    lastMessage: z.string(), lastMessageAt: z.string(),
    tags: z.array(z.string()), notes: z.array(z.string()),
    messages: z.array(z.object({ id: z.string(), author: z.string(), body: z.string(), timestamp: z.string() }).passthrough()),
  }).passthrough()),
  leads: z.array(z.object({
    id: z.string(), companyId: z.string(), name: z.string(), phone: z.string(),
    interest: z.string(), source: z.string(), stage: z.string(), notes: z.string(),
    owner: z.string(), consent: z.boolean(), tags: z.array(z.string()), lastInteractionAt: z.string(),
  }).passthrough()),
  knowledge: z.array(z.object({
    id: z.string(), companyId: z.string(), name: z.string(), type: z.string(), status: z.string(),
    chunks: z.number(), size: z.string(), updatedAt: z.string(),
  }).passthrough()),
  automations: z.array(z.object({
    id: z.string(), companyId: z.string(), name: z.string(), description: z.string(),
    trigger: z.string(), condition: z.string(), action: z.string(), active: z.boolean(), executions: z.number(),
  }).passthrough()),
}).strict();

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      selectedCompanyId: "company-rbr",
      ...cloneDemo(),
      toasts: [],
      setSelectedCompany: (companyId) => set({ selectedCompanyId: companyId }),
      addCompany: (company) =>
        set((state) => ({ companies: [company, ...state.companies], selectedCompanyId: company.id })),
      addAgent: (agent) => set((state) => ({ agents: [agent, ...state.agents] })),
      updateAgent: (agentId, patch) =>
        set((state) => ({ agents: state.agents.map((agent) => (agent.id === agentId ? { ...agent, ...patch } : agent)) })),
      takeoverConversation: (conversationId) =>
        set((state) => ({
          conversations: state.conversations.map((conversation) =>
            conversation.id === conversationId
              ? {
                  ...conversation,
                  status: "Humano atendendo",
                  humanOwner: "Leonardo Alves",
                  unread: 0,
                  messages: [
                    ...conversation.messages,
                    {
                      id: `system-${Date.now()}`,
                      author: "system",
                      body: "Leonardo Alves assumiu o atendimento. As respostas da IA foram pausadas.",
                      timestamp: new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date()),
                    },
                  ],
                }
              : conversation,
          ),
        })),
      returnConversationToAi: (conversationId) =>
        set((state) => ({
          conversations: state.conversations.map((conversation) =>
            conversation.id === conversationId
              ? {
                  ...conversation,
                  status: "IA atendendo",
                  humanOwner: undefined,
                  messages: [
                    ...conversation.messages,
                    {
                      id: `system-${Date.now()}`,
                      author: "system",
                      body: "Atendimento devolvido ao agente. A IA pode voltar a responder.",
                      timestamp: new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date()),
                    },
                  ],
                }
              : conversation,
          ),
        })),
      resolveConversation: (conversationId) =>
        set((state) => ({
          conversations: state.conversations.map((conversation) =>
            conversation.id === conversationId ? { ...conversation, status: "Resolvido", unread: 0 } : conversation,
          ),
        })),
      sendMessage: (conversationId, body) =>
        set((state) => ({
          conversations: state.conversations.map((conversation) => {
            if (conversation.id !== conversationId) return conversation;
            const message: ChatMessage = {
              id: `human-${Date.now()}`,
              author: "human",
              body,
              timestamp: new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date()),
              status: "sent",
            };
            return { ...conversation, messages: [...conversation.messages, message], lastMessage: body, lastMessageAt: "Agora" };
          }),
        })),
      addConversationNote: (conversationId, note) =>
        set((state) => ({
          conversations: state.conversations.map((conversation) =>
            conversation.id === conversationId ? { ...conversation, notes: [...conversation.notes, note] } : conversation,
          ),
        })),
      addLead: (lead) =>
        set((state) => {
          const duplicate = state.leads.find(
            (item) =>
              item.companyId === lead.companyId &&
              ((lead.phone && item.phone === lead.phone) || (lead.email && item.email === lead.email)),
          );
          if (!duplicate) return { leads: [lead, ...state.leads] };
          return {
            leads: state.leads.map((item) =>
              item.id === duplicate.id
                ? { ...item, ...lead, id: item.id, stage: item.stage, lastInteractionAt: "Agora" }
                : item,
            ),
          };
        }),
      updateLeadStage: (leadId, stage) =>
        set((state) => ({ leads: state.leads.map((lead) => (lead.id === leadId ? { ...lead, stage } : lead)) })),
      addKnowledge: (source) => set((state) => ({ knowledge: [source, ...state.knowledge] })),
      toggleAutomation: (automationId) =>
        set((state) => ({
          automations: state.automations.map((automation) =>
            automation.id === automationId ? { ...automation, active: !automation.active } : automation,
          ),
        })),
      addAutomation: (automation) => set((state) => ({ automations: [automation, ...state.automations] })),
      notify: (toast) =>
        set((state) => ({ toasts: [...state.toasts, { ...toast, id: `${Date.now()}-${state.toasts.length}` }] })),
      dismissToast: (toastId) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== toastId) })),
      resetDemo: () => set({ ...cloneDemo(), selectedCompanyId: "company-rbr", toasts: [] }),
    }),
    {
      name: "zyrva-demo-state-v1",
      version: 1,
      skipHydration: true,
      merge: (persistedState, currentState) => {
        const parsed = StoredStateSchema.safeParse(persistedState);
        if (!parsed.success) return currentState;
        const selectedCompanyId = parsed.data.selectedCompanyId === "all" || parsed.data.companies.some(
          (company) => company.id === parsed.data.selectedCompanyId,
        )
          ? parsed.data.selectedCompanyId
          : parsed.data.companies[0]?.id ?? currentState.selectedCompanyId;
        return { ...currentState, ...parsed.data, selectedCompanyId, toasts: [] } as AppState;
      },
      partialize: (state) => ({
        selectedCompanyId: state.selectedCompanyId,
        companies: state.companies,
        agents: state.agents,
        conversations: state.conversations,
        leads: state.leads,
        knowledge: state.knowledge,
        automations: state.automations,
      }),
    },
  ),
);
