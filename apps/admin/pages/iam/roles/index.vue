<template>
  <div>
    <LayoutPageHeader :title="$t('roles.title')" />
    <CardsAppCard>
      <v-data-table
        :headers="headers"
        :items="rolesWithPermissions"
        :loading="pending"
        item-value="name"
        class="table-header-nowrap"
      >
        <template #no-data>
          <span class="text-medium-emphasis">{{ $t('roles.noData') }}</span>
        </template>

        <template #[`item.name`]="{ item }">
          {{ $t(`role.${item.name}`) }}
        </template>

        <template #[`item.permissions`]="{ item }">
          <v-row no-gutters class="py-1 ga-1">
            <v-chip v-for="perm in item.permissions" :key="perm" size="small" label>
              {{ $t(`permission.${perm}`) }}
            </v-chip>
          </v-row>
          <span v-if="item.permissions.length === 0" class="text-medium-emphasis">—</span>
        </template>

        <template v-if="isSuperadmin" #[`item.actions`]="{ item }">
          <ButtonsIconActionBtn icon="mdi-pencil" @click="openEdit(item)" />
        </template>
      </v-data-table>
    </CardsAppCard>

    <v-dialog v-model="dialog" max-width="480" persistent>
      <CardsDialogCard>
        <v-card-title class="pa-4"
          >{{ $t('roles.editPermissions') }} —
          {{ editing ? $t(`role.${editing.name}`) : '' }}</v-card-title
        >
        <v-card-text>
          <v-checkbox
            v-for="perm in allPermissions"
            :key="perm.name"
            v-model="selectedPermissions"
            :label="$t(`permission.${perm.name}`)"
            :value="perm.name"
            density="compact"
            hide-details
          />
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <ButtonsAppButton kind="secondary" @click="dialog = false">{{
            $t('common.cancel')
          }}</ButtonsAppButton>
          <ButtonsAppButton kind="primary" :loading="saving" @click="save">{{
            $t('common.save')
          }}</ButtonsAppButton>
        </v-card-actions>
      </CardsDialogCard>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useAuthStore } from '~/stores/auth';
import type { OkResponse } from '@saas-starter-kit/shared';

const auth = useAuthStore();
const { isSuperadmin } = storeToRefs(auth);
const { t } = useI18n();

const { showSuccess } = useToast();
const { apiFetch } = useApi();

const headers = computed(() => [
  { title: t('roles.name'), key: 'name' },
  { title: t('roles.permissions'), key: 'permissions', sortable: false },
  ...(isSuperadmin.value
    ? [{ title: '', key: 'actions', sortable: false, align: 'end' as const }]
    : []),
]);

const [
  { data: roles, pending, refresh: refreshRoles },
  { data: rolePermissions, refresh: refreshRolePermissions },
  { data: allPermissions },
] = await Promise.all([
  useAuthFetch<Array<{ name: string }>>('/api/admin/roles', { default: () => [] }),
  useAuthFetch<Record<string, string[]>>('/api/admin/role-permissions', { default: () => ({}) }),
  useAuthFetch<Array<{ name: string }>>('/api/admin/permissions', { default: () => [] }),
]);

const rolesWithPermissions = computed(() =>
  (roles.value ?? []).map((role) => ({
    ...role,
    permissions: rolePermissions.value?.[role.name] ?? [],
  })),
);

type RoleRow = (typeof rolesWithPermissions.value)[number];

const dialog = ref(false);
const saving = ref(false);
const editing = ref<RoleRow | null>(null);
const selectedPermissions = ref<string[]>([]);

function openEdit(item: RoleRow) {
  editing.value = item;
  selectedPermissions.value = rolePermissions.value?.[item.name] ?? [];
  dialog.value = true;
}

async function save() {
  if (!editing.value) return;
  saving.value = true;
  const result = await apiFetch<OkResponse>('/api/admin/role-permissions', {
    method: 'PATCH',
    body: { roleName: editing.value.name, permissions: selectedPermissions.value },
  });
  if (result !== null) {
    dialog.value = false;
    await Promise.all([refreshRoles(), refreshRolePermissions()]);
    showSuccess(t('roles.updateSuccess'));
  }
  saving.value = false;
}
</script>
