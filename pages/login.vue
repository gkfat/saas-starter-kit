<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="4">
        <v-card class="pa-6" elevation="4">
          <v-card-title class="text-h5 mb-4">登入</v-card-title>

          <v-alert v-if="error" type="error" class="mb-4" density="compact">
            {{ error }}
          </v-alert>

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

          <v-btn block variant="outlined" :disabled="loading" @click="navigateTo('/otp')">
            <v-icon start>mdi-phone</v-icon>
            手機 OTP 登入
          </v-btn>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
const { loginWithEmail, loginWithGoogle } = useAuth();
const router = useRouter();

const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');

async function handleEmailLogin() {
  error.value = '';
  loading.value = true;
  try {
    await loginWithEmail(email.value, password.value);
    router.push('/');
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : '登入失敗';
  } finally {
    loading.value = false;
  }
}

async function handleGoogleLogin() {
  error.value = '';
  loading.value = true;
  try {
    await loginWithGoogle();
    router.push('/');
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : '登入失敗';
  } finally {
    loading.value = false;
  }
}
</script>
