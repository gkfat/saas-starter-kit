<script setup lang="ts">
import { ref, watch } from 'vue';
import AppCard from '~/components/common/AppCard.vue';
import { useToast } from '~/composables/useToast';
import { useAuthStore } from '~/stores/auth';
import { apiFetch } from '~/utils/api-client';
import { getFreshIdToken } from '~/utils/auth-token';

const store = useAuthStore();
const { showSuccess } = useToast();

const editing = ref(false);
const displayNameInput = ref(store.user?.displayName ?? '');
const saving = ref(false);
const errorMessage = ref('');

watch(
  () => store.user?.displayName,
  (displayName) => {
    if (!editing.value) displayNameInput.value = displayName ?? '';
  },
);

function startEdit() {
  displayNameInput.value = store.user?.displayName ?? '';
  errorMessage.value = '';
  editing.value = true;
}

function cancelEdit() {
  editing.value = false;
  errorMessage.value = '';
  displayNameInput.value = store.user?.displayName ?? '';
}

async function save() {
  const trimmed = displayNameInput.value.trim();
  if (!trimmed || !store.user) return;

  saving.value = true;
  errorMessage.value = '';
  try {
    const idToken = await getFreshIdToken();
    await apiFetch('/api/profile/display-name', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${idToken ?? ''}` },
      body: { displayName: trimmed },
    });
    store.user.displayName = trimmed;
    editing.value = false;
    showSuccess('個人資料已更新');
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : String(e);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div>
    <div class="d-flex align-center justify-space-between mb-3">
      <div class="text-h6 font-weight-bold">個人資料</div>
    </div>

    <AppCard>
      <v-row dense class="py-3 ga-1">
        <v-col cols="12">
          <v-text-field
            :model-value="store.user?.username ?? '-'"
            variant="outlined"
            rounded="xl"
            label="帳號"
            hide-details
            readonly
            :disabled="editing"
          />
        </v-col>

        <v-col cols="12">
          <v-text-field
            v-model="displayNameInput"
            label="顯示名稱"
            rounded="xl"
            :readonly="!editing"
            variant="outlined"
            hide-details="auto"
            :disabled="saving"
          />
        </v-col>

        <v-col cols="12">
          <v-text-field
            :model-value="store.user?.email ?? '未綁定'"
            label="Email"
            readonly
            rounded="xl"
            hide-details
            variant="outlined"
            :disabled="editing"
          />
        </v-col>

        <v-col cols="12">
          <v-text-field
            :model-value="store.user?.phone ?? '未綁定'"
            label="手機號碼"
            hide-details
            rounded="xl"
            readonly
            variant="outlined"
            :disabled="editing"
          />
        </v-col>
      </v-row>

      <div v-if="errorMessage" class="text-error text-caption">{{ errorMessage }}</div>

      <v-card-actions>
        <v-spacer />
        <v-btn v-if="editing" variant="outlined" :disabled="saving" @click="cancelEdit">取消</v-btn>
        <v-btn
          color="info"
          variant="flat"
          :loading="saving"
          @click="editing ? save() : startEdit()"
        >
          {{ editing ? '儲存' : '編輯' }}
        </v-btn>
      </v-card-actions>
    </AppCard>
  </div>
</template>
