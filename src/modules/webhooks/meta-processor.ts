import { MetaWebhookEventSchema, type MetaWebhookEvent } from "@/modules/webhooks/meta";

export interface MetaChannelContext {
  id: string;
  organizationId: string;
  clientCompanyId: string;
  agentId: string | null;
}

export type MetaWebhookClaim =
  | { claimed: false; channel: null }
  | { claimed: true; channel: MetaChannelContext | null };

export interface MetaWebhookProcessorRepository {
  claim(event: MetaWebhookEvent): Promise<MetaWebhookClaim>;
  persistInboundAndComplete(channel: MetaChannelContext, event: MetaWebhookEvent): Promise<void>;
  persistStatusAndComplete(channel: MetaChannelContext, event: MetaWebhookEvent): Promise<void>;
  markIgnored(event: MetaWebhookEvent, reason: string): Promise<void>;
  markMalformed(rawEvent: unknown, finalAttempt: boolean): Promise<void>;
  releaseAfterFailure(event: MetaWebhookEvent, finalAttempt: boolean, errorCode: string): Promise<void>;
}

export type MetaWebhookProcessResult =
  | { outcome: "duplicate" }
  | { outcome: "ignored"; reason: string }
  | { outcome: "processed"; kind: "inbound" | "status" };

export class MetaWebhookProcessingError extends Error {
  constructor() {
    super("Falha ao processar evento da Meta.");
    this.name = "MetaWebhookProcessingError";
  }
}

export async function processMetaWebhookEvent(
  rawEvent: MetaWebhookEvent,
  repository: MetaWebhookProcessorRepository,
  options: { finalAttempt?: boolean } = {},
): Promise<MetaWebhookProcessResult> {
  const event = MetaWebhookEventSchema.parse(rawEvent);
  const claim = await repository.claim(event);
  if (!claim.claimed) return { outcome: "duplicate" };

  try {
    if (!event.phoneNumberId) {
      await repository.markIgnored(event, "PHONE_NUMBER_ID_MISSING");
      return { outcome: "ignored", reason: "PHONE_NUMBER_ID_MISSING" };
    }

    const channel = claim.channel;
    if (!channel) {
      await repository.markIgnored(event, "UNKNOWN_OR_INACTIVE_CHANNEL");
      return { outcome: "ignored", reason: "UNKNOWN_OR_INACTIVE_CHANNEL" };
    }

    if (event.eventType.startsWith("message.")) {
      await repository.persistInboundAndComplete(channel, event);
      return { outcome: "processed", kind: "inbound" };
    }
    if (event.eventType.startsWith("status.")) {
      await repository.persistStatusAndComplete(channel, event);
      return { outcome: "processed", kind: "status" };
    }

    await repository.markIgnored(event, "UNSUPPORTED_EVENT_TYPE");
    return { outcome: "ignored", reason: "UNSUPPORTED_EVENT_TYPE" };
  } catch {
    await repository.releaseAfterFailure(
      event,
      options.finalAttempt ?? true,
      "META_EVENT_PROCESSING_FAILED",
    );
    throw new MetaWebhookProcessingError();
  }
}
