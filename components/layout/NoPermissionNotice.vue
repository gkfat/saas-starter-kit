<template>
  <div class="d-flex flex-column align-center justify-center text-center py-16">
    <v-icon icon="mdi-lock-alert-outline" size="64" color="warning" class="mb-4" />
    <div class="text-h6 mb-2">{{ $t('admin.noPermission') }}</div>
    <div class="text-body-2 text-medium-emphasis">{{ $t('admin.noPermissionHint') }}</div>
  </div>
</template>
