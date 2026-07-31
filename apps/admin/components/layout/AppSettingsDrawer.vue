<template>
  <Teleport to="body">
    <Transition name="settings-panel">
      <div v-if="open" class="settings-root">
        <div class="settings-scrim" @click="open = false" />
        <div class="settings-panel">
          <div class="d-flex align-center px-4 settings-header">
            <span class="text-body-1 font-weight-medium flex-grow-1">{{
              $t('settings.title')
            }}</span>
            <v-btn icon size="small" variant="text" @click="open = false">
              <v-icon>mdi-close</v-icon>
            </v-btn>
          </div>

          <v-divider />

          <div class="px-4 py-4">
            <div class="text-caption text-medium-emphasis text-uppercase font-weight-medium mb-2">
              {{ $t('settings.language') }}
            </div>
            <v-list density="compact" rounded="lg" bg-color="transparent">
              <v-list-item
                v-for="loc in locales"
                :key="loc.code"
                :active="loc.code === currentLocale"
                active-color="primary"
                rounded="lg"
                @click="switchLocale(loc.code)"
              >
                <template #prepend>
                  <v-icon size="18" class="mr-2">mdi-translate</v-icon>
                </template>
                <v-list-item-title class="text-body-2">{{ loc.name }}</v-list-item-title>
                <template v-if="loc.code === currentLocale" #append>
                  <v-icon size="16" color="primary">mdi-check</v-icon>
                </template>
              </v-list-item>
            </v-list>

            <div
              class="text-caption text-medium-emphasis text-uppercase font-weight-medium mb-2 mt-4"
            >
              {{ $t('settings.timezone') }}
            </div>
            <v-select
              :model-value="timezoneStore.selected"
              :items="timezoneOptions"
              item-title="label"
              item-value="value"
              variant="outlined"
              density="compact"
              hide-details
              :menu-props="{ zIndex: 10000 }"
              @update:model-value="switchTimezone"
            />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { TimezoneOptions, type TimezoneValue } from '@saas-starter-kit/shared';
import { useTimezoneStore } from '~/stores/timezone';

const open = defineModel<boolean>({ default: false });

const { locale, locales, setLocale } = useI18n();
const timezoneStore = useTimezoneStore();

const currentLocale = computed(() => locale.value);
const timezoneOptions = TimezoneOptions;

function switchLocale(code: string) {
  setLocale(code as 'zh-TW' | 'en');
  open.value = false;
}

function switchTimezone(value: TimezoneValue) {
  timezoneStore.setTimezone(value);
  open.value = false;
}
</script>

<style scoped>
.settings-root {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  justify-content: flex-end;
}

.settings-scrim {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.32);
}

.settings-panel {
  position: relative;
  width: 280px;
  max-width: 100vw;
  height: 100%;
  background: rgb(var(--v-theme-surface));
  color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity));
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.settings-header {
  min-height: 56px;
  flex-shrink: 0;
}

/* Slide from right */
.settings-panel-enter-active,
.settings-panel-leave-active {
  transition: opacity 0.2s ease;
}
.settings-panel-enter-active .settings-panel,
.settings-panel-leave-active .settings-panel {
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.settings-panel-enter-from .settings-panel,
.settings-panel-leave-to .settings-panel {
  transform: translateX(100%);
}
.settings-panel-enter-from,
.settings-panel-leave-to {
  opacity: 0;
}
</style>
