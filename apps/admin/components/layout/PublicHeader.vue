<template>
  <v-app-bar flat elevation="0" class="public-header" height="64">
    <div class="d-flex align-center px-4 w-100">
      <div
        class="d-flex align-center flex-grow-1"
        style="cursor: pointer"
        @click="router.push(ROUTES.root)"
      >
        <img :src="'/logo.svg'" alt="" width="24" height="24" class="flex-shrink-0" />
        <span class="ml-3 text-body-1 font-weight-medium">SaaS Starter Kit</span>
      </div>

      <v-menu>
        <template #activator="{ props }">
          <v-btn v-bind="props" variant="text" size="small" class="text-none">
            <v-icon size="16" class="mr-1">mdi-translate</v-icon>
            {{ currentLocaleName }}
          </v-btn>
        </template>
        <v-list density="compact" min-width="120">
          <v-list-item
            v-for="loc in locales"
            :key="loc.code"
            :active="loc.code === currentLocale"
            active-color="accent"
            @click="switchLocale(loc.code)"
          >
            <v-list-item-title style="font-size: 12px">{{ loc.name }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>

      <ButtonsAppButton kind="primary" class="text-none ml-3" :to="ROUTES.login">
        {{ $t('auth.goToLogin') }}
      </ButtonsAppButton>
    </div>
  </v-app-bar>
</template>

<script setup lang="ts">
import { ROUTES } from '~/config/app-routes';

const router = useRouter();
const { locale, locales, setLocale } = useI18n();

const currentLocale = computed(() => locale.value);
const currentLocaleName = computed(
  () => locales.value.find((l) => l.code === locale.value)?.name ?? locale.value,
);

function switchLocale(code: string) {
  setLocale(code as 'zh-TW' | 'en');
}
</script>

<style scoped>
.public-header {
  background: #ffffff !important;
}
</style>
