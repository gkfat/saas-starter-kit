<template>
  <v-row class="fill-height" no-gutters justify="center" align="center">
    <v-col cols="12" sm="8" md="4">
      <CardsAppCard class="pa-6" elevation="4">
        <v-card-title class="text-h5 mb-4">{{ $t('auth.createAccount') }}</v-card-title>

        <AuthRegisterForm @success="router.push(ROUTES.login)" />

        <div class="text-center text-body-2 mt-6">
          {{ $t('auth.hasAccount') }}
          <NuxtLink :to="ROUTES.login">{{ $t('auth.loginLink') }}</NuxtLink>
        </div>
      </CardsAppCard>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import { ROUTES } from '~/config/app-routes';

definePageMeta({ path: ROUTES.register });

const router = useRouter();
</script>
