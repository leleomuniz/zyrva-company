export type CompanyStatus = "Ativa" | "Implantação" | "Pausada";

export type AgentStatus = "Ativo" | "Rascunho" | "Pausado";

export type ConversationStatus =
  | "Novo"
  | "IA atendendo"
  | "Aguardando cliente"
  | "Aguardando humano"
  | "Humano atendendo"
  | "Resolvido"
  | "Arquivado";

export type LeadStage =
  | "Novo"
  | "Qualificando"
  | "Qualificado"
  | "Proposta"
  | "Negociação"
  | "Convertido"
  | "Perdido";

export type KnowledgeType = "Documento" | "Texto" | "FAQ" | "Catalogo" | "Link";

export interface Company {
  id: string;
  name: string;
  initials: string;
  segment: string;
  legalName: string;
  document: string;
  phone: string;
  email: string;
  city: string;
  status: CompanyStatus;
  channelStatus: "Conectado" | "Pendente" | "Desconectado";
  accent: "violet" | "cyan" | "amber";
  createdAt: string;
}

export interface AgentConfig {
  objective: string;
  persona: string;
  tone: string;
  language: string;
  greeting: string;
  services: string[];
  allowedTopics: string[];
  forbiddenTopics: string[];
  qualificationQuestions: string[];
  requiredInformation: string[];
  businessHours: string;
  responseRules: string[];
  maxMessageLength: number;
  knowledgeSourceIds: string[];
  allowedTools: string[];
  handoffRules: string[];
  confidenceThreshold: number;
  privacyMessage: string;
  errorMessage: string;
  outOfHoursMessage: string;
}

export interface Agent {
  id: string;
  companyId: string;
  name: string;
  role: string;
  description: string;
  status: AgentStatus;
  version: number;
  model: string;
  channel: string;
  updatedAt: string;
  publishedAt?: string;
  conversations: number;
  resolutionRate: number;
  config: AgentConfig;
}

export interface ChatMessage {
  id: string;
  author: "contact" | "agent" | "human" | "system";
  body: string;
  timestamp: string;
  status?: "sent" | "delivered" | "read";
  sourceLabels?: string[];
}

export interface Conversation {
  id: string;
  companyId: string;
  agentId: string;
  contactName: string;
  contactPhone: string;
  contactInitials: string;
  status: ConversationStatus;
  lastMessage: string;
  lastMessageAt: string;
  unread: number;
  tags: string[];
  humanOwner?: string;
  leadId?: string;
  notes: string[];
  messages: ChatMessage[];
}

export interface Lead {
  id: string;
  companyId: string;
  name: string;
  phone: string;
  email?: string;
  interest: string;
  budget?: string;
  preferredDate?: string;
  source: string;
  stage: LeadStage;
  notes: string;
  owner: string;
  consent: boolean;
  tags: string[];
  lastInteractionAt: string;
}

export interface KnowledgeSource {
  id: string;
  companyId: string;
  agentId?: string;
  name: string;
  type: KnowledgeType;
  status: "Pronto" | "Processando" | "Falha";
  chunks: number;
  size: string;
  updatedAt: string;
  content?: string;
}

export interface Automation {
  id: string;
  companyId: string;
  name: string;
  description: string;
  trigger: string;
  condition: string;
  action: string;
  active: boolean;
  executions: number;
  lastRun?: string;
}

export interface Integration {
  id: string;
  companyId?: string;
  name: string;
  description: string;
  category: string;
  status: "Conectado" | "Simulado" | "Planejado" | "Atenção";
  enabled: boolean;
}

export interface AuditEntry {
  id: string;
  companyId: string;
  timestamp: string;
  actor: string;
  action: string;
  resource: string;
  detail: string;
  severity: "info" | "success" | "warning" | "error";
  correlationId: string;
}

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  tone?: "neutral" | "success" | "warning" | "danger";
}

export interface GeneratedAgentDraft {
  name: string;
  role: string;
  description: string;
  config: AgentConfig;
}
