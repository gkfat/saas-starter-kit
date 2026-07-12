<template>
  <div>
    <div class="text-h5 mb-6">Admin Dashboard</div>
    <v-row>
      <v-col cols="12" sm="6" md="3">
        <v-card :to="'/admin/users'" elevation="2" hover>
          <v-card-text class="d-flex align-center ga-4">
            <v-icon icon="mdi-account-group" size="36" color="primary" />
            <div>
              <div class="text-overline text-medium-emphasis">Management</div>
              <div class="text-h6">Users</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card :to="'/admin/roles'" elevation="2" hover>
          <v-card-text class="d-flex align-center ga-4">
            <v-icon icon="mdi-shield-account" size="36" color="secondary" />
            <div>
              <div class="text-overline text-medium-emphasis">Management</div>
              <div class="text-h6">Roles</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card :to="'/admin/logs/login'" elevation="2" hover>
          <v-card-text class="d-flex align-center ga-4">
            <v-icon icon="mdi-login" size="36" color="success" />
            <div>
              <div class="text-overline text-medium-emphasis">Logs</div>
              <div class="text-h6">Login Logs</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card :to="'/admin/logs/audit'" elevation="2" hover>
          <v-card-text class="d-flex align-center ga-4">
            <v-icon icon="mdi-history" size="36" color="warning" />
            <div>
              <div class="text-overline text-medium-emphasis">Logs</div>
              <div class="text-h6">Audit Logs</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>
