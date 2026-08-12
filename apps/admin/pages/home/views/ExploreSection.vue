<template>
  <section id="explore" class="explore-section">
    <v-container class="py-12">
      <v-row justify="center" class="text-center mb-6">
        <v-col cols="12" md="8">
          <div class="text-h5 font-weight-medium text-white">{{ $t('home.explore.title') }}</div>
        </v-col>
      </v-row>

      <div v-for="category in featureCategories" :key="category.labelKey" class="mb-8">
        <v-row justify="center" class="mb-3">
          <v-col cols="12" md="8" class="text-center">
            <div class="text-subtitle-1 font-weight-medium explore-category-label">
              {{ $t(category.labelKey) }}
            </div>
          </v-col>
        </v-row>
        <v-row justify="center">
          <v-col v-for="module in category.modules" :key="module" cols="12" sm="6" md="4">
            <HomeCard class="pa-6 h-100">
              <v-icon :icon="FEATURE_MODULE_ICONS[module]" color="primary" size="32" class="mb-3" />
              <div class="text-h6 mb-2">{{ $t(`features.${module}.title`) }}</div>
              <div class="text-body-2 text-medium-emphasis">
                {{ $t(`features.${module}.description`) }}
              </div>
            </HomeCard>
          </v-col>
        </v-row>
      </div>
    </v-container>
  </section>
</template>

<script setup lang="ts">
import { FeatureModule } from '@saas-starter-kit/shared';
import HomeCard from '../components/HomeCard.vue';

const FEATURE_MODULE_ICONS: Record<FeatureModule, string> = {
  [FeatureModule.Auth]: 'mdi-login-variant',
  [FeatureModule.UserManagement]: 'mdi-account-group',
  [FeatureModule.Rbac]: 'mdi-shield-account',
  [FeatureModule.LoginLogs]: 'mdi-login',
  [FeatureModule.AuditLogs]: 'mdi-history',
  [FeatureModule.Dashboard]: 'mdi-view-dashboard',
  [FeatureModule.Level]: 'mdi-podium-gold',
  [FeatureModule.Coupon]: 'mdi-ticket-percent',
  [FeatureModule.Points]: 'mdi-cash-multiple',
  [FeatureModule.Event]: 'mdi-bullhorn-outline',
};

type FeatureCategory = {
  labelKey: string;
  modules: FeatureModule[];
};

const featureCategories: FeatureCategory[] = [
  {
    labelKey: 'home.explore.categories.membership',
    modules: [FeatureModule.Auth, FeatureModule.UserManagement],
  },
  {
    labelKey: 'home.explore.categories.admin',
    modules: [FeatureModule.Rbac, FeatureModule.LoginLogs, FeatureModule.AuditLogs],
  },
  {
    labelKey: 'home.explore.categories.engagement',
    modules: [FeatureModule.Level, FeatureModule.Coupon, FeatureModule.Points, FeatureModule.Event],
  },
  {
    labelKey: 'home.explore.categories.analytics',
    modules: [FeatureModule.Dashboard],
  },
];
</script>

<style scoped>
.explore-section {
  background: #33495d;
  /* Cancel the ancestor PageContent v-container's fixed 16px left/right padding so the
     background reaches the true left/right edges, like the hero. */
  margin-left: -16px;
  margin-right: -16px;
  width: calc(100% + 32px);
}

.explore-category-label {
  color: #9db8d6;
}
</style>
