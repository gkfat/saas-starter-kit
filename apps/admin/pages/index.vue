<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';
import { ROUTES } from '~/config/app-routes';
import { Permission } from '@saas-starter-kit/shared';

const auth = useAuthStore();
const { hasPermission } = usePermission();

if (auth.isLoggedIn) {
  const target = hasPermission(Permission.Dashboard.Read) ? ROUTES.dashboard : ROUTES.profile;
  await navigateTo(target, { replace: true });
} else {
  await navigateTo(ROUTES.home, { replace: true });
}
</script>
