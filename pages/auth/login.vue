<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="4">
        <v-card class="pa-6" elevation="4">
          <v-card-title class="text-h5 mb-4">登入</v-card-title>

          <v-form @submit.prevent="handleEmailLogin">
            <v-text-field v-model="email" label="Email" type="email" required :disabled="loading" />
            <v-text-field
              v-model="password"
              label="密碼"
              type="password"
              required
              :disabled="loading"
            />
            <v-btn type="submit" color="primary" block :loading="loading" class="mb-3">
              登入
            </v-btn>
          </v-form>

          <v-divider class="my-4" />

          <v-btn
            block
            variant="outlined"
            :loading="loading"
            class="mb-3"
            @click="handleGoogleLogin"
          >
            <v-icon start>mdi-google</v-icon>
            透過 Google 登入
          </v-btn>

          <div class="text-center text-body-2 mt-2">
            還沒有帳號？
            <NuxtLink to="/auth/register">前往註冊</NuxtLink>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'blank', path: '/login' });

const { loginWithEmail, loginWithGoogle } = useAuth();
const { showError } = useToast();
const router = useRouter();

const email = ref('');
const password = ref('');
const loading = ref(false);

const FIREBASE_LOGIN_ERRORS: Record<string, string> = {
  'auth/invalid-credential': '帳號或密碼錯誤',
  'auth/wrong-password': '帳號或密碼錯誤',
  'auth/user-not-found': '帳號或密碼錯誤',
  'auth/invalid-email': 'Email 格式不正確',
  'auth/user-disabled': '帳號已停用，請聯絡管理員',
  'auth/too-many-requests': '登入嘗試次數過多，請稍後再試',
};

function getLoginErrorMessage(e: unknown): string {
  const code = (e as { code?: string }).code ?? '';
  return FIREBASE_LOGIN_ERRORS[code] ?? '登入失敗，請再試一次';
}

async function handleEmailLogin() {
  loading.value = true;
  try {
    await loginWithEmail(email.value, password.value);
    router.push('/dashboard');
  } catch (e: unknown) {
    showError(getLoginErrorMessage(e));
  } finally {
    loading.value = false;
  }
}

async function handleGoogleLogin() {
  loading.value = true;
  try {
    await loginWithGoogle();
    router.push('/dashboard');
  } catch (e: unknown) {
    showError(getLoginErrorMessage(e));
  } finally {
    loading.value = false;
  }
}
</script>
