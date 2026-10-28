import { z } from "zod";

export const OrganizationRoleSchema = z.enum([
  "ZYRVA_ADMIN",
  "COMPANY_MANAGER",
  "ATTENDANT",
  "VIEWER",
]);

export const PermissionSchema = z.enum([
  "organization:manage",
  "company:read",
  "company:write",
  "agent:read",
  "agent:write",
  "agent:publish",
  "knowledge:read",
  "knowledge:write",
  "conversation:read",
  "conversation:reply",
  "conversation:handoff",
  "lead:read",
  "lead:write",
  "audit:read",
]);

export type OrganizationRole = z.infer<typeof OrganizationRoleSchema>;
export type Permission = z.infer<typeof PermissionSchema>;

const ALL_PERMISSIONS = PermissionSchema.options;

export const ROLE_PERMISSIONS: Readonly<Record<OrganizationRole, readonly Permission[]>> = {
  ZYRVA_ADMIN: ALL_PERMISSIONS,
  COMPANY_MANAGER: ALL_PERMISSIONS.filter((permission) => permission !== "audit:read"),
  ATTENDANT: [
    "company:read",
    "agent:read",
    "knowledge:read",
    "conversation:read",
    "conversation:reply",
    "conversation:handoff",
    "lead:read",
    "lead:write",
  ],
  VIEWER: [
    "company:read",
    "agent:read",
    "knowledge:read",
    "conversation:read",
    "lead:read",
  ],
};

export function hasPermission(role: OrganizationRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export class AuthorizationError extends Error {
  readonly status = 403;

  constructor(message = "Acesso não autorizado para esta organização.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export function requirePermission(role: OrganizationRole, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new AuthorizationError();
  }
}
