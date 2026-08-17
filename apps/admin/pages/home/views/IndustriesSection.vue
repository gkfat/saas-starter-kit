<template>
  <section class="industries-section">
    <v-container class="py-12" :max-width="CONTAINER_WIDTH">
      <v-row justify="center" class="text-center mb-4">
        <v-col cols="12" md="8">
          <div class="text-h5 font-weight-medium mb-2">{{ $t('home.industries.title') }}</div>
          <div class="text-body-2 text-medium-emphasis">{{ $t('home.industries.subtitle') }}</div>
        </v-col>
      </v-row>
      <v-row justify="center">
        <v-col cols="12" md="8" class="d-flex flex-wrap justify-center ga-2">
          <v-chip v-for="n in 8" :key="n" variant="outlined" class="industry-chip">
            {{ $t(`home.industries.items.${n - 1}`) }}
          </v-chip>
        </v-col>
      </v-row>
      <v-row justify="center" class="text-center mt-4">
        <v-col cols="12" md="8">
          <div class="text-body-2 text-medium-emphasis">{{ $t('home.industries.footnote') }}</div>
        </v-col>
      </v-row>
    </v-container>
  </section>
</template>

<script setup lang="ts">
import { CONTAINER_WIDTH } from './constants';
</script>

<style scoped>
.industries-section {
  background: #ffffff;
  margin-left: -16px;
  margin-right: -16px;
  width: calc(100% + 32px);
}

.industry-chip {
  border-color: #e8804b !important;
  color: #c65f2c;
}
</style>
