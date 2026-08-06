<template>
  <v-navigation-drawer v-model="open" temporary :style="{ width: open ? '100vw' : undefined }">
    <template #prepend>
      <div class="d-flex align-center justify-end pa-2">
        <v-btn icon variant="text" @click="open = false">
          <v-icon size="28">mdi-close</v-icon>
        </v-btn>
      </div>
    </template>
    <v-list nav density="compact">
      <v-list-item
        :to="{ name: 'home' }"
        prepend-icon="mdi-home-outline"
        title="首頁"
        @click="open = false"
      />
      <v-list-item
        :to="{ name: 'memberCenter' }"
        prepend-icon="mdi-account-circle-outline"
        title="會員中心"
        @click="open = false"
      />
    </v-list>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
const open = defineModel<boolean>({ default: false });
</script>
