<template>
  <v-app>
    <v-app-bar v-if="mobile" elevation="1" density="compact">
      <v-app-bar-nav-icon @click="drawerOpen = !drawerOpen" />
      <v-app-bar-title class="text-body-1 font-weight-medium">saas-starter-kit</v-app-bar-title>
    </v-app-bar>

    <LayoutAppDrawer v-model="drawerOpen" />

    <v-main>
      <LayoutPageContent>
        <slot />
      </LayoutPageContent>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { useDisplay } from 'vuetify';

const { mobile } = useDisplay();
const drawerOpen = ref(false);
</script>
