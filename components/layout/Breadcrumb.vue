<template>
  <div class="d-flex align-center mb-3" style="font-size: 11px; color: #5f6368">
    <nav class="d-flex align-center ga-1 flex-grow-1">
      <template v-for="(crumb, i) in crumbs" :key="crumb.path">
        <span v-if="i > 0" class="text-disabled">/</span>
        <NuxtLink
          v-if="crumb.to"
          :to="crumb.to"
          class="text-decoration-none"
          style="color: inherit"
        >
          {{ crumb.label }}
        </NuxtLink>
        <span v-else>{{ crumb.label }}</span>
      </template>
    </nav>

    <v-menu>
      <template #activator="{ props }">
        <v-btn
          v-bind="props"
          variant="text"
          size="x-small"
          density="compact"
          class="text-disabled px-1"
          style="font-size: 11px; min-width: 0"
        >
          <v-icon size="13" class="mr-1">mdi-translate</v-icon>
          {{ currentLocaleName }}
        </v-btn>
      </template>
      <v-list density="compact" min-width="120">
        <v-list-item
          v-for="loc in locales"
          :key="loc.code"
          :active="loc.code === currentLocale"
          active-color="primary"
          @click="switchLocale(loc.code)"
        >
          <v-list-item-title style="font-size: 12px">{{ loc.name }}</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-menu>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const { locale, locales, setLocale } = useI18n();

const crumbs = computed(() => {
  const segments = route.path.split('/').filter(Boolean);
  return segments.map((seg, i) => ({
    path: seg,
    label: seg.charAt(0).toUpperCase() + seg.slice(1),
    to: i < segments.length - 1 ? '/' + segments.slice(0, i + 1).join('/') : undefined,
  }));
});

const currentLocale = computed(() => locale.value);
const currentLocaleName = computed(
  () => locales.value.find((l) => l.code === locale.value)?.name ?? locale.value,
);

function switchLocale(code: string) {
  setLocale(code as 'zh-TW' | 'en');
}
</script>
