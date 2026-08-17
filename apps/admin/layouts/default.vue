<template>
  <v-app>
    <template v-if="isLoggedIn">
      <LayoutAppDrawer v-model="drawerOpen" />
      <LayoutAppSettingsDrawer v-model="settingsOpen" />

      <v-main>
        <LayoutPageContent>
          <LayoutAppHeader
            @toggle-drawer="drawerOpen = !drawerOpen"
            @toggle-settings="settingsOpen = !settingsOpen"
          />
          <slot />
        </LayoutPageContent>
      </v-main>
    </template>

    <template v-else>
      <LayoutPublicHeader />

      <v-main class="public-main">
        <LayoutPageContent>
          <slot />
        </LayoutPageContent>
      </v-main>
    </template>
  </v-app>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useAuthStore } from '~/stores/auth';

const authStore = useAuthStore();
const { isLoggedIn } = storeToRefs(authStore);

const drawerOpen = ref(false);
const settingsOpen = ref(false);
</script>

<style scoped>
.public-main {
  background: #ffffff;
}
</style>
