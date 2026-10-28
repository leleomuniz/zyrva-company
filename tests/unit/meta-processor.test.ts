import type { PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PrismaMetaWebhookProcessorRepository } from "@/lib/server/meta-webhook-processor-repository";
import type { MetaWebhookEvent } from "@/modules/webhooks/meta";
import {
  MetaWebhookProcessingError,
  processMetaWebhookEvent,
  type MetaChannelContext,
  type MetaWebhookProcessorRepository,
} from "@/modules/webhooks/meta-processor";

const channel: MetaChannelContext = {
  id: "channel-a",
  organizationId: "org-a",
  clientCompanyId: "company-a",
  agentId: "agent-a",
};

const inbound: MetaWebhookEvent = {
  provider: "meta_whatsapp",
  externalEventId: "message:wamid.in-1",
  eventType: "message.text",
  phoneNumberId: "1234567890",
  payload: {
    phoneNumberId: "1234567890",
    message: {
      id: "wamid.in-1",
      from: "5585999999999",
      timestamp: "1786046400",
      type: "text",
      text: { body: "Olá" },
    },
  },
};

function repositoryMock(): MetaWebhookProcessorRepository {
  return {
    claim: vi.fn().mockResolvedValue({ claimed: true, channel }),
    persistInboundAndComplete: vi.fn().mockResolvedValue(undefined),
    persistStatusAndComplete: vi.fn().mockResolvedValue(undefined),
    markIgnored: vi.fn().mockResolvedValue(undefined),
    markMalformed: vi.fn().mockResolvedValue(undefined),
    releaseAfterFailure: vi.fn().mockResolvedValue(undefined),
  };
}

describe("processor do worker Meta", () => {
  let repository: MetaWebhookProcessorRepository;

  beforeEach(() => {
    repository = repositoryMock();
  });

  it("faz claim e persiste inbound no tenant resolvido", async () => {
    await expect(processMetaWebhookEvent(inbound, repository)).resolves.toEqual({
      outcome: "processed",
      kind: "inbound",
    });
    expect(repository.claim).toHaveBeenCalledWith(inbound);
    expect(repository.persistInboundAndComplete).toHaveBeenCalledWith(channel, inbound);
    expect(repository.persistStatusAndComplete).not.toHaveBeenCalled();
  });

  it("persiste atualização de entrega sem tratar como mensagem inbound", async () => {
    const statusEvent: MetaWebhookEvent = {
      ...inbound,
      externalEventId: "status:wamid.out-1:delivered:10",
      eventType: "status.delivered",
      payload: {
        phoneNumberId: "1234567890",
        status: { id: "wamid.out-1", status: "delivered", timestamp: "10" },
      },
    };
    await expect(processMetaWebhookEvent(statusEvent, repository)).resolves.toEqual({
      outcome: "processed",
      kind: "status",
    });
    expect(repository.persistStatusAndComplete).toHaveBeenCalledWith(channel, statusEvent);
    expect(repository.persistInboundAndComplete).not.toHaveBeenCalled();
  });

  it("ignora canal desconhecido sem persistir conversa", async () => {
    vi.mocked(repository.claim).mockResolvedValue({ claimed: true, channel: null });
    await expect(processMetaWebhookEvent(inbound, repository)).resolves.toEqual({
      outcome: "ignored",
      reason: "UNKNOWN_OR_INACTIVE_CHANNEL",
    });
    expect(repository.markIgnored).toHaveBeenCalledWith(inbound, "UNKNOWN_OR_INACTIVE_CHANNEL");
    expect(repository.persistInboundAndComplete).not.toHaveBeenCalled();
  });

  it("não reprocessa evento que perdeu o CAS", async () => {
    vi.mocked(repository.claim).mockResolvedValue({ claimed: false, channel: null });
    await expect(processMetaWebhookEvent(inbound, repository)).resolves.toEqual({ outcome: "duplicate" });
    expect(repository.persistInboundAndComplete).not.toHaveBeenCalled();
  });

  it("devolve o evento para QUEUED quando ainda haverá tentativa", async () => {
    vi.mocked(repository.persistInboundAndComplete).mockRejectedValue(new Error("database unavailable"));
    await expect(
      processMetaWebhookEvent(inbound, repository, { finalAttempt: false }),
    ).rejects.toBeInstanceOf(MetaWebhookProcessingError);
    expect(repository.releaseAfterFailure).toHaveBeenCalledWith(
      inbound,
      false,
      "META_EVENT_PROCESSING_FAILED",
    );
  });

  it("marca a falha como final quando as tentativas acabaram", async () => {
    vi.mocked(repository.persistInboundAndComplete).mockRejectedValue(new Error("invalid event"));
    await expect(processMetaWebhookEvent(inbound, repository)).rejects.toBeInstanceOf(
      MetaWebhookProcessingError,
    );
    expect(repository.releaseAfterFailure).toHaveBeenCalledWith(
      inbound,
      true,
      "META_EVENT_PROCESSING_FAILED",
    );
  });

  it("impede que receipts fora de ordem regridam o status da mensagem", async () => {
    const messageUpdateMany = vi.fn().mockResolvedValue({ count: 1 });
    const webhookUpdateMany = vi.fn().mockResolvedValue({ count: 1 });
    const transactionClient = {
      message: { updateMany: messageUpdateMany },
      webhookEvent: { updateMany: webhookUpdateMany },
    };
    const prisma = {
      $transaction: vi.fn(async (callback: (tx: typeof transactionClient) => unknown) =>
        callback(transactionClient)),
    } as unknown as PrismaClient;
    const prismaRepository = new PrismaMetaWebhookProcessorRepository(prisma);
    const statusEvent: MetaWebhookEvent = {
      ...inbound,
      externalEventId: "status:wamid.out-1:delivered:10",
      eventType: "status.delivered",
      payload: {
        phoneNumberId: "1234567890",
        status: { id: "wamid.out-1", status: "delivered", timestamp: "10" },
      },
    };

    await prismaRepository.persistStatusAndComplete(channel, statusEvent);

    expect(messageUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: { in: ["QUEUED", "SENT"] } }),
        data: expect.objectContaining({ status: "DELIVERED" }),
      }),
    );
  });

  it("usa o tenant reservado no evento e recusa canal reassociado", async () => {
    const webhookEvent = {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      findUnique: vi.fn().mockResolvedValue({
        organizationId: "org-a",
        clientCompanyId: "company-a",
        channelConnectionId: "channel-a",
        channelConnection: {
          id: "channel-a",
          organizationId: "org-a",
          clientCompanyId: "company-b",
          agentId: "agent-b",
          phoneNumberId: "1234567890",
          type: "WHATSAPP",
          status: "ACTIVE",
        },
      }),
    };
    const prismaRepository = new PrismaMetaWebhookProcessorRepository({
      webhookEvent,
    } as unknown as PrismaClient);

    await expect(prismaRepository.claim(inbound)).resolves.toEqual({ claimed: true, channel: null });
  });
});
