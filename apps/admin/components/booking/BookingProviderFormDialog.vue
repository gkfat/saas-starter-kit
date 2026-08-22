<template>
  <v-dialog :model-value="modelValue" max-width="480" persistent @update:model-value="close">
    <CardsDialogCard>
      <v-card-title class="pa-4">{{
        provider ? $t('bookingProviders.edit') : $t('bookingProviders.create')
      }}</v-card-title>
      <v-card-text>
        <v-row no-gutters class="ga-4 flex-column">
          <v-col>
            <v-text-field
              v-model="name"
              v-bind="nameAttrs"
              :label="$t('bookingProviders.name')"
              :error-messages="formErrors.name"
              hide-details="auto"
            />
          </v-col>

          <v-col>
            <v-switch
              v-model="enabled"
              :label="$t('bookingProviders.enabled')"
              color="primary"
              hide-details
            />
            <div class="text-caption text-medium-emphasis">
              {{ $t('bookingProviders.enabledHint') }}
            </div>
          </v-col>

          <v-col>
            <v-select
              v-model="selectedServiceIds"
              :items="serviceOptions"
              item-title="text"
              item-value="value"
              multiple
              chips
              closable-chips
              :label="$t('bookingProviders.assignedServices')"
              hide-details="auto"
            />
            <div class="text-caption text-medium-emphasis">
              {{ $t('bookingProviders.assignedServicesHint') }}
            </div>
          </v-col>

          <v-col>
            <v-switch
              v-model="hasWorkingHours"
              :label="$t('bookingProviders.setWorkingHours')"
              color="primary"
              hide-details
            />
            <div class="text-caption text-medium-emphasis">
              {{ $t('bookingProviders.workingHoursRequiredHint') }}
            </div>
          </v-col>

          <template v-if="hasWorkingHours">
            <v-col>
              <div class="text-caption text-medium-emphasis mb-1">
                {{ $t('bookingProviders.workingWeekdays') }}
              </div>
              <WeekdayPicker v-model="selectedWeekdays" />
              <div v-if="weekdaysError" class="text-caption text-error mt-1">
                {{ weekdaysError }}
              </div>
            </v-col>

            <v-col>
              <v-row no-gutters class="ga-3">
                <v-col>
                  <div class="text-caption text-medium-emphasis mb-1">
                    {{ $t('bookingProviders.dailyStartTime') }}
                  </div>
                  <CommonTimePicker v-model="dailyStartTimeParts" />
                  <div v-if="formErrors.dailyStartTime" class="text-caption text-error mt-1">
                    {{ formErrors.dailyStartTime }}
                  </div>
                </v-col>
                <v-col>
                  <div class="text-caption text-medium-emphasis mb-1">
                    {{ $t('bookingProviders.dailyEndTime') }}
                  </div>
                  <CommonTimePicker v-model="dailyEndTimeParts" />
                  <div v-if="formErrors.dailyEndTime" class="text-caption text-error mt-1">
                    {{ formErrors.dailyEndTime }}
                  </div>
                </v-col>
              </v-row>
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
import type { BookingProvider, BookingService, BookingWeekday } from '@saas-starter-kit/shared';
import WeekdayPicker from '~/components/booking/WeekdayPicker.vue';
import { formatTimeOfDay, parseTimeOfDay } from '~/utils/booking-slot-generation';

const props = defineProps<{
  modelValue: boolean;
  provider: BookingProvider | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  saved: [provider: BookingProvider];
}>();

const { t } = useI18n();
const { showSuccess } = useToast();
const { apiFetch } = useApi();

const { data: services } = useAuthFetch<BookingService[]>('/api/admin/booking/services', {
  default: () => [],
});
const serviceOptions = computed(() =>
  (services.value ?? []).map((service) => ({ text: service.name, value: service.id })),
);
const selectedServiceIds = ref<string[]>([]);

const validationSchema = computed(() =>
  toTypedSchema(
    z
      .object({
        name: z.string().trim().min(1, t('bookingProviders.nameRequired')),
        dailyStartTime: z.string().optional(),
        dailyEndTime: z.string().optional(),
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
  initialValues: { name: '', dailyStartTime: '09:00', dailyEndTime: '18:00' },
});

const [name, nameAttrs] = defineField('name');
const [dailyStartTime] = defineField('dailyStartTime');
const [dailyEndTime] = defineField('dailyEndTime');

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

const enabled = ref(true);
const hasWorkingHours = ref(false);
const selectedWeekdays = ref<BookingWeekday[]>([]);
const weekdaysError = ref('');
const saving = ref(false);

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return;
    weekdaysError.value = '';
    if (props.provider) {
      resetForm({
        values: {
          name: props.provider.name,
          dailyStartTime: props.provider.workingHours?.dailyStartTime ?? '09:00',
          dailyEndTime: props.provider.workingHours?.dailyEndTime ?? '18:00',
        },
      });
      enabled.value = props.provider.enabled !== false;
      selectedServiceIds.value = props.provider.serviceIds ? [...props.provider.serviceIds] : [];
      hasWorkingHours.value = !!props.provider.workingHours;
      selectedWeekdays.value = props.provider.workingHours
        ? [...props.provider.workingHours.weekdays]
        : [];
    } else {
      resetForm({ values: { name: '', dailyStartTime: '09:00', dailyEndTime: '18:00' } });
      enabled.value = true;
      selectedServiceIds.value = [];
      hasWorkingHours.value = false;
      selectedWeekdays.value = [1, 2, 3, 4, 5];
    }
  },
);

function close() {
  emit('update:modelValue', false);
}

const save = handleSubmit(async (values) => {
  if (hasWorkingHours.value && selectedWeekdays.value.length === 0) {
    weekdaysError.value = t('bookingSlotTemplates.businessDaysRequired');
    return;
  }
  weekdaysError.value = '';

  saving.value = true;
  const workingHours = hasWorkingHours.value
    ? {
        weekdays: selectedWeekdays.value,
        dailyStartTime: values.dailyStartTime ?? '09:00',
        dailyEndTime: values.dailyEndTime ?? '18:00',
      }
    : null;

  const result = props.provider
    ? await apiFetch<BookingProvider>(`/api/admin/booking/providers/${props.provider.id}`, {
        method: 'PATCH',
        body: {
          name: values.name,
          enabled: enabled.value,
          serviceIds: selectedServiceIds.value,
          workingHours,
        },
      })
    : await apiFetch<BookingProvider>('/api/admin/booking/providers', {
        method: 'POST',
        body: {
          name: values.name,
          enabled: enabled.value,
          serviceIds: selectedServiceIds.value,
          ...(workingHours ? { workingHours } : {}),
        },
      });

  if (result !== null) {
    close();
    emit('saved', result);
    showSuccess(
      props.provider ? t('bookingProviders.updateSuccess') : t('bookingProviders.createSuccess'),
    );
  }
  saving.value = false;
});
</script>
