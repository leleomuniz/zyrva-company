import { Prisma, type PrismaClient } from "@prisma/client";

import type {
  MetaChannelContext,
  MetaWebhookClaim,
  MetaWebhookProcessorRepository,
} from "@/modules/webhooks/meta-processor";
import type { MetaWebhookEvent } from "@/modules/webhooks/meta";

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function requiredRecord(value: unknown): Record<string, unknown> {
  const record = asRecord(value);
  if (!record) throw new Error("INVALID_META_EVENT");
  return record;
}

function providerDate(timestamp: unknown): Date {
  if (typeof timestamp !== "string" || !/^\d{1,13}$/.test(timestamp)) return new Date();
  const milliseconds = Number(timestamp) * 1_000;
  const date = new Date(milliseconds);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function contactName(payload: Record<string, unknown>): string | undefined {
  const profile = asRecord(asRecord(payload.contact)?.profile);
  const name = typeof profile?.name === "string" ? profile.name.trim() : "";
  return name ? name.slice(0, 120) : undefined;
}

type StoredContentType =
  | "TEXT"
  | "BUTTON"
  | "INTERACTIVE"
  | "IMAGE"
  | "AUDIO"
  | "DOCUMENT"
  | "LOCATION"
  | "UNKNOWN";

function messageContent(message: Record<string, unknown>): {
  contentType: StoredContentType;
  text: string | null;
} {
  const type = typeof message.type === "string" ? message.type : "unknown";
  if (type === "text") {
    const body = asRecord(message.text)?.body;
    return { contentType: "TEXT", text: typeof body === "string" ? body.slice(0, 16_000) : null };
  }
  if (type === "button") {
    const text = asRecord(message.button)?.text;
    return { contentType: "BUTTON", text: typeof text === "string" ? text.slice(0, 4_000) : null };
  }
  if (type === "interactive") {
    const interactive = asRecord(message.interactive);
    const reply = asRecord(interactive?.button_reply) ?? asRecord(interactive?.list_reply);
    const title = reply?.title;
    return { contentType: "INTERACTIVE", text: typeof title === "string" ? title.slice(0, 4_000) : null };
  }
  const mediaTypes: Record<string, StoredContentType> = {
    image: "IMAGE",
    audio: "AUDIO",
    document: "DOCUMENT",
    location: "LOCATION",
  };
  return { contentType: mediaTypes[type] ?? "UNKNOWN", text: null };
}

function deliveryStatus(status: string): "SENT" | "DELIVERED" | "READ" | "FAILED" | null {
  if (status === "sent") return "SENT";
  if (status === "delivered") return "DELIVERED";
  if (status === "read") return "READ";
  if (status === "failed") return "FAILED";
  return null;
}

const DELIVERY_PREDECESSORS = {
  SENT: ["QUEUED"],
  DELIVERED: ["QUEUED", "SENT"],
  READ: ["QUEUED", "SENT", "DELIVERED"],
  FAILED: ["QUEUED", "SENT"],
} as const;

function deliveryErrorCode(status: Record<string, unknown>): string | undefined {
  const firstError = Array.isArray(status.errors) ? asRecord(status.errors[0]) : null;
  const code = firstError?.code;
  return typeof code === "string" || typeof code === "number" ? String(code).slice(0, 80) : undefined;
}

export class PrismaMetaWebhookProcessorRepository implements MetaWebhookProcessorRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async claim(event: MetaWebhookEvent): Promise<MetaWebhookClaim> {
    const result = await this.prisma.webhookEvent.updateMany({
      where: {
        provider: event.provider,
        externalEventId: event.externalEventId,
        // BullMQ guarantees one active handler per job ID. PROCESSING is
        // reclaimable so a stalled worker or a failed release cannot strand it.
        status: { in: ["RECEIVED", "QUEUED", "PROCESSING"] },
      },
      data: { status: "PROCESSING", attempts: { increment: 1 }, lastErrorCode: null },
    });
    if (result.count !== 1) return { claimed: false, channel: null };

    const stored = await this.prisma.webhookEvent.findUnique({
      where: {
        provider_externalEventId: {
          provider: event.provider,
          externalEventId: event.externalEventId,
        },
      },
      select: {
        organizationId: true,
        clientCompanyId: true,
        channelConnectionId: true,
        channelConnection: {
          select: {
            id: true,
            organizationId: true,
            clientCompanyId: true,
            agentId: true,
            phoneNumberId: true,
            type: true,
            status: true,
          },
        },
      },
    });
    const connection = stored?.channelConnection;
    const matchesReservation = Boolean(
      stored?.organizationId &&
      stored.clientCompanyId &&
      stored.channelConnectionId &&
      connection &&
      connection.id === stored.channelConnectionId &&
      connection.organizationId === stored.organizationId &&
      connection.clientCompanyId === stored.clientCompanyId &&
      connection.phoneNumberId === event.phoneNumberId &&
      connection.type === "WHATSAPP" &&
      connection.status === "ACTIVE",
    );

    return {
      claimed: true,
      channel: matchesReservation && connection
        ? {
            id: connection.id,
            organizationId: connection.organizationId,
            clientCompanyId: connection.clientCompanyId,
            agentId: connection.agentId,
          }
        : null,
    };
  }

  async persistInboundAndComplete(channel: MetaChannelContext, event: MetaWebhookEvent): Promise<void> {
    const message = requiredRecord(event.payload.message);
    const externalId = typeof message.id === "string" ? message.id : "";
    const phone = typeof message.from === "string" ? message.from : "";
    if (!externalId || !/^\d{8,15}$/.test(phone)) throw new Error("INVALID_INBOUND_MESSAGE");
    const content = messageContent(message);
    const occurredAt = providerDate(message.timestamp);
    const name = contactName(event.payload);

    await this.prisma.$transaction(async (tx) => {
      const contact = await tx.contact.upsert({
        where: {
          organizationId_clientCompanyId_phone: {
            organizationId: channel.organizationId,
            clientCompanyId: channel.clientCompanyId,
            phone,
          },
        },
        update: name ? { name } : {},
        create: {
          organizationId: channel.organizationId,
          clientCompanyId: channel.clientCompanyId,
          phone,
          name,
          metadata: { channel: "whatsapp" },
        },
      });

      const existingMessage = await tx.message.findUnique({
        where: {
          channelConnectionId_externalId: {
            channelConnectionId: channel.id,
            externalId,
          },
        },
        select: { id: true },
      });

      if (!existingMessage) {
        let conversation = await tx.conversation.findFirst({
          where: {
            organizationId: channel.organizationId,
            clientCompanyId: channel.clientCompanyId,
            channelConnectionId: channel.id,
            contactId: contact.id,
            status: { notIn: ["RESOLVED", "ARCHIVED"] },
          },
          orderBy: { lastMessageAt: "desc" },
        });

        if (!conversation) {
          conversation = await tx.conversation.create({
            data: {
              organizationId: channel.organizationId,
              clientCompanyId: channel.clientCompanyId,
              agentId: channel.agentId,
              channelConnectionId: channel.id,
              contactId: contact.id,
              status: "WAITING_HUMAN",
              mode: "PAUSED",
              unreadCount: 1,
              handoffReason: "Mensagem recebida pelo worker seguro; resposta automática não executada.",
              lastMessageAt: occurredAt,
              collectedData: {},
            },
          });
        } else {
          const humanActive = conversation.mode === "HUMAN" || conversation.status === "HUMAN_ACTIVE";
          conversation = await tx.conversation.update({
            where: { id: conversation.id },
            data: {
              status: humanActive ? "HUMAN_ACTIVE" : "WAITING_HUMAN",
              mode: humanActive ? "HUMAN" : "PAUSED",
              unreadCount: { increment: 1 },
              handoffReason: humanActive
                ? conversation.handoffReason
                : "Mensagem recebida pelo worker seguro; resposta automática não executada.",
              lastMessageAt: occurredAt,
            },
          });
        }

        await tx.message.create({
          data: {
            organizationId: channel.organizationId,
            conversationId: conversation.id,
            channelConnectionId: channel.id,
            externalId,
            direction: "INBOUND",
            sender: "CONTACT",
            contentType: content.contentType,
            text: content.text,
            payload: event.payload as Prisma.InputJsonValue,
            status: "RECEIVED",
            sourceIds: [],
            createdAt: occurredAt,
          },
        });

        await tx.usageRecord.create({
          data: {
            organizationId: channel.organizationId,
            agentId: channel.agentId,
            conversationId: conversation.id,
            kind: "MESSAGE_IN",
            metadata: { provider: "meta_whatsapp", eventId: event.externalEventId },
          },
        });
      }

      await tx.webhookEvent.updateMany({
        where: {
          provider: event.provider,
          externalEventId: event.externalEventId,
          status: "PROCESSING",
        },
        data: {
          organizationId: channel.organizationId,
          channelConnectionId: channel.id,
          status: "PROCESSED",
          processedAt: new Date(),
          lastErrorCode: null,
        },
      });
    });
  }

  async persistStatusAndComplete(channel: MetaChannelContext, event: MetaWebhookEvent): Promise<void> {
    const statusPayload = requiredRecord(event.payload.status);
    const externalId = typeof statusPayload.id === "string" ? statusPayload.id : "";
    const rawStatus = typeof statusPayload.status === "string" ? statusPayload.status : "";
    if (!externalId || !rawStatus) throw new Error("INVALID_DELIVERY_STATUS");
    const mappedStatus = deliveryStatus(rawStatus);
    const occurredAt = providerDate(statusPayload.timestamp);
    const errorCode = deliveryErrorCode(statusPayload);

    await this.prisma.$transaction(async (tx) => {
      if (mappedStatus) {
        const data: Prisma.MessageUpdateManyMutationInput = {
          status: mappedStatus,
          ...(mappedStatus === "DELIVERED" ? { deliveredAt: occurredAt } : {}),
          ...(mappedStatus === "READ" ? { readAt: occurredAt, deliveredAt: occurredAt } : {}),
          ...(mappedStatus === "FAILED" ? { errorCode: errorCode ?? "META_DELIVERY_FAILED" } : {}),
        };
        const updated = await tx.message.updateMany({
          where: {
            organizationId: channel.organizationId,
            channelConnectionId: channel.id,
            externalId,
            status: { in: [...DELIVERY_PREDECESSORS[mappedStatus]] },
          },
          data,
        });
        if (updated.count !== 1) throw new Error("OUTBOUND_MESSAGE_NOT_FOUND");
      }

      await tx.webhookEvent.updateMany({
        where: {
          provider: event.provider,
          externalEventId: event.externalEventId,
          status: "PROCESSING",
        },
        data: {
          organizationId: channel.organizationId,
          channelConnectionId: channel.id,
          status: "PROCESSED",
          processedAt: new Date(),
          lastErrorCode: mappedStatus ? null : "UNSUPPORTED_DELIVERY_STATUS",
        },
      });
    });
  }

  async markIgnored(event: MetaWebhookEvent, reason: string): Promise<void> {
    await this.prisma.webhookEvent.updateMany({
      where: {
        provider: event.provider,
        externalEventId: event.externalEventId,
        status: "PROCESSING",
      },
      data: { status: "IGNORED", processedAt: new Date(), lastErrorCode: reason.slice(0, 80) },
    });
  }

  async markMalformed(rawEvent: unknown, finalAttempt: boolean): Promise<void> {
    const record = asRecord(rawEvent);
    const provider = typeof record?.provider === "string" ? record.provider : null;
    const externalEventId = typeof record?.externalEventId === "string"
      ? record.externalEventId
      : null;
    if (!provider || !externalEventId) return;
    await this.prisma.webhookEvent.updateMany({
      where: {
        provider,
        externalEventId,
        status: { in: ["RECEIVED", "QUEUED", "PROCESSING"] },
      },
      data: {
        status: finalAttempt ? "FAILED" : "QUEUED",
        processedAt: finalAttempt ? new Date() : null,
        lastErrorCode: "INVALID_META_EVENT",
      },
    });
  }

  async releaseAfterFailure(
    event: MetaWebhookEvent,
    finalAttempt: boolean,
    errorCode: string,
  ): Promise<void> {
    await this.prisma.webhookEvent.updateMany({
      where: {
        provider: event.provider,
        externalEventId: event.externalEventId,
        status: "PROCESSING",
      },
      data: {
        status: finalAttempt ? "FAILED" : "QUEUED",
        processedAt: finalAttempt ? new Date() : null,
        lastErrorCode: errorCode.slice(0, 80),
      },
    });
  }
}
