<template>
  <div>
    <CardsAppCard class="h-100">
      <v-card-title class="d-flex align-center justify-end py-3">
        <span class="mr-auto">{{ $t('profile.profileCardTitle') }}</span>
        <ButtonsAppButton kind="secondary" size="small" @click="openEditProfileDialog">
          {{ $t('profile.editProfile') }}
        </ButtonsAppButton>
        <ButtonsAppButton
          kind="secondary"
          size="small"
          class="ml-2"
          @click="openChangePasswordDialog"
        >
          {{ $t('profile.changePassword') }}
        </ButtonsAppButton>
      </v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="12" sm="6">
            <div class="text-caption text-medium-emphasis">{{ $t('auth.username') }}</div>
            <div>{{ store.user?.username ?? '—' }}</div>
          </v-col>

          <v-col cols="12" sm="6">
            <div class="text-caption text-medium-emphasis">{{ $t('profile.email') }}</div>
            <div>{{ store.user?.email ?? '—' }}</div>
          </v-col>

          <v-col cols="12" sm="6">
            <div class="text-caption text-medium-emphasis">{{ $t('profile.displayName') }}</div>
            <div>{{ store.user?.displayName ?? '—' }}</div>
          </v-col>

          <v-col cols="12" sm="6">
            <div class="text-caption text-medium-emphasis">{{ $t('profile.role') }}</div>
            <div>{{ $t(`role.${store.user?.role}`) }}</div>
          </v-col>
        </v-row>
      </v-card-text>
    </CardsAppCard>

    <v-dialog v-model="editingProfile" max-width="400" persistent>
      <CardsDialogCard>
        <v-card-title class="pa-4">{{ $t('profile.editProfile') }}</v-card-title>
        <v-card-text>
          <v-row no-gutters class="ga-3 flex-column">
            <v-col>
              <div class="text-caption text-medium-emphasis mb-1">
                {{ $t('profile.displayName') }}
              </div>
              <v-text-field
                v-model="displayNameInput"
                v-bind="displayNameInputAttrs"
                hide-details="auto"
                :disabled="profileLoading"
                :error-messages="profileFormErrors.displayNameInput"
              />
            </v-col>
            <v-col>
              <div class="text-caption text-medium-emphasis mb-1">{{ $t('profile.email') }}</div>
              <v-text-field
                v-model="emailInput"
                v-bind="emailInputAttrs"
                type="email"
                hide-details="auto"
                :disabled="profileLoading"
                :error-messages="profileFormErrors.emailInput"
              />
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <ButtonsAppButton kind="secondary" :disabled="profileLoading" @click="cancelEditProfile">
            {{ $t('profile.cancel') }}
          </ButtonsAppButton>
          <ButtonsAppButton
            kind="primary"
            :loading="profileLoading"
            :disabled="!profileFormMeta.valid"
            @click="onSaveProfile"
          >
            {{ $t('profile.save') }}
          </ButtonsAppButton>
        </v-card-actions>
      </CardsDialogCard>
    </v-dialog>

    <v-dialog v-model="changePasswordDialog" max-width="400" persistent>
      <CardsDialogCard>
        <v-card-title class="pa-4">{{ $t('profile.changePassword') }}</v-card-title>
        <v-card-text>
          <v-row no-gutters class="ga-3 flex-column">
            <v-col v-if="isPasswordBound">
              <v-text-field
                v-model="currentPassword"
                v-bind="currentPasswordAttrs"
                :label="$t('profile.currentPassword')"
                type="password"
                :error-messages="passwordFormErrors.currentPassword"
                :disabled="changePasswordLoading"
                hide-details="auto"
              />
            </v-col>
            <v-col>
              <v-text-field
                v-model="newPassword"
                v-bind="newPasswordAttrs"
                :label="$t('profile.newPassword')"
                type="password"
                :error-messages="passwordFormErrors.newPassword"
                :disabled="changePasswordLoading"
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
                :error-messages="passwordFormErrors.confirmNewPassword"
                :disabled="changePasswordLoading"
                hide-details="auto"
              />
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <ButtonsAppButton
            kind="secondary"
            :disabled="changePasswordLoading"
            @click="changePasswordDialog = false"
          >
            {{ $t('common.cancel') }}
          </ButtonsAppButton>
          <ButtonsAppButton
            kind="primary"
            :loading="changePasswordLoading"
            :disabled="!passwordFormMeta.valid"
            @click="onSubmitChangePassword"
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
import type { OkResponse } from '@saas-starter-kit/shared';

