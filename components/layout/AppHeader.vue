<template>
  <v-app-bar elevation="1">
    <v-app-bar-nav-icon @click="$emit('toggle-drawer')" />
    <v-app-bar-title>SaaS Starter Kit</v-app-bar-title>
    <v-spacer />
    <v-btn variant="text" :loading="loading" @click="handleLogout">登出</v-btn>
  </v-app-bar>
</template>

<script setup lang="ts">
defineEmits<{ 'toggle-drawer': [] }>();

const { logout } = useAuth();
const router = useRouter();
const loading = ref(false);

async function handleLogout() {
  loading.value = true;
  try {
    await logout();
    router.push('/login');
  } finally {
    loading.value = false;
  }
}
</script>
