<template>
  <v-dialog :model-value="modelValue" max-width="480" persistent @update:model-value="close">
    <CardsDialogCard>
      <v-card-title class="pa-4">{{
        template ? $t('coupons.edit') : $t('coupons.create')
      }}</v-card-title>
      <v-card-text>
        <v-row no-gutters class="ga-3 flex-column">
          <v-col>
            <v-text-field
              v-model="title"
              v-bind="titleAttrs"
              :label="$t('coupons.templateTitle')"
              :error-messages="formErrors.title"
              hide-details="auto"
            />
          </v-col>
          <v-col>
            <v-textarea
              v-model="description"
              v-bind="descriptionAttrs"
              :label="$t('coupons.description')"
              rows="2"
              :error-messages="formErrors.description"
              hide-details="auto"
            />
          </v-col>
          <v-col>
            <v-select
              v-model="discountType"
              v-bind="discountTypeAttrs"
              :items="discountTypeOptions"
              :label="$t('coupons.discountType')"
              :error-messages="formErrors.discountType"
              hide-details="auto"
            />
          </v-col>
          <v-col v-if="discountType !== 'item'">
            <v-text-field
              v-model.number="discountValue"
              v-bind="discountValueAttrs"
              type="number"
              :label="$t('coupons.discountValue')"
              :error-messages="formErrors.discountValue"
              hide-details="auto"
            />
          </v-col>
          <v-col>
            <v-text-field
              v-model.number="validDays"
              v-bind="validDaysAttrs"
              type="number"
              :label="$t('coupons.validDays')"
              :error-messages="formErrors.validDays"
              hide-details="auto"
            />
          </v-col>
          <v-col>
            <v-select
              v-model="status"
              v-bind="statusAttrs"
              :items="statusOptions"
              :label="$t('coupons.status')"
              :error-messages="formErrors.status"
              hide-details="auto"
            />
          </v-col>
        </v-row>
      </v-card-text>
      <v-card-actions class="pa-4">
        <v-spacer />
        <ButtonsAppButton kind="secondary" :disabled="saving" @click="close">
          {{ $t('common.cancel') }}
        </ButtonsAppButton>
        <ButtonsAppButton kind="primary" :loading="saving" @click="save">
          {{ $t('common.save') }}
        </ButtonsAppButton>
      </v-card-actions>
    </CardsDialogCard>
  </v-dialog>
</template>

<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod';
import { useForm } from 'vee-validate';
import { z } from 'zod';
import type { CouponTemplate, OkResponse } from '@saas-starter-kit/shared';

const props = defineProps<{
  modelValue: boolean;
  template: CouponTemplate | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  saved: [];
}>();

const { t } = useI18n();
const { showSuccess } = useToast();
const { apiFetch } = useApi();

const discountTypeOptions = computed(() => [
  { title: t('coupons.discountTypeOption.fixed'), value: 'fixed' },
  { title: t('coupons.discountTypeOption.percentage'), value: 'percentage' },
  { title: t('coupons.discountTypeOption.item'), value: 'item' },
]);

const statusOptions = computed(() => [
  { title: t('coupons.statusOption.draft'), value: 'draft' },
  { title: t('coupons.statusOption.published'), value: 'published' },
  { title: t('coupons.statusOption.disabled'), value: 'disabled' },
]);

const validationSchema = computed(() =>
  toTypedSchema(
    z
      .object({
        title: z.string().trim().min(1, t('coupons.titleRequired')),
        description: z.string().trim().min(1, t('coupons.descriptionRequired')),
        discountType: z.enum(['fixed', 'percentage', 'item']),
        discountValue: z.number().positive().optional(),
        validDays: z
          .number({ invalid_type_error: t('coupons.validDaysRequired') })
          .int()
          .positive(),
        status: z.enum(['draft', 'published', 'disabled']),
      })
      .superRefine((values, ctx) => {
        if (values.discountType !== 'item' && values.discountValue === undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['discountValue'],
            message: t('coupons.discountValueRequired'),
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
  initialValues: {
    title: '',
    description: '',
    discountType: 'fixed',
    discountValue: undefined,
    validDays: undefined,
    status: 'draft',
  },
});

const [title, titleAttrs] = defineField('title');
const [description, descriptionAttrs] = defineField('description');
const [discountType, discountTypeAttrs] = defineField('discountType');
const [discountValue, discountValueAttrs] = defineField('discountValue');
const [validDays, validDaysAttrs] = defineField('validDays');
const [status, statusAttrs] = defineField('status');

const saving = ref(false);

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return;
    if (props.template) {
      resetForm({
        values: {
          title: props.template.title,
          description: props.template.description,
          discountType: props.template.discountType,
          discountValue: props.template.discountValue,
          validDays: props.template.validDays,
          status: props.template.status,
        },
      });
    } else {
      resetForm({
        values: {
          title: '',
          description: '',
          discountType: 'fixed',
          discountValue: undefined,
          validDays: undefined,
          status: 'draft',
        },
      });
    }
  },
);

function close() {
  emit('update:modelValue', false);
}

const save = handleSubmit(async (values) => {
  saving.value = true;
  const result = props.template
    ? await apiFetch<OkResponse>(`/api/admin/coupons/${props.template.id}`, {
        method: 'PATCH',
        body: values,
      })
    : await apiFetch<OkResponse>('/api/admin/coupons', {
        method: 'POST',
        body: values,
      });
  if (result !== null) {
    close();
    emit('saved');
    showSuccess(props.template ? t('coupons.updateSuccess') : t('coupons.createSuccess'));
  }
  saving.value = false;
});
</script>
