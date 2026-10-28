import { afterEach, describe, expect, it, vi } from "vitest";

import { signDemoSession, verifySessionToken } from "@/lib/server/auth";
import { consumeRateLimit, requestIp, resetRateLimitsForTests } from "@/lib/server/rate-limit";
import { hasPermission } from "@/modules/auth/rbac";
import { InMemoryTenantRepository } from "@/modules/tenancy/tenant-repository";

afterEach(() => {
  vi.unstubAllEnvs();
  resetRateLimitsForTests();
});

describe("autenticação, RBAC e isolamento", () => {
  it("assina e verifica uma sessão demo vinculada à organização", async () => {
    vi.stubEnv("APP_MODE", "test");
    vi.stubEnv("AUTH_SECRET", "uma-chave-de-testes-com-pelo-menos-32-bytes");
    const token = await signDemoSession("leonardo@zyrva.demo");
    const session = await verifySessionToken(token);

    expect(session.organizationId).toBe("org-demo-zyrva");
    expect(session.role).toBe("ZYRVA_ADMIN");
    await expect(verifySessionToken(`${token}x`)).rejects.toThrow(/Sessão inválida/i);
  });

  it("não permite emitir login demo em produção", async () => {
    vi.stubEnv("APP_MODE", "production");
    vi.stubEnv("AUTH_SECRET", "uma-chave-de-testes-com-pelo-menos-32-bytes");
    await expect(signDemoSession("leonardo@zyrva.demo")).rejects.toThrow(/desativado/i);
  });

  it("rejeita o segredo local conhecido e sessões demo em produção", async () => {
    vi.stubEnv("APP_MODE", "test");
    vi.stubEnv("AUTH_SECRET", "change-me-local-demo-auth-secret");
    const tokenWithKnownSecret = await signDemoSession("leonardo@zyrva.demo");
    vi.stubEnv("APP_MODE", "production");
    await expect(verifySessionToken(tokenWithKnownSecret)).rejects.toThrow(/Sessão inválida/i);

    vi.stubEnv("APP_MODE", "test");
    vi.stubEnv("AUTH_SECRET", "uma-chave-de-producao-forte-com-mais-de-32-bytes");
    const demoToken = await signDemoSession("leonardo@zyrva.demo");

    vi.stubEnv("APP_MODE", "production");
    await expect(verifySessionToken(demoToken)).rejects.toThrow(/Sessão inválida/i);
  });

  it("aplica a matriz de permissões por função", () => {
    expect(hasPermission("ATTENDANT", "conversation:reply")).toBe(true);
    expect(hasPermission("ATTENDANT", "agent:publish")).toBe(false);
    expect(hasPermission("VIEWER", "lead:write")).toBe(false);
    expect(hasPermission("ZYRVA_ADMIN", "audit:read")).toBe(true);
  });

  it("filtra leituras e rejeita gravação entre organizações e empresas", () => {
    const repository = new InMemoryTenantRepository([
      { id: "a", organizationId: "org-a", clientCompanyId: "company-a", name: "A" },
      { id: "b", organizationId: "org-b", clientCompanyId: "company-b", name: "B" },
      { id: "c", organizationId: "org-a", clientCompanyId: "company-c", name: "C" },
    ]);
    const context = {
      organizationId: "org-a",
      clientCompanyId: "company-a",
      userId: "user-a",
      role: "COMPANY_MANAGER" as const,
    };

    expect(repository.list(context).map((record) => record.id)).toEqual(["a"]);
    expect(repository.findById(context, "b")).toBeNull();
    expect(repository.findById(context, "c")).toBeNull();
    expect(() => repository.save(context, {
      id: "d",
      organizationId: "org-a",
      clientCompanyId: "company-c",
      name: "D",
    })).toThrow(
      /fora do escopo/i,
    );
  });

  it("limita requisições dentro da janela", () => {
    const first = consumeRateLimit("unit:ip", { limit: 2, windowMs: 1_000 }, 100);
    const second = consumeRateLimit("unit:ip", { limit: 2, windowMs: 1_000 }, 200);
    const third = consumeRateLimit("unit:ip", { limit: 2, windowMs: 1_000 }, 300);
    const reset = consumeRateLimit("unit:ip", { limit: 2, windowMs: 1_000 }, 1_101);

    expect([first.allowed, second.allowed, third.allowed, reset.allowed]).toEqual([true, true, false, true]);
  });

  it("só confia no IP encaminhado quando o proxy foi explicitamente habilitado", () => {
    const request = new Request("http://localhost", {
      headers: { "x-forwarded-for": "203.0.113.10, 10.0.0.1" },
    });
    expect(requestIp(request)).toBe("direct");
    vi.stubEnv("TRUST_PROXY", "true");
    expect(requestIp(request)).toBe("203.0.113.10");
    expect(requestIp(new Request("http://localhost", {
      headers: { "x-forwarded-for": "valor-controlado" },
    }))).toBe("proxy-unknown");
  });

  it("exige proxy confiavel para rate limiting em producao", () => {
    vi.stubEnv("APP_MODE", "production");
    vi.stubEnv("TRUST_PROXY", "false");
    expect(() => requestIp(new Request("http://localhost"))).toThrow(/TRUST_PROXY/);
  });
});
