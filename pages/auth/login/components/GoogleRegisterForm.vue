<template>
  <div>
    <v-form @submit.prevent="onSubmit">
      <v-text-field
        v-model="newUsername"
        v-bind="newUsernameAttrs"
        :label="$t('auth.username')"
        type="text"
        :error-messages="errors.newUsername"
        :disabled="loading"
        :hint="$t('auth.usernameHint')"
        persistent-hint
        hide-details="auto"
        class="mb-2"
      />
      <v-btn
        type="submit"
        color="primary"
        variant="flat"
        block
        :loading="loading"
        :disabled="!meta.valid"
        class="mb-3"
      >
        {{ $t('auth.confirmUsername') }}
      </v-btn>
    </v-form>
    <v-btn variant="flat" class="border" block :disabled="loading" @click="emit('cancel')">
      {{ $t('common.cancel') }}
    </v-btn>
  </div>
</template>

<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod';
import { useForm } from 'vee-validate';
import { z } from 'zod';
import { isValidUsername } from '~/shared/utils/validation';

const props = defineProps<{
  idToken: string;
}>();

const emit = defineEmits<{
  success: [];
  cancel: [];
}>();

const { googleRegister } = useAuth();
const { showError } = useToast();
const { t } = useI18n();

const loading = ref(false);

const validationSchema = toTypedSchema(
  z.object({
    newUsername: z.string().refine(isValidUsername, t('auth.error.invalidUsername')),
  }),
);

const { defineField, errors, meta, handleSubmit } = useForm({
  validationSchema,
  initialValues: { newUsername: '' },
});

const [newUsername, newUsernameAttrs] = defineField('newUsername');

const onSubmit = handleSubmit(async (values) => {
  loading.value = true;
  try {
    await googleRegister(values.newUsername, props.idToken);
    emit('success');
  } catch (e: unknown) {
    const statusCode = (e as { data?: { statusCode?: number } }).data?.statusCode;
    if (statusCode === 409) {
      showError(t('auth.error.usernameTaken'));
    } else {
      showError(t('auth.error.registerDefault'));
    }
  } finally {
    loading.value = false;
  }
});
</script>
