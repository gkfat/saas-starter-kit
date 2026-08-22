<template>
  <section id="explore" class="explore-section">
    <v-container class="py-12">
      <v-row justify="center" class="text-center mb-8">
        <v-col cols="12" md="8">
          <span class="explore-eyebrow">MODULE INDEX</span>
          <div class="text-h5 font-weight-medium text-white mt-4">
            {{ $t('home.explore.title') }}
          </div>
        </v-col>
      </v-row>

      <div class="explore-layout">
        <nav class="explore-nav">
          <button
            v-for="(category, index) in featureCategories"
            :key="category.labelKey"
            type="button"
            class="explore-nav-item"
            :class="{ 'explore-nav-item-active': activeCategory === category.labelKey }"
            @click="scrollToCategory(category.labelKey)"
          >
            <span class="explore-nav-num">{{ String(index + 1).padStart(2, '0') }}</span>
            <span class="explore-nav-label">{{ $t(category.labelKey) }}</span>
            <span class="explore-nav-count">{{ category.modules.length }}</span>
          </button>
        </nav>

        <div class="explore-content">
          <div
            v-for="category in featureCategories"
            :key="category.labelKey"
            :ref="(el) => setCategoryRef(category.labelKey, el)"
            :data-category="category.labelKey"
            class="explore-group"
            :class="{ 'explore-group-dim': activeCategory !== category.labelKey }"
          >
            <div class="explore-group-label">{{ $t(category.labelKey) }}</div>
            <div class="ticket-grid">
              <div v-for="module in category.modules" :key="module" class="ticket">
                <div class="ticket-stub">
                  <v-icon :icon="FEATURE_MODULE_ICONS[module]" size="24" />
                  <span class="ticket-perf" />
                </div>
                <div class="ticket-body">
                  <span class="ticket-tag">{{ FEATURE_MODULE_TAGS[module] }}</span>
                  <div class="ticket-title">{{ $t(`features.${module}.title`) }}</div>
                  <div class="ticket-desc">{{ $t(`features.${module}.description`) }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </v-container>
  </section>
</template>

<script setup lang="ts">
import { FeatureModule } from '@saas-starter-kit/shared';

const FEATURE_MODULE_ICONS: Record<FeatureModule, string> = {
  [FeatureModule.Auth]: 'mdi-login-variant',
  [FeatureModule.UserManagement]: 'mdi-account-group',
  [FeatureModule.Rbac]: 'mdi-shield-account',
  [FeatureModule.LoginLogs]: 'mdi-login',
  [FeatureModule.AuditLogs]: 'mdi-history',
  [FeatureModule.Dashboard]: 'mdi-view-dashboard',
  [FeatureModule.Level]: 'mdi-podium-gold',
  [FeatureModule.Coupon]: 'mdi-ticket-percent',
  [FeatureModule.Points]: 'mdi-cash-multiple',
  [FeatureModule.Event]: 'mdi-bullhorn-outline',
  [FeatureModule.Booking]: 'mdi-calendar-check-outline',
  [FeatureModule.MemberLiff]: 'mdi-cellphone-message',
};

const FEATURE_MODULE_TAGS: Record<FeatureModule, string> = {
  [FeatureModule.Auth]: 'AUTH',
  [FeatureModule.UserManagement]: 'USER',
  [FeatureModule.Rbac]: 'RBAC',
  [FeatureModule.LoginLogs]: 'LOGIN',
  [FeatureModule.AuditLogs]: 'AUDIT',
  [FeatureModule.Dashboard]: 'STATS',
  [FeatureModule.Level]: 'LEVEL',
  [FeatureModule.Coupon]: 'COUPON',
  [FeatureModule.Points]: 'POINTS',
  [FeatureModule.Event]: 'EVENT',
  [FeatureModule.Booking]: 'BOOKING',
  [FeatureModule.MemberLiff]: 'LIFF',
};

type FeatureCategory = {
  labelKey: string;
  modules: FeatureModule[];
};

const featureCategories: FeatureCategory[] = [
  {
    labelKey: 'home.explore.categories.membership',
    modules: [FeatureModule.Auth, FeatureModule.UserManagement, FeatureModule.MemberLiff],
  },
  {
    labelKey: 'home.explore.categories.admin',
    modules: [FeatureModule.Rbac, FeatureModule.LoginLogs, FeatureModule.AuditLogs],
  },
  {
    labelKey: 'home.explore.categories.engagement',
    modules: [
      FeatureModule.Level,
      FeatureModule.Coupon,
      FeatureModule.Points,
      FeatureModule.Event,
      FeatureModule.Booking,
    ],
  },
  {
    labelKey: 'home.explore.categories.analytics',
    modules: [FeatureModule.Dashboard],
  },
];

const activeCategory = ref(featureCategories[0]?.labelKey ?? '');
const categoryOrder = featureCategories.map((category) => category.labelKey);
const categoryRefs = new Map<string, HTMLElement>();
let scrollRaf = 0;

function setCategoryRef(labelKey: string, el: Element | null) {
  if (el instanceof HTMLElement) {
    categoryRefs.set(labelKey, el);
  }
}

function getHeaderOffset() {
  const header = document.querySelector('.v-app-bar');
  return header instanceof HTMLElement ? header.offsetHeight : 0;
}

function scrollToCategory(labelKey: string) {
  const target = categoryRefs.get(labelKey);
  if (!target) return;

  const top = target.getBoundingClientRect().top + window.scrollY - getHeaderOffset() - 16;

  window.scrollTo({ top, behavior: 'smooth' });
}

function updateActiveCategory() {
  const threshold = getHeaderOffset() + 32;

  let current = categoryOrder[0];
  for (const labelKey of categoryOrder) {
    const el = categoryRefs.get(labelKey);
    if (!el) continue;
    if (el.getBoundingClientRect().top <= threshold) {
      current = labelKey;
    }
  }

  if (current) activeCategory.value = current;
}

function onScroll() {
  cancelAnimationFrame(scrollRaf);
  scrollRaf = requestAnimationFrame(updateActiveCategory);
}

onMounted(() => {
  updateActiveCategory();
  window.addEventListener('scroll', onScroll, { passive: true });
});

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll);
  cancelAnimationFrame(scrollRaf);
});
</script>

