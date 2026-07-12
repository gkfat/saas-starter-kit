import { useAuthStore } from '~/stores/auth';
import { usePermission } from '~/composables/usePermission';

const PUBLIC_ROUTES = new Set(['/login']);

const PERMISSION_ROUTES: { prefix: string; permission: string }[] = [
  { prefix: '/admin', permission: 'admin:access' },
  { prefix: '/iam', permission: 'admin:access' },
  { prefix: '/users', permission: 'admin:access' },
];

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
