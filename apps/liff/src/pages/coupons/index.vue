<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { CouponInstanceDetail } from '@saas-starter-kit/shared';
import { fetchMyCoupons } from '~/utils/coupons-api';

type TabValue = 'usable' | 'redeemed' | 'expired';

const tabs: { value: TabValue; label: string }[] = [
  { value: 'usable', label: '可使用' },
  { value: 'redeemed', label: '已使用' },
  { value: 'expired', label: '已失效' },
];

const coupons = ref<CouponInstanceDetail[]>([]);
const loading = ref(true);
const errorMessage = ref('');
const activeTab = ref<TabValue>('usable');

const usable = computed(() => coupons.value.filter((c) => c.state === 'usable'));
const redeemed = computed(() => coupons.value.filter((c) => c.state === 'redeemed'));
const expired = computed(() => coupons.value.filter((c) => c.state === 'expired'));

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('zh-TW');
}

async function loadCoupons(): Promise<void> {
  loading.value = true;
  errorMessage.value = '';
  try {
    coupons.value = await fetchMyCoupons();
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : String(e);
  } finally {
    loading.value = false;
  }
}

onMounted(loadCoupons);
</script>

<template>
  <div>
    <div class="d-flex align-center justify-space-between mb-4">
      <div class="text-h6 font-weight-bold">我的優惠券</div>
      <v-btn
        icon="mdi-refresh"
        variant="text"
        density="comfortable"
        :loading="loading"
        @click="loadCoupons"
      />
    </div>

    <div v-if="loading" class="text-center text-medium-emphasis py-8">載入中...</div>
    <div v-else-if="errorMessage" class="text-error text-body-2">{{ errorMessage }}</div>

    <template v-else>
      <v-tabs
        v-model="activeTab"
        grow
        bg-color="white"
        selected-class="bg-warning"
        hide-slider
        class="rounded-lg"
      >
        <v-tab v-for="tab in tabs" :key="tab.value" :value="tab.value">
          {{ tab.label }}
        </v-tab>
      </v-tabs>

      <v-window v-model="activeTab" class="mt-3">
        <v-window-item value="usable">
          <div v-if="usable.length === 0" class="text-medium-emphasis text-center py-8">
            目前沒有可使用的優惠券
          </div>
          <v-card
            v-for="coupon in usable"
            :key="coupon.id"
            class="pa-4 mb-3"
            elevation="2"
            rounded="lg"
            :to="{ name: 'couponDetail', params: { id: coupon.id } }"
          >
            <div class="text-body-1 font-weight-bold">{{ coupon.title }}</div>
            <div class="text-caption text-medium-emphasis">
              到期日：{{ formatDate(coupon.expiresAt) }}
            </div>
          </v-card>
        </v-window-item>

        <v-window-item value="redeemed">
          <div v-if="redeemed.length === 0" class="text-medium-emphasis text-center py-8">
            目前沒有已使用的優惠券
          </div>
          <v-card
            v-for="coupon in redeemed"
            :key="coupon.id"
            class="pa-4 mb-3 bg-white"
            elevation="1"
            rounded="lg"
            variant="tonal"
            :to="{ name: 'couponDetail', params: { id: coupon.id } }"
          >
            <div class="text-body-1">{{ coupon.title }}</div>
            <div class="text-caption text-medium-emphasis">
              使用時間：{{ coupon.redeemedAt ? formatDate(coupon.redeemedAt) : '-' }}
            </div>
          </v-card>
        </v-window-item>

        <v-window-item value="expired">
          <div v-if="expired.length === 0" class="text-medium-emphasis text-center py-8">
            目前沒有已失效的優惠券
          </div>
          <v-card
            v-for="coupon in expired"
            :key="coupon.id"
            class="pa-4 mb-3"
            elevation="1"
            rounded="lg"
            variant="tonal"
            :to="{ name: 'couponDetail', params: { id: coupon.id } }"
          >
            <div class="text-body-1 text-medium-emphasis">{{ coupon.title }}</div>
            <div class="text-caption text-medium-emphasis">
              到期日：{{ formatDate(coupon.expiresAt) }}
            </div>
          </v-card>
        </v-window-item>
      </v-window>
    </template>
  </div>
</template>
