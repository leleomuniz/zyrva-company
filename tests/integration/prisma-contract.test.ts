import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("contrato PostgreSQL multiempresa", () => {
  it("inclui entidades mínimas e organizationId nas entidades de negócio", async () => {
    const schema = await readFile("prisma/schema.prisma", "utf8");
    const requiredModels = [
      "User",
      "Organization",
      "OrganizationMember",
      "ClientCompany",
      "Agent",
      "AgentVersion",
      "KnowledgeSource",
      "KnowledgeChunk",
      "ChannelConnection",
      "Contact",
      "Lead",
      "Conversation",
      "Message",
      "Tool",
      "Automation",
      "WebhookEvent",
      "UsageRecord",
      "AuditLog",
    ];
    for (const model of requiredModels) expect(schema).toContain(`model ${model} {`);
    expect(schema).toContain("enum OrganizationRole");
    expect(schema).toContain("@@unique([provider, externalEventId])");
  });

  it("habilita pgvector, HNSW e FKs compostas de tenant na migration", async () => {
    const migration = await readFile("prisma/migrations/20260806153000_init/migration.sql", "utf8");
    expect(migration).toContain("CREATE EXTENSION IF NOT EXISTS vector");
    expect(migration).toContain("KnowledgeChunk_embedding_hnsw_idx");
    expect(migration).toContain("Agent_org_company_tenant_fkey");
    expect(migration).toContain("Message_org_conversation_tenant_fkey");
    expect(migration).toContain("Agent_published_own_version_scope_fkey");
    expect(migration).toContain("Conversation_org_company_agent_scope_fkey");
    expect(migration).toContain("KnowledgeChunk_org_company_source_scope_fkey");
    expect(migration).toContain("WebhookEvent_provider_externalEventId_key");
  });

  it("mantém nomes únicos e chaves client-company alinhadas com o schema", async () => {
    const [schema, migration] = await Promise.all([
      readFile("prisma/schema.prisma", "utf8"),
      readFile("prisma/migrations/20260806153000_init/migration.sql", "utf8"),
    ]);
    const names = [
      ...migration.matchAll(/CREATE (?:UNIQUE )?INDEX "([^"]+)"/g),
      ...migration.matchAll(/CONSTRAINT "([^"]+)"/g),
    ].map((match) => match[1]);
    expect(new Set(names).size).toBe(names.length);

    const scopedKeys = [
      "Agent_organizationId_clientCompanyId_id_key",
      "KnowledgeSource_organizationId_clientCompanyId_id_key",
      "ChannelConnection_organizationId_clientCompanyId_id_key",
      "Contact_organizationId_clientCompanyId_id_key",
      "Lead_organizationId_clientCompanyId_id_key",
      "Conversation_organizationId_clientCompanyId_id_key",
    ];
    for (const key of scopedKeys) expect(migration).toContain(`CREATE UNIQUE INDEX "${key}"`);
    expect(schema).toContain("clientCompanyId String\n  sourceId");
    expect(migration).toContain('FOREIGN KEY ("organizationId", "clientCompanyId", "contactId")');
    expect(migration).toContain('FOREIGN KEY ("organizationId", "id", "publishedVersionId")');
  });
});
