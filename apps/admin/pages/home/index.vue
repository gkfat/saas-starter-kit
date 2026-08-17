<template>
  <div>
    <HeroSection />
    <ProcessSection />
    <ArchitectureSection />
    <ExploreSection />
    <IndustriesSection />
    <PricingInfoSection />
    <QASection />
    <GetStartedSection />
    <FooterSection />
  </div>
</template>

<script lang="ts" setup>
import { ROUTES } from '~/config/app-routes';
import ArchitectureSection from './views/ArchitectureSection.vue';
import ExploreSection from './views/ExploreSection.vue';
import FooterSection from './views/FooterSection.vue';
import GetStartedSection from './views/GetStartedSection.vue';
import HeroSection from './views/HeroSection.vue';
import IndustriesSection from './views/IndustriesSection.vue';
import PricingInfoSection from './views/PricingInfoSection.vue';
import ProcessSection from './views/ProcessSection.vue';
import QASection from './views/QASection.vue';

definePageMeta({ path: ROUTES.home });
</script>
