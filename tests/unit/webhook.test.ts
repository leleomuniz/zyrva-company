import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

import {
  MemoryWebhookEventRepository,
  MemoryWebhookQueue,
  WebhookQueueError,
  ingestWebhookEvents,
} from "@/lib/server/webhook-ingestion";
import { extractMetaWebhookEvents, payloadHash, verifyMetaSignature } from "@/modules/webhooks/meta";

const payload = {
  object: "whatsapp_business_account",
  entry: [
    {
      id: "waba-1",
      changes: [
        {
          field: "messages",
          value: {
            metadata: { phone_number_id: "1234567890" },
            messages: [{ id: "wamid.message-1", from: "5585999999999", timestamp: "1", type: "text", text: { body: "ação" } }],
            statuses: [{ id: "wamid.out-1", status: "delivered", timestamp: "2" }],
          },
        },
      ],
    },
  ],
};

describe("webhook da Meta", () => {
  it("valida HMAC sobre os bytes exatos, incluindo Unicode", () => {
    const bytes = new TextEncoder().encode(JSON.stringify(payload));
    const secret = "meta-secret-for-tests";
    const signature = `sha256=${createHmac("sha256", secret).update(bytes).digest("hex")}`;

    expect(verifyMetaSignature(bytes, signature, secret)).toBe(true);
    const changed = new Uint8Array(bytes);
    changed[changed.length - 2] ^= 1;
    expect(verifyMetaSignature(changed, signature, secret)).toBe(false);
    expect(payloadHash(bytes)).toHaveLength(64);
  });

  it("extrai mensagens e status com chaves idempotentes", () => {
    const events = extractMetaWebhookEvents(payload);
    expect(events).toHaveLength(2);
    expect(events.map((event) => event.eventType)).toEqual(["message.text", "status.delivered"]);
    expect(events.every((event) => event.phoneNumberId === "1234567890")).toBe(true);
  });

  it("reserva e enfileira uma única vez", async () => {
    const repository = new MemoryWebhookEventRepository();
    const queue = new MemoryWebhookQueue();
    const events = extractMetaWebhookEvents(payload);

    expect(await ingestWebhookEvents(events, "hash", repository, queue)).toEqual({ accepted: 2, duplicates: 0 });
    expect(await ingestWebhookEvents(events, "hash", repository, queue)).toEqual({ accepted: 0, duplicates: 2 });
    expect(queue.jobs).toHaveLength(2);
  });

  it("marca falha de fila e permite uma nova tentativa", async () => {
    const repository = new MemoryWebhookEventRepository();
    const queue = { enqueue: vi.fn().mockRejectedValue(new Error("offline")) };
    const [event] = extractMetaWebhookEvents(payload);

    await expect(ingestWebhookEvents([event], "hash", repository, queue)).rejects.toBeInstanceOf(WebhookQueueError);
    expect(repository.status(event.externalEventId)).toBe("FAILED");
    const retryQueue = new MemoryWebhookQueue();
    expect(await ingestWebhookEvents([event], "hash", repository, retryQueue)).toEqual({ accepted: 1, duplicates: 0 });
  });

  it("recupera evento reservado quando houve falha antes do enqueue", async () => {
    const repository = new MemoryWebhookEventRepository();
    const queue = new MemoryWebhookQueue();
    const [event] = extractMetaWebhookEvents(payload);

    expect(await repository.reserve(event, "hash")).toBe(true);
    expect(repository.status(event.externalEventId)).toBe("RECEIVED");
    expect(await ingestWebhookEvents([event], "hash", repository, queue)).toEqual({ accepted: 1, duplicates: 0 });
    expect(queue.jobs).toHaveLength(1);
    expect(repository.status(event.externalEventId)).toBe("QUEUED");
  });
});