const store = useAuthStore();
const { changePassword } = useAuth();
const { showError, showSuccess } = useToast();
const { t } = useI18n();
const { apiFetch } = useApi();

const profileLoading = ref(false);
const editingProfile = ref(false);

const profileValidationSchema = toTypedSchema(
  z.object({
    displayNameInput: z
      .string()
      .trim()
      .min(1, t('profile.displayNameRequired'))
      .max(20, t('profile.displayNameTooLong')),
    emailInput: z
      .union([z.string().trim().email(t('profile.emailInvalid')), z.literal('')])
      .optional(),
  }),
);
const {
  defineField: defineProfileField,
  errors: profileFormErrors,
  meta: profileFormMeta,
  handleSubmit: handleProfileSubmit,
  resetForm: resetProfileForm,
} = useForm({
  validationSchema: profileValidationSchema,
  initialValues: { displayNameInput: '', emailInput: '' },
});
const [displayNameInput, displayNameInputAttrs] = defineProfileField('displayNameInput');
const [emailInput, emailInputAttrs] = defineProfileField('emailInput');

function openEditProfileDialog() {
  resetProfileForm({
    values: {
      displayNameInput: store.user?.displayName ?? '',
      emailInput: store.user?.email ?? '',
    },
  });
  editingProfile.value = true;
}

function cancelEditProfile() {
  editingProfile.value = false;
}

const onSaveProfile = handleProfileSubmit(async (values) => {
  if (!store.user) return;
  const displayName = values.displayNameInput.trim();
  const email = values.emailInput?.trim() ?? '';

  let hasError = false;
  const tasks: Promise<void>[] = [];

  if (displayName !== (store.user.displayName ?? '')) {
    tasks.push(
      apiFetch<OkResponse>('/api/profile/display-name', {
        method: 'PATCH',
        silent: true,
        body: { displayName },
      })
        .then((result) => {
          if (result !== null && store.user) store.user.displayName = displayName;
        })
        .catch(() => {
          hasError = true;
          showError(t('profile.displayNameUpdateFailed'));
        }),
    );
  }

  if (email !== (store.user.email ?? '')) {
    tasks.push(
      apiFetch<OkResponse>('/api/profile/email', {
        method: 'PATCH',
        silent: true,
        body: { email },
      })
        .then((result) => {
          if (result !== null && store.user) store.user.email = email;
        })
        .catch((e: unknown) => {
          hasError = true;
          showError(
            getErrorCode(e) === 'contact-taken'
              ? t('profile.contactTaken')
              : t('profile.emailUpdateFailed'),
          );
        }),
    );
  }

  if (tasks.length === 0) {
    editingProfile.value = false;
    return;
  }

  profileLoading.value = true;
  try {
    await Promise.all(tasks);
    if (!hasError) {
      showSuccess(t('profile.profileUpdateSuccess'));
      editingProfile.value = false;
    }
  } finally {
    profileLoading.value = false;
  }
});

const changePasswordDialog = ref(false);
const changePasswordLoading = ref(false);

const isPasswordBound = computed(() => store.user?.providers.includes('password') ?? false);

const passwordValidationSchema = toTypedSchema(
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

const {
  defineField: definePasswordField,
  errors: passwordFormErrors,
  meta: passwordFormMeta,
  handleSubmit: handlePasswordSubmit,
  resetForm: resetPasswordForm,
} = useForm({
  validationSchema: passwordValidationSchema,
  initialValues: { currentPassword: '', newPassword: '', confirmNewPassword: '' },
});

const [currentPassword, currentPasswordAttrs] = definePasswordField('currentPassword');
const [newPassword, newPasswordAttrs] = definePasswordField('newPassword');
const [confirmNewPassword, confirmNewPasswordAttrs] = definePasswordField('confirmNewPassword');

function openChangePasswordDialog() {
  resetPasswordForm();
  changePasswordDialog.value = true;
}

const onSubmitChangePassword = handlePasswordSubmit(async (values) => {
  changePasswordLoading.value = true;
  try {
    await changePassword(values.newPassword, values.currentPassword || undefined);
    showSuccess(t('profile.changePasswordSuccess'));
    changePasswordDialog.value = false;
  } catch (e: unknown) {
    const statusCode = (e as { data?: { statusCode?: number } }).data?.statusCode;
    showError(
      statusCode === 401
        ? t('profile.currentPasswordIncorrect')
        : t('profile.changePasswordFailed'),
    );
  } finally {
    changePasswordLoading.value = false;
  }
});
</script>
