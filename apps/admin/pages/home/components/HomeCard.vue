<template>
  <v-card variant="flat" :elevation="0" rounded="lg" class="home-card">
    <slot />
  </v-card>
</template>

<script setup lang="ts"></script>

<style scoped>
.home-card {
  border: 1px solid #edd9c2;
}
</style>
