<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';
import { Permission } from '@saas-starter-kit/shared';

const auth = useAuthStore();
const { hasPermission } = usePermission();

if (auth.isLoggedIn) {
  const target = hasPermission(Permission.Dashboard.Read) ? '/dashboard' : '/profile';
  await navigateTo(target, { replace: true });
} else {
  await navigateTo('/home', { replace: true });
}
</script>
