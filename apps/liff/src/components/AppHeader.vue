<template>
  <v-card class="d-flex align-center py-2 px-2 mb-4" elevation="4" rounded="lg">
    <v-row no-gutters justify="space-between" align="center">
      <v-col cols="auto">
        <v-btn icon="mdi-menu" variant="text" @click="emit('toggle-menu')" />
      </v-col>
      <v-col cols="auto">
        <span class="text-subtitle-1 font-weight-bold flex-grow-1 text-center"
          >SaaS Starter Kit</span
        >
      </v-col>
      <v-col cols="auto">
        <v-btn v-if="store.user?.memberNo" icon="mdi-qrcode" variant="text" @click="openQrDialog" />
        <div v-else style="width: 40px" />
      </v-col>
    </v-row>
  </v-card>

  <v-dialog v-model="qrDialog" max-width="320">
    <v-card class="pa-4 text-center" rounded="lg">
      <div class="text-subtitle-1 font-weight-bold mb-1">會員條碼</div>
      <div v-if="store.user?.memberNo" class="text-body-2 text-medium-emphasis mb-3">
        {{ store.user.memberNo }}
      </div>
      <div v-if="qrDataUrl" class="d-flex justify-center mb-2">
        <img :src="qrDataUrl" alt="會員條碼" width="200" height="200" />
      </div>
      <v-btn variant="text" size="small" @click="qrDialog = false">關閉</v-btn>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import QRCode from 'qrcode';
import { useAuthStore } from '~/stores/auth';

const emit = defineEmits<{ 'toggle-menu': [] }>();

const store = useAuthStore();
const qrDialog = ref(false);
const qrDataUrl = ref<string | null>(null);

async function openQrDialog() {
  if (!qrDataUrl.value && store.user?.memberNo) {
    qrDataUrl.value = await QRCode.toDataURL(store.user.memberNo);
  }
  qrDialog.value = true;
}
</script>
