<template>
  <v-container class="py-12" :max-width="CONTAINER_WIDTH">
    <v-row justify="center" class="text-center mb-6">
      <v-col cols="12" md="8">
        <div class="text-h5 font-weight-medium mb-2">{{ $t('home.architecture.title') }}</div>
        <div class="text-body-2 text-medium-emphasis">
          {{ $t('home.architecture.subtitle') }}
        </div>
      </v-col>
    </v-row>
    <v-row justify="center">
      <v-col cols="12" sm="6">
        <HomeCard class="pa-6 h-100 text-center">
          <v-icon icon="mdi-cellphone" color="primary" size="32" class="mb-3" />
          <div class="text-subtitle-1 font-weight-medium mb-2">
            {{ $t('home.architecture.liff.label') }}
          </div>
          <div class="text-body-2 text-medium-emphasis mb-4">
            {{ $t('home.architecture.liff.description') }}
          </div>
          <img
            v-if="liffQrDataUrl"
            :src="liffQrDataUrl"
            alt="LIFF QR code"
            width="160"
            height="160"
          />
          <div v-if="liffQrDataUrl" class="text-caption text-medium-emphasis mt-2">
            {{ $t('home.architecture.liff.qrCaption') }}
          </div>
        </HomeCard>
      </v-col>
      <v-col cols="12" sm="6">
        <HomeCard class="pa-6 h-100 text-center">
          <v-icon icon="mdi-monitor-dashboard" color="primary" size="32" class="mb-3" />
          <div class="text-subtitle-1 font-weight-medium mb-2">
            {{ $t('home.architecture.admin.label') }}
          </div>
          <div class="text-body-2 text-medium-emphasis mb-4">
            {{ $t('home.architecture.admin.description') }}
          </div>
          <ButtonsAppButton kind="primary" class="text-none" :to="ROUTES.register">
            {{ $t('home.architecture.admin.cta') }}
          </ButtonsAppButton>
        </HomeCard>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import QRCode from 'qrcode';
import HomeCard from '../components/HomeCard.vue';
import { CONTAINER_WIDTH } from './constants';
import { ROUTES } from '~/config/app-routes';

const { public: publicConfig } = useRuntimeConfig();
const liffQrDataUrl = ref<string | null>(null);

onMounted(async () => {
  if (!publicConfig.liffId) return;
  liffQrDataUrl.value = await QRCode.toDataURL(`https://liff.line.me/${publicConfig.liffId}`);
});
</script>
