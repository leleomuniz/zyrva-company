import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { Worker, type Job } from "bullmq";

import { appMode, requiredEnv } from "@/lib/server/env";
import { logger } from "@/lib/server/logger";
import { PrismaMetaWebhookProcessorRepository } from "@/lib/server/meta-webhook-processor-repository";
import { prismaClient } from "@/lib/server/prisma";
import { MetaWebhookEventSchema, type MetaWebhookEvent } from "@/modules/webhooks/meta";
import {
  MetaWebhookProcessingError,
  processMetaWebhookEvent,
  type MetaWebhookProcessResult,
  type MetaWebhookProcessorRepository,
} from "@/modules/webhooks/meta-processor";

function redisConnection(redisUrl: string) {
  const url = new URL(redisUrl);
  if (url.protocol !== "redis:" && url.protocol !== "rediss:") {
    throw new Error("REDIS_URL inválida.");
  }
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username || undefined,
    password: url.password || undefined,
    db: url.pathname.length > 1 ? Number(url.pathname.slice(1)) : 0,
    tls: url.protocol === "rediss:" ? {} : undefined,
    maxRetriesPerRequest: null,
  };
}

export function createMetaWebhookWorker(options: {
  repository?: MetaWebhookProcessorRepository;
  redisUrl?: string;
  concurrency?: number;
} = {}): Worker<MetaWebhookEvent, MetaWebhookProcessResult> {
  if (!options.repository && appMode() !== "production") {
    throw new Error("O worker real só pode iniciar em APP_MODE=production.");
  }

  const repository =
    options.repository ?? new PrismaMetaWebhookProcessorRepository(prismaClient());
  const redisUrl = options.redisUrl ?? requiredEnv("REDIS_URL");

  const worker = new Worker<MetaWebhookEvent, MetaWebhookProcessResult>(
    "zyrva-meta-webhooks",
    async (job: Job<MetaWebhookEvent>) => {
      const totalAttempts = job.opts.attempts ?? 1;
      const finalAttempt = job.attemptsMade + 1 >= totalAttempts;
      const event = MetaWebhookEventSchema.safeParse(job.data);
      if (!event.success) {
        await repository.markMalformed(job.data, finalAttempt);
        throw new MetaWebhookProcessingError();
      }
      return processMetaWebhookEvent(event.data, repository, { finalAttempt });
    },
    {
      connection: redisConnection(redisUrl),
      concurrency: Math.max(1, Math.min(options.concurrency ?? 8, 32)),
    },
  );

  worker.on("completed", (job, result) => {
    logger.info(
      { jobId: job.id, outcome: result.outcome, eventType: job.name },
      "meta webhook processed",
    );
  });
  worker.on("failed", (job, error) => {
    logger.error(
      { jobId: job?.id, eventType: job?.name, errorName: error.name },
      "meta webhook processing failed",
    );
  });
  worker.on("error", (error) => {
    logger.error({ errorName: error.name }, "meta webhook worker error");
  });

  return worker;
}

async function runWorker(): Promise<void> {
  const worker = createMetaWebhookWorker();
  await worker.waitUntilReady();
  logger.info({ queue: "zyrva-meta-webhooks" }, "meta webhook worker ready");

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "meta webhook worker stopping");
    await worker.close();
    await prismaClient().$disconnect();
    process.exit(0);
  };
  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
}

const entryPath = process.argv[1];
if (entryPath && pathToFileURL(resolve(entryPath)).href === import.meta.url) {
  runWorker().catch((error: unknown) => {
    logger.fatal(
      { errorName: error instanceof Error ? error.name : "UnknownError" },
      "meta webhook worker failed to start",
    );
    process.exitCode = 1;
  });
}
