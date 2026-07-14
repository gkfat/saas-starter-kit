<template>
  <v-app-bar v-if="mobile" elevation="1" density="compact">
    <v-app-bar-nav-icon @click="$emit('toggle-drawer')" />
    <v-app-bar-title class="text-body-1 font-weight-medium">saas-starter-kit</v-app-bar-title>
    <template #append>
      <v-btn icon size="small" variant="text" @click="$emit('toggle-settings')">
        <v-icon>mdi-cog-outline</v-icon>
      </v-btn>
    </template>
  </v-app-bar>
</template>

<script setup lang="ts">
import { useDisplay } from 'vuetify';

defineEmits<{
  'toggle-drawer': [];
  'toggle-settings': [];
}>();

const { mobile } = useDisplay();
</script>
