import { createError } from 'h3';
import type { H3Event } from 'h3';

export function hasPermission(event: H3Event, permission: string): boolean {
  if (event.context.role === 'superadmin') return true;
  return event.context.permissions?.includes(permission) ?? false;
}

export function requirePermission(event: H3Event, permission: string): void {
  if (!hasPermission(event, permission)) {
    throw createError({ statusCode: 403, message: 'Forbidden' });
  }
}
