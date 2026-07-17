<template>
  <v-form @submit.prevent="onSubmit">
    <v-row no-gutters class="ga-3 flex-column">
      <v-col>
        <v-text-field
          v-model="identifier"
          v-bind="identifierAttrs"
          :label="$t('auth.identifier')"
          type="text"
          :error-messages="errors.identifier"
          :disabled="loading"
          hide-details="auto"
        />
      </v-col>
      <v-col>
        <v-text-field
          v-model="password"
          v-bind="passwordAttrs"
          :label="$t('auth.password')"
          type="password"
          :error-messages="errors.password"
          :disabled="loading"
          hide-details="auto"
        />
      </v-col>
      <v-col>
        <v-btn
          type="submit"
          size="x-large"
          color="primary"
          variant="flat"
          block
          :loading="loading"
          :disabled="!meta.valid"
        >
          {{ $t('auth.login') }}
        </v-btn>
      </v-col>
    </v-row>
  </v-form>
</template>

<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod';
import { useForm } from 'vee-validate';
import { z } from 'zod';

const emit = defineEmits<{
  success: [];
}>();

const { login, getLoginErrorMessage } = useAuth();
const { showError } = useToast();
const { t } = useI18n();

const loading = ref(false);

const validationSchema = toTypedSchema(
  z.object({
    identifier: z.string().min(1, t('common.required')),
    password: z.string().min(1, t('common.required')),
  }),
);

const { defineField, errors, meta, handleSubmit } = useForm({
  validationSchema,
  initialValues: { identifier: '', password: '' },
});

const [identifier, identifierAttrs] = defineField('identifier');
const [password, passwordAttrs] = defineField('password');

const onSubmit = handleSubmit(async (values) => {
  loading.value = true;
  try {
    await login(values.identifier, values.password);
    emit('success');
  } catch (e: unknown) {
    const statusCode = (e as { data?: { statusCode?: number } }).data?.statusCode;
    if (statusCode === 429) {
      showError(t('auth.error.accountLocked'));
    } else {
      showError(getLoginErrorMessage(e));
    }
  } finally {
    loading.value = false;
  }
});
</script>
