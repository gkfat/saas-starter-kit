<template>
  <section class="process-section">
    <v-container class="py-12" :max-width="CONTAINER_WIDTH">
      <v-row justify="center" class="text-center mb-8">
        <v-col cols="12" md="8">
          <div class="text-h5 font-weight-medium">{{ $t('home.process.title') }}</div>
        </v-col>
      </v-row>
      <v-row justify="center" align="stretch">
        <v-col
          v-for="column in processColumns"
          :key="column.labelKey"
          cols="12"
          sm="6"
          class="d-flex"
        >
          <div class="process-track" :class="{ 'process-track-highlight': column.highlight }">
            <div class="process-track-head">
              <div class="process-track-label" :class="column.labelClass">
                {{ $t(column.labelKey) }}
              </div>
              <div class="process-track-count">
                {{ $t('home.process.stepCount', { count: column.stepCount }) }}
              </div>
            </div>
            <ol class="process-steps">
              <li v-for="n in column.stepCount" :key="n" class="process-step">
                <span class="process-step-marker">{{ n }}</span>
                <span class="process-step-text">{{ $t(`${column.stepsKey}.${n - 1}`) }}</span>
              </li>
            </ol>
            <div class="process-track-note">{{ $t(column.noteKey) }}</div>
          </div>
        </v-col>
      </v-row>
    </v-container>
  </section>
</template>

<script setup lang="ts">
import { CONTAINER_WIDTH } from './constants';

type ProcessColumn = {
  labelKey: string;
  labelClass?: string;
  stepsKey: string;
  stepCount: number;
  noteKey: string;
  highlight?: boolean;
};

const processColumns: ProcessColumn[] = [
  {
    labelKey: 'home.process.traditional.label',
    stepsKey: 'home.process.traditional.steps',
    stepCount: 6,
    noteKey: 'home.process.traditional.note',
  },
  {
    labelKey: 'home.process.platform.label',
    labelClass: 'text-primary',
    stepsKey: 'home.process.platform.steps',
    stepCount: 2,
    noteKey: 'home.process.platform.note',
    highlight: true,
  },
];
</script>

<style scoped>
.process-section {
  background: #ffffff;
  margin-left: -16px;
  margin-right: -16px;
  width: calc(100% + 32px);
}

.process-track {
  width: 100%;
  border: 1px solid #edd9c2;
  border-radius: 12px;
  background: #ffffff;
  padding: 24px;
  display: flex;
  flex-direction: column;
}

.process-track-highlight {
  border-color: #e8804b;
  background: #fff9f4;
}

.process-track-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 16px;
}

.process-track-label {
  font-size: 1rem;
  font-weight: 500;
}

.process-track-count {
  font-family: 'Fraunces', 'Noto Sans TC', serif;
  font-weight: 600;
  font-size: 0.875rem;
  color: #8a94a6;
}

.process-track-highlight .process-track-count {
  color: #e8804b;
}

.process-steps {
  list-style: none;
  margin: 0 0 16px;
  padding: 0;
  position: relative;
}

.process-step {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 0;
  position: relative;
}

.process-step:not(:last-child)::after {
  content: '';
  position: absolute;
  left: 11px;
  top: 28px;
  width: 1px;
  height: calc(100% - 12px);
  background: #edd9c2;
}

.process-track-highlight .process-step:not(:last-child)::after {
  background: #f3c9a8;
}

.process-step-marker {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  background: #f2ede2;
  color: #6b7280;
  z-index: 1;
}

.process-track-highlight .process-step-marker {
  background: #e8804b;
  color: #ffffff;
}

.process-step-text {
  font-size: 0.875rem;
  color: #1f2933;
}

.process-track-note {
  font-size: 0.75rem;
  color: #8a94a6;
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px dashed #edd9c2;
}
</style>
