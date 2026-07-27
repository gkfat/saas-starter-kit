<template>
  <div>
    <!-- Hero -->
    <section class="hero-section" @mousemove="onHeroMouseMove">
      <v-container class="py-16">
        <v-row justify="center" class="text-center">
          <v-col cols="12" md="9">
            <div class="text-h4 font-weight-medium mb-4">{{ $t('home.hero.title') }}</div>
            <div class="text-body-1 text-medium-emphasis mb-10">
              {{ $t('home.hero.subtitle') }}
            </div>
            <div class="d-flex justify-center ga-3 flex-wrap">
              <ButtonsAppButton kind="primary" size="large" class="text-none" to="/login">
                {{ $t('home.hero.ctaPrimary') }}
              </ButtonsAppButton>
              <ButtonsAppButton kind="secondary" size="large" class="text-none" href="#explore">
                {{ $t('home.hero.ctaSecondary') }}
              </ButtonsAppButton>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Traditional vs platform -->
    <v-container class="py-12" :max-width="800">
      <v-row justify="center" class="text-center mb-6">
        <v-col cols="12" md="8">
          <div class="text-h5 font-weight-medium">{{ $t('home.process.title') }}</div>
        </v-col>
      </v-row>
      <v-row justify="center">
        <v-col v-for="column in processColumns" :key="column.labelKey" cols="12" sm="6">
          <HomeCard class="pa-6 h-100">
            <div class="text-subtitle-1 font-weight-medium mb-3" :class="column.labelClass">
              {{ $t(column.labelKey) }}
            </div>
            <v-list density="compact">
              <v-list-item
                v-for="n in column.stepCount"
                :key="n"
                :title="$t(`${column.stepsKey}.${n - 1}`)"
                :prepend-icon="column.icon"
              />
            </v-list>
            <div class="text-caption text-medium-emphasis mt-2">
              {{ $t(column.noteKey) }}
            </div>
          </HomeCard>
        </v-col>
      </v-row>
    </v-container>

    <!-- Explore -->
    <section id="explore" class="explore-section">
      <v-container class="py-12">
        <v-row justify="center" class="text-center mb-6">
          <v-col cols="12" md="8">
            <div class="text-h5 font-weight-medium">{{ $t('home.explore.title') }}</div>
          </v-col>
        </v-row>

        <div v-for="category in featureCategories" :key="category.labelKey" class="mb-8">
          <v-row justify="center" class="mb-3">
            <v-col cols="12" md="8" class="text-center">
              <div class="text-subtitle-1 font-weight-medium text-primary">
                {{ $t(category.labelKey) }}
              </div>
            </v-col>
          </v-row>
          <v-row justify="center">
            <v-col v-for="module in category.modules" :key="module" cols="12" sm="6" md="4">
              <HomeCard class="pa-6 h-100">
                <v-icon
                  :icon="FEATURE_MODULE_ICONS[module]"
                  color="primary"
                  size="32"
                  class="mb-3"
                />
                <div class="text-h6 mb-2">{{ $t(`features.${module}.title`) }}</div>
                <div class="text-body-2 text-medium-emphasis">
                  {{ $t(`features.${module}.description`) }}
                </div>
              </HomeCard>
            </v-col>
          </v-row>
        </div>
      </v-container>
    </section>

    <!-- Industries -->
    <v-container class="py-12" :max-width="1000">
      <v-row justify="center" class="text-center mb-4">
        <v-col cols="12" md="8">
          <div class="text-h5 font-weight-medium mb-2">{{ $t('home.industries.title') }}</div>
          <div class="text-body-2 text-medium-emphasis">{{ $t('home.industries.subtitle') }}</div>
        </v-col>
      </v-row>
      <v-row justify="center">
        <v-col cols="12" md="8" class="d-flex flex-wrap justify-center ga-2">
          <v-chip v-for="n in 8" :key="n" variant="outlined" color="primary">
            {{ $t(`home.industries.items.${n - 1}`) }}
          </v-chip>
        </v-col>
      </v-row>
      <v-row justify="center" class="text-center mt-4">
        <v-col cols="12" md="8">
          <div class="text-body-2 text-medium-emphasis">{{ $t('home.industries.footnote') }}</div>
        </v-col>
      </v-row>
    </v-container>

    <!-- Pricing info -->
    <v-container class="py-12" :max-width="1000">
      <v-row justify="center" class="text-center mb-6">
        <v-col cols="12" md="8">
          <div class="text-h5 font-weight-medium">{{ $t('home.pricingInfo.title') }}</div>
        </v-col>
      </v-row>
      <v-row justify="center">
        <v-col v-for="card in pricingInfoCards" :key="card.key" cols="12" sm="6" md="4">
          <HomeCard class="pa-6 h-100">
            <v-icon :icon="card.icon" color="primary" size="32" class="mb-3" />
            <div class="text-h6 mb-1">{{ $t(`home.pricingInfo.items.${card.key}.title`) }}</div>
            <v-chip size="small" color="primary" variant="tonal" class="mb-3">
              {{ $t(`home.pricingInfo.items.${card.key}.tag`) }}
            </v-chip>
            <div class="text-body-2 text-medium-emphasis">
              {{ $t(`home.pricingInfo.items.${card.key}.description`) }}
            </div>
          </HomeCard>
        </v-col>
      </v-row>
    </v-container>

    <!-- Get started -->
    <v-container class="py-12" :max-width="800">
      <v-row justify="center" class="text-center mb-6">
        <v-col cols="12" md="8">
          <div class="text-h5 font-weight-medium">{{ $t('home.getStarted.title') }}</div>
        </v-col>
      </v-row>
      <v-row justify="center">
        <v-col cols="12">
          <HomeCard class="pa-6">
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
                  @click="toggleModule(module)"
                >
                  {{ $t(`features.${module}.title`) }}
                </v-chip>
              </div>
            </div>
            <div class="d-flex justify-end">
              <ButtonsAppButton
                kind="primary"
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
  </div>
