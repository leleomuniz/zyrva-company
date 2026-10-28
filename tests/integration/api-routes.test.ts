import { createHmac } from "node:crypto";
import { SignJWT } from "jose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST as login } from "@/app/api/auth/demo/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { POST as generate } from "@/app/api/agents/generate/route";
import { GET as listAgents } from "@/app/api/agents/route";
import { POST as playground } from "@/app/api/playground/message/route";
import { GET as verifyWebhook, POST as receiveWebhook } from "@/app/api/webhooks/meta/route";
import { resetRateLimitsForTests } from "@/lib/server/rate-limit";

const authSecret = "integration-auth-secret-with-more-than-32-bytes";

beforeEach(() => {
  vi.stubEnv("APP_MODE", "test");
  vi.stubEnv("AUTH_SECRET", authSecret);
  vi.stubEnv("DEMO_USER_EMAIL", "leonardo@zyrva.demo");
  vi.stubEnv("DEMO_USER_PASSWORD", "ZyrvaDemo!2026");
  vi.stubEnv("META_APP_SECRET", "meta-app-secret-long-enough");
  vi.stubEnv("META_WEBHOOK_VERIFY_TOKEN", "meta-verify-token-long-enough");
  resetRateLimitsForTests();
});

afterEach(() => {
  vi.unstubAllEnvs();
  resetRateLimitsForTests();
});

async function authenticatedCookie(): Promise<string> {
  const response = await login(
    new Request("http://localhost/api/auth/demo", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "leonardo@zyrva.demo", password: "ZyrvaDemo!2026" }),
    }),
  );
  expect(response.status).toBe(200);
  return response.headers.get("set-cookie")?.split(";")[0] ?? "";
}

