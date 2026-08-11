<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import type { Event } from '@saas-starter-kit/shared';
import AppCard from '~/components/common/AppCard.vue';
import { fetchEventDetail } from '~/utils/events-api';

const route = useRoute();

const event = ref<Event | null>(null);
const loading = ref(true);
const errorMessage = ref('');

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('zh-TW');
}

onMounted(async () => {
  try {
    const id = String(route.params.id);
    event.value = await fetchEventDetail(id);
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : String(e);
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div>
    <div v-if="loading" class="text-center text-medium-emphasis py-8">載入中...</div>
    <div v-else-if="errorMessage" class="text-error text-body-2">{{ errorMessage }}</div>

    <AppCard v-else-if="event">
      <img
        v-if="event.bannerUrl"
        :src="event.bannerUrl"
        :alt="event.title"
        class="w-100 mb-3 rounded"
      />
      <div class="text-h6 font-weight-bold mb-2">{{ event.title }}</div>
      <div class="text-body-2 text-medium-emphasis mb-3" style="white-space: pre-line">
        {{ event.copyText }}
      </div>
      <div class="text-caption text-medium-emphasis">
        {{ formatDateTime(event.startAt) }} ~ {{ formatDateTime(event.endAt) }}
      </div>
    </AppCard>

    <div class="close-button-bar d-flex justify-center">
      <v-btn icon="mdi-close" variant="tonal" :to="{ name: 'home' }" />
    </div>
  </div>
</template>

<style scoped>
.close-button-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 24px;
}
</style>
