<template>
  <div>
    <LayoutPageHeader :title="$t('profile.title')" />
    <v-row align="stretch">
      <v-col cols="12" md="6" lg="auto">
        <ProfileInfoCard />
      </v-col>

      <v-col cols="12" md="6" lg="auto">
        <LoginMethodsCard />
      </v-col>

      <v-col cols="12" md="6" lg="auto">
        <ChangePasswordCard />
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import ProfileInfoCard from './components/ProfileInfoCard.vue';
import LoginMethodsCard from './components/LoginMethodsCard.vue';
import ChangePasswordCard from './components/ChangePasswordCard.vue';
</script>
