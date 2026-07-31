<template>
  <CardsAppCard class="h-100">
    <v-card-title class="py-3">{{ $t('dashboard.activeUsers.title') }}</v-card-title>
    <v-card-text>
      <v-row>
        <v-col cols="6">
          <div class="text-caption text-medium-emphasis">{{ $t('dashboard.activeUsers.dau') }}</div>
          <div class="text-h5">{{ activeUsers.dau }}</div>
        </v-col>

        <v-col cols="6">
          <div class="text-caption text-medium-emphasis">{{ $t('dashboard.activeUsers.wau') }}</div>
          <div class="text-h5">{{ activeUsers.wau }}</div>
        </v-col>

        <v-col cols="6">
          <div class="text-caption text-medium-emphasis">{{ $t('dashboard.activeUsers.mau') }}</div>
          <div class="text-h5">{{ activeUsers.mau }}</div>
        </v-col>

        <v-col cols="6">
          <div class="text-caption text-medium-emphasis">
            {{ $t('dashboard.activeUsers.activeRate') }}
          </div>
          <div class="text-h5">{{ activeRatePercent }}%</div>
        </v-col>

        <v-col cols="6">
          <div class="text-caption text-medium-emphasis">
            {{ $t('dashboard.activeUsers.todayLogins') }}（{{
              $t('dashboard.activeUsers.loginSuccess')
            }}）
          </div>
          <div class="text-h5">{{ activeUsers.todayLogins.success }}</div>
        </v-col>

        <v-col cols="6">
          <div class="text-caption text-medium-emphasis">
            {{ $t('dashboard.activeUsers.todayLogins') }}（{{
              $t('dashboard.activeUsers.loginFailure')
            }}）
          </div>
          <div class="text-h5">{{ activeUsers.todayLogins.failure }}</div>
        </v-col>
      </v-row>
    </v-card-text>
  </CardsAppCard>
</template>

<script setup lang="ts">
const props = defineProps<{
  activeUsers: {
    dau: number;
    wau: number;
    mau: number;
    todayLogins: { success: number; failure: number };
    activeRate: number;
  };
}>();

const activeRatePercent = computed(() => Math.round(props.activeUsers.activeRate * 100));
</script>
