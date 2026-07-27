<template>
  <v-container>
    <LayoutPageHeader :title="$t('features.title')" />
    <div class="text-body-1 text-medium-emphasis mb-8">{{ $t('features.subtitle') }}</div>

    <div class="text-subtitle-1 font-weight-medium mb-4">{{ $t('features.current.title') }}</div>
    <v-row class="mb-8">
      <v-col v-for="item in items" :key="item.icon" cols="12" sm="6" md="4">
        <CardsAppCard class="pa-6 h-100">
          <v-icon :icon="item.icon" color="primary" size="32" class="mb-3" />
          <div class="text-h6 mb-2">{{ $t(item.title) }}</div>
          <div class="text-body-2 text-medium-emphasis">{{ $t(item.description) }}</div>
        </CardsAppCard>
      </v-col>
    </v-row>

    <CardsAppCard class="pa-6">
      <div class="d-flex align-center ga-2 mb-2">
        <div class="text-subtitle-1 font-weight-medium">{{ $t('features.roadmap.title') }}</div>
        <v-chip size="small" color="primary" variant="tonal">
          {{ $t('features.roadmap.badge') }}
        </v-chip>
      </div>
      <div class="text-body-2 text-medium-emphasis mb-4">{{ $t('features.roadmap.subtitle') }}</div>
      <div class="d-flex flex-wrap ga-2">
        <v-chip v-for="n in 9" :key="n" variant="outlined" prepend-icon="mdi-progress-clock">
          {{ $t(`features.roadmap.items.${n - 1}`) }}
        </v-chip>
      </div>
    </CardsAppCard>
  </v-container>
</template>

<script setup lang="ts">
definePageMeta({ path: '/features' });

const items = [
  {
    icon: 'mdi-login-variant',
    title: 'features.auth.title',
    description: 'features.auth.description',
  },
  {
    icon: 'mdi-shield-account',
    title: 'features.rbac.title',
    description: 'features.rbac.description',
  },
  { icon: 'mdi-history', title: 'features.audit.title', description: 'features.audit.description' },
  {
    icon: 'mdi-view-dashboard',
    title: 'features.dashboard.title',
    description: 'features.dashboard.description',
  },
  {
    icon: 'mdi-account-group',
    title: 'features.userManagement.title',
    description: 'features.userManagement.description',
  },
  { icon: 'mdi-translate', title: 'features.i18n.title', description: 'features.i18n.description' },
];
</script>
