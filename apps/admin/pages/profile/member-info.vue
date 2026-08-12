<template>
  <div>
    <LayoutPageHeader :title="$t('memberInfo.title')" />
    <v-row align="stretch">
      <v-col cols="12" md="6">
        <CardsAppCard class="h-100">
          <v-card-text>
            <div class="text-caption text-medium-emphasis">{{ $t('memberInfo.memberNo') }}</div>
            <div class="mb-4">{{ store.user?.memberNo ?? '—' }}</div>

            <template v-if="isLevelEnabled">
              <v-divider class="mb-4" />

              <template v-if="level">
                <v-chip
                  prepend-icon="mdi-star"
                  color="warning"
                  variant="flat"
                  size="small"
                  class="font-weight-bold text-caption mb-3"
                >
                  {{ level.levelName }}
                </v-chip>

                <v-progress-linear
                  :model-value="periodProgress"
                  color="info"
                  bg-opacity="0.12"
                  height="8"
                  rounded
                  class="mb-2"
                />

                <div class="d-flex justify-space-between">
                  <div class="text-caption text-medium-emphasis">
                    {{ level.currentPeriodTotal
                    }}<template v-if="level.nextTierThreshold !== null">
                      ／ {{ level.nextTierThreshold }}</template
                    >
                  </div>
                  <div class="text-caption text-medium-emphasis">
                    {{ $t('memberInfo.expiresAt', { date: formatDate(level.endDate) }) }}
                  </div>
                </div>
              </template>
              <span v-else class="text-medium-emphasis">{{ $t('level.notInitialized') }}</span>
            </template>

            <template v-if="isPointsEnabled">
              <v-divider class="mb-4" :class="{ 'mt-4': isLevelEnabled }" />

              <v-row no-gutters>
                <v-col cols="6">
                  <div class="text-caption text-medium-emphasis">
                    {{ $t('points.myCard.balance') }}
                  </div>
                  <div>{{ wallet.balance }}</div>
                </v-col>
                <v-col cols="6">
                  <div class="text-caption text-medium-emphasis">
                    {{ $t('points.myCard.redeemableAmount') }}
                  </div>
                  <div>{{ wallet.redeemableAmount }}</div>
                </v-col>
              </v-row>
            </template>
          </v-card-text>
        </CardsAppCard>
      </v-col>

      <v-col v-if="isPointsEnabled" cols="12">
        <CardsAppCard>
          <v-card-title class="py-3">{{ $t('points.myCard.ledgerTitle') }}</v-card-title>
          <v-card-text>
            <v-data-table
              :headers="ledgerHeaders"
              :items="ledger"
              item-value="id"
              density="compact"
            >
              <template #no-data>
                <span class="text-medium-emphasis">{{ $t('points.myCard.ledgerEmpty') }}</span>
              </template>
              <template #[`item.amount`]="{ item }">
                <span :class="item.amount >= 0 ? 'text-success' : 'text-error'">{{
                  item.amount
                }}</span>
              </template>
              <template #[`item.reason`]="{ item }">
                {{ reasonLabel(item.reason)
                }}<template v-if="item.reasonNote"> ({{ item.reasonNote }})</template>
              </template>
              <template #[`item.createdAt`]="{ item }">
                {{ formatDateTime(item.createdAt) }}
              </template>
            </v-data-table>
          </v-card-text>
        </CardsAppCard>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { FeatureFlag, PointsAdjustReasonMeta } from '@saas-starter-kit/shared';
import type {
  GetLevelResult,
  PointsAdjustReason,
  PointsLedgerEntry,
  PointsWallet,
} from '@saas-starter-kit/shared';
import { useAuthStore } from '~/stores/auth';

const store = useAuthStore();
const { t } = useI18n();

const { isFeatureEnabled } = useFeatureFlags();
const isLevelEnabled = isFeatureEnabled(FeatureFlag.Level);
const isPointsEnabled = isFeatureEnabled(FeatureFlag.Points);

const { data: level } = isLevelEnabled
  ? await useAuthFetch<GetLevelResult | null>('/api/profile/level', { default: () => null })
  : { data: ref(null) };

const { data: wallet } = isPointsEnabled
  ? await useAuthFetch<PointsWallet>('/api/profile/points', {
      default: () => ({ balance: 0, redeemableAmount: 0 }),
    })
  : { data: ref({ balance: 0, redeemableAmount: 0 }) };

const { data: ledger } = isPointsEnabled
  ? await useAuthFetch<PointsLedgerEntry[]>('/api/profile/points/ledger', { default: () => [] })
  : { data: ref([]) };

const periodProgress = computed(() => {
  if (!level.value || !level.value.nextTierThreshold) return 0;
  return Math.min(
    100,
    Math.max(0, (level.value.currentPeriodTotal / level.value.nextTierThreshold) * 100),
  );
});

function reasonLabel(reason: PointsAdjustReason): string {
  return PointsAdjustReasonMeta[reason] ?? reason;
}

const ledgerHeaders = computed(() => [
  { title: t('points.myCard.ledgerAmount'), key: 'amount' },
  { title: t('points.myCard.ledgerBalanceAfter'), key: 'balanceAfter' },
  { title: t('points.myCard.ledgerReason'), key: 'reason' },
  { title: t('points.myCard.ledgerCreatedAt'), key: 'createdAt' },
]);
</script>
