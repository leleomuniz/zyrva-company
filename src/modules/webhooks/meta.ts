import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

const MetaWebhookSchema = z
  .object({
    object: z.string(),
    entry: z
      .array(
        z
          .object({
            id: z.string().optional(),
            changes: z.array(
              z
                .object({
                  field: z.string(),
                  value: z.record(z.string(), z.unknown()),
                })
                .passthrough(),
            ),
          })
          .passthrough(),
      )
      .default([]),
  })
  .passthrough();

export interface MetaWebhookEvent {
  provider: "meta_whatsapp";
  externalEventId: string;
  eventType: string;
  phoneNumberId: string | null;
  payload: Record<string, unknown>;
}

export const MetaWebhookEventSchema = z
  .object({
    provider: z.literal("meta_whatsapp"),
    externalEventId: z.string().min(1).max(300),
    eventType: z.string().min(1).max(100),
    phoneNumberId: z.string().regex(/^\d+$/).nullable(),
    payload: z.record(z.string(), z.unknown()),
  })
  .strict();

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.map(asRecord).filter((item): item is Record<string, unknown> => item !== null);
}

export function verifyMetaSignature(rawBody: string | Uint8Array, signature: string | null, appSecret: string): boolean {
  const match = signature?.match(/^sha256=([a-fA-F0-9]{64})$/);
  if (!match || !appSecret) return false;
  const hmac = createHmac("sha256", appSecret);
  const expected = (typeof rawBody === "string" ? hmac.update(rawBody, "utf8") : hmac.update(rawBody)).digest();
  const received = Buffer.from(match[1], "hex");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export function secureTokenEqual(received: string | null, expected: string): boolean {
  if (!received || !expected) return false;
  const receivedHash = createHash("sha256").update(received).digest();
  const expectedHash = createHash("sha256").update(expected).digest();
  return timingSafeEqual(receivedHash, expectedHash);
}

export function payloadHash(rawBody: string | Uint8Array): string {
  return createHash("sha256").update(rawBody).digest("hex");
}

export function extractMetaWebhookEvents(payload: unknown): MetaWebhookEvent[] {
  const parsed = MetaWebhookSchema.parse(payload);
  if (parsed.object !== "whatsapp_business_account") return [];

  const events = new Map<string, MetaWebhookEvent>();
  for (const entry of parsed.entry) {
    for (const change of entry.changes) {
      if (change.field !== "messages") continue;
      const metadata = asRecord(change.value.metadata);
      const phoneNumberId = typeof metadata?.phone_number_id === "string" ? metadata.phone_number_id : null;
      const contacts = asRecordArray(change.value.contacts);

      for (const message of asRecordArray(change.value.messages)) {
        if (typeof message.id !== "string") continue;
        const type = typeof message.type === "string" ? message.type : "unknown";
        const event: MetaWebhookEvent = {
          provider: "meta_whatsapp",
          externalEventId: `message:${message.id}`,
          eventType: `message.${type}`,
          phoneNumberId,
          payload: {
            phoneNumberId,
            message,
            contact:
              contacts.find((contact) => contact.wa_id === message.from) ?? contacts[0] ?? null,
          },
        };
        events.set(event.externalEventId, event);
      }

      for (const status of asRecordArray(change.value.statuses)) {
        if (typeof status.id !== "string" || typeof status.status !== "string") continue;
        const timestamp = typeof status.timestamp === "string" ? status.timestamp : "unknown";
        const event: MetaWebhookEvent = {
          provider: "meta_whatsapp",
          externalEventId: `status:${status.id}:${status.status}:${timestamp}`,
          eventType: `status.${status.status}`,
          phoneNumberId,
          payload: { phoneNumberId, status },
        };
        events.set(event.externalEventId, event);
      }
    }
  }

  return [...events.values()];
}
