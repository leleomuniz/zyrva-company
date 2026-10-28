import { createHash } from "node:crypto";
import { Queue } from "bullmq";
import { Prisma, type PrismaClient } from "@prisma/client";

import { appMode, requiredEnv } from "@/lib/server/env";
import { prismaClient } from "@/lib/server/prisma";
import type { MetaWebhookEvent } from "@/modules/webhooks/meta";

export interface WebhookEventRepository {
  reserve(event: MetaWebhookEvent, hash: string): Promise<boolean>;
  markQueued(event: MetaWebhookEvent): Promise<void>;
  markFailed(event: MetaWebhookEvent, code: string): Promise<void>;
}

export interface WebhookQueue {
  enqueue(events: readonly MetaWebhookEvent[]): Promise<void>;
}

interface MemoryEventState {
  status: "RECEIVED" | "QUEUED" | "FAILED";
  hash: string;
  attempts: number;
}

export class MemoryWebhookEventRepository implements WebhookEventRepository {
  readonly #events = new Map<string, MemoryEventState>();

  async reserve(event: MetaWebhookEvent, hash: string): Promise<boolean> {
    const existing = this.#events.get(event.externalEventId);
    if (existing?.status === "QUEUED") return false;
    this.#events.set(event.externalEventId, {
      status: "RECEIVED",
      hash,
      attempts: (existing?.attempts ?? 0) + 1,
    });
    return true;
  }

  async markQueued(event: MetaWebhookEvent): Promise<void> {
    const existing = this.#events.get(event.externalEventId);
    if (existing) existing.status = "QUEUED";
  }

  async markFailed(event: MetaWebhookEvent): Promise<void> {
    const existing = this.#events.get(event.externalEventId);
    if (existing) existing.status = "FAILED";
  }

  status(externalEventId: string): MemoryEventState["status"] | undefined {
    return this.#events.get(externalEventId)?.status;
  }
}

export class MemoryWebhookQueue implements WebhookQueue {
  readonly jobs: MetaWebhookEvent[] = [];

  async enqueue(events: readonly MetaWebhookEvent[]): Promise<void> {
    // Queueing is synchronous; processing happens after the HTTP ACK in demo mode.
    const existingIds = new Set(this.jobs.map((event) => event.externalEventId));
    this.jobs.push(
      ...events
        .filter((event) => !existingIds.has(event.externalEventId))
        .map((event) => structuredClone(event)),
    );
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "P2002");
}

export class PrismaWebhookEventRepository implements WebhookEventRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async reserve(event: MetaWebhookEvent, hash: string): Promise<boolean> {
    const connection = event.phoneNumberId
      ? await this.prisma.channelConnection.findUnique({
          where: { phoneNumberId: event.phoneNumberId },
          select: { id: true, organizationId: true, clientCompanyId: true },
        })
      : null;

    if (!connection) {
      try {
        await this.prisma.webhookEvent.create({
          data: {
            provider: event.provider,
            externalEventId: event.externalEventId,
            eventType: event.eventType,
            status: "IGNORED",
            payload: event.payload as Prisma.InputJsonValue,
            payloadHash: hash,
            attempts: 1,
            lastErrorCode: "UNKNOWN_CHANNEL",
          },
        });
      } catch (error) {
        if (!isUniqueConstraintError(error)) throw error;
      }
      return false;
    }

    try {
      await this.prisma.webhookEvent.create({
        data: {
          organizationId: connection?.organizationId,
          clientCompanyId: connection?.clientCompanyId,
          channelConnectionId: connection?.id,
          provider: event.provider,
          externalEventId: event.externalEventId,
          eventType: event.eventType,
          status: "RECEIVED",
          payload: event.payload as Prisma.InputJsonValue,
          payloadHash: hash,
          attempts: 1,
        },
      });
      return true;
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
      const existing = await this.prisma.webhookEvent.findUnique({
        where: {
          provider_externalEventId: {
            provider: event.provider,
            externalEventId: event.externalEventId,
          },
        },
        select: { status: true },
      });
      if (existing?.status !== "FAILED" && existing?.status !== "RECEIVED") return false;
      await this.prisma.webhookEvent.update({
        where: {
          provider_externalEventId: {
            provider: event.provider,
            externalEventId: event.externalEventId,
          },
        },
        data: { status: "RECEIVED", lastErrorCode: null, attempts: { increment: 1 } },
      });
      return true;
    }
  }

  async markQueued(event: MetaWebhookEvent): Promise<void> {
    await this.prisma.webhookEvent.updateMany({
      where: {
        provider: event.provider,
        externalEventId: event.externalEventId,
        status: { in: ["RECEIVED", "FAILED"] },
      },
      data: { status: "QUEUED" },
    });
  }

  async markFailed(event: MetaWebhookEvent, code: string): Promise<void> {
    await this.prisma.webhookEvent.updateMany({
      where: {
        provider: event.provider,
        externalEventId: event.externalEventId,
        status: "RECEIVED",
      },
      data: { status: "FAILED", lastErrorCode: code.slice(0, 80) },
    });
  }
}

