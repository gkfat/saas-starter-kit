<template>
  <v-navigation-drawer
    v-model="drawerOpen"
    :rail="!mobile && rail"
    :permanent="!mobile"
    :temporary="mobile"
  >
    <!-- Project header -->
    <div class="d-flex align-center px-3 py-3" style="min-height: 64px">
      <v-icon icon="mdi-fire" color="primary" size="24" class="flex-shrink-0" />
      <div v-if="!rail || mobile" class="ml-3 overflow-hidden">
        <div class="text-body-2 font-weight-medium text-truncate">saas-starter-kit</div>
        <div class="text-caption text-medium-emphasis text-truncate">
          {{ user?.tenantId ?? '—' }}
        </div>
      </div>
    </div>

    <v-divider />

    <v-list nav density="compact" class="py-2" style="--v-list-item-icon-size: 18px">
      <!-- General -->
      <v-list-subheader v-if="!rail || mobile">General</v-list-subheader>

      <v-list-item
        prepend-icon="mdi-view-dashboard"
        title="Dashboard"
        :to="'/dashboard'"
        :active="route.path === '/dashboard'"
        @click="closeOnMobile"
      />
      <v-list-item
        prepend-icon="mdi-account-circle"
        title="Profile"
        :to="'/profile'"
        :active="route.path === '/profile'"
        @click="closeOnMobile"
      />

      <!-- Management -->
      <template v-if="hasPermission('admin:access')">
        <v-divider class="my-2" />
        <v-list-subheader v-if="!rail || mobile">Management</v-list-subheader>

        <v-list-item
          prepend-icon="mdi-account-group"
          title="Users"
          :to="'/admin/users'"
          :active="route.path.startsWith('/admin/users')"
          @click="closeOnMobile"
        />
        <v-list-item
          prepend-icon="mdi-shield-account"
          title="Roles"
          :to="'/admin/roles'"
          :active="route.path.startsWith('/admin/roles')"
          @click="closeOnMobile"
        />
        <v-list-item
          prepend-icon="mdi-key-variant"
          title="Permissions"
          :to="'/iam/permissions'"
          :active="route.path.startsWith('/iam/permissions')"
          @click="closeOnMobile"
        />

        <v-divider class="my-2" />
        <v-list-subheader v-if="!rail || mobile">Logs</v-list-subheader>

        <v-list-item
          prepend-icon="mdi-login"
          title="Login Logs"
          :to="'/admin/logs/login'"
          :active="route.path === '/admin/logs/login'"
          @click="closeOnMobile"
        />
        <v-list-item
          prepend-icon="mdi-history"
          title="Audit Logs"
          :to="'/admin/logs/audit'"
          :active="route.path === '/admin/logs/audit'"
          @click="closeOnMobile"
        />
      </template>
    </v-list>

    <template #append>
      <v-divider />
      <div class="pa-3">
        <div class="d-flex align-center ga-3 mb-3">
          <v-avatar color="primary" size="32" class="flex-shrink-0">
            <span class="text-body-2 font-weight-medium text-white">{{ avatarLetter }}</span>
          </v-avatar>
          <div v-if="!rail || mobile" class="overflow-hidden">
            <div class="text-body-2 font-weight-medium text-truncate">
              {{ user?.displayName ?? user?.email }}
            </div>
            <div class="text-caption text-medium-emphasis text-truncate">{{ user?.role }}</div>
          </div>
        </div>
        <v-btn
          size="small"
          variant="text"
          class="border text-none"
          :loading="loading"
          block
          @click="handleLogout"
        >
          <v-icon>mdi-logout</v-icon>
          <span v-if="!rail || mobile" class="ml-3">Log out</span>
        </v-btn>
      </div>
      <template v-if="!mobile">
        <v-divider />
        <div class="pa-3">
          <v-row no-gutters justify="end">
            <v-col cols="auto">
              <v-btn
                :icon="rail ? 'mdi-chevron-right' : 'mdi-chevron-left'"
                size="small"
                variant="text"
                @click="toggle"
              />
            </v-col>
          </v-row>
        </div>
      </template>
    </template>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';
import { storeToRefs } from 'pinia';
import { useDisplay } from 'vuetify';

const open = defineModel<boolean>({ default: false });

const { mobile } = useDisplay();
const { rail, toggle } = useSidebarState();
const { hasPermission } = usePermission();
const { logout } = useAuth();
const router = useRouter();
const route = useRoute();

const authStore = useAuthStore();
const { user } = storeToRefs(authStore);

const drawerOpen = computed({
  get: () => (mobile.value ? open.value : true),
  set: (val) => {
    if (mobile.value) open.value = val;
  },
});

const avatarLetter = computed(() => {
  const name = user.value?.displayName ?? user.value?.email ?? '?';
  return name.charAt(0).toUpperCase();
});

const loading = ref(false);

function closeOnMobile() {
  if (mobile.value) open.value = false;
}

async function handleLogout() {
  loading.value = true;
  try {
    await logout();
    router.push('/login');
  } finally {
    loading.value = false;
  }
}
</script>
