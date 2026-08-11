<template>
  <v-navigation-drawer
    v-model="drawerOpen"
    :rail="!mobile && rail"
    :permanent="!mobile"
    :temporary="mobile"
    :width="mobile ? Math.min(280, viewportWidth) : 256"
  >
    <template #prepend>
      <!-- Project header -->
      <div
        class="d-flex align-center px-3 py-3"
        :class="{ 'justify-center': rail || mobile }"
        style="min-height: 64px; cursor: pointer"
        @click="router.push(ROUTES.root)"
      >
        <img :src="'/logo.svg'" alt="" width="24" height="24" class="flex-shrink-0" />
        <div v-if="!rail || mobile" class="ml-3 overflow-hidden">
          <div class="text-body-2 font-weight-medium text-truncate">SaaS Starter Kit</div>
          <div class="text-caption text-medium-emphasis text-truncate">v{{ appVersion }}</div>
        </div>
      </div>

      <v-divider />
    </template>

    <v-list nav density="compact" class="py-2" style="--v-list-item-icon-size: 18px">
      <template v-for="group in visibleGroups" :key="group.label">
        <v-divider v-if="group.label !== visibleGroups[0]?.label" class="my-2" />
        <v-list-subheader v-if="group.label && (!rail || mobile)">{{
          $t(group.label)
        }}</v-list-subheader>

        <template v-for="item in group.items" :key="item.title">
          <!-- Parent item with children (accordion) -->
          <v-list-group v-if="item.children?.length" :value="item.title">
            <template #activator="{ props }">
              <v-list-item v-bind="props" :prepend-icon="item.icon" :title="$t(item.title)" />
            </template>

            <v-list-item
              v-for="child in item.children"
              :key="child.title"
              :prepend-icon="child.icon"
              :title="$t(child.title)"
              :to="child.path"
              :active="isActive(child)"
              @click="closeOnMobile"
            />
          </v-list-group>

          <!-- Leaf item -->
          <v-list-item
            v-else
            :prepend-icon="item.icon"
            :title="$t(item.title)"
            :to="item.path"
            :active="isActive(item)"
            @click="closeOnMobile"
          />
        </template>
      </template>
    </v-list>

    <template #append>
      <v-divider />
      <div v-if="isLoggedIn" class="pa-3">
        <div class="d-flex align-center ga-3 mb-3">
          <v-avatar color="primary" size="32" class="flex-shrink-0">
            <span class="text-body-2 font-weight-medium text-white">{{ avatarLetter }}</span>
          </v-avatar>
          <div v-if="!rail || mobile" class="overflow-hidden">
            <div class="text-body-2 font-weight-medium text-truncate">
              {{ user?.displayName ?? user?.email }}
            </div>
            <div class="text-caption text-medium-emphasis text-truncate">
              {{ $t(`role.${user?.role}`) }}
            </div>
          </div>
        </div>
        <ButtonsAppButton
          kind="secondary"
          class="text-none"
          :loading="loading"
          block
          @click="handleLogout"
        >
          <v-icon>mdi-logout</v-icon>
          <span v-if="!rail || mobile" class="ml-3">{{ $t('common.logout') }}</span>
        </ButtonsAppButton>
      </div>
      <div v-else class="pa-3">
        <ButtonsAppButton kind="secondary" class="text-none" block :to="ROUTES.login">
          <v-icon>mdi-login</v-icon>
          <span v-if="!rail || mobile" class="ml-3">{{ $t('auth.login') }}</span>
        </ButtonsAppButton>
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
import { APP_ROUTES, ROUTES } from '~/config/app-routes';
import type { RouteItem } from '~/config/app-routes';

const open = defineModel<boolean>({ default: false });

const { mobile, width: viewportWidth } = useDisplay();
const { rail, toggle } = useSidebarState();
const { hasPermission } = usePermission();
const { isFeatureEnabled } = useFeatureFlags();
const { logout } = useAuth();
const router = useRouter();
const route = useRoute();

const authStore = useAuthStore();
const { user, isLoggedIn } = storeToRefs(authStore);

const { public: publicConfig } = useRuntimeConfig();
const appVersion = publicConfig.appVersion;

const drawerOpen = computed({
  get: () => (mobile.value ? open.value : true),
  set: (val) => {
    if (mobile.value) open.value = val;
  },
});

const visibleGroups = computed(() =>
  APP_ROUTES.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) =>
        item.public ||
        (isLoggedIn.value &&
          (!item.permission || hasPermission(item.permission)) &&
          (!item.featureFlag || isFeatureEnabled(item.featureFlag))),
    ),
  })).filter((group) => group.items.length > 0),
);

const avatarLetter = computed(() => {
  const name = user.value?.displayName ?? user.value?.email ?? '?';
  return name.charAt(0).toUpperCase();
});

const loading = ref(false);

function isActive(item: RouteItem): boolean {
  if (!item.path) return false;
  return item.exact ? route.path === item.path : route.path.startsWith(item.path);
}

function closeOnMobile() {
  if (mobile.value) open.value = false;
}

async function handleLogout() {
  loading.value = true;
  try {
    await logout();
    router.push(ROUTES.login);
  } finally {
    loading.value = false;
  }
}
</script>
