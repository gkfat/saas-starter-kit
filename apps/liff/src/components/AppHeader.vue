<template>
  <AppCard padding="2" class="mb-3">
    <v-row no-gutters justify="space-between" align="center">
      <v-col cols="auto">
        <v-btn icon="mdi-menu" variant="text" @click="emit('toggle-menu')" />
      </v-col>
      <v-col cols="auto">
        <span class="text-subtitle-1 font-weight-bold flex-grow-1 text-center"
          >SaaS Starter Kit</span
        >
      </v-col>
      <v-col cols="auto">
        <v-btn
          v-if="store.user?.memberNo"
          icon="mdi-qrcode"
          variant="text"
          :to="{ name: 'memberCard' }"
        />
        <div v-else style="width: 40px" />
      </v-col>
    </v-row>
  </AppCard>
</template>

<script setup lang="ts">
import AppCard from '~/components/common/AppCard.vue';
import { useAuthStore } from '~/stores/auth';

const emit = defineEmits<{ 'toggle-menu': [] }>();

const store = useAuthStore();
</script>
