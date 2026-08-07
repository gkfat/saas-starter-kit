<template>
  <div>
    <LayoutPageHeader :title="$t('profile.title')" />
    <v-row align="stretch">
      <v-col cols="12" md="4">
        <ProfileInfoCard />
      </v-col>

      <v-col cols="12" md="4">
        <LoginMethodsCard />
      </v-col>

      <v-col v-if="isLevelEnabled" cols="12" md="4">
        <LevelCard :level="level" />
      </v-col>

      <v-col v-if="isCouponEnabled" cols="12" md="4">
        <CouponsCard :coupons="coupons" />
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { FeatureFlag } from '@saas-starter-kit/shared';
import type { CouponInstanceDetail, GetLevelResult } from '@saas-starter-kit/shared';
import ProfileInfoCard from './components/ProfileInfoCard.vue';
import LoginMethodsCard from './components/LoginMethodsCard.vue';
import CouponsCard from './components/CouponsCard.vue';

const { isFeatureEnabled } = useFeatureFlags();
const isLevelEnabled = isFeatureEnabled(FeatureFlag.Level);
const isCouponEnabled = isFeatureEnabled(FeatureFlag.Coupon);

const { data: level } = isLevelEnabled
  ? await useAuthFetch<GetLevelResult | null>('/api/profile/level', { default: () => null })
  : { data: ref(null) };

const { data: coupons } = isCouponEnabled
  ? await useAuthFetch<CouponInstanceDetail[]>('/api/profile/coupons', { default: () => [] })
  : { data: ref([]) };
</script>
