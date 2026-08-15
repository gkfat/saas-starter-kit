<template>
  <div>
    <div class="d-flex flex-wrap ga-3 align-center justify-space-between">
      <LayoutPageHeader :title="$t('levelTiers.title')" />
      <LevelTiersToolbar :can-write="canWrite" @create="openCreate" />
    </div>

    <CardsAppCard>
      <v-data-table
        :headers="headers"
        :items="tiers ?? []"
        :loading="pending"
        item-value="levelNumber"
      >
        <template #no-data>
          <span class="text-medium-emphasis">{{ $t('levelTiers.noData') }}</span>
        </template>

        <template v-if="canWrite" #[`item.actions`]="{ item }">
          <v-row no-gutters class="ga-1 flex-nowrap">
            <ButtonsIconActionBtn icon="mdi-pencil" @click="openEdit(item)" />
            <ButtonsIconActionBtn
              icon="mdi-delete-outline"
              class="text-error"
              @click="openDelete(item)"
            />
          </v-row>
        </template>
      </v-data-table>
    </CardsAppCard>

    <v-dialog v-model="dialog" max-width="420" persistent>
      <CardsDialogCard>
        <v-card-title class="pa-4">{{
          editing ? $t('levelTiers.edit') : $t('levelTiers.create')
        }}</v-card-title>
        <v-card-text>
          <v-row no-gutters class="ga-3 flex-column">
            <v-col>
              <v-text-field
                v-model.number="levelNumber"
                v-bind="levelNumberAttrs"
                :label="$t('levelTiers.levelNumber')"
                type="number"
                disabled
                :error-messages="formErrors.levelNumber"
                hide-details="auto"
              />
            </v-col>
            <v-col>
              <v-text-field
                v-model="name"
                v-bind="nameAttrs"
                :label="$t('levelTiers.name')"
                :error-messages="formErrors.name"
                hide-details="auto"
              />
            </v-col>
            <v-col>
              <v-text-field
                v-model.number="metricThreshold"
                v-bind="metricThresholdAttrs"
                :label="$t('levelTiers.metricThreshold')"
                type="number"
                :disabled="levelNumber === 1"
                :hint="levelNumber === 1 ? $t('levelTiers.floorThresholdFixed') : undefined"
                persistent-hint
                :error-messages="formErrors.metricThreshold"
              />
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <ButtonsAppButton kind="secondary" :disabled="saving" @click="dialog = false">
            {{ $t('common.cancel') }}
          </ButtonsAppButton>
          <ButtonsAppButton kind="primary" :loading="saving" @click="save">
            {{ $t('common.save') }}
          </ButtonsAppButton>
        </v-card-actions>
      </CardsDialogCard>
    </v-dialog>

    <v-dialog v-model="deleteDialog" max-width="400" persistent>
      <CardsDialogCard>
        <v-card-title class="pa-4">{{ $t('levelTiers.deleteConfirmTitle') }}</v-card-title>
        <v-card-text>
          {{ $t('levelTiers.deleteConfirm', { name: deleteTarget?.name }) }}
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <ButtonsAppButton kind="secondary" :disabled="deleting" @click="deleteDialog = false">
            {{ $t('common.cancel') }}
          </ButtonsAppButton>
          <ButtonsAppButton kind="primary" color="error" :loading="deleting" @click="confirmDelete">
            {{ $t('common.confirm') }}
          </ButtonsAppButton>
        </v-card-actions>
      </CardsDialogCard>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod';
import { useForm } from 'vee-validate';
import { z } from 'zod';
import { Permission } from '@saas-starter-kit/shared';
import type { LevelTier, OkResponse } from '@saas-starter-kit/shared';

const { t } = useI18n();
const { showSuccess } = useToast();
const { apiFetch } = useApi();
const { hasPermission } = usePermission();

const canWrite = computed(() => hasPermission(Permission.LevelTiers.Write));

const {
  data: tiers,
  pending,
  refresh,
} = useAuthFetch<LevelTier[]>('/api/admin/level/tiers', {
  default: () => [],
});

const headers = computed(() => [
  { title: t('levelTiers.levelNumber'), key: 'levelNumber' },
  { title: t('levelTiers.name'), key: 'name' },
  { title: t('levelTiers.metricThreshold'), key: 'metricThreshold' },
  ...(canWrite.value
    ? [{ title: '', key: 'actions', sortable: false, align: 'end' as const }]
    : []),
]);

const validationSchema = computed(() =>
  toTypedSchema(
    z
      .object({
        levelNumber: z
          .number({ invalid_type_error: t('levelTiers.levelNumberRequired') })
          .int()
          .positive(),
        name: z.string().trim().min(1, t('levelTiers.nameRequired')),
        metricThreshold: z
          .number({ invalid_type_error: t('levelTiers.thresholdRequired') })
          .nonnegative(),
      })
      .superRefine((values, ctx) => {
        if (values.levelNumber === 1) return;
        const previousTier = (tiers.value ?? []).find(
          (tier) => tier.levelNumber === values.levelNumber - 1,
        );
        if (previousTier && values.metricThreshold <= previousTier.metricThreshold) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['metricThreshold'],
            message: t('levelTiers.thresholdMustExceedPrevious', {
              threshold: previousTier.metricThreshold,
            }),
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
  initialValues: { levelNumber: undefined, name: '', metricThreshold: undefined },
});

const [levelNumber, levelNumberAttrs] = defineField('levelNumber');
const [name, nameAttrs] = defineField('name');
const [metricThreshold, metricThresholdAttrs] = defineField('metricThreshold');

watch(levelNumber, (value) => {
  if (value === 1) metricThreshold.value = 0;
});

const dialog = ref(false);
const saving = ref(false);
const editing = ref<LevelTier | null>(null);

const nextLevelNumber = computed(
  () => Math.max(0, ...(tiers.value ?? []).map((tier) => tier.levelNumber)) + 1,
);

function openCreate() {
  editing.value = null;
  resetForm({
    values: { levelNumber: nextLevelNumber.value, name: '', metricThreshold: undefined },
  });
  dialog.value = true;
}

function openEdit(item: LevelTier) {
  editing.value = item;
  resetForm({
    values: {
      levelNumber: item.levelNumber,
      name: item.name,
      metricThreshold: item.metricThreshold,
    },
  });
  dialog.value = true;
}

const save = handleSubmit(async (values) => {
  saving.value = true;
  const result = editing.value
    ? await apiFetch<OkResponse>(`/api/admin/level/tiers/${editing.value.levelNumber}`, {
        method: 'PATCH',
        body: { name: values.name, metricThreshold: values.metricThreshold },
      })
    : await apiFetch<OkResponse>('/api/admin/level/tiers', {
        method: 'POST',
        body: values,
      });
  if (result !== null) {
    dialog.value = false;
    await refresh();
    showSuccess(editing.value ? t('levelTiers.updateSuccess') : t('levelTiers.createSuccess'));
  }
  saving.value = false;
});

const deleteDialog = ref(false);
const deleting = ref(false);
const deleteTarget = ref<LevelTier | null>(null);

function openDelete(item: LevelTier) {
  deleteTarget.value = item;
  deleteDialog.value = true;
}

async function confirmDelete() {
  if (!deleteTarget.value) return;
  deleting.value = true;
  const result = await apiFetch<OkResponse>(
    `/api/admin/level/tiers/${deleteTarget.value.levelNumber}`,
    { method: 'DELETE' },
  );
  if (result !== null) {
    deleteDialog.value = false;
    await refresh();
    showSuccess(t('levelTiers.deleteSuccess'));
  }
  deleting.value = false;
}
</script>
