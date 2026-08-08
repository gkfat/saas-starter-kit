<template>
  <v-main class="bg-secondary">
    <v-container :max-width="700">
      <AppHeader @toggle-menu="drawerOpen = !drawerOpen" />
      <router-view />
    </v-container>
  </v-main>
  <AppDrawer v-model="drawerOpen" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import AppDrawer from '~/components/AppDrawer.vue';
import AppHeader from '~/components/AppHeader.vue';

const drawerOpen = ref(false);
</script>
