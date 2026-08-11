<template>
  <v-container class="py-12" :max-width="CONTAINER_WIDTH">
    <v-row justify="center" class="text-center mb-6">
      <v-col cols="12" md="8">
        <div class="text-h5 font-weight-medium">{{ $t('home.process.title') }}</div>
      </v-col>
    </v-row>
    <v-row justify="center">
      <v-col v-for="column in processColumns" :key="column.labelKey" cols="12" sm="6">
        <HomeCard class="pa-6 h-100">
          <div class="text-subtitle-1 font-weight-medium mb-3" :class="column.labelClass">
            {{ $t(column.labelKey) }}
          </div>
          <v-list density="compact">
            <v-list-item
              v-for="n in column.stepCount"
              :key="n"
              :title="$t(`${column.stepsKey}.${n - 1}`)"
              :prepend-icon="column.icon"
            />
          </v-list>
          <div class="text-caption text-medium-emphasis mt-2">
            {{ $t(column.noteKey) }}
          </div>
        </HomeCard>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import HomeCard from '../components/HomeCard.vue';
import { CONTAINER_WIDTH } from './constants';

type ProcessColumn = {
  labelKey: string;
  labelClass?: string;
  stepsKey: string;
  stepCount: number;
  icon: string;
  noteKey: string;
};

const processColumns: ProcessColumn[] = [
  {
    labelKey: 'home.process.traditional.label',
    stepsKey: 'home.process.traditional.steps',
    stepCount: 6,
    icon: 'mdi-arrow-right-thin',
    noteKey: 'home.process.traditional.note',
  },
  {
    labelKey: 'home.process.platform.label',
    labelClass: 'text-primary',
    stepsKey: 'home.process.platform.steps',
    stepCount: 2,
    icon: 'mdi-check',
    noteKey: 'home.process.platform.note',
  },
];
</script>