async function sessionCookieFor(input: {
  organizationId: string;
  role?: "ZYRVA_ADMIN" | "COMPANY_MANAGER";
  clientCompanyId?: string;
  mode?: "demo" | "production";
}): Promise<string> {
  const token = await new SignJWT({
    email: "tenant-test@zyrva.demo",
    organizationId: input.organizationId,
    clientCompanyId: input.clientCompanyId,
    role: input.role ?? "ZYRVA_ADMIN",
    mode: input.mode ?? "demo",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject("tenant-test-user")
    .setIssuer("zyrva-agents")
    .setAudience("zyrva-dashboard")
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(new TextEncoder().encode(authSecret));
  return `zyrva_session=${token}`;
}

describe("route handlers", () => {
  it("autentica, gera rascunho e executa playground com sessão assinada", async () => {
    const cookie = await authenticatedCookie();
    const generation = await generate(
      new Request("http://localhost/api/agents/generate", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({
          description: "Crie um agente para oficina automotiva que registre leads e encaminhe orçamentos.",
          companyId: "company-rbr",
        }),
      }),
    );
    expect(generation.status).toBe(201);
    const generatedPayload = await generation.json();
    expect(generatedPayload.draft.config.services).toContain("Lavagem técnica");
    expect(generatedPayload.data.requiresHumanReview).toBe(true);

    const simulation = await playground(
      new Request("http://localhost/api/playground/message", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ agentId: "agent-ravi", companyId: "company-rbr", mode: "published", message: "Qual o preço da lavagem?" }),
      }),
    );
    expect(simulation.status).toBe(200);
    const simulationPayload = await simulation.json();
    expect(simulationPayload.data.sourceIds).toContain("rbr-catalog");

    const signedOut = logout();
    expect(signedOut.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it("protege as rotas privadas e rejeita corpo acima do limite", async () => {
    const unauthorized = await generate(
      new Request("http://localhost/api/agents/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ description: "Descrição suficientemente longa para passar pela validação." }),
      }),
    );
    expect(unauthorized.status).toBe(401);

    const malformedCookie = await listAgents(
      new Request("http://localhost/api/agents", {
        headers: { cookie: "zyrva_session=%E0%A4%A" },
      }),
    );
    expect(malformedCookie.status).toBe(401);

    const oversized = await login(
      new Request("http://localhost/api/auth/demo", {
        method: "POST",
        headers: { "content-type": "application/json", "content-length": "70000" },
        body: JSON.stringify({ email: "leonardo@zyrva.demo", password: "x".repeat(70_000) }),
      }),
    );
    expect(oversized.status).toBe(413);
  });

  it("retorna erro estruturado quando o proxy de producao nao esta configurado", async () => {
    vi.stubEnv("APP_MODE", "production");
    vi.stubEnv("TRUST_PROXY", "false");
    const response = await listAgents(new Request("http://localhost/api/agents"));
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ error: "CONFIGURATION_ERROR" });
  });

  it("não permite executar um agente de outra organização ou empresa", async () => {
    const otherOrganization = await sessionCookieFor({ organizationId: "org-outra" });
    const crossOrganization = await playground(
      new Request("http://localhost/api/playground/message", {
        method: "POST",
        headers: { "content-type": "application/json", cookie: otherOrganization },
        body: JSON.stringify({ agentId: "rbr-garage-agent", message: "Qual é o preço?" }),
      }),
    );
    expect(crossOrganization.status).toBe(403);

    const wrongCompany = await sessionCookieFor({
      organizationId: "org-demo-zyrva",
      role: "COMPANY_MANAGER",
      clientCompanyId: "company-serra-doces",
    });
    const crossCompany = await playground(
      new Request("http://localhost/api/playground/message", {
        method: "POST",
        headers: { "content-type": "application/json", cookie: wrongCompany },
        body: JSON.stringify({ agentId: "rbr-garage-agent", message: "Qual é o preço?" }),
      }),
    );
    expect(crossCompany.status).toBe(403);

    const scopedList = await listAgents(
      new Request("http://localhost/api/agents", { headers: { cookie: wrongCompany } }),
    );
    expect(scopedList.status).toBe(200);
    const scopedPayload = await scopedList.json();
    expect(scopedPayload.data).toHaveLength(1);
    expect(scopedPayload.data[0].clientCompanyId).toBe("company-serra-doces");
  });

  it("rejeita geracao para outra empresa e falha fechado em producao", async () => {
    const scopedCookie = await sessionCookieFor({
      organizationId: "org-demo-zyrva",
      role: "COMPANY_MANAGER",
      clientCompanyId: "company-rbr",
    });
    const crossCompany = await generate(
      new Request("http://localhost/api/agents/generate", {
        method: "POST",
        headers: { "content-type": "application/json", cookie: scopedCookie },
        body: JSON.stringify({
          description: "Crie um agente de atendimento comercial para esta empresa cliente.",
          companyId: "company-serra-doces",
        }),
      }),
    );
    expect(crossCompany.status).toBe(403);

    vi.stubEnv("APP_MODE", "production");
    vi.stubEnv("TRUST_PROXY", "true");
    const productionCookie = await sessionCookieFor({
      organizationId: "org-production",
      mode: "production",
    });
    const withoutProvider = await generate(
      new Request("http://localhost/api/agents/generate", {
        method: "POST",
        headers: { "content-type": "application/json", cookie: productionCookie },
        body: JSON.stringify({
          description: "Crie um agente de atendimento comercial para esta organizacao.",
          useAI: false,
        }),
      }),
    );
    expect(withoutProvider.status).toBe(503);
    await expect(withoutProvider.json()).resolves.toMatchObject({ error: "CONFIGURATION_ERROR" });
  });

  it("verifica handshake, HMAC e idempotência do webhook", async () => {
    const verification = verifyWebhook(
      new Request(
        "http://localhost/api/webhooks/meta?hub.mode=subscribe&hub.verify_token=meta-verify-token-long-enough&hub.challenge=abc123",
      ),
    );
    expect(verification.status).toBe(200);
    await expect(verification.text()).resolves.toBe("abc123");

    const body = JSON.stringify({
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              field: "messages",
              value: {
                metadata: { phone_number_id: "1234567890" },
                messages: [{ id: `wamid.integration-${Date.now()}`, from: "5585999999999", type: "text", text: { body: "Olá" } }],
              },
            },
          ],
        },
      ],
    });
    const signature = `sha256=${createHmac("sha256", "meta-app-secret-long-enough").update(body).digest("hex")}`;
    const makeRequest = () =>
      new Request("http://localhost/api/webhooks/meta", {
        method: "POST",
        headers: { "content-type": "application/json", "x-hub-signature-256": signature },
        body,
      });

    const accepted = await receiveWebhook(makeRequest());
    expect(accepted.status).toBe(200);
    expect(await accepted.json()).toMatchObject({ received: true, accepted: 1, duplicates: 0 });
    const duplicate = await receiveWebhook(makeRequest());
    expect(await duplicate.json()).toMatchObject({ accepted: 0, duplicates: 1 });

    const invalid = await receiveWebhook(
      new Request("http://localhost/api/webhooks/meta", {
        method: "POST",
        headers: { "x-hub-signature-256": `sha256=${"0".repeat(64)}` },
        body,
      }),
    );
    expect(invalid.status).toBe(401);
  });
});
