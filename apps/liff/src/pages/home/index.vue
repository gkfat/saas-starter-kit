<script setup lang="ts">
import { ref } from 'vue';
import CouponSummaryCard from '~/components/coupons/CouponSummaryCard.vue';
import EventBannerCarousel from '~/components/events/EventBannerCarousel.vue';
import HomeShortcuts from '~/components/home/HomeShortcuts.vue';
import MemberCard from '~/components/home/MemberCard.vue';
import PointsSummaryCard from '~/components/points/PointsSummaryCard.vue';

const showCoupon = ref(true);
</script>

<template>
  <v-row dense>
    <v-col cols="12">
      <EventBannerCarousel />
    </v-col>
    <v-col cols="12">
      <HomeShortcuts />
    </v-col>
    <v-col cols="12">
      <MemberCard />
    </v-col>
    <v-col v-if="showCoupon" cols="6">
      <CouponSummaryCard @visible="showCoupon = $event" />
    </v-col>
    <v-col cols="6">
      <PointsSummaryCard />
    </v-col>
  </v-row>
</template>
