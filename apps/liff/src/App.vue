<template>
  <v-app>
    <router-view />
    <AppToast />
  </v-app>
</template>

<script setup lang="ts">
import AppToast from '~/components/common/AppToast.vue';
</script>

<style>
.v-application {
  color: #3f3b37;
}
</style>
