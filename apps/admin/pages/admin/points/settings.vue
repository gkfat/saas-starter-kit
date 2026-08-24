<template>
  <div>
    <LayoutPageHeader :title="$t('pointsSettings.title')" />

    <CardsAppCard class="pa-6 pa-md-8">
      <v-row no-gutters class="ga-6 ga-md-10 flex-column flex-md-row">
        <v-col cols="12" md="5">
          <div class="text-overline text-medium-emphasis mb-2">
            {{ $t('pointsSettings.explainEyebrow') }}
          </div>
          <p class="text-body-2 text-medium-emphasis mb-6" style="max-width: 320px">
            {{ $t('pointsSettings.explainBody') }}
          </p>

          <div class="ratio-preview">
            <div class="ratio-preview__eq">
              <span class="ratio-preview__value">{{ pointsPerUnit || 0 }}</span>
              <span class="ratio-preview__unit">{{ $t('pointsSettings.unitPoints') }}</span>
              <span class="ratio-preview__op">=</span>
              <span class="ratio-preview__value">{{ currencyValue || 0 }}</span>
              <span class="ratio-preview__unit">{{ $t('pointsSettings.unitCurrency') }}</span>
            </div>
            <div class="text-caption text-medium-emphasis mt-3">
              {{
                $t('pointsSettings.exampleHint', {
                  points: exampleBasePoints,
                  amount: exampleAmount,
                })
              }}
            </div>
          </div>
        </v-col>

        <v-divider vertical class="d-none d-md-block" />
        <v-divider class="d-md-none" />

        <v-col cols="12" md="6">
          <v-row no-gutters class="ga-4 flex-column" style="max-width: 360px">
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
            <v-col v-if="canWrite">
              <ButtonsAppButton kind="primary" :loading="saving" @click="save">
                {{ $t('common.save') }}
              </ButtonsAppButton>
            </v-col>
          </v-row>
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

const exampleBasePoints = 100;
const exampleAmount = computed(() => {
  if (!pointsPerUnit.value || !currencyValue.value) return 0;
  return Math.floor((exampleBasePoints / pointsPerUnit.value) * currencyValue.value);
});

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

<style scoped>
.ratio-preview {
  background-color: rgb(var(--v-theme-surface-variant));
  border-radius: 12px;
  padding: 20px 24px;
  max-width: 320px;
}

.ratio-preview__eq {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 6px;
}

.ratio-preview__value {
  font-size: 2rem;
  font-weight: 700;
  line-height: 1;
  color: rgb(var(--v-theme-primary));
}

.ratio-preview__unit {
  font-size: 0.875rem;
  color: rgb(var(--v-theme-muted));
  margin-right: 6px;
}

.ratio-preview__op {
  font-size: 1.5rem;
  font-weight: 500;
  color: rgb(var(--v-theme-accent));
  margin: 0 4px;
}
</style>
