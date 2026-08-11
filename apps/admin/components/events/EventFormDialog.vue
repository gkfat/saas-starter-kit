<template>
  <v-dialog :model-value="modelValue" max-width="480" persistent @update:model-value="close">
    <CardsDialogCard>
      <v-card-title class="pa-4">{{
        event ? $t('events.edit') : $t('events.create')
      }}</v-card-title>
      <v-card-text>
        <v-row no-gutters class="ga-3 flex-column">
          <v-col>
            <v-text-field
              v-model="title"
              v-bind="titleAttrs"
              :label="$t('events.eventTitle')"
              :error-messages="formErrors.title"
              hide-details="auto"
            />
          </v-col>
          <v-col>
            <v-textarea
              v-model="copyText"
              v-bind="copyTextAttrs"
              :label="$t('events.copyText')"
              rows="4"
              :error-messages="formErrors.copyText"
              hide-details="auto"
            />
          </v-col>
          <v-col>
            <div class="text-caption text-medium-emphasis mb-1">{{ $t('events.startAt') }}</div>
            <div class="d-flex ga-2">
              <CommonDatePicker v-model="startAtDate" class="flex-grow-1" />
              <CommonTimePicker v-model="startAtTime" style="width: 130px" />
            </div>
            <div v-if="formErrors.startAt" class="text-caption text-error mt-1">
              {{ formErrors.startAt }}
            </div>
          </v-col>
          <v-col>
            <div class="text-caption text-medium-emphasis mb-1">{{ $t('events.endAt') }}</div>
            <div class="d-flex ga-2">
              <CommonDatePicker v-model="endAtDate" class="flex-grow-1" />
              <CommonTimePicker v-model="endAtTime" style="width: 130px" />
            </div>
            <div v-if="formErrors.endAt" class="text-caption text-error mt-1">
              {{ formErrors.endAt }}
            </div>
          </v-col>
          <v-col>
            <v-switch
              v-model="enabled"
              v-bind="enabledAttrs"
              :label="$t('events.enabled')"
              color="primary"
              hide-details
            />
          </v-col>
          <v-col>
            <div class="text-caption text-medium-emphasis mb-1">{{ $t('events.banner') }}</div>
            <v-card variant="outlined" rounded="lg" class="overflow-hidden">
              <v-img v-if="bannerPreviewUrl" :src="bannerPreviewUrl" height="160" cover>
                <div class="d-flex ga-1 pa-2 justify-end">
                  <v-btn
                    icon="mdi-pencil"
                    size="small"
                    density="comfortable"
                    color="white"
                    variant="flat"
                    class="text-grey-darken-3"
                    :title="$t('events.bannerChange')"
                    @click="triggerFileInput"
                  />
                  <v-btn
                    v-if="bannerFile"
                    icon="mdi-close"
                    size="small"
                    density="comfortable"
                    color="white"
                    variant="flat"
                    class="text-grey-darken-3"
                    :title="$t('events.bannerRemove')"
                    @click="clearStagedBanner"
                  />
                </div>
              </v-img>
              <div
                v-else
                class="d-flex flex-column align-center justify-center pa-8 cursor-pointer"
                @click="triggerFileInput"
              >
                <v-icon icon="mdi-image-plus" size="32" class="text-medium-emphasis" />
                <span class="text-caption text-medium-emphasis mt-1">{{
                  $t('events.bannerUpload')
                }}</span>
              </div>
            </v-card>
            <input
              ref="fileInputRef"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              class="d-none"
              @change="onFileSelected"
            />
            <div v-if="bannerError" class="text-caption text-error mt-1">{{ bannerError }}</div>
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
import type { Event, OkResponse } from '@saas-starter-kit/shared';

const props = defineProps<{
  modelValue: boolean;
  event: Event | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  saved: [];
}>();

const { t } = useI18n();
const { showSuccess, showError } = useToast();
const { apiFetch } = useApi();

const MAX_BANNER_SIZE = 5 * 1024 * 1024;
const ALLOWED_BANNER_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

