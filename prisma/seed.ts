import "dotenv/config";
import { createHash } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@prisma/client";

import { DEMO_ORGANIZATION_ID, demoAgents } from "../src/modules/agents/demo-data";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL é obrigatória para executar o seed.");

const prisma = new PrismaClient({ adapter: new PrismaPg(databaseUrl) });

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function agentStatus(status: (typeof demoAgents)[number]["status"]): "ACTIVE" | "DRAFT" | "PAUSED" {
  if (status === "active") return "ACTIVE";
  if (status === "paused") return "PAUSED";
  return "DRAFT";
}

async function seed() {
  const userEmail = process.env.DEMO_USER_EMAIL ?? "leonardo@zyrva.demo";
  const user = await prisma.user.upsert({
    where: { email: userEmail },
    update: { name: "Leonardo", isPlatformAdmin: true },
    create: {
      id: "user-demo-leonardo",
      email: userEmail,
      name: "Leonardo",
      isPlatformAdmin: true,
      // Authentication is environment-backed in demo mode; no demo password is persisted.
      passwordHash: null,
    },
  });

  await prisma.organization.upsert({
    where: { id: DEMO_ORGANIZATION_ID },
    update: { name: "ZYRVA Demonstração", status: "ACTIVE" },
    create: {
      id: DEMO_ORGANIZATION_ID,
      slug: "zyrva-demo",
      name: "ZYRVA Demonstração",
      status: "ACTIVE",
      settings: asJson({ demo: true, dataNotice: "Dados inteiramente fictícios." }),
    },
  });

  await prisma.organizationMember.upsert({
    where: { organizationId_userId: { organizationId: DEMO_ORGANIZATION_ID, userId: user.id } },
    update: { role: "ZYRVA_ADMIN" },
    create: { organizationId: DEMO_ORGANIZATION_ID, userId: user.id, role: "ZYRVA_ADMIN" },
  });

  const tools = [
    ["register_lead", "Registrar lead", false],
    ["request_quote", "Solicitar orçamento", false],
    ["request_appointment", "Solicitar agendamento", true],
    ["handoff_to_human", "Encaminhar para humano", false],
  ] as const;
  for (const [key, name, requiresConfirmation] of tools) {
    await prisma.tool.upsert({
      where: { organizationId_key: { organizationId: DEMO_ORGANIZATION_ID, key } },
      update: { name, enabled: true },
      create: {
        id: `tool-${key.replaceAll("_", "-")}`,
        organizationId: DEMO_ORGANIZATION_ID,
        key,
        name,
        description: `${name} com validação e registro de auditoria.`,
        inputSchema: asJson({ type: "object", additionalProperties: false }),
        risk: requiresConfirmation ? "HIGH" : "LOW",
        requiresConfirmation,
      },
    });
  }

  for (const demo of demoAgents) {
    await prisma.clientCompany.upsert({
      where: { id: demo.clientCompanyId },
      update: {
        name: demo.companyName,
        businessType: demo.businessType,
        status: "ACTIVE",
        isDemo: true,
      },
      create: {
        id: demo.clientCompanyId,
        organizationId: DEMO_ORGANIZATION_ID,
        slug: demo.clientCompanyId.replace("company-", ""),
        name: demo.companyName,
        businessType: demo.businessType,
        description: demo.configuration.description,
        status: "ACTIVE",
        isDemo: true,
        settings: asJson({ demo: true }),
      },
    });

    await prisma.agent.upsert({
      where: { id: demo.id },
      update: {
        name: demo.configuration.name,
        description: demo.configuration.description,
        status: agentStatus(demo.status),
        currentDraft: asJson(demo.configuration),
      },
      create: {
        id: demo.id,
        organizationId: DEMO_ORGANIZATION_ID,
        clientCompanyId: demo.clientCompanyId,
        name: demo.configuration.name,
        description: demo.configuration.description,
        status: agentStatus(demo.status),
        currentDraft: asJson(demo.configuration),
      },
    });

    const versionId = `${demo.id}-v${demo.version}`;
    await prisma.agentVersion.upsert({
      where: { agentId_version: { agentId: demo.id, version: demo.version } },
      update: {
        configuration: asJson(demo.configuration),
        status: demo.status === "draft" ? "DRAFT" : "PUBLISHED",
      },
      create: {
        id: versionId,
        organizationId: DEMO_ORGANIZATION_ID,
        agentId: demo.id,
        version: demo.version,
        status: demo.status === "draft" ? "DRAFT" : "PUBLISHED",
        configuration: asJson(demo.configuration),
        changeSummary: "Versão demonstrativa inicial.",
        createdById: user.id,
        publishedById: demo.status === "draft" ? null : user.id,
        publishedAt: demo.status === "draft" ? null : new Date(),
      },
    });

    if (demo.status !== "draft") {
      await prisma.agent.update({
        where: { id: demo.id },
        data: { publishedVersionId: versionId, publishedAt: new Date() },
      });
    }

    for (const source of demo.knowledge) {
      const hash = createHash("sha256").update(source.content).digest("hex");
      await prisma.knowledgeSource.upsert({
        where: { id: source.id },
        update: { title: source.title, rawText: source.content, contentHash: hash, status: "READY" },
        create: {
          id: source.id,
          organizationId: DEMO_ORGANIZATION_ID,
          clientCompanyId: demo.clientCompanyId,
          agentId: demo.id,
          type: "TEXT",
          title: source.title,
          contentHash: hash,
          rawText: source.content,
          status: "READY",
          metadata: asJson({ demo: true, keywords: source.keywords }),
        },
      });
      await prisma.knowledgeChunk.upsert({
        where: { id: `chunk-${source.id}` },
        update: { content: source.content, metadata: asJson({ demo: true }) },
        create: {
          id: `chunk-${source.id}`,
          organizationId: DEMO_ORGANIZATION_ID,
          clientCompanyId: demo.clientCompanyId,
          sourceId: source.id,
          agentId: demo.id,
          sequence: 0,
          content: source.content,
          metadata: asJson({ demo: true }),
        },
      });
    }

    for (const toolKey of demo.configuration.authorizedTools) {
      const tool = await prisma.tool.findUnique({
        where: { organizationId_key: { organizationId: DEMO_ORGANIZATION_ID, key: toolKey } },
      });
      if (!tool) continue;
      await prisma.agentTool.upsert({
        where: { agentId_toolId: { agentId: demo.id, toolId: tool.id } },
        update: { enabled: true },
        create: {
          organizationId: DEMO_ORGANIZATION_ID,
          agentId: demo.id,
          toolId: tool.id,
          enabled: true,
        },
      });
    }
  }

  const operationalFixtures = [
    {
      suffix: "rbr",
      companyId: "company-rbr-garage",
      agentId: "rbr-garage-agent",
      name: "Marina Costa",
      phone: "+5585999990101",
      desiredService: "Vitrificação de pintura",
      text: "Quero avaliar a vitrificação do meu carro.",
    },
    {
      suffix: "serra",
      companyId: "company-serra-doces",
      agentId: "serra-doces-agent",
      name: "Rafael Lima",
      phone: "+5585999990102",
      desiredService: "Bolo comemorativo",
      text: "Preciso de um bolo para uma comemoração.",
    },
    {
      suffix: "educallis",
      companyId: "company-educallis",
      agentId: "educallis-agent",
      name: "Carla Nunes",
      phone: "+5585999990103",
      desiredService: "Ensino fundamental",
      text: "Gostaria de informações sobre matrícula.",
    },
  ] as const;

  for (const fixture of operationalFixtures) {
    const contactId = `contact-demo-${fixture.suffix}`;
    const leadId = `lead-demo-${fixture.suffix}`;
    const conversationId = `conversation-demo-${fixture.suffix}`;
    await prisma.contact.upsert({
      where: { id: contactId },
      update: { name: fixture.name },
      create: {
        id: contactId,
        organizationId: DEMO_ORGANIZATION_ID,
        clientCompanyId: fixture.companyId,
        phone: fixture.phone,
        name: fixture.name,
        consentAt: new Date(),
        consentSource: "demo_fixture",
        metadata: asJson({ demo: true }),
      },
    });
    await prisma.lead.upsert({
      where: { id: leadId },
      update: { desiredService: fixture.desiredService, lastInteractionAt: new Date() },
      create: {
        id: leadId,
        organizationId: DEMO_ORGANIZATION_ID,
        clientCompanyId: fixture.companyId,
        contactId,
        name: fixture.name,
        phone: fixture.phone,
        desiredService: fixture.desiredService,
        source: "demo_playground",
        stage: "QUALIFYING",
        tags: ["demo"],
        consent: true,
        consentAt: new Date(),
      },
    });
    await prisma.conversation.upsert({
      where: { id: conversationId },
      update: { lastMessageAt: new Date() },
      create: {
        id: conversationId,
        organizationId: DEMO_ORGANIZATION_ID,
        clientCompanyId: fixture.companyId,
        agentId: fixture.agentId,
        contactId,
        leadId,
        status: fixture.suffix === "educallis" ? "WAITING_HUMAN" : "AI_ACTIVE",
        mode: fixture.suffix === "educallis" ? "PAUSED" : "AI",
        intent: "commercial_interest",
        collectedData: asJson({ desiredService: fixture.desiredService }),
      },
    });
    await prisma.message.upsert({
      where: { id: `message-demo-${fixture.suffix}` },
      update: { text: fixture.text },
      create: {
        id: `message-demo-${fixture.suffix}`,
        organizationId: DEMO_ORGANIZATION_ID,
        conversationId,
        direction: "INBOUND",
        sender: "CONTACT",
        contentType: "TEXT",
        text: fixture.text,
        status: "RECEIVED",
        sourceIds: [],
        payload: asJson({ demo: true }),
      },
    });
  }

  await prisma.auditLog.upsert({
    where: { id: "audit-demo-seed" },
    update: { metadata: asJson({ demo: true, refreshedAt: new Date().toISOString() }) },
    create: {
      id: "audit-demo-seed",
      organizationId: DEMO_ORGANIZATION_ID,
      actorUserId: user.id,
      action: "demo.seeded",
      entityType: "Organization",
      entityId: DEMO_ORGANIZATION_ID,
      metadata: asJson({ demo: true }),
    },
  });
}

seed()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error instanceof Error ? error.message : "Falha ao criar dados demonstrativos.");
    await prisma.$disconnect();
    process.exitCode = 1;
  });