<style scoped>
.explore-section {
  background: linear-gradient(180deg, #33495d 0%, #1f2933 100%);
  /* Cancel the ancestor PageContent v-container's fixed 16px left/right padding so the
     background reaches the true left/right edges, like the hero. */
  margin-left: -16px;
  margin-right: -16px;
  width: calc(100% + 32px);
}

.explore-eyebrow {
  display: inline-block;
  font-family: 'Fraunces', 'Noto Sans TC', serif;
  font-weight: 600;
  font-size: 13px;
  letter-spacing: 0.08em;
  color: #e8804b;
  padding: 4px 14px;
  border: 1px solid rgba(237, 217, 194, 0.35);
  border-radius: 999px;
}

.explore-layout {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 40px;
}

@media (max-width: 959.98px) {
  .explore-layout {
    grid-template-columns: 1fr;
    gap: 24px;
  }
}

.explore-nav {
  display: flex;
  flex-direction: column;
  position: sticky;
  /* 64px matches PublicHeader's fixed v-app-bar height, so the nav sticks below it
     instead of scrolling underneath. */
  top: calc(64px + 24px);
  align-self: start;
}

@media (max-width: 959.98px) {
  .explore-nav {
    position: static;
    flex-direction: row;
    gap: 8px;
    overflow-x: auto;
    padding-bottom: 4px;
  }
}

.explore-nav-item {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 14px 4px;
  border: none;
  border-top: 1px solid rgba(157, 184, 214, 0.18);
  background: transparent;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
}

.explore-nav-item:first-child {
  border-top: none;
}

@media (max-width: 959.98px) {
  .explore-nav-item {
    border-top: none;
    border: 1px solid rgba(157, 184, 214, 0.25);
    border-radius: 999px;
    padding: 8px 16px;
    white-space: nowrap;
  }
}

.explore-nav-num {
  font-family: 'Fraunces', 'Noto Sans TC', serif;
  font-size: 12px;
  color: rgba(157, 184, 214, 0.6);
}

.explore-nav-label {
  font-size: 15px;
  font-weight: 500;
  color: #dce8f4;
}

.explore-nav-item-active .explore-nav-num,
.explore-nav-item-active .explore-nav-label {
  color: #e8804b;
}

.explore-nav-count {
  margin-left: auto;
  font-size: 11px;
  color: rgba(157, 184, 214, 0.55);
}

@media (max-width: 959.98px) {
  .explore-nav-count {
    display: none;
  }
}

.explore-group {
  margin-bottom: 40px;
  transition: opacity 0.3s ease;
}

.explore-group:last-child {
  margin-bottom: 0;
}

@media (min-width: 960px) {
  .explore-group-dim {
    opacity: 0.35;
  }
}

.explore-group-label {
  font-size: 13px;
  letter-spacing: 0.04em;
  color: #9db8d6;
  margin-bottom: 14px;
}

@media (min-width: 960px) {
  .explore-group-label {
    display: none;
  }
}

.ticket-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 18px;
}

.ticket {
  position: relative;
  display: flex;
  background: #fdf8f0;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 14px 30px -20px rgba(0, 0, 0, 0.55);
  transition:
    transform 0.25s ease,
    box-shadow 0.25s ease;
}

.ticket:hover {
  transform: translateY(-3px);
  box-shadow: 0 18px 34px -16px rgba(0, 0, 0, 0.6);
}

.ticket-stub {
  flex: 0 0 64px;
  background: #fdf1e6;
  color: #e8804b;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.ticket-perf {
  position: absolute;
  right: -1px;
  top: 0;
  bottom: 0;
  width: 0;
  border-right: 2px dashed rgba(31, 41, 51, 0.18);
}

.ticket-perf::before,
.ticket-perf::after {
  content: '';
  position: absolute;
  right: -7px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #1f2933;
}

.ticket-perf::before {
  top: -7px;
}

.ticket-perf::after {
  bottom: -7px;
}

.ticket-body {
  padding: 16px 18px;
  flex: 1;
  min-width: 0;
}

.ticket-tag {
  font-family: ui-monospace, 'SFMono-Regular', Menlo, monospace;
  font-size: 10.5px;
  letter-spacing: 0.06em;
  color: rgba(31, 41, 51, 0.4);
  margin-bottom: 6px;
  display: block;
}

.ticket-title {
  font-size: 15px;
  font-weight: 600;
  color: #1f2933;
  margin-bottom: 6px;
}

.ticket-desc {
  font-size: 12.5px;
  line-height: 1.6;
  color: rgba(31, 41, 51, 0.62);
}
</style>
