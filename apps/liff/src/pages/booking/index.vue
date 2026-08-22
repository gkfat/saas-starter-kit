<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import type { BookingService } from '@saas-starter-kit/shared';
import AppCard from '~/components/common/AppCard.vue';
import { fetchBookingServices } from '~/utils/booking-api';

const router = useRouter();

const services = ref<BookingService[]>([]);
const loading = ref(true);
const errorMessage = ref('');

async function loadServices(): Promise<void> {
  loading.value = true;
  errorMessage.value = '';
  try {
    services.value = await fetchBookingServices();
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : String(e);
  } finally {
    loading.value = false;
  }
}

function openService(id: string) {
  router.push({ name: 'bookingService', params: { serviceId: id } });
}

onMounted(loadServices);
</script>

<template>
  <div>
    <div class="text-h6 font-weight-bold mb-3">預約服務</div>

    <div v-if="loading" class="text-center text-medium-emphasis py-8">載入中...</div>
    <div v-else-if="errorMessage" class="text-error text-body-2">{{ errorMessage }}</div>

    <template v-else>
      <AppCard
        v-for="service in services"
        :key="service.id"
        class="mb-3"
        @click="openService(service.id)"
      >
        <div class="text-body-1 font-weight-bold">{{ service.name }}</div>
        <div v-if="service.description" class="text-caption text-medium-emphasis">
          {{ service.description }}
        </div>
      </AppCard>
      <div v-if="services.length === 0" class="text-caption text-medium-emphasis text-center py-8">
        目前尚未開放任何服務項目
      </div>
    </template>
  </div>
</template>
