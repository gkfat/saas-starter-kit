<template>
  <div class="h-100">
    <CardsAppCard class="h-100" :min-width="280">
      <v-card-title class="d-flex align-center justify-end py-3">
        <span class="mr-auto">{{ $t('profile.changePasswordCardTitle') }}</span>
        <ButtonsAppButton kind="secondary" size="small" @click="openDialog">
          {{ isPasswordBound ? $t('profile.changePassword') : $t('profile.setPassword') }}
        </ButtonsAppButton>
      </v-card-title>
      <v-card-text>
        <p v-if="!isPasswordBound" class="text-body-2 text-medium-emphasis">
          {{ $t('profile.setPasswordHint') }}
        </p>
        <p v-else class="text-body-2 text-medium-emphasis">•••••••</p>
      </v-card-text>
    </CardsAppCard>

    <v-dialog v-model="dialog" max-width="400" persistent>
      <CardsDialogCard>
        <v-card-title class="pa-4">{{
          isPasswordBound ? $t('profile.changePassword') : $t('profile.setPassword')
        }}</v-card-title>
        <v-card-text>
          <v-row no-gutters class="ga-3 flex-column">
            <v-col v-if="isPasswordBound">
              <v-text-field
                v-model="currentPassword"
                v-bind="currentPasswordAttrs"
                :label="$t('profile.currentPassword')"
                type="password"
                :error-messages="errors.currentPassword"
                :disabled="loading"
                hide-details="auto"
              />
            </v-col>
            <v-col>
              <v-text-field
                v-model="newPassword"
                v-bind="newPasswordAttrs"
                :label="$t('profile.newPassword')"
                type="password"
                :error-messages="errors.newPassword"
                :disabled="loading"
                :hint="$t('auth.passwordHint')"
                persistent-hint
                hide-details="auto"
              />
            </v-col>
            <v-col>
              <v-text-field
                v-model="confirmNewPassword"
                v-bind="confirmNewPasswordAttrs"
                :label="$t('profile.confirmNewPassword')"
                type="password"
                :error-messages="errors.confirmNewPassword"
                :disabled="loading"
                hide-details="auto"
              />
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <ButtonsAppButton kind="secondary" :disabled="loading" @click="dialog = false">
            {{ $t('common.cancel') }}
          </ButtonsAppButton>
          <ButtonsAppButton
            kind="primary"
            :loading="loading"
            :disabled="!meta.valid"
            @click="onSubmit"
          >
            {{ $t('profile.save') }}
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
import { useAuthStore } from '~/stores/auth';
import { isValidPassword } from '@saas-starter-kit/shared';

const store = useAuthStore();
const { changePassword } = useAuth();
const { showError, showSuccess } = useToast();
const { t } = useI18n();

const dialog = ref(false);
const loading = ref(false);

const isPasswordBound = computed(() => store.user?.providers.includes('password') ?? false);

const validationSchema = toTypedSchema(
  z
    .object({
      currentPassword: z.string().optional(),
      newPassword: z.string().refine(isValidPassword, t('auth.error.invalidPassword')),
      confirmNewPassword: z.string(),
    })
    .superRefine((data, ctx) => {
      if (isPasswordBound.value && !data.currentPassword) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t('common.required'),
          path: ['currentPassword'],
        });
      }
      if (data.newPassword !== data.confirmNewPassword) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t('auth.passwordMismatch'),
          path: ['confirmNewPassword'],
        });
      }
    }),
);

const { defineField, errors, meta, handleSubmit, resetForm } = useForm({
  validationSchema,
  initialValues: { currentPassword: '', newPassword: '', confirmNewPassword: '' },
});

const [currentPassword, currentPasswordAttrs] = defineField('currentPassword');
const [newPassword, newPasswordAttrs] = defineField('newPassword');
const [confirmNewPassword, confirmNewPasswordAttrs] = defineField('confirmNewPassword');

function openDialog() {
  resetForm();
  dialog.value = true;
}

const onSubmit = handleSubmit(async (values) => {
  loading.value = true;
  try {
    await changePassword(values.newPassword, values.currentPassword || undefined);
    showSuccess(
      isPasswordBound.value ? t('profile.changePasswordSuccess') : t('profile.setPasswordSuccess'),
    );
    dialog.value = false;
  } catch (e: unknown) {
    const statusCode = (e as { data?: { statusCode?: number } }).data?.statusCode;
    showError(
      statusCode === 401
        ? t('profile.currentPasswordIncorrect')
        : t('profile.changePasswordFailed'),
    );
  } finally {
    loading.value = false;
  }
});
</script>
