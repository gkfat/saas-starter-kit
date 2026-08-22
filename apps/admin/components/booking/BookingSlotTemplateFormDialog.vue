<template>
  <v-dialog :model-value="modelValue" max-width="640" persistent @update:model-value="close">
    <CardsDialogCard>
      <v-card-title class="pa-4">{{
        template ? $t('bookingSlotTemplates.edit') : $t('bookingSlotTemplates.create')
      }}</v-card-title>
      <v-card-text>
        <v-row no-gutters class="ga-4 flex-column">
          <v-col>
            <v-text-field
              v-model="name"
              v-bind="nameAttrs"
              :label="$t('bookingSlotTemplates.name')"
              :error-messages="formErrors.name"
              hide-details="auto"
            />
          </v-col>

          <v-col>
            <div class="text-caption text-medium-emphasis mb-1">
              {{ $t('bookingSlotTemplates.businessDays') }}
            </div>
            <WeekdayPicker v-model="selectedWeekdays" />
            <div v-if="weekdaysError" class="text-caption text-error mt-1">{{ weekdaysError }}</div>
          </v-col>

          <v-col>
            <v-row no-gutters class="ga-3">
              <v-col>
                <div class="text-caption text-medium-emphasis mb-1">
                  {{ $t('bookingSlotTemplates.dailyStartTime') }}
                </div>
                <CommonTimePicker v-model="dailyStartTimeParts" />
                <div v-if="formErrors.dailyStartTime" class="text-caption text-error mt-1">
                  {{ formErrors.dailyStartTime }}
                </div>
              </v-col>
              <v-col>
                <div class="text-caption text-medium-emphasis mb-1">
                  {{ $t('bookingSlotTemplates.dailyEndTime') }}
                </div>
                <CommonTimePicker v-model="dailyEndTimeParts" />
                <div v-if="formErrors.dailyEndTime" class="text-caption text-error mt-1">
                  {{ formErrors.dailyEndTime }}
                </div>
              </v-col>
            </v-row>
          </v-col>

          <v-col>
            <v-row no-gutters class="ga-3">
              <v-col>
                <v-select
                  v-model="granularityMinutes"
                  v-bind="granularityMinutesAttrs"
                  :label="$t('bookingSlotTemplates.granularity')"
                  :items="granularityOptions"
                  item-title="text"
                  item-value="value"
                  :error-messages="formErrors.granularityMinutes"
                  hide-details="auto"
                />
              </v-col>
              <v-col>
                <v-text-field
                  v-model.number="defaultCapacity"
                  v-bind="defaultCapacityAttrs"
                  :label="$t('bookingSlotTemplates.defaultCapacity')"
                  type="number"
                  min="1"
                  :error-messages="formErrors.defaultCapacity"
                  hide-details="auto"
                />
              </v-col>
            </v-row>
          </v-col>

          <v-col v-if="perDayPreviewCount !== null">
            <v-alert type="info" variant="tonal" density="compact">
              {{ $t('bookingSlotTemplates.perDayPreviewCount', { count: perDayPreviewCount }) }}
            </v-alert>
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
import type { BookingSlotTemplate, BookingWeekday } from '@saas-starter-kit/shared';
import WeekdayPicker from '~/components/booking/WeekdayPicker.vue';
import { formatTimeOfDay, parseTimeOfDay } from '~/utils/booking-slot-generation';

const props = defineProps<{
  modelValue: boolean;
  template: BookingSlotTemplate | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  saved: [];
}>();

const { t } = useI18n();
const { showSuccess } = useToast();
const { apiFetch } = useApi();

const granularityOptions = computed(() => [
  { text: t('bookingSlotTemplates.granularityOption.60'), value: 60 },
  { text: t('bookingSlotTemplates.granularityOption.30'), value: 30 },
  { text: t('bookingSlotTemplates.granularityOption.15'), value: 15 },
]);

