import { z } from 'zod';

export const RoleSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
});

export const PermissionSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
});

export const RolePermissionSchema = z.object({
  permissions: z.array(z.string()),
});

export const UserRoleSchema = z.object({
  role: z.string().min(1),
});
