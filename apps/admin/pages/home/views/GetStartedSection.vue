<template>
  <v-container class="py-12" :max-width="CONTAINER_WIDTH - 100">
    <v-row justify="center" class="text-center mb-6">
      <v-col cols="12" md="8">
        <div class="text-h5 font-weight-medium">{{ $t('home.getStarted.title') }}</div>
      </v-col>
    </v-row>
    <v-row justify="center">
      <v-col cols="12">
        <HomeCard class="pa-8">
          <div class="text-subtitle-1 font-weight-medium mb-2">
            {{ $t('home.getStarted.nameLabel') }}
          </div>
          <v-text-field
            v-model="contactName"
            :placeholder="$t('home.getStarted.namePlaceholder')"
            class="mb-4"
            hide-details="auto"
          />

          <div class="text-subtitle-1 font-weight-medium mb-2">
            {{ $t('home.getStarted.businessLabel') }}
          </div>
          <v-text-field
            v-model="businessDescription"
            :placeholder="$t('home.getStarted.businessPlaceholder')"
            class="mb-4"
            hide-details="auto"
          />

          <div class="text-subtitle-1 font-weight-medium mb-2">
            {{ $t('home.getStarted.emailLabel') }}
          </div>
          <v-text-field
            v-model="contactEmail"
            type="email"
            placeholder="example@email.com"
            class="mb-4"
            hide-details="auto"
          />

          <div class="text-subtitle-1 font-weight-medium mb-4">
            {{ $t('home.getStarted.formTitle') }}
          </div>
          <div class="mb-4">
            <div class="text-caption text-medium-emphasis mb-2">
              {{ $t('home.getStarted.includedLabel') }}
            </div>
            <div class="d-flex flex-wrap ga-2">
              <v-chip
                v-for="module in mandatoryModules"
                :key="module"
                color="primary"
                variant="flat"
                prepend-icon="mdi-lock"
                class="locked-chip"
              >
                {{ $t(`features.${module}.title`) }}
              </v-chip>
            </div>
          </div>
          <div class="mb-6">
            <div class="text-caption text-medium-emphasis mb-2">
              {{ $t('home.getStarted.optionalLabel') }}
            </div>
            <div class="d-flex flex-wrap ga-2">
              <v-chip
                v-for="module in optionalModules"
                :key="module"
                :color="isModuleSelected(module) ? 'primary' : undefined"
                :variant="isModuleSelected(module) ? 'flat' : 'outlined'"
                :prepend-icon="isModuleSelected(module) ? 'mdi-check' : undefined"
                @click="toggleModule(module)"
              >
                {{ $t(`features.${module}.title`) }}
              </v-chip>
            </div>
          </div>
          <v-divider class="my-6"></v-divider>
          <div class="d-flex justify-end">
            <ButtonsAppButton
              kind="primary"
              block
              size="x-large"
              class="text-none"
              :loading="submitting"
              @click="submitFeatureRequest"
            >
              {{ $t('home.getStarted.submit') }}
            </ButtonsAppButton>
          </div>
        </HomeCard>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { FEATURE_MODULES, MANDATORY_FEATURE_MODULES } from '@saas-starter-kit/shared';
import type { FeatureModule } from '@saas-starter-kit/shared';
import HomeCard from '../components/HomeCard.vue';
import { CONTAINER_WIDTH } from './constants';

const { t } = useI18n();
const { showSuccess, showError } = useToast();
const { $api } = useNuxtApp();

const mandatoryModules = MANDATORY_FEATURE_MODULES;
const optionalModules = FEATURE_MODULES.filter((m) => !MANDATORY_FEATURE_MODULES.includes(m));

const contactName = ref('');
const businessDescription = ref('');
const contactEmail = ref('');
const selectedOptionalModules = ref<Set<FeatureModule>>(new Set());
const submitting = ref(false);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isModuleSelected(module: FeatureModule) {
  return selectedOptionalModules.value.has(module);
}

function toggleModule(module: FeatureModule) {
  const next = new Set(selectedOptionalModules.value);
  if (next.has(module)) {
    next.delete(module);
  } else {
    next.add(module);
  }
  selectedOptionalModules.value = next;
}

async function submitFeatureRequest() {
  if (!contactName.value.trim() || !EMAIL_REGEX.test(contactEmail.value.trim())) {
    showError(t('home.getStarted.validationError'));
    return;
  }

  submitting.value = true;
  try {
    await $api('/api/marketing/feature-request', {
      method: 'POST',
      body: {
        name: contactName.value.trim(),
        business: businessDescription.value.trim(),
        email: contactEmail.value.trim(),
        modules: [...mandatoryModules, ...selectedOptionalModules.value],
      },
    });
    showSuccess(t('home.getStarted.submitSuccess'));
    contactName.value = '';
    businessDescription.value = '';
    contactEmail.value = '';
    selectedOptionalModules.value = new Set();
  } catch {
    showError(t('home.getStarted.submitError'));
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.locked-chip {
  cursor: default;
  pointer-events: none;
}
</style>
