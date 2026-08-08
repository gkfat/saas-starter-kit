<script setup lang="ts">
import { onMounted, ref } from 'vue';
import QRCode from 'qrcode';
import { useRoute } from 'vue-router';
import type { CouponInstanceDetail } from '@saas-starter-kit/shared';
import AppCard from '~/components/common/AppCard.vue';
import { fetchCouponDetail } from '~/utils/coupons-api';

const route = useRoute();

const coupon = ref<CouponInstanceDetail | null>(null);
const qrDataUrl = ref<string | null>(null);
const loading = ref(true);
const errorMessage = ref('');

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('zh-TW');
}

const STATE_LABEL: Record<CouponInstanceDetail['state'], string> = {
  usable: '可使用',
  redeemed: '已使用',
  expired: '已過期',
};

onMounted(async () => {
  try {
    const id = String(route.params.id);
    coupon.value = await fetchCouponDetail(id);
    qrDataUrl.value = await QRCode.toDataURL(coupon.value.code);
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

    <AppCard v-else-if="coupon" class="text-center">
      <div class="text-h6 font-weight-bold mb-1">{{ coupon.title }}</div>
      <div class="text-body-2 text-medium-emphasis">{{ coupon.description }}</div>

      <div v-if="qrDataUrl" class="d-flex justify-center">
        <img :src="qrDataUrl" alt="優惠券 QR code" width="300" height="300" />
      </div>
      <div class="text-body-1 font-weight-bold mb-1">{{ coupon.code }}</div>
      <div class="text-caption text-medium-emphasis mb-3">
        到期日：{{ formatDate(coupon.expiresAt) }}
      </div>
      <v-chip
        :color="
          coupon.state === 'usable' ? 'success' : coupon.state === 'redeemed' ? 'info' : 'error'
        "
        size="small"
        variant="flat"
      >
        {{ STATE_LABEL[coupon.state] }}
      </v-chip>
    </AppCard>

    <div class="close-button-bar d-flex justify-center">
      <v-btn icon="mdi-close" variant="tonal" :to="{ name: 'myCoupons' }" />
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
