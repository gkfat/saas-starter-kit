<template>
  <div>
    <LayoutPageHeader :title="$t('coupons.myCard.cardTitle')" />

    <v-select
      v-model="stateFilter"
      :items="stateFilterOptions"
      :label="$t('coupons.myCard.filterState')"
      hide-details
      variant="outlined"
      density="compact"
      class="mb-4"
      style="max-width: 180px"
    />

    <CardsAppCard v-if="filteredCoupons.length === 0">
      <v-card-text class="text-medium-emphasis text-center py-8">
        {{ $t('coupons.myCard.empty') }}
      </v-card-text>
    </CardsAppCard>

    <v-row v-else>
      <v-col v-for="coupon in filteredCoupons" :key="coupon.id" cols="12" md="6" lg="4">
        <CardsAppCard :class="{ 'bg-grey-lighten-3': coupon.state === 'redeemed' }">
          <v-card-text>
            <div class="d-flex justify-space-between align-start">
              <div>
                <div class="text-body-1 font-weight-bold">{{ coupon.title }}</div>
                <div class="text-caption text-medium-emphasis">{{ coupon.description }}</div>
                <div class="text-caption text-medium-emphasis">{{ coupon.code }}</div>
              </div>
              <v-chip size="small" :color="stateColor(coupon.state)" variant="tonal">
                {{ $t(`coupons.myCard.${coupon.state}`) }}
              </v-chip>
            </div>
            <v-divider class="my-3" />
            <div class="text-caption text-medium-emphasis">
              <template v-if="coupon.state === 'redeemed'">
                {{ $t('coupons.myCard.redeemedAt', { date: formatDate(coupon.redeemedAt) }) }}
              </template>
              <template v-else>
                {{ $t('coupons.myCard.expiresAt', { date: formatDate(coupon.expiresAt) }) }}
              </template>
            </div>
          </v-card-text>
        </CardsAppCard>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { FeatureFlag } from '@saas-starter-kit/shared';
import type { CouponInstanceDetail, CouponInstanceState } from '@saas-starter-kit/shared';

const { isFeatureEnabled } = useFeatureFlags();
if (!isFeatureEnabled(FeatureFlag.Coupon)) {
  throw createError({ statusCode: 404, statusMessage: 'Not Found' });
}

const { t } = useI18n();

const { data: coupons } = await useAuthFetch<CouponInstanceDetail[]>('/api/profile/coupons', {
  default: () => [],
});

const stateFilter = ref<CouponInstanceState | 'all'>('all');

const stateFilterOptions = computed(() => [
  { title: t('coupons.myCard.filterAll'), value: 'all' },
  { title: t('coupons.myCard.usable'), value: 'usable' },
  { title: t('coupons.myCard.redeemed'), value: 'redeemed' },
  { title: t('coupons.myCard.expired'), value: 'expired' },
]);

const filteredCoupons = computed(() => {
  const list =
    stateFilter.value === 'all'
      ? coupons.value
      : coupons.value.filter((coupon) => coupon.state === stateFilter.value);

  return [...list].sort((a, b) => {
    if (a.state === 'usable' && b.state === 'usable') {
      return new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime();
    }
    return 0;
  });
});

function stateColor(state: CouponInstanceState): string {
  switch (state) {
    case 'usable':
      return 'success';
    case 'redeemed':
      return 'default';
    case 'expired':
      return 'error';
  }
}
</script>
