<template>
  <v-navigation-drawer v-model="open">
    <v-list nav>
      <v-list-item
        prepend-icon="mdi-view-dashboard"
        title="Dashboard"
        value="dashboard"
        :to="'/dashboard'"
      />

      <v-list-item
        prepend-icon="mdi-account-circle"
        title="Profile"
        value="profile"
        :to="'/profile'"
      />

      <v-list-subheader>Admin</v-list-subheader>

      <v-list-item prepend-icon="mdi-account-group" title="Users" value="users" :to="'/users'" />

      <v-list-group value="iam">
        <template #activator="{ props }">
          <v-list-item v-bind="props" prepend-icon="mdi-shield-account" title="IAM" />
        </template>

        <v-list-item
          prepend-icon="mdi-badge-account"
          title="Roles"
          value="iam-roles"
          :to="'/iam/roles'"
        />
        <v-list-item
          prepend-icon="mdi-key"
          title="Permissions"
          value="iam-permissions"
          :to="'/iam/permissions'"
        />
      </v-list-group>
    </v-list>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
const open = defineModel<boolean>({ required: true });
</script>
