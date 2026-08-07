<template>
  <v-dialog :model-value="modelValue" max-width="720" persistent @update:model-value="close">
    <CardsDialogCard>
      <v-card-title class="pa-4">{{ $t('coupons.instancesTitle') }}</v-card-title>
      <v-card-text>
        <v-data-table
          :headers="headers"
          :items="instances ?? []"
          :loading="pending"
          item-value="id"
        >
          <template #no-data>
            <span class="text-medium-emphasis">{{ $t('coupons.instancesNoData') }}</span>
          </template>
          <template #[`item.member`]="{ item }">
            {{ memberLabel(item.memberId) }}
          </template>
          <template #[`item.issuedAt`]="{ item }">
            {{ formatDateTime(item.issuedAt) }}
          </template>
          <template #[`item.state`]="{ item }">
            <v-chip :color="stateColor(item.state)" size="small" variant="flat">
              {{ $t(`coupons.stateLabel.${item.state}`) }}
            </v-chip>
          </template>
        </v-data-table>
      </v-card-text>
      <v-card-actions class="pa-4">
        <v-spacer />
        <ButtonsAppButton kind="secondary" @click="close">{{
          $t('common.cancel')
        }}</ButtonsAppButton>
      </v-card-actions>
    </CardsDialogCard>
  </v-dialog>
</template>

<script setup lang="ts">
import type { CouponInstanceWithState, CouponTemplate, UserRow } from '@saas-starter-kit/shared';

const props = defineProps<{
  modelValue: boolean;
  template: CouponTemplate | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const { t } = useI18n();

const headers = computed(() => [
  { title: t('coupons.member'), key: 'member' },
  { title: t('coupons.issuedAt'), key: 'issuedAt' },
  { title: t('coupons.state'), key: 'state' },
]);

const templateId = computed(() => props.template?.id ?? '');

const {
  data: instances,
  pending,
  refresh,
} = useAuthFetch<CouponInstanceWithState[]>(
  computed(() => `/api/admin/coupons/${templateId.value}/instances`),
  { default: () => [], immediate: false },
);

const { data: members, refresh: refreshMembers } = useAuthFetch<UserRow[]>('/api/admin/users', {
  query: { role: 'member' },
  default: () => [],
  immediate: false,
});

const membersById = computed(() => new Map((members.value ?? []).map((m) => [m.userId, m])));

function memberLabel(memberId: string): string {
  const member = membersById.value.get(memberId);
  return member ? `${member.displayName} (${member.memberNo})` : memberId;
}

function stateColor(state: CouponInstanceWithState['state']): string {
  if (state === 'usable') return 'success';
  if (state === 'redeemed') return 'info';
  return 'error';
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open || !templateId.value) return;
    refresh();
    refreshMembers();
  },
);

function close() {
  emit('update:modelValue', false);
}
</script>