const validationSchema = computed(() =>
  toTypedSchema(
    z
      .object({
        title: z.string().trim().min(1, t('events.titleRequired')),
        copyText: z.string().trim().min(1, t('events.copyTextRequired')),
        startAt: z.string().min(1, t('events.startAtRequired')),
        endAt: z.string().min(1, t('events.endAtRequired')),
        enabled: z.boolean(),
      })
      .superRefine((values, ctx) => {
        if (values.startAt && values.endAt && new Date(values.endAt) <= new Date(values.startAt)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['endAt'],
            message: t('events.scheduleInvalid'),
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
  initialValues: { title: '', copyText: '', startAt: '', endAt: '', enabled: true },
});

const [title, titleAttrs] = defineField('title');
const [copyText, copyTextAttrs] = defineField('copyText');
const [startAt] = defineField('startAt');
const [endAt] = defineField('endAt');
const [enabled, enabledAttrs] = defineField('enabled');

const { datePart: startAtDate, timePart: startAtTime } = useDateTimeParts(startAt);
const { datePart: endAtDate, timePart: endAtTime } = useDateTimeParts(endAt);

const bannerFile = ref<File | null>(null);
const bannerError = ref('');
const saving = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);
const stagedPreviewUrl = ref<string | null>(null);

const bannerPreviewUrl = computed(() => stagedPreviewUrl.value ?? props.event?.bannerUrl ?? null);

watch(bannerFile, (file, previous) => {
  if (previous && stagedPreviewUrl.value) URL.revokeObjectURL(stagedPreviewUrl.value);
  stagedPreviewUrl.value = file ? URL.createObjectURL(file) : null;
});

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return;
    bannerFile.value = null;
    bannerError.value = '';
    if (props.event) {
      resetForm({
        values: {
          title: props.event.title,
          copyText: props.event.copyText,
          startAt: props.event.startAt,
          endAt: props.event.endAt,
          enabled: props.event.enabled,
        },
      });
    } else {
      resetForm({ values: { title: '', copyText: '', startAt: '', endAt: '', enabled: true } });
    }
  },
);

function close() {
  emit('update:modelValue', false);
}

function triggerFileInput() {
  fileInputRef.value?.click();
}

function clearStagedBanner() {
  bannerFile.value = null;
  bannerError.value = '';
  if (fileInputRef.value) fileInputRef.value.value = '';
}

function onFileSelected(e: globalThis.Event) {
  const file = (e.target as HTMLInputElement).files?.[0] ?? null;
  bannerFile.value = file;
  bannerError.value = '';
}

async function uploadBanner(eventId: string, file: File): Promise<boolean> {
  const formData = new FormData();
  formData.append('file', file);
  const result = await apiFetch<OkResponse>(`/api/admin/events/${eventId}/banner`, {
    method: 'POST',
    body: formData,
  });
  return result !== null;
}

const save = handleSubmit(async (values) => {
  if (bannerFile.value) {
    if (!ALLOWED_BANNER_TYPES.includes(bannerFile.value.type)) {
      bannerError.value = t('events.bannerTypeInvalid');
      return;
    }
    if (bannerFile.value.size > MAX_BANNER_SIZE) {
      bannerError.value = t('events.bannerTooLarge');
      return;
    }
  }

  saving.value = true;
  const body = {
    title: values.title,
    copyText: values.copyText,
    startAt: values.startAt,
    endAt: values.endAt,
    enabled: values.enabled,
  };

  const result = props.event
    ? await apiFetch<Event>(`/api/admin/events/${props.event.id}`, { method: 'PATCH', body })
    : await apiFetch<Event>('/api/admin/events', { method: 'POST', body });

  if (result === null) {
    saving.value = false;
    return;
  }

  if (bannerFile.value) {
    const uploaded = await uploadBanner(result.id, bannerFile.value);
    if (!uploaded) {
      showError(t('events.bannerUploadFailed'));
      saving.value = false;
      return;
    }
  }

  close();
  emit('saved');
  showSuccess(props.event ? t('events.updateSuccess') : t('events.createSuccess'));
  saving.value = false;
});
</script>
