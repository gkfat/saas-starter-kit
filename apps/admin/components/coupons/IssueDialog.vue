<template>
  <v-dialog :model-value="modelValue" max-width="720" persistent @update:model-value="close">
    <CardsDialogCard>
      <v-card-title class="pa-4">{{ $t('coupons.issueTitle') }}</v-card-title>
      <v-card-text>
        <v-text-field
          v-model="search"
          :label="$t('coupons.searchMember')"
          prepend-inner-icon="mdi-magnify"
          clearable
          hide-details="auto"
          class="mb-3"
          @update:model-value="applySearch"
        />

        <div class="text-caption text-medium-emphasis mb-2">
          {{ $t('coupons.issueSelected', { count: selected.length }) }}
        </div>

        <v-data-table
          v-model="selected"
          :headers="headers"
          :items="members ?? []"
          :loading="pending"
          item-value="userId"
          show-select
          height="360"
          fixed-header
        >
          <template #no-data>
            <span class="text-medium-emphasis">{{ $t('users.noData') }}</span>
          </template>
        </v-data-table>
      </v-card-text>
      <v-card-actions class="pa-4">
        <v-spacer />
        <ButtonsAppButton kind="secondary" :disabled="issuing" @click="close">
          {{ $t('common.cancel') }}
        </ButtonsAppButton>
        <ButtonsAppButton
          kind="primary"
          :loading="issuing"
          :disabled="selected.length === 0"
          @click="submit"
        >
          {{ $t('coupons.issueSubmit') }}
        </ButtonsAppButton>
      </v-card-actions>
    </CardsDialogCard>
  </v-dialog>
</template>

<script setup lang="ts">
import type { CouponInstance, CouponTemplate, UserRow } from '@saas-starter-kit/shared';

const props = defineProps<{
  modelValue: boolean;
  template: CouponTemplate | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  issued: [];
}>();

const { t } = useI18n();
const { showSuccess } = useToast();
const { apiFetch } = useApi();

const headers = computed(() => [
  { title: t('users.memberNo'), key: 'memberNo' },
  { title: t('auth.username'), key: 'username' },
  { title: t('users.displayName'), key: 'displayName' },
  { title: t('users.email'), key: 'email' },
]);

const appliedSearch = ref('');
const search = ref('');
const selected = ref<string[]>([]);
const issuing = ref(false);

const queryParams = computed(() => ({
  role: 'member',
  ...(appliedSearch.value ? { q: appliedSearch.value } : {}),
}));

const {
  data: members,
  pending,
  refresh,
} = useAuthFetch<UserRow[]>('/api/admin/users', {
  query: queryParams,
  default: () => [],
  immediate: false,
});

function applySearch(value: string | null) {
  appliedSearch.value = value ?? '';
  refresh();
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return;
    search.value = '';
    appliedSearch.value = '';
    selected.value = [];
    refresh();
  },
);

function close() {
  emit('update:modelValue', false);
}

async function submit() {
  if (!props.template || selected.value.length === 0) return;
  issuing.value = true;
  const result = await apiFetch<CouponInstance[]>(`/api/admin/coupons/${props.template.id}/issue`, {
    method: 'POST',
    body: { memberIds: selected.value },
  });
  if (result !== null) {
    close();
    emit('issued');
    showSuccess(t('coupons.issueSuccess', { count: result.length }));
  }
  issuing.value = false;
}
</script>
