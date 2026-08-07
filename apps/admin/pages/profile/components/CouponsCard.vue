<template>
  <CardsAppCard class="h-100">
    <v-card-title class="py-3">{{ $t('coupons.myCard.cardTitle') }}</v-card-title>
    <v-card-text>
      <template v-if="coupons.length > 0">
        <v-row>
          <v-col cols="12" sm="4">
            <div class="text-caption text-medium-emphasis">
              {{ $t('coupons.myCard.usable') }}
            </div>
            <div>{{ usableCount }}</div>
          </v-col>

          <v-col cols="12" sm="4">
            <div class="text-caption text-medium-emphasis">
              {{ $t('coupons.myCard.redeemed') }}
            </div>
            <div>{{ redeemedCount }}</div>
          </v-col>

          <v-col cols="12" sm="4">
            <div class="text-caption text-medium-emphasis">
              {{ $t('coupons.myCard.expired') }}
            </div>
            <div>{{ expiredCount }}</div>
          </v-col>
        </v-row>
      </template>
      <span v-else class="text-medium-emphasis">{{ $t('coupons.myCard.empty') }}</span>
    </v-card-text>
  </CardsAppCard>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { CouponInstanceDetail } from '@saas-starter-kit/shared';

const props = defineProps<{
  coupons: CouponInstanceDetail[];
}>();

const usableCount = computed(() => props.coupons.filter((c) => c.state === 'usable').length);
const redeemedCount = computed(() => props.coupons.filter((c) => c.state === 'redeemed').length);
const expiredCount = computed(() => props.coupons.filter((c) => c.state === 'expired').length);
</script>
