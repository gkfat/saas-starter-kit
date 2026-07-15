<template>
  <LayoutNoPermissionNotice v-if="!hasAnyAccess" />
</template>

<script setup lang="ts">
import { IAM_GROUP_LABEL } from '~/config/app-routes';

const { hasAnyAccess } = await useGroupRedirect(IAM_GROUP_LABEL);
</script>
