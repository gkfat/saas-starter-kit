<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { BookingProvider } from '@saas-starter-kit/shared';
import BookingBottomAction from '~/components/booking/BookingBottomAction.vue';
import BookingStepper from '~/components/booking/BookingStepper.vue';
import AppCard from '~/components/common/AppCard.vue';
import { fetchBookingProviders } from '~/utils/booking-api';

const route = useRoute();
const router = useRouter();

const serviceId = computed(() => String(route.params.serviceId));
const timeSlotId = computed(() => String(route.query.timeSlotId ?? ''));

const providers = ref<BookingProvider[]>([]);
const loading = ref(true);
const selectedProviderId = ref<string | null>(null);

onMounted(async () => {
  try {
    providers.value = await fetchBookingProviders(timeSlotId.value);
  } catch {
    // 人員清單載入失敗時，不阻擋預約流程——此步驟本就是選填
    providers.value = [];
  } finally {
    loading.value = false;
  }
});

function goToConfirm() {
  router.push({
    name: 'bookingConfirm',
    params: { serviceId: serviceId.value },
    query: {
      timeSlotId: timeSlotId.value,
      ...(selectedProviderId.value ? { providerId: selectedProviderId.value } : {}),
    },
  });
}
</script>

<template>
  <div>
    <BookingStepper :step="2" />
    <div class="text-h6 font-weight-bold mb-3">選擇服務人員</div>

    <div v-if="loading" class="text-center text-medium-emphasis py-8">載入中...</div>

    <template v-else>
      <AppCard
        class="mb-3"
        :class="{ 'border-selected': selectedProviderId === null }"
        @click="selectedProviderId = null"
      >
        <div class="text-body-1 font-weight-bold">不指定</div>
      </AppCard>
      <AppCard
        v-for="provider in providers"
        :key="provider.id"
        class="mb-3"
        :class="{ 'border-selected': selectedProviderId === provider.id }"
        @click="selectedProviderId = provider.id"
      >
        <div class="text-body-1 font-weight-bold">{{ provider.name }}</div>
      </AppCard>

      <div class="booking-bottom-spacer" />
      <BookingBottomAction @click="goToConfirm">下一步</BookingBottomAction>
    </template>
  </div>
</template>

<style scoped>
.border-selected {
  border: 2px solid rgb(var(--v-theme-primary));
}

.booking-bottom-spacer {
  height: 72px;
}
</style>
