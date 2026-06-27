<template>
  <v-app>
    <LayoutAppHeader @toggle-drawer="drawerOpen = !drawerOpen" />
    <LayoutAppDrawer v-model="drawerOpen" />
    <v-main>
      <LayoutPageContent>
        <slot />
      </LayoutPageContent>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
const drawerOpen = ref(true);
</script>
