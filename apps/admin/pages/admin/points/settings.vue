<template>
  <div>
    <LayoutPageHeader :title="$t('pointsSettings.title')" />

    <CardsAppCard class="pa-4">
      <v-row no-gutters class="ga-3 flex-column" style="max-width: 360px">
        <v-col>
          <v-text-field
            v-model.number="pointsPerUnit"
            v-bind="pointsPerUnitAttrs"
            :label="$t('pointsSettings.pointsPerUnit')"
            type="number"
            :disabled="!canWrite || pending"
            :error-messages="formErrors.pointsPerUnit"
            hide-details="auto"
          />
        </v-col>
        <v-col>
          <v-text-field
            v-model.number="currencyValue"
            v-bind="currencyValueAttrs"
            :label="$t('pointsSettings.currencyValue')"
            type="number"
            :disabled="!canWrite || pending"
            :error-messages="formErrors.currencyValue"
            hide-details="auto"
          />
        </v-col>
        <v-col class="text-caption text-medium-emphasis">
          {{
            $t('pointsSettings.ratioPreview', {
              points: pointsPerUnit || 0,
              amount: currencyValue || 0,
            })
          }}
        </v-col>
        <v-col v-if="canWrite">
          <ButtonsAppButton kind="primary" :loading="saving" @click="save">
            {{ $t('common.save') }}
          </ButtonsAppButton>
        </v-col>
      </v-row>
    </CardsAppCard>
  </div>
</template>

<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod';
import { useForm } from 'vee-validate';
import { z } from 'zod';
import { Permission } from '@saas-starter-kit/shared';
import type { OkResponse, PointsSettings } from '@saas-starter-kit/shared';

const { t } = useI18n();
const { showSuccess } = useToast();
const { apiFetch } = useApi();
const { hasPermission } = usePermission();

const canWrite = computed(() => hasPermission(Permission.Points.Adjust));

const {
  data: settings,
  pending,
  refresh,
} = useAuthFetch<PointsSettings | null>('/api/admin/points/settings', { default: () => null });

const validationSchema = computed(() =>
  toTypedSchema(
    z.object({
      pointsPerUnit: z
        .number({ invalid_type_error: t('pointsSettings.pointsPerUnitRequired') })
        .int()
        .positive(),
      currencyValue: z
        .number({ invalid_type_error: t('pointsSettings.currencyValueRequired') })
        .positive(),
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
    pointsPerUnit: settings.value?.pointsPerUnit,
    currencyValue: settings.value?.currencyValue,
  },
});

const [pointsPerUnit, pointsPerUnitAttrs] = defineField('pointsPerUnit');
const [currencyValue, currencyValueAttrs] = defineField('currencyValue');

watch(settings, (value) => {
  resetForm({
    values: { pointsPerUnit: value?.pointsPerUnit, currencyValue: value?.currencyValue },
  });
});

const saving = ref(false);

const save = handleSubmit(async (values) => {
  saving.value = true;
  const result = await apiFetch<OkResponse>('/api/admin/points/settings', {
    method: 'PUT',
    body: values,
  });
  if (result !== null) {
    await refresh();
    showSuccess(t('pointsSettings.updateSuccess'));
  }
  saving.value = false;
});
</script>
