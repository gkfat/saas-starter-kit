<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="4">
        <v-card class="pa-6" elevation="4">
          <v-card-title class="text-h5 mb-4">建立帳號</v-card-title>

          <v-form @submit.prevent="handleRegister">
            <v-text-field
              v-model="displayName"
              label="顯示名稱"
              type="text"
              required
              :disabled="loading"
            />
            <v-text-field v-model="email" label="Email" type="email" required :disabled="loading" />
            <v-text-field
              v-model="password"
              label="密碼"
              type="password"
              required
              :disabled="loading"
            />
            <v-text-field
              v-model="confirmPassword"
              label="確認密碼"
              type="password"
              required
              :disabled="loading"
            />
            <v-btn type="submit" color="primary" block :loading="loading" class="mb-3">
              註冊
            </v-btn>
          </v-form>

          <div class="text-center text-body-2">
            已有帳號？
            <NuxtLink to="/login">前往登入</NuxtLink>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'blank' });

const { register } = useAuth();
const { showError } = useToast();
const router = useRouter();

const displayName = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const loading = ref(false);

const FIREBASE_ERROR_MESSAGES: Record<string, string> = {
  'auth/email-already-in-use': 'Email 已被使用，請改用其他 Email 或前往登入',
  'auth/invalid-email': 'Email 格式不正確',
  'auth/weak-password': '密碼強度不足，請使用更複雜的密碼',
};

async function handleRegister() {
  if (password.value !== confirmPassword.value) {
    showError('兩次密碼輸入不一致');
    return;
  }

  loading.value = true;
  try {
    await register(displayName.value, email.value, password.value);
    router.push('/login');
  } catch (e: unknown) {
    const code = (e as { code?: string }).code ?? '';
    showError(FIREBASE_ERROR_MESSAGES[code] ?? '註冊失敗，請再試一次');
  } finally {
    loading.value = false;
  }
}
</script>
