<template>
  <LayoutNoPermissionNotice v-if="!hasAnyAccess" />
</template>

<script setup lang="ts">
import { ADMIN_GROUP_LABEL } from '~/config/app-routes';

const { hasAnyAccess } = await useGroupRedirect(ADMIN_GROUP_LABEL);
</script>
