import { useAuthStore } from '~/stores/auth';
import { usePermission } from '~/composables/usePermission';
import { flattenRoutePermissions } from '~/config/app-routes';

const PUBLIC_ROUTES = new Set(['/login', '/auth/register']);

const PERMISSION_ROUTES = flattenRoutePermissions();

export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore();

  if (!auth.isReady) return;

  if (PUBLIC_ROUTES.has(to.path)) {
    if (auth.isLoggedIn) return navigateTo('/dashboard');
    return;
  }

  if (!auth.isLoggedIn) {
    return navigateTo('/login');
  }

  const { hasPermission } = usePermission();
  const matched = PERMISSION_ROUTES.find((r) => to.path.startsWith(r.prefix));
  if (matched && !hasPermission(matched.permission)) {
    return navigateTo('/dashboard');
  }
});
