import { requiredEnv } from "@/lib/server/env";
import { errorResponse, json } from "@/lib/server/http";
import { consumeRateLimit, requestIp } from "@/lib/server/rate-limit";
import { ingestWebhookEvents, webhookInfrastructure } from "@/lib/server/webhook-ingestion";
import {
  extractMetaWebhookEvents,
  payloadHash,
  secureTokenEqual,
  verifyMetaSignature,
} from "@/modules/webhooks/meta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request): Response {
  try {
    const url = new URL(request.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    const expectedToken = requiredEnv("META_WEBHOOK_VERIFY_TOKEN", 16);

    if (mode !== "subscribe" || !challenge || !secureTokenEqual(token, expectedToken)) {
      return new Response("Forbidden", { status: 403 });
    }
    return new Response(challenge, {
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const rate = consumeRateLimit(`webhook:meta:${requestIp(request)}`, { limit: 600, windowMs: 60_000 });
    if (!rate.allowed) {
      return json({ error: "RATE_LIMITED", message: "Taxa de webhooks excedida." }, { status: 429 });
    }

    const declaredLength = Number(request.headers.get("content-length") ?? 0);
    if (declaredLength > 1_000_000) {
      return json({ error: "PAYLOAD_TOO_LARGE", message: "Evento excede o limite permitido." }, { status: 413 });
    }

    const rawBody = new Uint8Array(await request.arrayBuffer());
    if (rawBody.byteLength > 1_000_000) {
      return json({ error: "PAYLOAD_TOO_LARGE", message: "Evento excede o limite permitido." }, { status: 413 });
    }
    const signature = request.headers.get("x-hub-signature-256");
    if (!verifyMetaSignature(rawBody, signature, requiredEnv("META_APP_SECRET", 16))) {
      return json({ error: "INVALID_SIGNATURE", message: "Assinatura inválida." }, { status: 401 });
    }

    let payload: unknown;
    try {
      payload = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(rawBody));
    } catch {
      return json({ error: "INVALID_JSON", message: "Evento inválido." }, { status: 400 });
    }
    const events = extractMetaWebhookEvents(payload);
    const infrastructure = webhookInfrastructure();
    const result = await ingestWebhookEvents(
      events,
      payloadHash(rawBody),
      infrastructure.repository,
      infrastructure.queue,
    );

    // Only validation, durable reservation and queueing happen before this ACK.
    return json({ received: true, ...result });
  } catch (error) {
    return errorResponse(error);
  }
}
