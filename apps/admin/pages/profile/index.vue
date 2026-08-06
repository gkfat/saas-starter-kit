<template>
  <div>
    <LayoutPageHeader :title="$t('profile.title')" />
    <v-row align="stretch">
      <v-col cols="12" md="6" lg="auto">
        <ProfileInfoCard />
      </v-col>

      <v-col cols="12" md="6" lg="auto">
        <LoginMethodsCard />
      </v-col>

      <v-col v-if="isLevelEnabled" cols="12" md="6" lg="auto">
        <LevelCard :level="level" />
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { FeatureFlag } from '@saas-starter-kit/shared';
import type { GetLevelResult } from '@saas-starter-kit/shared';
import ProfileInfoCard from './components/ProfileInfoCard.vue';
import LoginMethodsCard from './components/LoginMethodsCard.vue';

const { isFeatureEnabled } = useFeatureFlags();
const isLevelEnabled = isFeatureEnabled(FeatureFlag.Level);

const { data: level } = isLevelEnabled
  ? await useAuthFetch<GetLevelResult | null>('/api/profile/level', { default: () => null })
  : { data: ref(null) };
</script>
