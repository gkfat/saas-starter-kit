<template>
  <v-form @submit.prevent="onSubmit">
    <v-row no-gutters class="ga-3 flex-column">
      <v-col>
        <v-text-field
          v-model="username"
          v-bind="usernameAttrs"
          :label="$t('auth.username')"
          type="text"
          :error-messages="errors.username"
          :disabled="loading"
          :hint="$t('auth.usernameHint')"
          persistent-hint
          hide-details="auto"
        />
      </v-col>
      <v-col v-if="!isQuickRegisterMode">
        <v-text-field
          v-model="password"
          v-bind="passwordAttrs"
          :label="$t('auth.password')"
          :type="showPassword ? 'text' : 'password'"
          :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
          :error-messages="errors.password"
          :disabled="loading"
          :hint="$t('auth.passwordHint')"
          persistent-hint
          hide-details="auto"
          @click:append-inner="showPassword = !showPassword"
        />
      </v-col>
      <v-col v-if="!isQuickRegisterMode">
        <v-text-field
          v-model="confirmPassword"
          v-bind="confirmPasswordAttrs"
          :label="$t('auth.confirmPassword')"
          :type="showConfirmPassword ? 'text' : 'password'"
          :append-inner-icon="showConfirmPassword ? 'mdi-eye-off' : 'mdi-eye'"
          :error-messages="errors.confirmPassword"
          :disabled="loading"
          hide-details="auto"
          @click:append-inner="showConfirmPassword = !showConfirmPassword"
        />
      </v-col>
      <v-col v-if="!isQuickRegisterMode">
        <v-text-field
          v-model="email"
          v-bind="emailAttrs"
          :label="$t('auth.emailOptional')"
          type="email"
          :error-messages="errors.email"
          :disabled="loading"
          hide-details="auto"
        />
      </v-col>
      <v-col v-if="!isQuickRegisterMode">
        <v-text-field
          v-model="phone"
          v-bind="phoneAttrs"
          :label="$t('auth.phoneOptional')"
          type="tel"
          :error-messages="errors.phone"
          :disabled="loading"
          hide-details="auto"
        />
      </v-col>
      <v-col>
        <ButtonsAppButton
          type="submit"
          kind="primary"
          size="x-large"
          block
          :loading="loading"
          :disabled="!meta.valid"
        >
          {{ $t(isQuickRegisterMode ? 'auth.confirmUsername' : 'auth.register') }}
        </ButtonsAppButton>
      </v-col>
      <v-col v-if="isQuickRegisterMode">
        <ButtonsAppButton kind="secondary" block :disabled="loading" @click="emit('cancel')">
          {{ $t('common.cancel') }}
        </ButtonsAppButton>
      </v-col>
    </v-row>
  </v-form>
</template>

<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod';
import { useForm } from 'vee-validate';
import { z } from 'zod';
import { isValidUsername, isValidPassword, isValidPhone } from '@saas-starter-kit/shared';

const props = withDefaults(
  defineProps<{
    idToken?: string;
    provider?: 'google' | 'line';
  }>(),
  { provider: 'google' },
);

const emit = defineEmits<{
  success: [];
  cancel: [];
}>();

const isQuickRegisterMode = computed(() => !!props.idToken);

const { register, googleRegister, lineRegister } = useAuth();
const { showError, showSuccess } = useToast();
const { t } = useI18n();

const loading = ref(false);
const showPassword = ref(false);
const showConfirmPassword = ref(false);

const validationSchema = toTypedSchema(
  z
    .object({
      username: z.string().refine(isValidUsername, t('auth.error.invalidUsername')),
      password: z.string().optional(),
      confirmPassword: z.string().optional(),
      email: z.union([z.string().email(t('auth.error.invalidEmail')), z.literal('')]).optional(),
      phone: z.union([z.string().refine(isValidPhone), z.literal('')]).optional(),
    })
    .superRefine((data, ctx) => {
      if (isQuickRegisterMode.value) return;
      if (!data.password || !isValidPassword(data.password)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t('auth.error.invalidPassword'),
          path: ['password'],
        });
      }
      if (data.password !== data.confirmPassword) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t('auth.passwordMismatch'),
          path: ['confirmPassword'],
        });
      }
    }),
);

const { defineField, errors, meta, handleSubmit } = useForm({
  validationSchema,
  initialValues: { username: '', password: '', confirmPassword: '', email: '', phone: '' },
});

const [username, usernameAttrs] = defineField('username');
const [password, passwordAttrs] = defineField('password');
const [confirmPassword, confirmPasswordAttrs] = defineField('confirmPassword');
const [email, emailAttrs] = defineField('email');
const [phone, phoneAttrs] = defineField('phone');

const onSubmit = handleSubmit(async (values) => {
  loading.value = true;
  try {
    if (isQuickRegisterMode.value) {
      if (props.provider === 'line') {
        await lineRegister(values.username, props.idToken as string);
      } else {
        await googleRegister(values.username, props.idToken as string);
      }
    } else {
      await register(
        values.username,
        values.password as string,
        values.email || undefined,
        values.phone || undefined,
      );
      showSuccess(t('auth.registerSuccess'));
    }
    emit('success');
  } catch (e: unknown) {
    const errorCode = getErrorCode(e);
    if (errorCode === 'username-taken') {
      showError(t('auth.error.usernameTaken'));
    } else if (errorCode === 'contact-taken') {
      showError(t('auth.error.contactTaken'));
    } else {
      showError(t('auth.error.registerDefault'));
    }
  } finally {
    loading.value = false;
  }
});
</script>