const validationSchema = computed(() =>
  toTypedSchema(
    z
      .object({
        name: z.string().trim().min(1, t('bookingSlotTemplates.nameRequired')),
        dailyStartTime: z.string().min(1, t('bookingSlotTemplates.startTimeRequired')),
        dailyEndTime: z.string().min(1, t('bookingSlotTemplates.endTimeRequired')),
        granularityMinutes: z.union([z.literal(15), z.literal(30), z.literal(60)], {
          errorMap: () => ({ message: t('bookingSlotTemplates.granularityRequired') }),
        }),
        defaultCapacity: z
          .number({ invalid_type_error: t('bookingSlotTemplates.capacityRequired') })
          .int()
          .positive(),
      })
      .superRefine((values, ctx) => {
        if (
          values.dailyStartTime &&
          values.dailyEndTime &&
          values.dailyEndTime <= values.dailyStartTime
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['dailyEndTime'],
            message: t('bookingSlotTemplates.scheduleInvalid'),
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
    name: '',
    dailyStartTime: '09:00',
    dailyEndTime: '18:00',
    granularityMinutes: undefined,
    defaultCapacity: undefined,
  },
});

const [name, nameAttrs] = defineField('name');
const [dailyStartTime] = defineField('dailyStartTime');
const [dailyEndTime] = defineField('dailyEndTime');
const [granularityMinutes, granularityMinutesAttrs] = defineField('granularityMinutes');
const [defaultCapacity, defaultCapacityAttrs] = defineField('defaultCapacity');

const dailyStartTimeParts = computed<{ hours: number; minutes: number } | null>({
  get: () => (dailyStartTime.value ? parseTimeOfDay(dailyStartTime.value) : null),
  set: (value) => {
    dailyStartTime.value = value ? formatTimeOfDay(value) : '';
  },
});
const dailyEndTimeParts = computed<{ hours: number; minutes: number } | null>({
  get: () => (dailyEndTime.value ? parseTimeOfDay(dailyEndTime.value) : null),
  set: (value) => {
    dailyEndTime.value = value ? formatTimeOfDay(value) : '';
  },
});

const selectedWeekdays = ref<BookingWeekday[]>([]);
const weekdaysError = ref('');
const saving = ref(false);

const perDayPreviewCount = computed(() => {
  if (selectedWeekdays.value.length === 0 || !dailyStartTime.value || !dailyEndTime.value) {
    return null;
  }
  if (dailyEndTime.value <= dailyStartTime.value || !granularityMinutes.value) return null;

  const [startHour, startMinute] = dailyStartTime.value.split(':').map(Number);
  const [endHour, endMinute] = dailyEndTime.value.split(':').map(Number);
  const totalMinutes = endHour * 60 + endMinute - (startHour * 60 + startMinute);
  return Math.floor(totalMinutes / granularityMinutes.value);
});

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return;
    weekdaysError.value = '';
    if (props.template) {
      resetForm({
        values: {
          name: props.template.name,
          dailyStartTime: props.template.dailyStartTime,
          dailyEndTime: props.template.dailyEndTime,
          granularityMinutes: props.template.granularityMinutes,
          defaultCapacity: props.template.defaultCapacity,
        },
      });
      selectedWeekdays.value = Array.isArray(props.template.weekdays)
        ? [...props.template.weekdays]
        : [];
    } else {
      resetForm({
        values: {
          name: '',
          dailyStartTime: '09:00',
          dailyEndTime: '18:00',
          granularityMinutes: undefined,
          defaultCapacity: undefined,
        },
      });
      selectedWeekdays.value = [1, 2, 3, 4, 5];
    }
  },
);

function close() {
  emit('update:modelValue', false);
}

const save = handleSubmit(async (values) => {
  if (selectedWeekdays.value.length === 0) {
    weekdaysError.value = t('bookingSlotTemplates.businessDaysRequired');
    return;
  }
  weekdaysError.value = '';

  saving.value = true;
  const body = {
    name: values.name,
    weekdays: selectedWeekdays.value,
    dailyStartTime: values.dailyStartTime,
    dailyEndTime: values.dailyEndTime,
    granularityMinutes: values.granularityMinutes,
    defaultCapacity: values.defaultCapacity,
  };

  const result = props.template
    ? await apiFetch<BookingSlotTemplate>(
        `/api/admin/booking/slot-templates/${props.template.id}`,
        {
          method: 'PATCH',
          body,
        },
      )
    : await apiFetch<BookingSlotTemplate>('/api/admin/booking/slot-templates', {
        method: 'POST',
        body,
      });

  if (result !== null) {
    close();
    emit('saved');
    showSuccess(
      props.template
        ? t('bookingSlotTemplates.updateSuccess')
        : t('bookingSlotTemplates.createSuccess'),
    );
  }
  saving.value = false;
});
</script>
