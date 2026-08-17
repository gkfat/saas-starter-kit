<template>
  <section class="hero-section">
    <v-container class="py-16">
      <v-row align="center" justify="center">
        <v-col cols="12" md="6" class="text-center text-md-left">
          <div class="hero-eyebrow mb-4">{{ $t('home.hero.eyebrow') }}</div>
          <div class="text-h4 font-weight-medium mb-4 hero-title">{{ $t('home.hero.title') }}</div>
          <div class="text-body-1 text-medium-emphasis mb-10">
            {{ $t('home.hero.subtitle') }}
          </div>
          <div class="d-flex justify-center justify-md-start ga-3 flex-wrap">
            <ButtonsAppButton kind="primary" size="large" elevation="0" :to="ROUTES.login">
              {{ $t('home.hero.ctaPrimary') }}
            </ButtonsAppButton>
            <ButtonsAppButton kind="secondary" color="accent" size="large" @click="scrollToExplore">
              {{ $t('home.hero.ctaSecondary') }}
            </ButtonsAppButton>
          </div>
        </v-col>

        <v-col cols="12" md="5" class="d-flex justify-center mt-12 mt-md-0">
          <div class="member-card">
            <div class="member-card-top">
              <div class="member-card-mark">
                <img :src="'/logo.svg'" alt="" width="20" height="20" />
              </div>
              <div class="member-card-tier">VIP</div>
            </div>
            <div class="member-card-lines">
              <div class="member-card-line member-card-line-lg"></div>
              <div class="member-card-line member-card-line-sm"></div>
            </div>
            <div class="member-card-bottom">
              <span class="member-card-dots">•••• •••• •••• 8842</span>
            </div>
          </div>
        </v-col>
      </v-row>
    </v-container>
  </section>
</template>

<script setup lang="ts">
import { ROUTES } from '~/config/app-routes';

function scrollToExplore() {
  const target = document.getElementById('explore');
  if (!target) return;

  const header = document.querySelector('.v-app-bar');
  const headerHeight = header instanceof HTMLElement ? header.offsetHeight : 0;
  const top = target.getBoundingClientRect().top + window.scrollY - headerHeight;

  window.scrollTo({ top, behavior: 'smooth' });
}
</script>

<style scoped>
.hero-section {
  position: relative;
  overflow: hidden;
  background: #ffffff;
  /* Cancel the ancestor PageContent v-container's fixed 16px padding (v-app-bar is
     position: fixed and out of flow, so this container's padding-top lands directly
     on the hero) so the hero background reaches the true top/left/right edges. */
  margin-top: -16px;
  margin-left: -16px;
  margin-right: -16px;
  width: calc(100% + 32px);
}

.hero-eyebrow {
  display: inline-block;
  font-family: 'Fraunces', 'Noto Sans TC', serif;
  font-weight: 600;
  font-size: 13px;
  letter-spacing: 0.04em;
  color: #e8804b;
  padding: 4px 12px;
  border: 1px solid #edd9c2;
  border-radius: 999px;
  background: #fff;
}

.hero-title {
  color: #1f2933;
}

.member-card {
  width: 280px;
  aspect-ratio: 1.586 / 1;
  border-radius: 16px;
  padding: 24px;
  background: linear-gradient(135deg, #33495d 0%, #1f2933 100%);
  box-shadow: 0 16px 28px -18px rgba(31, 41, 51, 0.35);
  transform: rotate(-4deg);
  transition: transform 0.35s ease;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.member-card:hover {
  transform: rotate(0deg);
}

.member-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.member-card-mark {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.member-card-tier {
  font-family: 'Fraunces', 'Noto Sans TC', serif;
  font-weight: 700;
  font-size: 14px;
  letter-spacing: 0.08em;
  color: #e8804b;
}

.member-card-lines {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.member-card-line {
  height: 8px;
  border-radius: 4px;
  background: rgba(253, 248, 240, 0.18);
}

.member-card-line-lg {
  width: 70%;
}

.member-card-line-sm {
  width: 40%;
}

.member-card-bottom {
  font-family: 'Fraunces', 'Noto Sans TC', serif;
  font-size: 15px;
  letter-spacing: 0.06em;
  color: rgba(253, 248, 240, 0.85);
}
</style>
