<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '~/stores/auth';
import { apiFetch } from '~/utils/api-client';
import { getFreshIdToken } from '~/utils/auth-token';

const store = useAuthStore();

const editingDisplayName = ref(false);
const displayNameInput = ref('');
const savingDisplayName = ref(false);
const errorMessage = ref('');

function startEdit() {
  displayNameInput.value = store.user?.displayName ?? '';
  errorMessage.value = '';
  editingDisplayName.value = true;
}

async function saveDisplayName() {
  const trimmed = displayNameInput.value.trim();
  if (!trimmed || !store.user) return;

  savingDisplayName.value = true;
  errorMessage.value = '';
  try {
    const idToken = await getFreshIdToken();
    await apiFetch('/api/profile/display-name', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${idToken ?? ''}` },
      body: { displayName: trimmed },
    });
    store.user.displayName = trimmed;
    editingDisplayName.value = false;
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : String(e);
  } finally {
    savingDisplayName.value = false;
  }
}
</script>

<template>
  <v-card class="pa-4" elevation="1" rounded="lg">
    <div v-if="!editingDisplayName" class="d-flex justify-end mb-2">
      <v-btn variant="text" size="small" @click="startEdit">編輯</v-btn>
    </div>
    <v-row>
      <v-col cols="12">
        <div class="text-caption text-medium-emphasis">顯示名稱</div>
        <div v-if="!editingDisplayName">{{ store.user?.displayName ?? '-' }}</div>
        <div v-else class="d-flex ga-2 align-center">
          <v-text-field
            v-model="displayNameInput"
            density="compact"
            hide-details
            :disabled="savingDisplayName"
          />
          <v-btn color="primary" size="small" :loading="savingDisplayName" @click="saveDisplayName">
            儲存
          </v-btn>
          <v-btn
            variant="text"
            size="small"
            :disabled="savingDisplayName"
            @click="editingDisplayName = false"
          >
            取消
          </v-btn>
        </div>
        <div v-if="errorMessage" class="text-error text-caption mt-1">{{ errorMessage }}</div>
      </v-col>

      <v-col cols="12" sm="6">
        <div class="text-caption text-medium-emphasis">帳號</div>
        <div>{{ store.user?.username ?? '-' }}</div>
      </v-col>

      <v-col cols="12" sm="6">
        <div class="text-caption text-medium-emphasis">Email</div>
        <div>{{ store.user?.email ?? '未綁定' }}</div>
      </v-col>

      <v-col cols="12" sm="6">
        <div class="text-caption text-medium-emphasis">手機號碼</div>
        <div>{{ store.user?.phone ?? '未綁定' }}</div>
      </v-col>
    </v-row>
  </v-card>
</template>
