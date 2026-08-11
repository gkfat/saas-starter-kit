<template>
  <section class="hero-section" @mousemove="onHeroMouseMove">
    <v-container class="py-16">
      <v-row justify="center" class="text-center">
        <v-col cols="12" md="9">
          <div class="text-h4 font-weight-medium mb-4">{{ $t('home.hero.title') }}</div>
          <div class="text-body-1 text-medium-emphasis mb-10">
            {{ $t('home.hero.subtitle') }}
          </div>
          <div class="d-flex justify-center ga-3 flex-wrap">
            <ButtonsAppButton kind="primary" size="large" class="text-none" :to="ROUTES.login">
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
</template>

<script setup lang="ts">
import { ROUTES } from '~/config/app-routes';

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
</style>
