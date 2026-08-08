<template>
  <v-dialog :model-value="modelValue" max-width="640" persistent @update:model-value="close">
    <CardsDialogCard>
      <v-card-title class="pa-4">{{ $t('pointsMembers.detailTitle') }}</v-card-title>
      <v-card-text>
        <div v-if="detail">
          <div class="d-flex justify-space-between align-center mb-4">
            <div class="text-caption text-medium-emphasis">
              {{ $t('pointsMembers.currentBalance') }}
            </div>
            <div class="text-h6 font-weight-bold">{{ detail.balance }}</div>
          </div>

          <template v-if="canAdjust">
            <div class="text-subtitle-2 font-weight-bold mb-2">
              {{ $t('pointsMembers.adjustTitle') }}
            </div>
            <v-row no-gutters class="ga-3 flex-column">
              <v-col>
                <v-text-field
                  v-model.number="amount"
                  v-bind="amountAttrs"
                  :label="$t('pointsMembers.amount')"
                  type="number"
                  :error-messages="formErrors.amount"
                  hide-details="auto"
                />
              </v-col>
              <v-col>
                <v-select
                  v-model="reason"
                  v-bind="reasonAttrs"
                  :label="$t('pointsMembers.reason')"
                  :items="reasonOptions"
                  :error-messages="formErrors.reason"
                  hide-details="auto"
                />
              </v-col>
              <v-col v-if="reason === PointsAdjustReason.Other">
                <v-text-field
                  v-model="reasonNote"
                  v-bind="reasonNoteAttrs"
                  :label="$t('pointsMembers.reasonNote')"
                  :error-messages="formErrors.reasonNote"
                  hide-details="auto"
                />
              </v-col>
              <v-col
                v-if="typeof amount === 'number' && !Number.isNaN(amount)"
                class="text-caption text-medium-emphasis"
              >
                {{ $t('pointsMembers.balanceAfterPreview', { balance: detail.balance + amount }) }}
              </v-col>
              <v-col>
                <ButtonsAppButton kind="primary" :loading="saving" @click="submit">
                  {{ $t('common.save') }}
                </ButtonsAppButton>
              </v-col>
            </v-row>
          </template>

          <v-divider class="my-4" />

          <div class="text-subtitle-2 font-weight-bold mb-2">
            {{ $t('pointsMembers.ledgerTitle') }}
          </div>
          <v-data-table
            :headers="ledgerHeaders"
            :items="detail.ledger"
            item-value="id"
            density="compact"
          >
            <template #no-data>
              <span class="text-medium-emphasis">{{ $t('pointsMembers.ledgerNoData') }}</span>
            </template>
            <template #[`item.amount`]="{ item }">
              <span :class="item.amount >= 0 ? 'text-success' : 'text-error'">{{
                item.amount
              }}</span>
            </template>
            <template #[`item.reason`]="{ item }">
              {{ reasonLabel(item.reason)
              }}<template v-if="item.reasonNote"> ({{ item.reasonNote }})</template>
            </template>
            <template #[`item.createdAt`]="{ item }">
              {{ formatDateTime(item.createdAt) }}
            </template>
          </v-data-table>
        </div>
        <div v-else class="d-flex justify-center py-6">
          <v-progress-circular indeterminate color="primary" />
        </div>
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
import { toTypedSchema } from '@vee-validate/zod';
import { useForm } from 'vee-validate';
import { z } from 'zod';
import { PointsAdjustReason, PointsAdjustReasonMeta } from '@saas-starter-kit/shared';
import type { PointsMemberDetail, PointsMemberRow } from '@saas-starter-kit/shared';

const props = defineProps<{
  modelValue: boolean;
  member: PointsMemberRow | null;
  canAdjust: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  adjusted: [];
}>();

const { t } = useI18n();
const { showSuccess } = useToast();
const { apiFetch } = useApi();

const detail = ref<PointsMemberDetail | null>(null);

const reasonOptions = Object.values(PointsAdjustReason).map((value) => ({
  title: PointsAdjustReasonMeta[value],
  value,
}));

function reasonLabel(reason: PointsAdjustReason): string {
  return PointsAdjustReasonMeta[reason] ?? reason;
}

const validationSchema = computed(() =>
  toTypedSchema(
    z
      .object({
        amount: z
          .number({ invalid_type_error: t('pointsMembers.amountRequired') })
          .int()
          .refine((v) => v !== 0, t('pointsMembers.amountNotZero')),
        reason: z.enum(
          [
            PointsAdjustReason.ConsumptionReward,
            PointsAdjustReason.ComplaintCompensation,
            PointsAdjustReason.CampaignGift,
            PointsAdjustReason.BirthdayGift,
            PointsAdjustReason.Other,
          ],
          { errorMap: () => ({ message: t('pointsMembers.reasonRequired') }) },
        ),
        reasonNote: z.string().trim().optional(),
      })
      .superRefine((values, ctx) => {
        if (values.reason === PointsAdjustReason.Other && !values.reasonNote) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['reasonNote'],
            message: t('pointsMembers.reasonNoteRequired'),
          });
        }
      }),
  ),
);

const {
  defineField,
  errors: formErrors,
  handleSubmit,
  resetForm,
} = useForm({
  validationSchema,
  initialValues: { amount: undefined, reason: undefined, reasonNote: '' },
});

const [amount, amountAttrs] = defineField('amount');
const [reason, reasonAttrs] = defineField('reason');
const [reasonNote, reasonNoteAttrs] = defineField('reasonNote');

const ledgerHeaders = computed(() => [
  { title: t('pointsMembers.ledgerAmount'), key: 'amount' },
  { title: t('pointsMembers.ledgerBalanceAfter'), key: 'balanceAfter' },
  { title: t('pointsMembers.ledgerReason'), key: 'reason' },
  { title: t('pointsMembers.ledgerCreatedAt'), key: 'createdAt' },
]);

const saving = ref(false);

async function loadDetail() {
  if (!props.member) return;
  detail.value = null;
  detail.value = await apiFetch<PointsMemberDetail>(
    `/api/admin/points/members/${props.member.userId}`,
    { silent: true },
  );
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open) {
      detail.value = null;
      return;
    }
    resetForm({ values: { amount: undefined, reason: undefined, reasonNote: '' } });
    loadDetail();
  },
);

const submit = handleSubmit(async (values) => {
  if (!props.member) return;
  saving.value = true;
  const result = await apiFetch(`/api/admin/points/members/${props.member.userId}/adjust`, {
    method: 'POST',
    body: values,
  });
  if (result !== null) {
    showSuccess(t('pointsMembers.adjustSuccess'));
    resetForm({ values: { amount: undefined, reason: undefined, reasonNote: '' } });
    await loadDetail();
    emit('adjusted');
  }
  saving.value = false;
});

function close() {
  emit('update:modelValue', false);
}
</script>
