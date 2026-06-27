import { useAuthStore } from '~/stores/auth';

const PUBLIC_ROUTES = new Set(['/login', '/otp']);

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
});
