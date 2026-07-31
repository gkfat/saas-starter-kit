<script setup lang="ts">
import { ref } from 'vue';
// verifies @saas-starter-kit/shared resolves correctly from apps/liff
import type { AuthUser } from '@saas-starter-kit/shared';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const currentUser = ref<AuthUser | null>(null);
</script>

<template>
  <main>
    <h1>LIFF App</h1>
    <p>API base URL: {{ apiBaseUrl }}</p>
    <p v-if="currentUser">{{ currentUser.displayName }}</p>
  </main>
</template>
