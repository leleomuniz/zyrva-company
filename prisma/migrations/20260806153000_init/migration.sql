-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- Required by KnowledgeChunk.embedding.
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateEnum
CREATE TYPE "OrganizationRole" AS ENUM ('ZYRVA_ADMIN', 'COMPANY_MANAGER', 'ATTENDANT', 'VIEWER');

-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ClientCompanyStatus" AS ENUM ('ONBOARDING', 'ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AgentVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'RETIRED');

-- CreateEnum
CREATE TYPE "KnowledgeSourceType" AS ENUM ('TEXT', 'FAQ', 'PDF', 'DOCX', 'TXT', 'CSV', 'URL', 'CATALOG');

-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "ChannelType" AS ENUM ('WHATSAPP', 'WEB_CHAT', 'INSTAGRAM', 'MESSENGER', 'EMAIL');

-- CreateEnum
CREATE TYPE "ChannelStatus" AS ENUM ('DISCONNECTED', 'CONFIGURING', 'ACTIVE', 'PAUSED', 'ERROR');

-- CreateEnum
CREATE TYPE "LeadStage" AS ENUM ('NEW', 'QUALIFYING', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'CONVERTED', 'LOST');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('NEW', 'AI_ACTIVE', 'WAITING_CUSTOMER', 'WAITING_HUMAN', 'HUMAN_ACTIVE', 'RESOLVED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ConversationMode" AS ENUM ('AI', 'HUMAN', 'PAUSED');

-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('INBOUND', 'OUTBOUND', 'INTERNAL');

-- CreateEnum
CREATE TYPE "MessageSender" AS ENUM ('CONTACT', 'AI', 'HUMAN', 'SYSTEM');

-- CreateEnum
CREATE TYPE "MessageContentType" AS ENUM ('TEXT', 'BUTTON', 'INTERACTIVE', 'IMAGE', 'AUDIO', 'DOCUMENT', 'LOCATION', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('RECEIVED', 'QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateEnum
CREATE TYPE "ToolRisk" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "AutomationStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'DISABLED');

-- CreateEnum
CREATE TYPE "WebhookStatus" AS ENUM ('RECEIVED', 'QUEUED', 'PROCESSING', 'PROCESSED', 'IGNORED', 'FAILED');

-- CreateEnum
CREATE TYPE "UsageKind" AS ENUM ('MESSAGE_IN', 'MESSAGE_OUT', 'MODEL_CALL', 'EMBEDDING', 'TOOL_CALL', 'HANDOFF', 'ERROR');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT,
    "isPlatformAdmin" BOOLEAN NOT NULL DEFAULT false,
    "disabledAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "OrganizationStatus" NOT NULL DEFAULT 'ACTIVE',
    "timezone" TEXT NOT NULL DEFAULT 'America/Fortaleza',
    "countryCode" TEXT NOT NULL DEFAULT 'BR',
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "monthlyTokenLimit" INTEGER NOT NULL DEFAULT 1000000,
    "monthlyMessageLimit" INTEGER NOT NULL DEFAULT 10000,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMember" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientCompanyId" TEXT,
    "userId" TEXT NOT NULL,
    "role" "OrganizationRole" NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientCompany" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "status" "ClientCompanyStatus" NOT NULL DEFAULT 'ONBOARDING',
    "businessType" TEXT NOT NULL,
    "description" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/Fortaleza',
    "phone" TEXT,
    "email" TEXT,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ClientCompany_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientCompanyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "AgentStatus" NOT NULL DEFAULT 'DRAFT',
    "currentDraft" JSONB NOT NULL,
    "publishedVersionId" TEXT,
    "publishedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentVersion" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "AgentVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "configuration" JSONB NOT NULL,
    "changeSummary" TEXT,
    "createdById" TEXT,
    "publishedById" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMPTZ(3),

    CONSTRAINT "AgentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeSource" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientCompanyId" TEXT NOT NULL,
    "agentId" TEXT,
    "type" "KnowledgeSourceType" NOT NULL,
    "title" TEXT NOT NULL,
    "originalName" TEXT,
    "mimeType" TEXT,
    "sourceUrl" TEXT,
    "contentHash" TEXT,
    "rawText" TEXT,
    "status" "ProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "errorCode" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "KnowledgeSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeChunk" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientCompanyId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "agentId" TEXT,
    "sequence" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "tokenCount" INTEGER,
    "embedding" vector(1536),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelConnection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientCompanyId" TEXT NOT NULL,
    "agentId" TEXT,
    "type" "ChannelType" NOT NULL DEFAULT 'WHATSAPP',
    "status" "ChannelStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "label" TEXT NOT NULL,
    "phoneNumberId" TEXT,
    "whatsappBusinessId" TEXT,
    "displayPhoneNumber" TEXT,
    "accessTokenCiphertext" TEXT,
    "tokenKeyVersion" INTEGER,
    "lastVerifiedAt" TIMESTAMPTZ(3),
    "lastErrorCode" TEXT,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ChannelConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientCompanyId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'pt-BR',
    "optedOutAt" TIMESTAMPTZ(3),
    "consentAt" TIMESTAMPTZ(3),
    "consentSource" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientCompanyId" TEXT NOT NULL,
    "contactId" TEXT,
    "assignedToId" TEXT,
    "name" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "companyName" TEXT,
    "desiredService" TEXT,
    "desiredProduct" TEXT,
    "approximateBudget" DECIMAL(12,2),
    "preferredDate" TIMESTAMPTZ(3),
    "source" TEXT NOT NULL,
    "stage" "LeadStage" NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "tags" TEXT[],
    "consent" BOOLEAN NOT NULL DEFAULT false,
    "consentAt" TIMESTAMPTZ(3),
    "lastInteractionAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "convertedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientCompanyId" TEXT NOT NULL,
    "agentId" TEXT,
    "agentVersionId" TEXT,
    "channelConnectionId" TEXT,
    "contactId" TEXT NOT NULL,
    "leadId" TEXT,
    "assignedToId" TEXT,
    "status" "ConversationStatus" NOT NULL DEFAULT 'NEW',
    "mode" "ConversationMode" NOT NULL DEFAULT 'AI',
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "intent" TEXT,
    "memorySummary" TEXT,
    "collectedData" JSONB NOT NULL DEFAULT '{}',
    "handoffReason" TEXT,
    "lastMessageAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "channelConnectionId" TEXT,
    "externalId" TEXT,
    "direction" "MessageDirection" NOT NULL,
    "sender" "MessageSender" NOT NULL,
    "sentByUserId" TEXT,
    "contentType" "MessageContentType" NOT NULL DEFAULT 'TEXT',
    "text" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "status" "DeliveryStatus" NOT NULL DEFAULT 'RECEIVED',
    "sourceIds" TEXT[],
    "confidence" DOUBLE PRECISION,
    "errorCode" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMPTZ(3),
    "readAt" TIMESTAMPTZ(3),

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tool" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "inputSchema" JSONB NOT NULL,
    "risk" "ToolRisk" NOT NULL DEFAULT 'LOW',
    "requiresConfirmation" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Tool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentTool" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentTool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Automation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientCompanyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "AutomationStatus" NOT NULL DEFAULT 'DRAFT',
    "trigger" JSONB NOT NULL,
    "conditions" JSONB NOT NULL DEFAULT '[]',
    "actions" JSONB NOT NULL,
    "maxExecutions" INTEGER NOT NULL DEFAULT 1,
    "cooldownSeconds" INTEGER NOT NULL DEFAULT 60,
    "lastRunAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Automation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "clientCompanyId" TEXT,
    "channelConnectionId" TEXT,
    "provider" TEXT NOT NULL,
    "externalEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "status" "WebhookStatus" NOT NULL DEFAULT 'RECEIVED',
    "payload" JSONB NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastErrorCode" TEXT,
    "receivedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMPTZ(3),

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageRecord" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "agentId" TEXT,
    "agentVersionId" TEXT,
    "conversationId" TEXT,
    "kind" "UsageKind" NOT NULL,
    "model" TEXT,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "toolCalls" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER,
    "estimatedCost" DECIMAL(14,6),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "correlationId" TEXT,
    "ipHash" TEXT,
    "before" JSONB,
    "after" JSONB,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "OrganizationMember_userId_role_idx" ON "OrganizationMember"("userId", "role");

-- CreateIndex
CREATE INDEX "OrganizationMember_organizationId_clientCompanyId_idx" ON "OrganizationMember"("organizationId", "clientCompanyId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMember_organizationId_userId_key" ON "OrganizationMember"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "ClientCompany_organizationId_status_idx" ON "ClientCompany"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ClientCompany_organizationId_slug_key" ON "ClientCompany"("organizationId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "ClientCompany_organizationId_id_key" ON "ClientCompany"("organizationId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_publishedVersionId_key" ON "Agent"("publishedVersionId");

-- CreateIndex
CREATE INDEX "Agent_organizationId_status_idx" ON "Agent"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Agent_organizationId_clientCompanyId_idx" ON "Agent"("organizationId", "clientCompanyId");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_organizationId_clientCompanyId_name_key" ON "Agent"("organizationId", "clientCompanyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_organizationId_id_key" ON "Agent"("organizationId", "id");

-- CreateIndex
CREATE INDEX "AgentVersion_organizationId_agentId_status_idx" ON "AgentVersion"("organizationId", "agentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AgentVersion_agentId_version_key" ON "AgentVersion"("agentId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "AgentVersion_organizationId_id_key" ON "AgentVersion"("organizationId", "id");

-- CreateIndex
CREATE INDEX "KnowledgeSource_organizationId_agentId_status_idx" ON "KnowledgeSource"("organizationId", "agentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeSource_organizationId_clientCompanyId_contentHash_key" ON "KnowledgeSource"("organizationId", "clientCompanyId", "contentHash");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeSource_organizationId_id_key" ON "KnowledgeSource"("organizationId", "id");

-- CreateIndex
CREATE INDEX "KnowledgeChunk_organizationId_agentId_idx" ON "KnowledgeChunk"("organizationId", "agentId");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeChunk_sourceId_sequence_key" ON "KnowledgeChunk"("sourceId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelConnection_phoneNumberId_key" ON "ChannelConnection"("phoneNumberId");

-- CreateIndex
CREATE INDEX "ChannelConnection_organizationId_clientCompanyId_status_idx" ON "ChannelConnection"("organizationId", "clientCompanyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelConnection_organizationId_id_key" ON "ChannelConnection"("organizationId", "id");

-- CreateIndex
CREATE INDEX "Contact_organizationId_email_idx" ON "Contact"("organizationId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_organizationId_clientCompanyId_phone_key" ON "Contact"("organizationId", "clientCompanyId", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_organizationId_id_key" ON "Contact"("organizationId", "id");

-- CreateIndex
CREATE INDEX "Lead_organizationId_stage_lastInteractionAt_idx" ON "Lead"("organizationId", "stage", "lastInteractionAt");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_organizationId_clientCompanyId_phone_key" ON "Lead"("organizationId", "clientCompanyId", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_organizationId_id_key" ON "Lead"("organizationId", "id");

-- CreateIndex
CREATE INDEX "Conversation_organizationId_status_lastMessageAt_idx" ON "Conversation"("organizationId", "status", "lastMessageAt");

-- CreateIndex
CREATE INDEX "Conversation_organizationId_clientCompanyId_contactId_idx" ON "Conversation"("organizationId", "clientCompanyId", "contactId");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_organizationId_id_key" ON "Conversation"("organizationId", "id");

-- CreateIndex
CREATE INDEX "Message_organizationId_conversationId_createdAt_idx" ON "Message"("organizationId", "conversationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Message_channelConnectionId_externalId_key" ON "Message"("channelConnectionId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Tool_organizationId_key_key" ON "Tool"("organizationId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "Tool_organizationId_id_key" ON "Tool"("organizationId", "id");

-- CreateIndex
CREATE INDEX "AgentTool_organizationId_enabled_idx" ON "AgentTool"("organizationId", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "AgentTool_agentId_toolId_key" ON "AgentTool"("agentId", "toolId");

-- CreateIndex
CREATE INDEX "Automation_organizationId_status_idx" ON "Automation"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Automation_organizationId_clientCompanyId_name_key" ON "Automation"("organizationId", "clientCompanyId", "name");

-- CreateIndex
CREATE INDEX "WebhookEvent_organizationId_clientCompanyId_status_received_idx" ON "WebhookEvent"("organizationId", "clientCompanyId", "status", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_provider_externalEventId_key" ON "WebhookEvent"("provider", "externalEventId");

-- CreateIndex
CREATE INDEX "UsageRecord_organizationId_kind_createdAt_idx" ON "UsageRecord"("organizationId", "kind", "createdAt");

-- CreateIndex
CREATE INDEX "UsageRecord_organizationId_agentId_createdAt_idx" ON "UsageRecord"("organizationId", "agentId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_entityType_entityId_createdAt_idx" ON "AuditLog"("organizationId", "entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_actorUserId_createdAt_idx" ON "AuditLog"("organizationId", "actorUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_org_company_scope_fkey" FOREIGN KEY ("organizationId", "clientCompanyId") REFERENCES "ClientCompany"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientCompany" ADD CONSTRAINT "ClientCompany_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_clientCompanyId_fkey" FOREIGN KEY ("clientCompanyId") REFERENCES "ClientCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_publishedVersionId_fkey" FOREIGN KEY ("publishedVersionId") REFERENCES "AgentVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentVersion" ADD CONSTRAINT "AgentVersion_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentVersion" ADD CONSTRAINT "AgentVersion_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentVersion" ADD CONSTRAINT "AgentVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentVersion" ADD CONSTRAINT "AgentVersion_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeSource" ADD CONSTRAINT "KnowledgeSource_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeSource" ADD CONSTRAINT "KnowledgeSource_clientCompanyId_fkey" FOREIGN KEY ("clientCompanyId") REFERENCES "ClientCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeSource" ADD CONSTRAINT "KnowledgeSource_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeChunk" ADD CONSTRAINT "KnowledgeChunk_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeChunk" ADD CONSTRAINT "KnowledgeChunk_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "KnowledgeSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeChunk" ADD CONSTRAINT "KnowledgeChunk_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelConnection" ADD CONSTRAINT "ChannelConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelConnection" ADD CONSTRAINT "ChannelConnection_clientCompanyId_fkey" FOREIGN KEY ("clientCompanyId") REFERENCES "ClientCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelConnection" ADD CONSTRAINT "ChannelConnection_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_clientCompanyId_fkey" FOREIGN KEY ("clientCompanyId") REFERENCES "ClientCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_clientCompanyId_fkey" FOREIGN KEY ("clientCompanyId") REFERENCES "ClientCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_clientCompanyId_fkey" FOREIGN KEY ("clientCompanyId") REFERENCES "ClientCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_agentVersionId_fkey" FOREIGN KEY ("agentVersionId") REFERENCES "AgentVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_channelConnectionId_fkey" FOREIGN KEY ("channelConnectionId") REFERENCES "ChannelConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_channelConnectionId_fkey" FOREIGN KEY ("channelConnectionId") REFERENCES "ChannelConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_sentByUserId_fkey" FOREIGN KEY ("sentByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tool" ADD CONSTRAINT "Tool_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentTool" ADD CONSTRAINT "AgentTool_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentTool" ADD CONSTRAINT "AgentTool_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentTool" ADD CONSTRAINT "AgentTool_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Automation" ADD CONSTRAINT "Automation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Automation" ADD CONSTRAINT "Automation_clientCompanyId_fkey" FOREIGN KEY ("clientCompanyId") REFERENCES "ClientCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEvent" ADD CONSTRAINT "WebhookEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEvent" ADD CONSTRAINT "WebhookEvent_clientCompanyId_fkey" FOREIGN KEY ("clientCompanyId") REFERENCES "ClientCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEvent" ADD CONSTRAINT "WebhookEvent_channelConnectionId_fkey" FOREIGN KEY ("channelConnectionId") REFERENCES "ChannelConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_agentVersionId_fkey" FOREIGN KEY ("agentVersionId") REFERENCES "AgentVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Enforce tenant consistency even when data is written outside Prisma.
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_org_company_tenant_fkey" FOREIGN KEY ("organizationId", "clientCompanyId") REFERENCES "ClientCompany"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_org_published_version_tenant_fkey" FOREIGN KEY ("organizationId", "publishedVersionId") REFERENCES "AgentVersion"("organizationId", "id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AgentVersion" ADD CONSTRAINT "AgentVersion_org_agent_tenant_fkey" FOREIGN KEY ("organizationId", "agentId") REFERENCES "Agent"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KnowledgeSource" ADD CONSTRAINT "KnowledgeSource_org_company_tenant_fkey" FOREIGN KEY ("organizationId", "clientCompanyId") REFERENCES "ClientCompany"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KnowledgeSource" ADD CONSTRAINT "KnowledgeSource_org_agent_tenant_fkey" FOREIGN KEY ("organizationId", "agentId") REFERENCES "Agent"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KnowledgeChunk" ADD CONSTRAINT "KnowledgeChunk_org_source_tenant_fkey" FOREIGN KEY ("organizationId", "sourceId") REFERENCES "KnowledgeSource"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KnowledgeChunk" ADD CONSTRAINT "KnowledgeChunk_org_agent_tenant_fkey" FOREIGN KEY ("organizationId", "agentId") REFERENCES "Agent"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChannelConnection" ADD CONSTRAINT "ChannelConnection_org_company_tenant_fkey" FOREIGN KEY ("organizationId", "clientCompanyId") REFERENCES "ClientCompany"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChannelConnection" ADD CONSTRAINT "ChannelConnection_org_agent_tenant_fkey" FOREIGN KEY ("organizationId", "agentId") REFERENCES "Agent"("organizationId", "id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_org_company_tenant_fkey" FOREIGN KEY ("organizationId", "clientCompanyId") REFERENCES "ClientCompany"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_org_company_tenant_fkey" FOREIGN KEY ("organizationId", "clientCompanyId") REFERENCES "ClientCompany"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_org_contact_tenant_fkey" FOREIGN KEY ("organizationId", "contactId") REFERENCES "Contact"("organizationId", "id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_org_company_tenant_fkey" FOREIGN KEY ("organizationId", "clientCompanyId") REFERENCES "ClientCompany"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_org_agent_tenant_fkey" FOREIGN KEY ("organizationId", "agentId") REFERENCES "Agent"("organizationId", "id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_org_version_tenant_fkey" FOREIGN KEY ("organizationId", "agentVersionId") REFERENCES "AgentVersion"("organizationId", "id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_org_channel_tenant_fkey" FOREIGN KEY ("organizationId", "channelConnectionId") REFERENCES "ChannelConnection"("organizationId", "id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_org_contact_tenant_fkey" FOREIGN KEY ("organizationId", "contactId") REFERENCES "Contact"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_org_lead_tenant_fkey" FOREIGN KEY ("organizationId", "leadId") REFERENCES "Lead"("organizationId", "id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_org_conversation_tenant_fkey" FOREIGN KEY ("organizationId", "conversationId") REFERENCES "Conversation"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_org_channel_tenant_fkey" FOREIGN KEY ("organizationId", "channelConnectionId") REFERENCES "ChannelConnection"("organizationId", "id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AgentTool" ADD CONSTRAINT "AgentTool_org_agent_tenant_fkey" FOREIGN KEY ("organizationId", "agentId") REFERENCES "Agent"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentTool" ADD CONSTRAINT "AgentTool_org_tool_tenant_fkey" FOREIGN KEY ("organizationId", "toolId") REFERENCES "Tool"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Automation" ADD CONSTRAINT "Automation_org_company_tenant_fkey" FOREIGN KEY ("organizationId", "clientCompanyId") REFERENCES "ClientCompany"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebhookEvent" ADD CONSTRAINT "WebhookEvent_org_channel_tenant_fkey" FOREIGN KEY ("organizationId", "channelConnectionId") REFERENCES "ChannelConnection"("organizationId", "id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WebhookEvent" ADD CONSTRAINT "WebhookEvent_org_company_tenant_fkey" FOREIGN KEY ("organizationId", "clientCompanyId") REFERENCES "ClientCompany"("organizationId", "id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_org_agent_tenant_fkey" FOREIGN KEY ("organizationId", "agentId") REFERENCES "Agent"("organizationId", "id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_org_version_tenant_fkey" FOREIGN KEY ("organizationId", "agentVersionId") REFERENCES "AgentVersion"("organizationId", "id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_org_conversation_tenant_fkey" FOREIGN KEY ("organizationId", "conversationId") REFERENCES "Conversation"("organizationId", "id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "KnowledgeChunk_embedding_hnsw_idx"
ON "KnowledgeChunk"
USING hnsw ("embedding" vector_cosine_ops)
WHERE "embedding" IS NOT NULL;

CREATE INDEX "KnowledgeChunk_organizationId_clientCompanyId_agentId_idx" ON "KnowledgeChunk"("organizationId", "clientCompanyId", "agentId");

-- Client-company scoped keys prevent relations from crossing companies that
-- belong to the same organization.
CREATE UNIQUE INDEX "Agent_organizationId_clientCompanyId_id_key" ON "Agent"("organizationId", "clientCompanyId", "id");
CREATE UNIQUE INDEX "AgentVersion_organizationId_agentId_id_key" ON "AgentVersion"("organizationId", "agentId", "id");
CREATE UNIQUE INDEX "KnowledgeSource_organizationId_clientCompanyId_id_key" ON "KnowledgeSource"("organizationId", "clientCompanyId", "id");
CREATE UNIQUE INDEX "ChannelConnection_organizationId_clientCompanyId_id_key" ON "ChannelConnection"("organizationId", "clientCompanyId", "id");
CREATE UNIQUE INDEX "Contact_organizationId_clientCompanyId_id_key" ON "Contact"("organizationId", "clientCompanyId", "id");
CREATE UNIQUE INDEX "Lead_organizationId_clientCompanyId_id_key" ON "Lead"("organizationId", "clientCompanyId", "id");
CREATE UNIQUE INDEX "Conversation_organizationId_clientCompanyId_id_key" ON "Conversation"("organizationId", "clientCompanyId", "id");
CREATE UNIQUE INDEX "Conversation_organizationId_id_channelConnectionId_key" ON "Conversation"("organizationId", "id", "channelConnectionId");

ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_company_scope_check"
CHECK ("role" = 'ZYRVA_ADMIN' OR "clientCompanyId" IS NOT NULL);
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_version_requires_agent_check"
CHECK ("agentVersionId" IS NULL OR "agentId" IS NOT NULL);
ALTER TABLE "KnowledgeChunk" ADD CONSTRAINT "KnowledgeChunk_org_company_tenant_fkey"
FOREIGN KEY ("organizationId", "clientCompanyId") REFERENCES "ClientCompany"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KnowledgeChunk" ADD CONSTRAINT "KnowledgeChunk_org_company_source_scope_fkey"
FOREIGN KEY ("organizationId", "clientCompanyId", "sourceId") REFERENCES "KnowledgeSource"("organizationId", "clientCompanyId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KnowledgeChunk" ADD CONSTRAINT "KnowledgeChunk_org_company_agent_scope_fkey"
FOREIGN KEY ("organizationId", "clientCompanyId", "agentId") REFERENCES "Agent"("organizationId", "clientCompanyId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_published_own_version_scope_fkey"
FOREIGN KEY ("organizationId", "id", "publishedVersionId") REFERENCES "AgentVersion"("organizationId", "agentId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "KnowledgeSource" ADD CONSTRAINT "KnowledgeSource_org_company_agent_scope_fkey"
FOREIGN KEY ("organizationId", "clientCompanyId", "agentId") REFERENCES "Agent"("organizationId", "clientCompanyId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "ChannelConnection" ADD CONSTRAINT "ChannelConnection_org_company_agent_scope_fkey"
FOREIGN KEY ("organizationId", "clientCompanyId", "agentId") REFERENCES "Agent"("organizationId", "clientCompanyId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_org_company_contact_scope_fkey"
FOREIGN KEY ("organizationId", "clientCompanyId", "contactId") REFERENCES "Contact"("organizationId", "clientCompanyId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_org_company_agent_scope_fkey"
FOREIGN KEY ("organizationId", "clientCompanyId", "agentId") REFERENCES "Agent"("organizationId", "clientCompanyId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_agent_own_version_scope_fkey"
FOREIGN KEY ("organizationId", "agentId", "agentVersionId") REFERENCES "AgentVersion"("organizationId", "agentId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_org_company_channel_scope_fkey"
FOREIGN KEY ("organizationId", "clientCompanyId", "channelConnectionId") REFERENCES "ChannelConnection"("organizationId", "clientCompanyId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_org_company_contact_scope_fkey"
FOREIGN KEY ("organizationId", "clientCompanyId", "contactId") REFERENCES "Contact"("organizationId", "clientCompanyId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_org_company_lead_scope_fkey"
FOREIGN KEY ("organizationId", "clientCompanyId", "leadId") REFERENCES "Lead"("organizationId", "clientCompanyId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversation_channel_scope_fkey"
FOREIGN KEY ("organizationId", "conversationId", "channelConnectionId") REFERENCES "Conversation"("organizationId", "id", "channelConnectionId") ON DELETE NO ACTION ON UPDATE CASCADE;
