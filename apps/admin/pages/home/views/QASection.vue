<template>
  <section class="qa-section">
    <v-container class="py-12" :max-width="CONTAINER_WIDTH">
      <v-row justify="center" class="text-center mb-8">
        <v-col cols="12" md="8">
          <div class="qa-eyebrow mb-4">{{ $t('home.qa.eyebrow') }}</div>
          <div class="text-h5 font-weight-medium">{{ $t('home.qa.title') }}</div>
        </v-col>
      </v-row>
      <v-row justify="center">
        <v-col cols="12">
          <v-expansion-panels static variant="accordion" flat multiple :model-value="[0]">
            <v-expansion-panel v-for="item in qaItems" :key="item.key" class="qa-panel">
              <v-expansion-panel-title class="text-subtitle-1 font-weight-medium px-3">
                {{ $t(`home.qa.items.${item.key}.question`) }}
              </v-expansion-panel-title>
              <v-expansion-panel-text class="text-body-2 text-medium-emphasis px-3">
                {{ $t(`home.qa.items.${item.key}.answer`) }}
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-col>
      </v-row>
    </v-container>
  </section>
</template>

<script setup lang="ts">
import { CONTAINER_WIDTH } from './constants';

const qaItems = [
  { key: '0' },
  { key: '1' },
  { key: '2' },
  { key: '3' },
  { key: '4' },
  { key: '5' },
  { key: '6' },
  { key: '7' },
];
</script>

<style scoped>
.qa-section {
  background: #ffffff;
  margin-left: -16px;
  margin-right: -16px;
  width: calc(100% + 32px);
}

.qa-eyebrow {
  display: inline-block;
  font-family: 'Fraunces', 'Noto Sans TC', serif;
  font-weight: 600;
  font-size: 13px;
  letter-spacing: 0.04em;
  color: #e8804b;
  padding: 4px 12px;
  border: 1px solid #edd9c2;
  border-radius: 999px;
  background: #fff;
}

.qa-panel {
  border-bottom: 1px solid #edd9c2;
}

.qa-panel:last-child {
  border-bottom: none;
}

:deep(.v-expansion-panel-title) {
  padding: 16px 0;
}

:deep(.v-expansion-panel-text__wrapper) {
  padding-left: 0;
  padding-right: 0;
}
</style>
