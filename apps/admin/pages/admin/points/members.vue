<template>
  <div>
    <LayoutPageHeader :title="$t('pointsMembers.title')" />

    <FilterBar
      v-model="formData"
      :config="filterConfig"
      class="mb-4"
      @search="applySearch"
      @reset="resetSearch"
    />

    <CardsAppCard>
      <v-data-table
        :headers="headers"
        :items="members ?? []"
        :loading="pending"
        item-value="userId"
      >
        <template #no-data>
          <span class="text-medium-emphasis">{{ $t('pointsMembers.noData') }}</span>
        </template>
        <template #[`item.memberNo`]="{ item }">
          <span class="text-caption font-mono">{{ item.memberNo }}</span>
        </template>
        <template #[`item.email`]="{ item }">
          <span>{{ item.email ?? '-' }}</span>
        </template>
        <template #[`item.balance`]="{ item }">
          <span class="font-weight-bold">{{ item.balance }}</span>
        </template>
        <template #[`item.actions`]="{ item }">
          <ButtonsIconActionBtn icon="mdi-cash-edit" @click="openDetail(item)" />
        </template>
      </v-data-table>
    </CardsAppCard>

    <MemberPointsDialog
      v-model="detailDialog"
      :member="detailTarget"
      :can-adjust="canAdjust"
      @adjusted="refresh"
    />
  </div>
</template>

<script setup lang="ts">
import { Permission } from '@saas-starter-kit/shared';
import type { PointsMemberRow } from '@saas-starter-kit/shared';
import {
  createTextInputField,
  type FilterBarConfig,
  type FormData,
} from '~/components/filter-bar/types';
import MemberPointsDialog from '~/components/points/MemberPointsDialog.vue';

const { t } = useI18n();
const { hasPermission } = usePermission();

const canAdjust = computed(() => hasPermission(Permission.Points.Adjust));

const appliedSearch = ref('');
const queryParams = computed(() => (appliedSearch.value ? { q: appliedSearch.value } : {}));

const {
  data: members,
  pending,
  refresh,
} = await useAuthFetch<PointsMemberRow[]>('/api/admin/points/members', {
  query: queryParams,
  default: () => [],
});

const filterConfig = computed<FilterBarConfig>(() => ({
  fields: [
    createTextInputField({
      key: 'search',
      label: t('pointsMembers.searchPlaceholder'),
      icon: 'mdi-magnify',
    }),
  ],
}));
const formData = ref<FormData>({});

function applySearch(data: FormData) {
  appliedSearch.value = typeof data.search === 'string' ? data.search : '';
  refresh();
}

function resetSearch() {
  appliedSearch.value = '';
  refresh();
}

const headers = computed(() => [
  { title: t('users.memberNo'), key: 'memberNo' },
  { title: t('users.displayName'), key: 'displayName' },
  { title: t('users.email'), key: 'email' },
  { title: t('pointsMembers.balance'), key: 'balance' },
  { title: '', key: 'actions', sortable: false, align: 'end' as const },
]);

const detailDialog = ref(false);
const detailTarget = ref<PointsMemberRow | null>(null);

function openDetail(item: PointsMemberRow) {
  detailTarget.value = item;
  detailDialog.value = true;
}
</script>
