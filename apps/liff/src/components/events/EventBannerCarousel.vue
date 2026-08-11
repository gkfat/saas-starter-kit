<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import type { Event } from '@saas-starter-kit/shared';
import { fetchVisibleEvents } from '~/utils/events-api';

const router = useRouter();
const events = ref<Event[] | null>(null);
const activeIndex = ref(0);

onMounted(async () => {
  try {
    const visibleEvents = await fetchVisibleEvents();
    events.value = visibleEvents.length > 0 ? visibleEvents : null;
  } catch {
    // 活動功能未開啟或查詢失敗時，安靜略過此區塊
    events.value = null;
  }
});

function openEvent(id: string) {
  router.push({ name: 'eventDetail', params: { id } });
}
</script>

<template>
  <div v-if="events" class="position-relative rounded-lg overflow-hidden">
    <v-carousel v-model="activeIndex" height="120" hide-delimiters :show-arrows="false" cycle>
      <v-carousel-item
        v-for="item in events"
        :key="item.id"
        :src="item.bannerUrl"
        cover
        class="cursor-pointer"
        @click="openEvent(item.id)"
      />
    </v-carousel>
    <div class="event-banner-counter">{{ activeIndex + 1 }}/{{ events.length }}</div>
  </div>
</template>

<style scoped>
.event-banner-counter {
  position: absolute;
  right: 8px;
  bottom: 8px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 12px;
  line-height: 1.4;
}
</style>
