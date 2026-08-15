<template>
  <div>
    <div class="d-flex flex-wrap ga-3 align-center justify-space-between">
      <LayoutPageHeader :title="$t('coupons.title')" />
      <CouponsToolbar :can-write="canWrite" @create="openCreate" />
    </div>

    <CardsAppCard>
      <v-data-table :headers="headers" :items="templates ?? []" :loading="pending" item-value="id">
        <template #no-data>
          <span class="text-medium-emphasis">{{ $t('coupons.noData') }}</span>
        </template>

        <template #[`item.id`]="{ item }">
          <span class="text-caption font-mono text-no-wrap text-medium-emphasis">{{
            item.id
          }}</span>
        </template>

        <template #[`item.discountType`]="{ item }">
          {{ $t(`coupons.discountTypeOption.${item.discountType}`) }}
        </template>

        <template #[`item.status`]="{ item }">
          <v-chip :color="statusColor(item.status)" size="small" variant="flat">
            {{ $t(`coupons.statusOption.${item.status}`) }}
          </v-chip>
        </template>

        <template #[`item.actions`]="{ item }">
          <v-row no-gutters class="ga-1 flex-nowrap">
            <ButtonsIconActionBtn
              v-if="canRead"
              icon="mdi-format-list-bulleted"
              @click="openInstances(item)"
            />
            <ButtonsIconActionBtn
              v-if="canIssue"
              icon="mdi-send"
              :disabled="item.status !== 'published'"
              @click="openIssue(item)"
            />
            <ButtonsIconActionBtn v-if="canWrite" icon="mdi-pencil" @click="openEdit(item)" />
          </v-row>
        </template>
      </v-data-table>
    </CardsAppCard>

    <TemplateFormDialog v-model="formDialog" :template="editing" @saved="refresh" />
    <IssueDialog v-model="issueDialog" :template="issueTarget" @issued="refresh" />
    <InstancesDialog v-model="instancesDialog" :template="instancesTarget" />
  </div>
</template>

<script setup lang="ts">
import { Permission } from '@saas-starter-kit/shared';
import type { CouponTemplate } from '@saas-starter-kit/shared';
import IssueDialog from '~/components/coupons/IssueDialog.vue';
import InstancesDialog from '~/components/coupons/InstancesDialog.vue';
import TemplateFormDialog from '~/components/coupons/TemplateFormDialog.vue';

const { t } = useI18n();
const { hasPermission } = usePermission();

const canRead = computed(() => hasPermission(Permission.Coupons.Read));
const canWrite = computed(() => hasPermission(Permission.Coupons.Write));
const canIssue = computed(() => hasPermission(Permission.Coupons.Issue));

const {
  data: templates,
  pending,
  refresh,
} = useAuthFetch<CouponTemplate[]>('/api/admin/coupons', { default: () => [] });

const headers = computed(() => [
  { title: t('users.uid'), key: 'id' },
  { title: t('coupons.templateTitle'), key: 'title' },
  { title: t('coupons.discountType'), key: 'discountType' },
  { title: t('coupons.validDays'), key: 'validDays' },
  { title: t('coupons.status'), key: 'status' },
  { title: '', key: 'actions', sortable: false, align: 'end' as const },
]);

function statusColor(status: CouponTemplate['status']): string {
  if (status === 'published') return 'success';
  if (status === 'disabled') return 'error';
  return 'warning';
}

const formDialog = ref(false);
const editing = ref<CouponTemplate | null>(null);

function openCreate() {
  editing.value = null;
  formDialog.value = true;
}

function openEdit(item: CouponTemplate) {
  editing.value = item;
  formDialog.value = true;
}

const issueDialog = ref(false);
const issueTarget = ref<CouponTemplate | null>(null);

function openIssue(item: CouponTemplate) {
  issueTarget.value = item;
  issueDialog.value = true;
}

const instancesDialog = ref(false);
const instancesTarget = ref<CouponTemplate | null>(null);

function openInstances(item: CouponTemplate) {
  instancesTarget.value = item;
  instancesDialog.value = true;
}
</script>
