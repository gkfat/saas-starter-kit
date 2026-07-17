<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="4">
        <CardsAppCard class="pa-6" elevation="4">
          <v-card-title class="text-h5 mb-4">{{ $t('auth.createAccount') }}</v-card-title>

          <RegisterForm @success="router.push('/login')" />

          <div class="text-center text-body-2 mt-6">
            {{ $t('auth.hasAccount') }}
            <NuxtLink to="/login">{{ $t('auth.loginLink') }}</NuxtLink>
          </div>
        </CardsAppCard>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import RegisterForm from './components/RegisterForm.vue';

definePageMeta({ layout: 'blank', path: '/register' });

const router = useRouter();
</script>
