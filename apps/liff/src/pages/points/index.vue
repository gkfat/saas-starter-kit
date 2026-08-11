<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { PointsAdjustReasonMeta } from '@saas-starter-kit/shared';
import type { PointsLedgerEntry, PointsWallet } from '@saas-starter-kit/shared';
import AppCard from '~/components/common/AppCard.vue';
import { apiFetch } from '~/utils/api-client';
import { getFreshIdToken } from '~/utils/auth-token';

type TabValue = 'earned' | 'used';

const tabs: { value: TabValue; label: string }[] = [
  { value: 'earned', label: '獲得記錄' },
  { value: 'used', label: '使用記錄' },
];

const wallet = ref<PointsWallet | null>(null);
const ledger = ref<PointsLedgerEntry[]>([]);
const loading = ref(true);
const errorMessage = ref('');
const activeTab = ref<TabValue>('earned');

const earned = computed(() => ledger.value.filter((entry) => entry.amount >= 0));
const used = computed(() => ledger.value.filter((entry) => entry.amount < 0));

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function reasonLabel(entry: PointsLedgerEntry): string {
  const label = PointsAdjustReasonMeta[entry.reason] ?? entry.reason;
  return entry.reasonNote ? `${label}（${entry.reasonNote}）` : label;
}

async function loadPoints(): Promise<void> {
  loading.value = true;
  errorMessage.value = '';
  try {
    const idToken = await getFreshIdToken();
    const headers = { Authorization: `Bearer ${idToken ?? ''}` };
    wallet.value = await apiFetch<PointsWallet>('/api/profile/points', { headers });
    ledger.value = await apiFetch<PointsLedgerEntry[]>('/api/profile/points/ledger', { headers });
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : String(e);
  } finally {
    loading.value = false;
  }
}

onMounted(loadPoints);
</script>

<template>
  <div>
    <div class="d-flex align-center justify-space-between mb-3">
      <div class="text-h6 font-weight-bold">我的點數</div>
      <v-btn
        icon="mdi-refresh"
        variant="text"
        density="comfortable"
        :loading="loading"
        @click="loadPoints"
      />
    </div>

    <div v-if="loading" class="text-center text-medium-emphasis py-8">載入中...</div>
    <div v-else-if="errorMessage" class="text-error text-body-2">{{ errorMessage }}</div>

    <template v-else>
      <v-sheet v-if="wallet" color="primary" rounded="lg" class="pa-6 text-center mb-3">
        <div class="d-flex align-center justify-center">
          <v-avatar color="white" size="28" class="mr-2">
            <span class="text-subtitle-2 font-weight-bold text-primary">P</span>
          </v-avatar>
          <span class="text-h4 font-weight-bold text-white">{{ wallet.balance }}</span>
        </div>
      </v-sheet>

      <v-tabs
        v-model="activeTab"
        grow
        bg-color="white"
        selected-class="bg-warning"
        hide-slider
        class="rounded-lg mb-3"
      >
        <v-tab v-for="tab in tabs" :key="tab.value" :value="tab.value">
          {{ tab.label }}
        </v-tab>
      </v-tabs>

      <v-window v-model="activeTab">
        <v-window-item value="earned">
          <AppCard v-for="entry in earned" :key="entry.id" class="mb-3">
            <div class="d-flex justify-space-between align-center">
              <div>
                <div class="text-body-1">{{ reasonLabel(entry) }}</div>
                <div class="text-caption text-medium-emphasis">
                  {{ formatDateTime(entry.createdAt) }}
                </div>
              </div>
              <div class="text-h6 font-weight-bold text-success">+{{ entry.amount }}</div>
            </div>
          </AppCard>
          <div
            v-if="earned.length === 0"
            class="text-caption text-medium-emphasis text-center py-8"
          >
            尚未有獲得紀錄
          </div>
        </v-window-item>

        <v-window-item value="used">
          <AppCard v-for="entry in used" :key="entry.id" class="mb-3">
            <div class="d-flex justify-space-between align-center">
              <div>
                <div class="text-body-1">{{ reasonLabel(entry) }}</div>
                <div class="text-caption text-medium-emphasis">
                  {{ formatDateTime(entry.createdAt) }}
                </div>
              </div>
              <div class="text-h6 font-weight-bold text-error">{{ entry.amount }}</div>
            </div>
          </AppCard>
          <div v-if="used.length === 0" class="text-caption text-medium-emphasis text-center py-8">
            尚未有使用紀錄
          </div>
        </v-window-item>
      </v-window>
    </template>
  </div>
</template>
