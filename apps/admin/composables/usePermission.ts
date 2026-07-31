import { useAuthStore } from '~/stores/auth';

export function usePermission() {
  const auth = useAuthStore();

  function hasPermission(permission: string): boolean {
    if (!auth.user) return false;
    if (auth.isSuperadmin) return true;
    return auth.user.permissions.includes(permission);
  }

  function hasAnyPermission(permissions: string[]): boolean {
    return permissions.some((p) => hasPermission(p));
  }

  function hasAllPermissions(permissions: string[]): boolean {
    return permissions.every((p) => hasPermission(p));
  }

  return { hasPermission, hasAnyPermission, hasAllPermissions };
}
