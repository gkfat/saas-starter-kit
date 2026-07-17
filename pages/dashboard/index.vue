<template>
  <div>
    <LayoutBreadcrumb />
    <LayoutPageHeader :title="$t('dashboard.title')" />
    <CardsAppCard>
      <v-card-text>
        <div class="text-body-2 text-medium-emphasis mb-3">
          {{ store.user?.email ?? store.user?.uid }}
        </div>
        <v-chip class="mr-2" color="primary" variant="tonal">
          {{ store.user?.role }}
        </v-chip>
      </v-card-text>
    </CardsAppCard>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';

const store = useAuthStore();
</script>
