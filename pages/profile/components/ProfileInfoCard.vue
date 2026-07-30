<template>
  <div>
    <CardsAppCard class="h-100">
      <v-card-title class="d-flex align-center justify-end py-3">
        <span class="mr-auto">{{ $t('profile.profileCardTitle') }}</span>
        <ButtonsAppButton kind="secondary" size="small" @click="startEditDisplayName">
          {{ $t('profile.editDisplayName') }}
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
            <div v-if="store.user?.email">{{ store.user.email }}</div>
            <v-row v-else no-gutters align="center" class="ga-2">
              <v-col cols="auto" class="text-medium-emphasis">{{ $t('common.notBound') }}</v-col>
              <v-col cols="auto">
                <ButtonsAppButton kind="secondary" size="small" disabled>
                  {{ $t('common.bind') }}
                </ButtonsAppButton>
              </v-col>
            </v-row>
          </v-col>

          <v-col cols="12" sm="6">
            <div class="text-caption text-medium-emphasis">{{ $t('profile.displayName') }}</div>
            <div>{{ store.user?.displayName ?? '—' }}</div>
          </v-col>

          <v-col cols="12" sm="6">
            <div class="text-caption text-medium-emphasis">{{ $t('profile.role') }}</div>
            <div>{{ $t(`role.${store.user?.role}`) }}</div>
          </v-col>

          <v-col cols="12" sm="6">
            <div class="text-caption text-medium-emphasis">{{ $t('profile.phone') }}</div>
            <v-row v-if="store.user?.phone" no-gutters align="center" class="ga-2">
              <v-col cols="auto">{{ store.user.phone }}</v-col>
              <v-col cols="auto">
                <v-icon size="small" color="success">mdi-check-circle</v-icon>
              </v-col>
            </v-row>
            <v-row v-else no-gutters align="center" class="ga-2">
              <v-col cols="auto" class="text-medium-emphasis">{{
                $t('profile.phoneNotVerified')
              }}</v-col>
              <v-col cols="auto">
                <ButtonsAppButton kind="secondary" size="small" @click="openVerifyPhoneDialog">
                  {{ $t('common.verify') }}
                </ButtonsAppButton>
              </v-col>
            </v-row>
          </v-col>
        </v-row>
      </v-card-text>
    </CardsAppCard>

    <v-dialog v-model="editingDisplayName" max-width="400" persistent>
      <CardsDialogCard>
        <v-card-title class="pa-4">{{ $t('profile.editDisplayName') }}</v-card-title>
        <v-card-text>
          <div class="text-caption text-medium-emphasis mb-1">{{ $t('profile.displayName') }}</div>
          <v-text-field
            v-model="displayNameInput"
            v-bind="displayNameInputAttrs"
            hide-details="auto"
            :disabled="displayNameLoading"
            :error-messages="displayNameFormErrors.displayNameInput"
          />
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <ButtonsAppButton
            kind="secondary"
            :disabled="displayNameLoading"
            @click="cancelEditDisplayName"
          >
            {{ $t('profile.cancel') }}
          </ButtonsAppButton>
          <ButtonsAppButton
            kind="primary"
            :loading="displayNameLoading"
            :disabled="!displayNameFormMeta.valid"
            @click="onSaveDisplayName"
          >
            {{ $t('profile.save') }}
          </ButtonsAppButton>
        </v-card-actions>
      </CardsDialogCard>
    </v-dialog>

    <v-dialog v-model="verifyPhoneDialog" max-width="400" persistent>
      <CardsDialogCard>
        <v-card-title class="pa-4">{{ $t('profile.verifyPhone') }}</v-card-title>
        <v-card-text>
          <template v-if="!confirmationResult">
            <div class="text-caption text-medium-emphasis mb-1">
              {{ $t('profile.phonePlaceholder') }}
            </div>
            <v-text-field
              v-model="phoneLocal"
              v-bind="phoneLocalAttrs"
              prefix="+886"
              type="tel"
              hide-details="auto"
              :disabled="loading"
              :error-messages="phoneFormErrors.phoneLocal"
            />
            <div id="recaptcha-container" />
          </template>
          <template v-else>
            <div class="text-caption text-medium-emphasis mb-1">{{ $t('profile.enterOtp') }}</div>
            <v-otp-input v-model="otp" length="6" :disabled="loading" />
          </template>
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <template v-if="!confirmationResult">
            <ButtonsAppButton
              kind="secondary"
              :disabled="loading"
              @click="verifyPhoneDialog = false"
            >
              {{ $t('profile.cancel') }}
            </ButtonsAppButton>
            <ButtonsAppButton
              kind="primary"
              :loading="loading"
              :disabled="!phoneFormMeta.valid"
              @click="onSendOtp"
            >
              {{ $t('auth.sendOtp') }}
            </ButtonsAppButton>
          </template>
          <template v-else>
            <ButtonsAppButton kind="secondary" :disabled="loading" @click="resetOtp">
              {{ $t('profile.resendOtp') }}
            </ButtonsAppButton>
            <ButtonsAppButton kind="primary" :loading="loading" @click="handleConfirmOtp">
              {{ $t('profile.confirmOtp') }}
            </ButtonsAppButton>
          </template>
        </v-card-actions>
      </CardsDialogCard>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod';