</template>
<script lang="ts" setup>
import {
  FEATURE_MODULES,
  FeatureModule,
  MANDATORY_FEATURE_MODULES,
} from '~/shared/feature-modules';
import HomeCard from './components/HomeCard.vue';

definePageMeta({ path: '/home' });

const { t } = useI18n();
const { showSuccess, showError } = useToast();

type ProcessColumn = {
  labelKey: string;
  labelClass?: string;
  stepsKey: string;
  stepCount: number;
  icon: string;
  noteKey: string;
};

const processColumns: ProcessColumn[] = [
  {
    labelKey: 'home.process.traditional.label',
    stepsKey: 'home.process.traditional.steps',
    stepCount: 6,
    icon: 'mdi-arrow-right-thin',
    noteKey: 'home.process.traditional.note',
  },
  {
    labelKey: 'home.process.platform.label',
    labelClass: 'text-primary',
    stepsKey: 'home.process.platform.steps',
    stepCount: 2,
    icon: 'mdi-check',
    noteKey: 'home.process.platform.note',
  },
];

const pricingInfoCards = [
  { key: '0', icon: 'mdi-package-variant-closed' },
  { key: '1', icon: 'mdi-puzzle-outline' },
  { key: '2', icon: 'mdi-palette-outline' },
  { key: '3', icon: 'mdi-rocket-launch-outline' },
  { key: '4', icon: 'mdi-tools' },
];

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
    await $fetch('/api/marketing/feature-request', {
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

const FEATURE_MODULE_ICONS: Record<FeatureModule, string> = {
  [FeatureModule.Auth]: 'mdi-login-variant',
  [FeatureModule.UserManagement]: 'mdi-account-group',
  [FeatureModule.Rbac]: 'mdi-shield-account',
  [FeatureModule.LoginLogs]: 'mdi-login',
  [FeatureModule.AuditLogs]: 'mdi-history',
  [FeatureModule.Dashboard]: 'mdi-view-dashboard',
};

type FeatureCategory = {
  labelKey: string;
  modules: FeatureModule[];
};

const featureCategories: FeatureCategory[] = [
  {
    labelKey: 'home.explore.categories.membership',
    modules: [FeatureModule.Auth, FeatureModule.UserManagement],
  },
  {
    labelKey: 'home.explore.categories.admin',
    modules: [FeatureModule.Rbac, FeatureModule.LoginLogs, FeatureModule.AuditLogs],
  },
  {
    labelKey: 'home.explore.categories.analytics',
    modules: [FeatureModule.Dashboard],
  },
];

function onHeroMouseMove(e: MouseEvent) {
  const target = e.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  target.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
  target.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
}
</script>

<style scoped>
.hero-section {
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #e8f0fe 0%, #ffffff 55%, #d2e3fc 100%);
  /* Cancel the ancestor PageContent v-container's fixed 16px padding (v-app-bar is
     position: fixed and out of flow, so this container's padding-top lands directly
     on the hero) so the hero background reaches the true top/left/right edges. */
  margin-top: -16px;
  margin-left: -16px;
  margin-right: -16px;
  width: calc(100% + 32px);
}

.hero-section::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  opacity: 0;
  background: radial-gradient(
    360px circle at var(--mouse-x, 50%) var(--mouse-y, 50%),
    rgba(25, 103, 210, 0.28),
    transparent 70%
  );
  transition: opacity 0.35s ease;
  pointer-events: none;
}

.hero-section:hover::before {
  opacity: 1;
}

.hero-section .v-row {
  position: relative;
  z-index: 1;
}

.locked-chip {
  cursor: default;
  pointer-events: none;
}

.explore-section {
  background: #f1f4f9;
  /* Cancel the ancestor PageContent v-container's fixed 16px left/right padding so the
     background reaches the true left/right edges, like the hero. */
  margin-left: -16px;
  margin-right: -16px;
  width: calc(100% + 32px);
}
</style>