class BullMqWebhookQueue implements WebhookQueue {
  readonly #queue: Queue<MetaWebhookEvent>;

  constructor(redisUrl: string) {
    const url = new URL(redisUrl);
    this.#queue = new Queue<MetaWebhookEvent>("zyrva-meta-webhooks", {
      connection: {
        host: url.hostname,
        port: Number(url.port || 6379),
        username: url.username || undefined,
        password: url.password || undefined,
        db: url.pathname.length > 1 ? Number(url.pathname.slice(1)) : 0,
        tls: url.protocol === "rediss:" ? {} : undefined,
        maxRetriesPerRequest: 1,
      },
      defaultJobOptions: {
        attempts: 4,
        backoff: { type: "exponential", delay: 1_000 },
        removeOnComplete: 500,
        removeOnFail: 2_000,
      },
    });
  }

  async enqueue(events: readonly MetaWebhookEvent[]): Promise<void> {
    const jobs = events.map((event) => ({
      event,
      jobId: createHash("sha256").update(event.externalEventId).digest("hex"),
    }));
    await Promise.all(
      jobs.map(async ({ jobId }) => {
        const existing = await this.#queue.getJob(jobId);
        if (!existing) return;
        const state = await existing.getState();
        if (state === "completed" || state === "failed") await existing.remove();
      }),
    );
    await this.#queue.addBulk(
      jobs.map(({ event, jobId }) => ({
        name: event.eventType,
        data: event,
        opts: { jobId },
      })),
    );
  }
}

export class WebhookQueueError extends Error {
  readonly status = 503;

  constructor() {
    super("Fila de webhooks temporariamente indisponível.");
    this.name = "WebhookQueueError";
  }
}

export async function ingestWebhookEvents(
  events: readonly MetaWebhookEvent[],
  hash: string,
  repository: WebhookEventRepository,
  queue: WebhookQueue,
): Promise<{ accepted: number; duplicates: number }> {
  const accepted: MetaWebhookEvent[] = [];
  for (const event of events) {
    if (await repository.reserve(event, hash)) accepted.push(event);
  }

  if (accepted.length > 0) {
    try {
      await queue.enqueue(accepted);
    } catch {
      await Promise.allSettled(accepted.map((event) => repository.markFailed(event, "QUEUE_UNAVAILABLE")));
      throw new WebhookQueueError();
    }
    await Promise.all(accepted.map((event) => repository.markQueued(event)));
  }

  return { accepted: accepted.length, duplicates: events.length - accepted.length };
}

const globalForWebhooks = globalThis as typeof globalThis & {
  zyrvaWebhookRepository?: WebhookEventRepository;
  zyrvaWebhookQueue?: WebhookQueue;
};

export function webhookInfrastructure(): {
  repository: WebhookEventRepository;
  queue: WebhookQueue;
} {
  const production = appMode() === "production";
  if (!globalForWebhooks.zyrvaWebhookRepository) {
    if (production) requiredEnv("DATABASE_URL");
    globalForWebhooks.zyrvaWebhookRepository = production
      ? new PrismaWebhookEventRepository(prismaClient())
      : new MemoryWebhookEventRepository();
  }
  if (!globalForWebhooks.zyrvaWebhookQueue) {
    globalForWebhooks.zyrvaWebhookQueue = production
      ? new BullMqWebhookQueue(requiredEnv("REDIS_URL"))
      : new MemoryWebhookQueue();
  }
  return {
    repository: globalForWebhooks.zyrvaWebhookRepository,
    queue: globalForWebhooks.zyrvaWebhookQueue,
  };
}
