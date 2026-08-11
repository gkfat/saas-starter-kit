<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { CouponInstanceDetail } from '@saas-starter-kit/shared';
import AppCard from '~/components/common/AppCard.vue';
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
    <div class="d-flex align-center justify-space-between mb-3">
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
          <AppCard
            v-for="coupon in usable"
            :key="coupon.id"
            class="mb-3"
            :to="{ name: 'couponDetail', params: { id: coupon.id } }"
          >
            <div class="d-flex justify-space-between align-center">
              <div>
                <div class="text-body-1 font-weight-bold">{{ coupon.title }}</div>
                <div class="text-caption text-medium-emphasis">
                  到期日：{{ formatDate(coupon.expiresAt) }}
                </div>
              </div>
              <v-btn
                icon="mdi-qrcode"
                variant="text"
                density="comfortable"
                :to="{ name: 'couponDetail', params: { id: coupon.id } }"
              />
            </div>
          </AppCard>
          <div
            v-if="usable.length === 0"
            class="text-caption text-medium-emphasis text-center py-8"
          >
            尚未有可使用優惠券
          </div>
        </v-window-item>

        <v-window-item value="redeemed">
          <AppCard
            v-for="coupon in redeemed"
            :key="coupon.id"
            class="mb-3 bg-white"
            variant="tonal"
          >
            <div class="text-body-1">{{ coupon.title }}</div>
            <div class="text-caption text-medium-emphasis">
              使用時間：{{ coupon.redeemedAt ? formatDate(coupon.redeemedAt) : '-' }}
            </div>
          </AppCard>
          <div
            v-if="redeemed.length === 0"
            class="text-caption text-medium-emphasis text-center py-8"
          >
            尚未有已使用優惠券
          </div>
        </v-window-item>

        <v-window-item value="expired">
          <AppCard
            v-for="coupon in expired"
            :key="coupon.id"
            class="mb-3"
            variant="tonal"
            :to="{ name: 'couponDetail', params: { id: coupon.id } }"
          >
            <div class="text-body-1 text-medium-emphasis">{{ coupon.title }}</div>
            <div class="text-caption text-medium-emphasis">
              到期日：{{ formatDate(coupon.expiresAt) }}
            </div>
          </AppCard>
          <div
            v-if="expired.length === 0"
            class="text-caption text-medium-emphasis text-center py-8"
          >
            尚未有已失效優惠券
          </div>
        </v-window-item>
      </v-window>
    </template>
  </div>
</template>
