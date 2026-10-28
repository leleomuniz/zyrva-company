import { z } from "zod";

import {
  AUTH_COOKIE_NAME,
  authenticateDemoCredentials,
  expiredSessionCookie,
  requireSession,
  sessionCookie,
  signDemoSession,
} from "@/lib/server/auth";
import { errorResponse, json, parseJson } from "@/lib/server/http";
import { consumeRateLimit, requestIp } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LoginSchema = z
  .object({
    email: z.string().trim().email().max(200),
    password: z.string().min(8).max(200),
  })
  .strict();

export async function POST(request: Request): Promise<Response> {
  try {
    const rate = consumeRateLimit(`auth:${requestIp(request)}`, { limit: 5, windowMs: 15 * 60_000 });
    if (!rate.allowed) {
      return json(
        { error: "RATE_LIMITED", message: "Muitas tentativas. Aguarde antes de tentar novamente." },
        { status: 429, headers: { "retry-after": String(rate.retryAfterSeconds) } },
      );
    }

    const credentials = await parseJson(request, LoginSchema);
    if (!authenticateDemoCredentials(credentials.email, credentials.password)) {
      return json({ error: "INVALID_CREDENTIALS", message: "E-mail ou senha inválidos." }, { status: 401 });
    }

    const token = await signDemoSession(credentials.email);
    return json(
      {
        user: {
          id: "user-demo-leonardo",
          name: "Leonardo",
          email: credentials.email.toLowerCase(),
          role: "ZYRVA_ADMIN",
          organizationId: "org-demo-zyrva",
        },
        expiresInSeconds: 28_800,
      },
      { status: 200, headers: { "set-cookie": sessionCookie(token) } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function GET(request: Request): Promise<Response> {
  try {
    const session = await requireSession(request);
    return json({
      user: {
        id: session.sub,
        email: session.email,
        role: session.role,
        organizationId: session.organizationId,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export function DELETE(): Response {
  return json(
    { signedOut: true, cookie: AUTH_COOKIE_NAME },
    { headers: { "set-cookie": expiredSessionCookie() } },
  );
}
