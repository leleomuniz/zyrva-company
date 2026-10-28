import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

const databaseUrl = required("DATABASE_URL");
const organizationId = required("META_CHANNEL_ORGANIZATION_ID");
const clientCompanyId = required("META_CHANNEL_COMPANY_ID");
const agentId = required("META_CHANNEL_AGENT_ID");
const phoneNumberId = required("META_PHONE_NUMBER_ID");

if (!/^\d{6,30}$/.test(phoneNumberId)) throw new Error("META_PHONE_NUMBER_ID is invalid.");

const prisma = new PrismaClient({ adapter: new PrismaPg(databaseUrl) });

async function provision(): Promise<void> {
  const [company, agent, existing] = await Promise.all([
    prisma.clientCompany.findFirst({
      where: { id: clientCompanyId, organizationId },
      select: { id: true },
    }),
    prisma.agent.findFirst({
      where: { id: agentId, organizationId, clientCompanyId },
      select: { id: true },
    }),
    prisma.channelConnection.findUnique({
      where: { phoneNumberId },
      select: { organizationId: true, clientCompanyId: true },
    }),
  ]);
  if (!company) throw new Error("Client company does not belong to the organization.");
  if (!agent) throw new Error("Agent does not belong to the selected company.");
  if (
    existing &&
    (existing.organizationId !== organizationId || existing.clientCompanyId !== clientCompanyId)
  ) {
    throw new Error("Phone number is already reserved by another tenant.");
  }

  const channel = await prisma.channelConnection.upsert({
    where: { phoneNumberId },
    update: {
      agentId,
      label: process.env.META_CHANNEL_LABEL?.trim() || "WhatsApp principal",
      status: "ACTIVE",
      lastVerifiedAt: new Date(),
      lastErrorCode: null,
    },
    create: {
      organizationId,
      clientCompanyId,
      agentId,
      type: "WHATSAPP",
      status: "ACTIVE",
      label: process.env.META_CHANNEL_LABEL?.trim() || "WhatsApp principal",
      phoneNumberId,
      lastVerifiedAt: new Date(),
      settings: { provisionedBy: "db:provision-meta" },
    },
    select: { id: true },
  });

  console.log(`Meta channel provisioned: ${channel.id}`);
}

provision()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Meta channel provisioning failed.");
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
