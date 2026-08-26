<template>
  <v-dialog :model-value="modelValue" max-width="480" persistent @update:model-value="close">
    <CardsDialogCard>
      <v-card-title class="pa-4">{{ $t('bookings.assignProviderTitle') }}</v-card-title>
      <v-card-text>
        <div class="text-caption text-medium-emphasis mb-1">
          {{ $t('bookings.currentProvider') }}
        </div>
        <div class="text-body-2 font-weight-medium mb-4">
          {{ booking?.providerName ?? $t('bookings.noProvider') }}
        </div>

        <div class="text-caption text-medium-emphasis mb-1">{{ $t('bookings.newProvider') }}</div>
        <v-select
          v-model="selectedProviderId"
          :items="providerOptions"
          item-title="label"
          item-value="value"
          :loading="loading"
          :no-data-text="$t('bookings.noAvailableProvider')"
          variant="outlined"
          density="comfortable"
          hide-details
        />

        <div class="text-caption text-medium-emphasis mb-1 mt-4">
          {{ $t('bookings.staffNote') }}
        </div>
        <v-textarea
          v-model="note"
          :placeholder="$t('bookings.staffNotePlaceholder')"
          variant="outlined"
          density="comfortable"
          rows="2"
          maxlength="200"
          hide-details
        />
      </v-card-text>
      <v-card-actions class="pa-4">
        <v-spacer />
        <ButtonsAppButton kind="secondary" :disabled="submitting" @click="close">
          {{ $t('common.cancel') }}
        </ButtonsAppButton>
        <ButtonsAppButton
          kind="primary"
          :disabled="!selectedProviderId"
          :loading="submitting"
          @click="submit"
        >
          {{ $t('common.confirm') }}
        </ButtonsAppButton>
      </v-card-actions>
    </CardsDialogCard>
  </v-dialog>
</template>

<script setup lang="ts">
import type { AdminBookingRow, BookingProvider } from '@saas-starter-kit/shared';

const props = defineProps<{
  modelValue: boolean;
  booking: AdminBookingRow | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  assigned: [];
}>();

const { t } = useI18n();
const { apiFetch } = useApi();
const { showSuccess } = useToast();

const loading = ref(false);
const submitting = ref(false);
const providers = ref<BookingProvider[]>([]);
const selectedProviderId = ref<string | null>(null);
const note = ref('');

const providerOptions = computed(() =>
  providers.value
    .filter((provider) => provider.enabled !== false)
    .map((provider) => ({ value: provider.id, label: provider.name })),
);

watch(
  () => props.modelValue,
  async (open) => {
    if (!open || !props.booking) return;
    selectedProviderId.value = props.booking.providerId ?? null;
    note.value = '';
    loading.value = true;
    const result = await apiFetch<BookingProvider[]>('/api/admin/booking/providers');
    providers.value = (result ?? []).filter((provider) =>
      provider.serviceIds?.includes(props.booking?.serviceId ?? ''),
    );
    loading.value = false;
  },
);

function close() {
  emit('update:modelValue', false);
}

async function submit() {
  if (!props.booking || !selectedProviderId.value) return;
  submitting.value = true;
  const trimmedNote = note.value.trim();
  const result = await apiFetch(`/api/admin/booking/bookings/${props.booking.id}/assign-provider`, {
    method: 'PATCH',
    body: { providerId: selectedProviderId.value, ...(trimmedNote ? { note: trimmedNote } : {}) },
  });
  submitting.value = false;
  if (result !== null) {
    showSuccess(t('bookings.assignProviderSuccess'));
    emit('assigned');
    close();
  }
}
</script>