import type { ConfirmationResult } from 'firebase/auth';
import { useForm } from 'vee-validate';
import { z } from 'zod';
import { useAuthStore } from '~/stores/auth';

const store = useAuthStore();
const { sendPhoneLinkOtp, confirmPhoneLinkOtp } = useAuth();
const { showError, showSuccess } = useToast();
const { t } = useI18n();
const { open: openSessionExpiredDialog } = useSessionExpiredDialog();

const otp = ref('');
const loading = ref(false);
const confirmationResult = ref<ConfirmationResult | null>(null);

const displayNameLoading = ref(false);
const editingDisplayName = ref(false);

const verifyPhoneDialog = ref(false);

const displayNameValidationSchema = toTypedSchema(
  z.object({
    displayNameInput: z
      .string()
      .trim()
      .min(1, t('profile.displayNameRequired'))
      .max(20, t('profile.displayNameTooLong')),
  }),
);
const {
  defineField: defineDisplayNameField,
  errors: displayNameFormErrors,
  meta: displayNameFormMeta,
  handleSubmit: handleDisplayNameSubmit,
  resetForm: resetDisplayNameForm,
} = useForm({
  validationSchema: displayNameValidationSchema,
  initialValues: { displayNameInput: '' },
});
const [displayNameInput, displayNameInputAttrs] = defineDisplayNameField('displayNameInput');

const phoneValidationSchema = toTypedSchema(
  z.object({
    phoneLocal: z.string().regex(/^0?9\d{8}$/, t('profile.phoneInvalid')),
  }),
);
const {
  defineField: definePhoneField,
  errors: phoneFormErrors,
  meta: phoneFormMeta,
  handleSubmit: handlePhoneSubmit,
  resetForm: resetPhoneForm,
} = useForm({
  validationSchema: phoneValidationSchema,
  initialValues: { phoneLocal: '' },
});
const [phoneLocal, phoneLocalAttrs] = definePhoneField('phoneLocal');

const fullPhone = computed(() => `+886${(phoneLocal.value ?? '').replace(/^0+/, '')}`);

function startEditDisplayName() {
  resetDisplayNameForm({ values: { displayNameInput: store.user?.displayName ?? '' } });
  editingDisplayName.value = true;
}

function cancelEditDisplayName() {
  editingDisplayName.value = false;
}

const onSaveDisplayName = handleDisplayNameSubmit(async (values) => {
  if (!store.user) return;
  const trimmed = values.displayNameInput.trim();
  displayNameLoading.value = true;
  try {
    await $fetch('/api/profile/display-name', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${store.idToken ?? ''}` },
      body: { displayName: trimmed },
    });
    store.user.displayName = trimmed;
    showSuccess(t('profile.displayNameUpdateSuccess'));
    editingDisplayName.value = false;
  } catch (e: unknown) {
    if (isSessionExpiredError(e)) {
      openSessionExpiredDialog();
    } else {
      showError(t('profile.displayNameUpdateFailed'));
    }
  } finally {
    displayNameLoading.value = false;
  }
});

function openVerifyPhoneDialog() {
  resetPhoneForm();
  otp.value = '';
  confirmationResult.value = null;
  verifyPhoneDialog.value = true;
}

const onSendOtp = handlePhoneSubmit(async () => {
  loading.value = true;
  try {
    confirmationResult.value = await sendPhoneLinkOtp(fullPhone.value, 'recaptcha-container');
  } catch (e: unknown) {
    showError(e instanceof Error ? e.message : t('profile.otpSendFailed'));
  } finally {
    loading.value = false;
  }
});

async function handleConfirmOtp() {
  if (!confirmationResult.value || !store.user) return;
  loading.value = true;
  try {
    await confirmPhoneLinkOtp(confirmationResult.value, otp.value);
    store.user.phone = fullPhone.value;
    showSuccess(t('profile.otpSuccess'));
    confirmationResult.value = null;
    verifyPhoneDialog.value = false;
  } catch (e: unknown) {
    showError(e instanceof Error ? e.message : t('profile.otpFailed'));
  } finally {
    loading.value = false;
  }
}

function resetOtp() {
  confirmationResult.value = null;
  otp.value = '';
}
</script>
