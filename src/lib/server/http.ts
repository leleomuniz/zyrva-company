import { ZodError, type ZodType } from "zod";

import { AuthenticationError } from "@/lib/server/auth";
import { ConfigurationError } from "@/lib/server/env";
import { AuthorizationError } from "@/modules/auth/rbac";

const API_HEADERS = {
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8",
  "x-content-type-options": "nosniff",
};

export function json(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { ...API_HEADERS, ...init.headers },
  });
}

export async function parseJson<T>(request: Request, schema: ZodType<T>, maxBytes = 65_536): Promise<T> {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    const error = new Error("O corpo excede o limite permitido.") as Error & { status: number };
    error.status = 413;
    throw error;
  }

  let body: unknown;
  try {
    const bytes = new Uint8Array(await request.arrayBuffer());
    if (bytes.byteLength > maxBytes) {
      const error = new Error("O corpo excede o limite permitido.") as Error & { status: number };
      error.status = 413;
      throw error;
    }
    body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch (error) {
    if (error instanceof Error && "status" in error) throw error;
    throw new ZodError([
      { code: "custom", path: [], message: "O corpo deve ser JSON válido." },
    ]);
  }
  return schema.parse(body);
}

export function errorResponse(error: unknown): Response {
  if (error instanceof ZodError) {
    return json(
      {
        error: "VALIDATION_ERROR",
        message: "Dados inválidos.",
        issues: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
      },
      { status: 400 },
    );
  }
  if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
    return json({ error: error.name, message: error.message }, { status: error.status });
  }
  if (error instanceof ConfigurationError) {
    return json({ error: error.code, message: "Integração não configurada." }, { status: 503 });
  }
  const status =
    typeof error === "object" && error && "status" in error && typeof error.status === "number"
      ? error.status
      : 500;
  const message = status < 500 && error instanceof Error ? error.message : "Erro interno do servidor.";
  return json({ error: "REQUEST_FAILED", message }, { status });
}
