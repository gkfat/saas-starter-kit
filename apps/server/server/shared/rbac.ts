import { createError } from 'h3';
import type { H3Event } from 'h3';
import { Role } from '@saas-starter-kit/shared';

export function hasPermission(event: H3Event, permission: string): boolean {
  if (event.context.role === Role.SuperAdmin) return true;
  return event.context.permissions?.includes(permission) ?? false;
}

export function requirePermission(event: H3Event, permission: string): void {
  if (!hasPermission(event, permission)) {
    throw createError({ statusCode: 403, message: 'Forbidden' });
  }
}
