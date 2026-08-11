<script setup lang="ts">
import CouponSummaryCard from '~/components/coupons/CouponSummaryCard.vue';
import EventBannerCarousel from '~/components/events/EventBannerCarousel.vue';
import MemberCard from '~/components/member/MemberCard.vue';
</script>

<template>
  <v-row dense>
    <v-col cols="12">
      <EventBannerCarousel />
    </v-col>
    <v-col cols="12">
      <MemberCard />
    </v-col>
    <v-col cols="6">
      <CouponSummaryCard />
    </v-col>
  </v-row>
</template>
