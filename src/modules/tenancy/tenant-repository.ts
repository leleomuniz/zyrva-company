import { AuthorizationError, type OrganizationRole } from "@/modules/auth/rbac";

export interface TenantContext {
  organizationId: string;
  clientCompanyId?: string;
  userId: string;
  role: OrganizationRole;
}

export interface TenantEntity {
  id: string;
  organizationId: string;
  clientCompanyId?: string;
}

export function tenantWhere<T extends object>(context: TenantContext, where?: T): T & {
  organizationId: string;
  clientCompanyId?: string;
} {
  return {
    ...where,
    organizationId: context.organizationId,
    ...(context.clientCompanyId ? { clientCompanyId: context.clientCompanyId } : {}),
  } as T & { organizationId: string; clientCompanyId?: string };
}

export function assertTenantAccess(
  context: Pick<TenantContext, "organizationId" | "clientCompanyId">,
  resource: Pick<TenantEntity, "organizationId" | "clientCompanyId"> | null | undefined,
): asserts resource is Pick<TenantEntity, "organizationId" | "clientCompanyId"> {
  if (
    !resource ||
    resource.organizationId !== context.organizationId ||
    (context.clientCompanyId && resource.clientCompanyId !== context.clientCompanyId)
  ) {
    // Use the same error for missing and cross-tenant resources to avoid enumeration.
    throw new AuthorizationError("Recurso não encontrado.");
  }
}

export class InMemoryTenantRepository<T extends TenantEntity> {
  readonly #records: Map<string, T>;

  constructor(initialRecords: readonly T[] = []) {
    this.#records = new Map(initialRecords.map((record) => [record.id, structuredClone(record)]));
  }

  list(context: Pick<TenantContext, "organizationId" | "clientCompanyId">): T[] {
    return [...this.#records.values()]
      .filter(
        (record) =>
          record.organizationId === context.organizationId &&
          (!context.clientCompanyId || record.clientCompanyId === context.clientCompanyId),
      )
      .map((record) => structuredClone(record));
  }

  findById(context: Pick<TenantContext, "organizationId" | "clientCompanyId">, id: string): T | null {
    const record = this.#records.get(id);
    if (
      !record ||
      record.organizationId !== context.organizationId ||
      (context.clientCompanyId && record.clientCompanyId !== context.clientCompanyId)
    ) {
      return null;
    }
    return structuredClone(record);
  }

  save(context: Pick<TenantContext, "organizationId" | "clientCompanyId">, record: T): T {
    if (
      record.organizationId !== context.organizationId ||
      (context.clientCompanyId && record.clientCompanyId !== context.clientCompanyId)
    ) {
      throw new AuthorizationError("Não é permitido gravar dados fora do escopo autorizado.");
    }

    const clone = structuredClone(record);
    this.#records.set(clone.id, clone);
    return structuredClone(clone);
  }
}
