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

      <template v-if="hasPermission('admin:access')">
        <v-divider class="my-2" />
        <v-list-subheader>Management</v-list-subheader>

        <v-list-item
          prepend-icon="mdi-account-group"
          title="Users"
          value="admin-users"
          :to="'/admin/users'"
        />
        <v-list-item
          prepend-icon="mdi-shield-account"
          title="Roles"
          value="admin-roles"
          :to="'/admin/roles'"
        />

        <v-divider class="my-2" />
        <v-list-subheader>Logs</v-list-subheader>

        <v-list-item
          prepend-icon="mdi-login"
          title="Login Logs"
          value="admin-logs-login"
          :to="'/admin/logs/login'"
        />
        <v-list-item
          prepend-icon="mdi-history"
          title="Audit Logs"
          value="admin-logs-audit"
          :to="'/admin/logs/audit'"
        />
      </template>
    </v-list>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
const open = defineModel<boolean>({ required: true });
const { hasPermission } = usePermission();
</script>
