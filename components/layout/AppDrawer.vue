<template>
  <v-navigation-drawer v-model="open">
    <v-list nav>
      <v-list-item
        prepend-icon="mdi-view-dashboard"
        title="Dashboard"
        value="dashboard"
        :to="'/dashboard'"
      />
    </v-list>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
const open = defineModel<boolean>({ required: true });
</script>
