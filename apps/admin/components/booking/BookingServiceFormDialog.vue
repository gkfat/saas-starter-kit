<template>
  <v-dialog :model-value="modelValue" max-width="480" persistent @update:model-value="close">
    <CardsDialogCard>
      <v-card-title class="pa-4">{{
        service ? $t('bookingServices.edit') : $t('bookingServices.create')
      }}</v-card-title>
      <v-card-text>
        <v-row no-gutters class="ga-3 flex-column">
          <v-col>
            <v-text-field
              v-model="name"
              v-bind="nameAttrs"
              :label="$t('bookingServices.name')"
              :error-messages="formErrors.name"
              hide-details="auto"
            />
          </v-col>
          <v-col>
            <v-textarea
              v-model="description"
              v-bind="descriptionAttrs"
              :label="$t('bookingServices.description')"
              rows="3"
              :error-messages="formErrors.description"
              hide-details="auto"
            />
          </v-col>
          <v-col>
            <v-select
              v-model="approvalMode"
              v-bind="approvalModeAttrs"
              :label="$t('bookingServices.approvalMode')"
              :items="approvalModeOptions"
              item-title="text"
              item-value="value"
              :error-messages="formErrors.approvalMode"
              hide-details="auto"
            />
          </v-col>
          <v-col>
            <v-switch
              v-model="enabled"
              v-bind="enabledAttrs"
              :label="$t('bookingServices.enabled')"
              color="primary"
              hide-details
            />
          </v-col>

          <template v-if="!service">
            <v-col>
              <div class="text-caption text-medium-emphasis mb-1">
                {{ $t('bookingServices.slotSetupLabel') }}
              </div>
              <v-radio-group v-model="slotSetup" hide-details>
                <v-radio
                  :label="$t('bookingServices.slotSetupApplyTemplate')"
                  value="applyTemplate"
                />
                <v-radio :label="$t('bookingServices.slotSetupLater')" value="later" />
              </v-radio-group>
            </v-col>
            <v-col v-if="slotSetup === 'applyTemplate'">
              <v-select
                v-model="applyTemplateId"
                :label="$t('bookingServices.slotSetupSelectTemplate')"
                :items="templateOptions"
                item-title="text"
                item-value="value"
                :error-messages="slotSetupError"
                hide-details="auto"
              />
            </v-col>
          </template>
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
import type { BookingService, BookingSlotTemplate } from '@saas-starter-kit/shared';

const props = defineProps<{
  modelValue: boolean;
  service: BookingService | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  /** `applyTemplateId` is only set when creating a service and choosing to apply a template. */
  saved: [payload: { service: BookingService; applyTemplateId?: string }];
}>();

const { t } = useI18n();
const { showSuccess } = useToast();
const { apiFetch } = useApi();

const { data: templates } = useAuthFetch<BookingSlotTemplate[]>(
  '/api/admin/booking/slot-templates',
  { default: () => [] },
);
const templateOptions = computed(() =>
  (templates.value ?? []).map((template) => ({ text: template.name, value: template.id })),
);

const slotSetup = ref<'applyTemplate' | 'later'>('later');
const applyTemplateId = ref<string | null>(null);
const slotSetupError = ref('');

const approvalModeOptions = computed(() => [
  { text: t('bookingServices.approvalModeOption.auto'), value: 'auto' },
  { text: t('bookingServices.approvalModeOption.manual'), value: 'manual' },
]);

const validationSchema = computed(() =>
  toTypedSchema(
    z.object({
      name: z.string().trim().min(1, t('bookingServices.nameRequired')),
      description: z.string().trim().optional(),
      approvalMode: z.enum(['auto', 'manual'], {
        errorMap: () => ({ message: t('bookingServices.approvalModeRequired') }),
      }),
      enabled: z.boolean(),
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
  initialValues: { name: '', description: '', approvalMode: undefined, enabled: true },
});

const [name, nameAttrs] = defineField('name');
const [description, descriptionAttrs] = defineField('description');
const [approvalMode, approvalModeAttrs] = defineField('approvalMode');
const [enabled, enabledAttrs] = defineField('enabled');

const saving = ref(false);

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return;
    slotSetup.value = 'later';
    applyTemplateId.value = null;
    slotSetupError.value = '';
    if (props.service) {
      resetForm({
        values: {
          name: props.service.name,
          description: props.service.description ?? '',
          approvalMode: props.service.approvalMode,
          enabled: props.service.enabled,
        },
      });
    } else {
      resetForm({ values: { name: '', description: '', approvalMode: undefined, enabled: true } });
    }
  },
);

function close() {
  emit('update:modelValue', false);
}

const save = handleSubmit(async (values) => {
  if (!props.service && slotSetup.value === 'applyTemplate' && !applyTemplateId.value) {
    slotSetupError.value = t('bookingServices.slotSetupTemplateRequired');
    return;
  }
  slotSetupError.value = '';

  saving.value = true;
  const body = {
    name: values.name,
    description: values.description || undefined,
    approvalMode: values.approvalMode,
    enabled: values.enabled,
  };

  const result = props.service
    ? await apiFetch<BookingService>(`/api/admin/booking/services/${props.service.id}`, {
        method: 'PATCH',
        body,
      })
    : await apiFetch<BookingService>('/api/admin/booking/services', { method: 'POST', body });

  if (result !== null) {
    close();
    emit('saved', {
      service: result,
      ...(!props.service && slotSetup.value === 'applyTemplate' && applyTemplateId.value
        ? { applyTemplateId: applyTemplateId.value }
        : {}),
    });
    showSuccess(
      props.service ? t('bookingServices.updateSuccess') : t('bookingServices.createSuccess'),
    );
  }
  saving.value = false;
});
</script>
