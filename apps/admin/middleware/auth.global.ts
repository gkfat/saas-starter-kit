import { useAuthStore } from '~/stores/auth';
import { useFeatureFlags } from '~/composables/useFeatureFlags';
import { usePermission } from '~/composables/usePermission';
import { ROUTES, flattenRouteFeatureFlags, flattenRoutePermissions } from '~/config/app-routes';

const PUBLIC_ROUTES = new Set<string>([
  ROUTES.login,
  ROUTES.register,
  ROUTES.setPassword,
  ROUTES.lineCallback,
]);
const PUBLIC_CONTENT_ROUTES = new Set<string>([ROUTES.root, ROUTES.home]);

const PERMISSION_ROUTES = flattenRoutePermissions();
const FEATURE_FLAG_ROUTES = flattenRouteFeatureFlags();

export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore();

  if (!auth.isReady) return;

  if (PUBLIC_CONTENT_ROUTES.has(to.path)) return;

  if (PUBLIC_ROUTES.has(to.path)) {
    if (auth.isLoggedIn) return navigateTo(ROUTES.dashboard);
    return;
  }

  if (!auth.isLoggedIn) {
    return navigateTo(ROUTES.login);
  }

  const { hasPermission } = usePermission();
  const matched = PERMISSION_ROUTES.find((r) => to.path.startsWith(r.prefix));
  if (matched && !hasPermission(matched.permission)) {
    return navigateTo(matched.redirectTo ?? ROUTES.dashboard);
  }

  const { isFeatureEnabled } = useFeatureFlags();
  const matchedFlag = FEATURE_FLAG_ROUTES.find((r) => to.path.startsWith(r.prefix));
  if (matchedFlag && !isFeatureEnabled(matchedFlag.featureFlag)) {
    return navigateTo(ROUTES.dashboard);
  }
});
