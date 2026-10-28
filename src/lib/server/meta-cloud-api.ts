import { z } from "zod";

import { appMode, requiredEnv } from "@/lib/server/env";

const MetaSendResponseSchema = z
  .object({
    messages: z.array(z.object({ id: z.string().min(1) })).min(1),
  })
  .passthrough();

export class MetaCloudApiError extends Error {
  readonly status = 502;

  constructor(message = "A Meta Cloud API não concluiu o envio.") {
    super(message);
    this.name = "MetaCloudApiError";
  }
}

export interface MetaCloudApiOptions {
  accessToken: string;
  phoneNumberId: string;
  graphApiVersion: string;
  fetch?: typeof fetch;
}

export class MetaCloudApiAdapter {
  readonly #accessToken: string;
  readonly #phoneNumberId: string;
  readonly #version: string;
  readonly #fetch: typeof fetch;

  constructor(options: MetaCloudApiOptions) {
    if (!/^v\d+\.\d+$/.test(options.graphApiVersion)) {
      throw new MetaCloudApiError("Versão da Graph API inválida.");
    }
    if (!/^\d+$/.test(options.phoneNumberId)) {
      throw new MetaCloudApiError("Identificador do número da Meta inválido.");
    }
    this.#accessToken = options.accessToken;
    this.#phoneNumberId = options.phoneNumberId;
    this.#version = options.graphApiVersion;
    this.#fetch = options.fetch ?? fetch;
  }

  async sendText(to: string, text: string): Promise<{ messageId: string }> {
    if (!/^\d{10,15}$/.test(to)) throw new MetaCloudApiError("Telefone de destino inválido.");
    if (!text.trim() || text.length > 4096) throw new MetaCloudApiError("Mensagem inválida.");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await this.#fetch(
        `https://graph.facebook.com/${this.#version}/${this.#phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${this.#accessToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to,
            type: "text",
            text: { preview_url: false, body: text },
          }),
          signal: controller.signal,
        },
      );

      if (!response.ok) throw new MetaCloudApiError();
      const payload = MetaSendResponseSchema.parse(await response.json());
      return { messageId: payload.messages[0].id };
    } catch (error) {
      if (error instanceof MetaCloudApiError) throw error;
      throw new MetaCloudApiError();
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function createMetaCloudApiAdapter(): MetaCloudApiAdapter | null {
  if (appMode() !== "production") return null;
  return new MetaCloudApiAdapter({
    accessToken: requiredEnv("META_ACCESS_TOKEN", 20),
    phoneNumberId: requiredEnv("META_PHONE_NUMBER_ID"),
    graphApiVersion: requiredEnv("META_GRAPH_API_VERSION"),
  });
}
