<script setup lang="ts">
import { onMounted, ref } from 'vue';
import QRCode from 'qrcode';
import { useRoute, useRouter } from 'vue-router';
import type { CouponInstanceDetail } from '@saas-starter-kit/shared';
import { fetchCouponDetail } from '~/utils/coupons-api';

const route = useRoute();
const router = useRouter();

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
    <v-btn variant="text" prepend-icon="mdi-arrow-left" class="mb-2" @click="router.back()">
      返回
    </v-btn>

    <div v-if="loading" class="text-center text-medium-emphasis py-8">載入中...</div>
    <div v-else-if="errorMessage" class="text-error text-body-2">{{ errorMessage }}</div>

    <v-card v-else-if="coupon" class="pa-4 text-center" elevation="4" rounded="lg">
      <div class="text-h6 font-weight-bold mb-1">{{ coupon.title }}</div>
      <div class="text-body-2 text-medium-emphasis mb-4">{{ coupon.description }}</div>

      <div v-if="qrDataUrl" class="d-flex justify-center mb-3">
        <img :src="qrDataUrl" alt="優惠券 QR code" width="200" height="200" />
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
    </v-card>
  </div>
</template>
