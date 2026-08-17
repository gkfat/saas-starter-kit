<template>
  <footer class="footer-section">
    <v-container class="py-8" :max-width="CONTAINER_WIDTH">
      <div class="text-subtitle-1 font-weight-bold mb-2">{{ $t('home.footer.brand') }}</div>
      <div class="text-body-2 text-medium-emphasis">
        {{ $t('home.footer.copyright', { year: currentYear }) }}
      </div>
    </v-container>
  </footer>
</template>

<script setup lang="ts">
import { CONTAINER_WIDTH } from './constants';

const currentYear = new Date().getFullYear();
</script>

<style scoped>
.footer-section {
  background: #f3f4f6;
  border-top: 1px solid #e2e5ea;
  margin-left: -16px;
  margin-right: -16px;
  width: calc(100% + 32px);
}
</style>
