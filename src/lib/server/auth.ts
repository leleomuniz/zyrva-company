import { createHash, timingSafeEqual } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";
import { z } from "zod";

import { OrganizationRoleSchema } from "@/modules/auth/rbac";
import { DEMO_ORGANIZATION_ID } from "@/modules/agents/demo-data";
import { appMode, optionalEnv } from "@/lib/server/env";

export const AUTH_COOKIE_NAME = "zyrva_session";
const ISSUER = "zyrva-agents";
const AUDIENCE = "zyrva-dashboard";
const UNSAFE_PRODUCTION_SECRETS = new Set([
  "change-me-local-demo-auth-secret",
  "zyrva-local-test-secret-is-not-for-production",
]);

export const SessionSchema = z
  .object({
    sub: z.string().min(1),
    email: z.string().email(),
    organizationId: z.string().min(1),
    clientCompanyId: z.string().min(1).optional(),
    role: OrganizationRoleSchema,
    mode: z.enum(["demo", "production"]),
  })
  .passthrough()
  .superRefine((session, context) => {
    if (session.role !== "ZYRVA_ADMIN" && !session.clientCompanyId) {
      context.addIssue({
        code: "custom",
        path: ["clientCompanyId"],
        message: "O escopo da empresa cliente é obrigatório para esta função.",
      });
    }
  });

export type Session = z.infer<typeof SessionSchema>;

export class AuthenticationError extends Error {
  readonly status = 401;

  constructor(message = "Sessão inválida ou expirada.") {
    super(message);
    this.name = "AuthenticationError";
  }
}

function secret(): Uint8Array {
  const configured = optionalEnv("AUTH_SECRET");
  const production = appMode() === "production";
  if (
    configured &&
    configured.length >= 32 &&
    (!production || !UNSAFE_PRODUCTION_SECRETS.has(configured))
  ) {
    return new TextEncoder().encode(configured);
  }
  if (production) throw new AuthenticationError("Autenticação não configurada.");

  // Local/test-only fallback. Production always requires AUTH_SECRET.
  return new TextEncoder().encode("zyrva-local-test-secret-is-not-for-production");
}

function sameSecretValue(left: string, right: string): boolean {
  const leftHash = createHash("sha256").update(left).digest();
  const rightHash = createHash("sha256").update(right).digest();
  return timingSafeEqual(leftHash, rightHash);
}

export function demoCredentials(): { email: string; password: string } {
  if (appMode() === "production") {
    throw new AuthenticationError("O login demonstrativo está desativado em produção.");
  }

  return {
    email: optionalEnv("DEMO_USER_EMAIL") ?? "leonardo@zyrva.demo",
    password: optionalEnv("DEMO_USER_PASSWORD") ?? "ZyrvaDemo!2026",
  };
}

export function authenticateDemoCredentials(email: string, password: string): boolean {
  const expected = demoCredentials();
  return sameSecretValue(email.trim().toLowerCase(), expected.email.toLowerCase()) && sameSecretValue(password, expected.password);
}

export async function signDemoSession(email: string, expiration = "8h"): Promise<string> {
  if (appMode() === "production") {
    throw new AuthenticationError("O login demonstrativo está desativado em produção.");
  }

  return new SignJWT({
    email: email.toLowerCase(),
    organizationId: DEMO_ORGANIZATION_ID,
    role: "ZYRVA_ADMIN",
    mode: "demo",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject("user-demo-leonardo")
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(expiration)
    .sign(secret());
}

export async function verifySessionToken(token: string): Promise<Session> {
  try {
    const { payload } = await jwtVerify(token, secret(), {
      algorithms: ["HS256"],
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    const session = SessionSchema.parse(payload);
    if (appMode() === "production" && session.mode !== "production") {
      throw new AuthenticationError();
    }
    return session;
  } catch {
    throw new AuthenticationError();
  }
}

function cookieValue(request: Request, name: string): string | undefined {
  const cookie = request.headers.get("cookie");
  if (!cookie) return undefined;
  for (const pair of cookie.split(";")) {
    const [key, ...value] = pair.trim().split("=");
    if (key === name) {
      try {
        return decodeURIComponent(value.join("="));
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

export async function requireSession(request: Request): Promise<Session> {
  const authorization = request.headers.get("authorization");
  const bearer = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  const token = bearer ?? cookieValue(request, AUTH_COOKIE_NAME);
  if (!token) throw new AuthenticationError();
  return verifySessionToken(token);
}

export function sessionCookie(token: string): string {
  const secure = appMode() === "production" ? "; Secure" : "";
  return `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800${secure}`;
}

export function expiredSessionCookie(): string {
  const secure = appMode() === "production" ? "; Secure" : "";
  return `${AUTH_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}
