<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { PointsAdjustReasonMeta } from '@saas-starter-kit/shared';
import type { PointsLedgerEntry } from '@saas-starter-kit/shared';
import AppCard from '~/components/common/AppCard.vue';
import { apiFetch } from '~/utils/api-client';
import { getFreshIdToken } from '~/utils/auth-token';

const ledger = ref<PointsLedgerEntry[]>([]);
const loading = ref(true);
const errorMessage = ref('');

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('zh-TW');
}

function reasonLabel(entry: PointsLedgerEntry): string {
  const label = PointsAdjustReasonMeta[entry.reason] ?? entry.reason;
  return entry.reasonNote ? `${label}（${entry.reasonNote}）` : label;
}

async function loadLedger(): Promise<void> {
  loading.value = true;
  errorMessage.value = '';
  try {
    const idToken = await getFreshIdToken();
    ledger.value = await apiFetch<PointsLedgerEntry[]>('/api/profile/points/ledger', {
      headers: { Authorization: `Bearer ${idToken ?? ''}` },
    });
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : String(e);
  } finally {
    loading.value = false;
  }
}

onMounted(loadLedger);
</script>

<template>
  <div>
    <div class="d-flex align-center justify-space-between mb-3">
      <div class="text-h6 font-weight-bold">點數紀錄</div>
      <v-btn
        icon="mdi-refresh"
        variant="text"
        density="comfortable"
        :loading="loading"
        @click="loadLedger"
      />
    </div>

    <div v-if="loading" class="text-center text-medium-emphasis py-8">載入中...</div>
    <div v-else-if="errorMessage" class="text-error text-body-2">{{ errorMessage }}</div>

    <template v-else>
      <AppCard v-for="entry in ledger" :key="entry.id" class="mb-3">
        <div class="d-flex justify-space-between align-center">
          <div>
            <div class="text-body-1">{{ reasonLabel(entry) }}</div>
            <div class="text-caption text-medium-emphasis">
              {{ formatDateTime(entry.createdAt) }}
            </div>
          </div>
          <div
            class="text-h6 font-weight-bold"
            :class="entry.amount >= 0 ? 'text-success' : 'text-error'"
          >
            {{ entry.amount >= 0 ? '+' : '' }}{{ entry.amount }}
          </div>
        </div>
      </AppCard>
      <div class="text-caption text-medium-emphasis text-center py-4">已經到底囉</div>
    </template>
  </div>
</template>
