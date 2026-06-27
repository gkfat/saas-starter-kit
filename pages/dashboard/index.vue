<template>
  <v-row>
    <v-col cols="12">
      <v-card class="pa-6" elevation="2">
        <v-card-title class="text-h5 mb-2">Dashboard</v-card-title>
        <v-card-subtitle class="mb-4">
          {{ store.user?.email ?? store.user?.uid }}
        </v-card-subtitle>

        <v-chip class="mr-2" color="primary" variant="tonal">
          {{ store.user?.role }}
        </v-chip>
        <v-chip color="secondary" variant="tonal">
          {{ store.user?.tenantId }}
        </v-chip>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';

const store = useAuthStore();
</script>
