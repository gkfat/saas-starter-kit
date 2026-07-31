<template>
  <CardsAppCard class="h-100">
    <v-card-title class="py-3">{{ $t('dashboard.userOverview.title') }}</v-card-title>
    <v-card-text>
      <v-row>
        <v-col cols="6">
          <div class="text-caption text-medium-emphasis">
            {{ $t('dashboard.userOverview.total') }}
          </div>
          <div class="text-h5">{{ overview.total }}</div>
        </v-col>

        <v-col cols="6">
          <div class="text-caption text-medium-emphasis">{{ $t('users.status.enabled') }}</div>
          <div class="text-h5">{{ overview.active }}</div>
        </v-col>

        <v-col cols="6">
          <div class="text-caption text-medium-emphasis">
            {{ $t('users.status.pendingPassword') }}
          </div>
          <div class="text-h5">{{ overview.pendingPassword }}</div>
        </v-col>

        <v-col cols="6">
          <div class="text-caption text-medium-emphasis">{{ $t('users.status.disabled') }}</div>
          <div class="text-h5">{{ overview.disabled }}</div>
        </v-col>

        <v-col cols="6">
          <div class="text-caption text-medium-emphasis">{{ $t('role.admin') }}</div>
          <div class="text-h5">{{ overview.byRole.admin }}</div>
        </v-col>

        <v-col cols="6">
          <div class="text-caption text-medium-emphasis">{{ $t('role.member') }}</div>
          <div class="text-h5">{{ overview.byRole.member }}</div>
        </v-col>
      </v-row>
    </v-card-text>
  </CardsAppCard>
</template>

<script setup lang="ts">
defineProps<{
  overview: {
    total: number;
    active: number;
    pendingPassword: number;
    disabled: number;
    byRole: {
      admin: number;
      member: number;
    };
  };
}>();
</script>
