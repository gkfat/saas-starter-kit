<template>
  <v-app>
    <LayoutAppHeader
      @toggle-drawer="drawerOpen = !drawerOpen"
      @toggle-settings="settingsOpen = !settingsOpen"
    />
    <LayoutAppDrawer v-model="drawerOpen" />
    <LayoutAppSettingsDrawer v-model="settingsOpen" />

    <v-main>
      <LayoutPageContent>
        <slot />
      </LayoutPageContent>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
const drawerOpen = ref(false);
const settingsOpen = ref(false);
</script>
