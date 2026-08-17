<template>
  <section class="architecture-section">
    <v-container class="py-12" :max-width="CONTAINER_WIDTH">
      <v-row justify="center" class="text-center mb-8">
        <v-col cols="12" md="8">
          <div class="text-h5 font-weight-medium mb-2">{{ $t('home.architecture.title') }}</div>
          <div class="text-body-2 text-medium-emphasis">
            {{ $t('home.architecture.subtitle') }}
          </div>
        </v-col>
      </v-row>
      <v-row justify="center" align="center" class="architecture-diagram">
        <v-col cols="12" sm="5">
          <HomeCard class="pa-6 h-100 text-center">
            <div class="architecture-icon">
              <v-icon icon="mdi-cellphone" size="28" />
            </div>
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
              width="140"
              height="140"
            />
            <div v-if="liffQrDataUrl" class="text-caption text-medium-emphasis mt-2">
              {{ $t('home.architecture.liff.qrCaption') }}
            </div>
          </HomeCard>
        </v-col>

        <v-col cols="12" sm="2" class="architecture-connector">
          <v-icon icon="mdi-sync" size="20" />
        </v-col>

        <v-col cols="12" sm="5">
          <HomeCard class="pa-6 h-100 text-center">
            <div class="architecture-icon">
              <v-icon icon="mdi-monitor-dashboard" size="28" />
            </div>
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
  </section>
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

<style scoped>
.architecture-section {
  background: #ffffff;
}

.architecture-icon {
  width: 56px;
  height: 56px;
  margin: 0 auto 12px;
  border-radius: 14px;
  background: #fdf1e6;
  color: #e8804b;
  display: flex;
  align-items: center;
  justify-content: center;
}

.architecture-connector {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #c9b89a;
  position: relative;
}

.architecture-connector::before,
.architecture-connector::after {
  content: '';
  flex: 1;
  height: 1px;
  border-top: 1px dashed #edd9c2;
}

.architecture-connector .v-icon {
  margin: 0 8px;
}

@media (max-width: 599.98px) {
  .architecture-connector {
    transform: rotate(90deg);
    margin: -8px 0;
  }
}
</style>
